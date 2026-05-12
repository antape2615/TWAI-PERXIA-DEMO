const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGODB_URI ||
  "mongodb+srv://Evalia:85IXjeMPtpB7OqW9@evalia.pjj2kzb.mongodb.net/catalogo-demo?retryWrites=true&w=majority&appName=EVALIA";
const DB = process.env.MONGODB_DATABASE || "catalogo-demo";
const COL = process.env.MONGODB_COLLECTION || "users-prod";

let cachedClient = null;

async function getCollection() {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URI);
    await cachedClient.connect();
  }
  return cachedClient.db(DB).collection(COL);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePassword(password) {
  return String(password || "").normalize("NFKC");
}

const DEMO_USER = {
  email: "demo@cocina.com",
  name: "Usuario Demo CocinaStore",
  addresses: [
    {
      id: "a-demo-1",
      label: "Casa",
      street: "Calle 100 #15-20",
      city: "Bogotá",
      state: "Cundinamarca",
      zip: "110111",
      country: "Colombia",
      phone: "+57 300 123 4567",
    },
  ],
};

function buildSafeUser(user) {
  const { password: _, payment_methods, salary, cedula, ...safeUser } = user;
  const maskedCards = (payment_methods || []).map((c) => ({
    brand: c.brand,
    last_four: c.last_four,
    expiry: c.expiry,
  }));

  return {
    ...safeUser,
    _id: safeUser._id?.toString(),
    payment_methods_masked: maskedCards,
  };
}

function authenticateUser(email, password, user) {
  if (!user) {
    return false;
  }

  return normalizePassword(user.password) === normalizePassword(password);
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const path = event.path
    .replace("/.netlify/functions/auth", "")
    .replace("/api/auth", "");

  if (event.httpMethod === "POST" && (path === "/login" || path === "" || path === "/")) {
    try {
      const { email, password } = JSON.parse(event.body || "{}");
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = normalizePassword(password);

      if (!normalizedEmail || !normalizedPassword) {
        return json(400, { ok: false, error: "Email y contraseña requeridos" });
      }

      if (
        normalizedEmail === DEMO_USER.email &&
        normalizedPassword === normalizePassword("demo123")
      ) {
        return json(200, { ok: true, user: buildSafeUser(DEMO_USER) });
      }

      const col = await getCollection();
      const user = await col.findOne({ email: normalizedEmail });

      if (!authenticateUser(normalizedEmail, normalizedPassword, user)) {
        return json(401, { ok: false, error: "Email o contraseña incorrectos" });
      }

      return json(200, {
        ok: true,
        user: buildSafeUser(user),
      });
    } catch (err) {
      console.error("Login error:", err);
      return json(500, { ok: false, error: "Error interno del servidor" });
    }
  }

  if (event.httpMethod === "GET" && path === "/users") {
    try {
      const col = await getCollection();
      const users = await col
        .find({}, { projection: { email: 1, name: 1, _id: 0 } })
        .limit(200)
        .toArray();
      return json(200, { users, total: users.length });
    } catch (err) {
      console.error("List users error:", err);
      return json(500, { error: "Error interno" });
    }
  }

  return json(404, { error: "Not found" });
};
