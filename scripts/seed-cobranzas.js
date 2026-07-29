/**
 * Siembra la colección `cobranzas` con 3 deudas de ejemplo (si está vacía).
 * Run: node scripts/seed-cobranzas.js
 */

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb+srv://Evalia:85IXjeMPtpB7OqW9@evalia.pjj2kzb.mongodb.net/catalogo-demo?retryWrites=true&w=majority&appName=EVALIA";
const DB = process.env.MONGODB_DATABASE || "catalogo-demo";
const COBRANZAS_COL = "cobranzas";

function computeEstado(fechaVencimiento, saldoPendiente, now = new Date()) {
  if (saldoPendiente <= 0) return "Pagada";
  const venc = new Date(fechaVencimiento);
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const vencDia = new Date(venc.getFullYear(), venc.getMonth(), venc.getDate());
  if (hoy > vencDia) return "Vencida";
  return "Pendiente";
}

const SEED = [
  {
    userId: "cliente-001",
    nombreUsuario: "María López",
    userEmail: "maria.lopez@example.com",
    montoInicial: 1500000,
    saldoPendiente: 1500000,
    fechaVencimiento: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  },
  {
    userId: "cliente-002",
    nombreUsuario: "Carlos Ruiz",
    userEmail: "carlos.ruiz@example.com",
    montoInicial: 800000,
    saldoPendiente: 800000,
    fechaVencimiento: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    userId: "cliente-003",
    nombreUsuario: "Ana Torres",
    userEmail: "ana.torres@example.com",
    montoInicial: 1000000,
    saldoPendiente: 1000000,
    fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
];

async function main() {
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(MONGO_URI);
  const now = new Date();

  try {
    await client.connect();
    const col = client.db(DB).collection(COBRANZAS_COL);
    const count = await col.countDocuments({});
    if (count > 0) {
      console.log(`Colección cobranzas ya tiene ${count} documento(s); no se modifica.`);
      return;
    }
    const docs = SEED.map((c) => ({
      ...c,
      estado: computeEstado(c.fechaVencimiento, c.saldoPendiente, now),
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
    await col.insertMany(docs);
    console.log(`Insertadas ${docs.length} cobranzas de ejemplo.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
