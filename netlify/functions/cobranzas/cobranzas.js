const { MongoClient, ObjectId } = require("mongodb");
const {
  ESTADOS_LISTADO_DEFAULT,
  MSG_PAGO_MAYOR_SALDO,
  MSG_ACCESO_NO_AUTORIZADO,
  MSG_SIN_DEUDAS,
  computeEstadoDeuda,
  applyPago,
} = require("./cobranzasLogic");

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb+srv://Evalia:85IXjeMPtpB7OqW9@evalia.pjj2kzb.mongodb.net/catalogo-demo?retryWrites=true&w=majority&appName=EVALIA";
const DB = process.env.MONGODB_DATABASE || "catalogo-demo";
const USERS_COL = process.env.MONGODB_COLLECTION || "users-prod";
const COBRANZAS_COL = process.env.MONGODB_COBRANZAS_COLLECTION || "cobranzas";
const AUDIT_COL = process.env.MONGODB_COBRANZAS_AUDIT_COLLECTION || "cobranzas_auditoria";

let cachedClient = null;

function normalizePath(event) {
  let p = event.path || "";
  if (event.rawPath) p = event.rawPath;
  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      p = new URL(p).pathname;
    } catch (_) {
      /* mantener p */
    }
  }
  return p
    .replace(/\/\.netlify\/functions\/cobranzas/gi, "")
    .replace(/\/api\/cobranzas/gi, "")
    .replace(/\/+$/, "") || "/";
}

async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URI);
    await cachedClient.connect();
  }
  return cachedClient.db(DB);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Email",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return null;
  }
}

function getAdminEmail(event, body) {
  const header = event.headers?.["x-admin-email"] || event.headers?.["X-Admin-Email"];
  if (header) return String(header).toLowerCase().trim();
  if (body?.adminEmail) return String(body.adminEmail).toLowerCase().trim();
  const qs = event.queryStringParameters || {};
  if (qs.adminEmail) return String(qs.adminEmail).toLowerCase().trim();
  return "";
}

async function logAuditoria(db, entry) {
  try {
    await db.collection(AUDIT_COL).insertOne({
      ...entry,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

async function isAdminUser(db, email) {
  if (!email) return false;
  const user = await db.collection(USERS_COL).findOne({ email: email.toLowerCase().trim() });
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  return role === "admin" || role === "administrador";
}

async function requireAdmin(event, body, db, action) {
  const adminEmail = getAdminEmail(event, body);
  const allowed = await isAdminUser(db, adminEmail);
  await logAuditoria(db, {
    action,
    adminEmail: adminEmail || "(sin email)",
    resultado: allowed ? "exito" : "fallo",
    detalle: allowed ? "Acceso autorizado" : MSG_ACCESO_NO_AUTORIZADO,
  });
  if (!allowed) {
    return { ok: false, response: json(403, { ok: false, error: MSG_ACCESO_NO_AUTORIZADO }) };
  }
  return { ok: true, adminEmail };
}

function mapCobranza(doc) {
  return {
    id: doc._id?.toString(),
    userId: doc.userId,
    nombreUsuario: doc.nombreUsuario,
    montoInicial: doc.montoInicial,
    saldoPendiente: doc.saldoPendiente,
    fechaVencimiento: doc.fechaVencimiento,
    estado: doc.estado,
    historialPagos: (doc.historialPagos || []).map((h) => ({
      ...h,
      fecha: h.fecha,
    })),
  };
}

async function refreshEstadoIfNeeded(db, doc, now = new Date()) {
  const nuevoEstado = computeEstadoDeuda(doc.fechaVencimiento, doc.saldoPendiente, now);
  if (nuevoEstado === doc.estado) {
    return doc;
  }
  const historial = [...(doc.historialPagos || [])];
  historial.push({
    fecha: now,
    monto: 0,
    tipoMovimiento: "Actualización de estado",
    registradoPor: "sistema",
    detalle: `Estado actualizado de ${doc.estado} a ${nuevoEstado}`,
  });
  await db.collection(COBRANZAS_COL).updateOne(
    { _id: doc._id },
    { $set: { estado: nuevoEstado, historialPagos: historial, updatedAt: now } },
  );
  await logAuditoria(db, {
    action: "actualizacion_estado_vencida",
    cobranzaId: doc._id.toString(),
    resultado: "exito",
    detalle: `RN-05: ${doc.estado} → ${nuevoEstado}`,
  });
  return { ...doc, estado: nuevoEstado, historialPagos: historial };
}

const SEED_COBRANZAS = [
  {
    userId: "cliente-001",
    nombreUsuario: "María López",
    userEmail: "maria.lopez@example.com",
    montoInicial: 1500000,
    saldoPendiente: 1500000,
    fechaVencimiento: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    estado: "Pendiente",
  },
  {
    userId: "cliente-002",
    nombreUsuario: "Carlos Ruiz",
    userEmail: "carlos.ruiz@example.com",
    montoInicial: 800000,
    saldoPendiente: 800000,
    fechaVencimiento: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    estado: "Vencida",
  },
  {
    userId: "cliente-003",
    nombreUsuario: "Ana Torres",
    userEmail: "ana.torres@example.com",
    montoInicial: 1000000,
    saldoPendiente: 1000000,
    fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estado: "Pendiente",
  },
];

async function ensureSeedCobranzas(db) {
  const count = await db.collection(COBRANZAS_COL).countDocuments({});
  if (count > 0) return;
  const now = new Date();
  const docs = SEED_COBRANZAS.map((c) => ({
    ...c,
    estado: computeEstadoDeuda(c.fechaVencimiento, c.saldoPendiente, now),
    historialPagos: [
      {
        fecha: now,
        monto: 0,
        tipoMovimiento: "Alta de deuda",
        registradoPor: "sistema",
        detalle: "Registro inicial de cobranza",
      },
    ],
    createdAt: now,
    updatedAt: now,
  }));
  await db.collection(COBRANZAS_COL).insertMany(docs);
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const path = normalizePath(event);
  const body = event.httpMethod === "POST" ? parseBody(event) : {};
  if (event.httpMethod === "POST" && body === null) {
    return json(400, { ok: false, error: "Cuerpo de solicitud inválido" });
  }

  try {
    const db = await getDb();
    await ensureSeedCobranzas(db);

    if (event.httpMethod === "GET" && (path === "" || path === "/")) {
      const auth = await requireAdmin(event, body, db, "consulta_listado_cobranzas");
      if (!auth.ok) return auth.response;

      const filtroEstado = (event.queryStringParameters?.estado || "").trim();
      const estadosVisibles = ESTADOS_LISTADO_DEFAULT;
      let query = {};
      if (filtroEstado && ["Pendiente", "Vencida", "Pagada"].includes(filtroEstado)) {
        query.estado = filtroEstado;
      } else {
        query.estado = { $in: estadosVisibles };
      }

      const raw = await db.collection(COBRANZAS_COL).find(query).sort({ fechaVencimiento: 1 }).toArray();
      const now = new Date();
      const refreshed = [];
      for (const doc of raw) {
        refreshed.push(await refreshEstadoIfNeeded(db, doc, now));
      }

      const items = refreshed.map(mapCobranza);
      const sinPendientes =
        !filtroEstado &&
        items.filter((i) => estadosVisibles.includes(i.estado)).length === 0;

      return json(200, {
        ok: true,
        items,
        total: items.length,
        estadosListado: estadosVisibles,
        mensajeVacio: sinPendientes ? MSG_SIN_DEUDAS : undefined,
      });
    }

    const detailMatch = path.match(/^\/([^/]+)$/);
    if (event.httpMethod === "GET" && detailMatch) {
      const auth = await requireAdmin(event, body, db, "consulta_detalle_cobranza");
      if (!auth.ok) return auth.response;

      let oid;
      try {
        oid = new ObjectId(detailMatch[1]);
      } catch {
        return json(404, { ok: false, error: "Cobranza no encontrada" });
      }

      const doc = await db.collection(COBRANZAS_COL).findOne({ _id: oid });
      if (!doc) {
        return json(404, { ok: false, error: "Cobranza no encontrada" });
      }
      const updated = await refreshEstadoIfNeeded(db, doc);
      return json(200, { ok: true, cobranza: mapCobranza(updated) });
    }

    const pagoMatch = path.match(/^\/([^/]+)\/pagos$/);
    if (event.httpMethod === "POST" && pagoMatch) {
      const auth = await requireAdmin(event, body, db, "registro_pago");
      if (!auth.ok) return auth.response;

      let oid;
      try {
        oid = new ObjectId(pagoMatch[1]);
      } catch {
        return json(404, { ok: false, error: "Cobranza no encontrada" });
      }

      const { monto, tipoPago } = body;
      let montoPago = Number(monto);
      if (tipoPago === "total") {
        const preview = await db.collection(COBRANZAS_COL).findOne({ _id: oid });
        if (!preview) return json(404, { ok: false, error: "Cobranza no encontrada" });
        montoPago = preview.saldoPendiente;
      }

      const doc = await db.collection(COBRANZAS_COL).findOne({ _id: oid });
      if (!doc) {
        return json(404, { ok: false, error: "Cobranza no encontrada" });
      }

      const refreshed = await refreshEstadoIfNeeded(db, doc);
      const result = applyPago(refreshed.saldoPendiente, montoPago, refreshed.fechaVencimiento);
      if (!result.ok) {
        await logAuditoria(db, {
          action: "registro_pago",
          cobranzaId: oid.toString(),
          adminEmail: auth.adminEmail,
          monto: montoPago,
          resultado: "fallo",
          detalle: result.error,
        });
        const status = result.error === MSG_PAGO_MAYOR_SALDO ? 400 : 400;
        return json(status, { ok: false, error: result.error });
      }

      const now = new Date();
      const tipoMovimiento = result.saldoPendiente === 0 ? "Pago total" : "Pago parcial";
      const historial = [...(refreshed.historialPagos || [])];
      historial.push({
        fecha: now,
        monto: montoPago,
        tipoMovimiento,
        registradoPor: auth.adminEmail,
        detalle: `Pago registrado (${tipoPago || tipoMovimiento})`,
      });

      await db.collection(COBRANZAS_COL).updateOne(
        { _id: oid },
        {
          $set: {
            saldoPendiente: result.saldoPendiente,
            estado: result.estado,
            historialPagos: historial,
            updatedAt: now,
          },
        },
      );

      await logAuditoria(db, {
        action: "registro_pago",
        cobranzaId: oid.toString(),
        adminEmail: auth.adminEmail,
        monto: montoPago,
        resultado: "exito",
        detalle: `Saldo actualizado a ${result.saldoPendiente}, estado ${result.estado}`,
      });

      const updated = await db.collection(COBRANZAS_COL).findOne({ _id: oid });
      return json(200, { ok: true, cobranza: mapCobranza(updated) });
    }

    return json(404, { ok: false, error: "Not found" });
  } catch (err) {
    console.error("Cobranzas error:", err);
    return json(500, { ok: false, error: "Error interno del servidor" });
  }
};
