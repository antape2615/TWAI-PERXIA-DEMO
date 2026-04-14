/**
 * Netlify Function — auth
 *
 * POST /api/auth/login   — Validate email+password against MongoDB
 * GET  /api/auth/users   — List users (emails only, for testing)
 */
import { MongoClient } from "mongodb";

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

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const path = event.path
    .replace("/.netlify/functions/auth", "")
    .replace("/api/auth", "");

  // POST /login
  if (event.httpMethod === "POST" && (path === "/login" || path === "" || path === "/")) {
    try {
      const { email, password } = JSON.parse(event.body || "{}");
      if (!email || !password) {
        return json(400, { ok: false, error: "Email y contraseña requeridos" });
      }

      const col = await getCollection();
      const user = await col.findOne({ email: email.toLowerCase().trim() });

      if (!user || user.password !== password) {
        return json(401, { ok: false, error: "Email o contraseña incorrectos" });
      }

      const { password: _, payment_methods, salary, cedula, ...safeUser } = user;
      const maskedCards = (payment_methods || []).map((c) => ({
        brand: c.brand,
        last_four: c.last_four,
        expiry: c.expiry,
      }));

      return json(200, {
        ok: true,
        user: {
          ...safeUser,
          _id: safeUser._id?.toString(),
          payment_methods_masked: maskedCards,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      return json(500, { ok: false, error: "Error interno del servidor" });
    }
  }

  // GET /users
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
}
