/**
 * Usuario administrador para el módulo de cobranzas.
 * Run: node scripts/ensure-admin-user.js
 */

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb+srv://Evalia:85IXjeMPtpB7OqW9@evalia.pjj2kzb.mongodb.net/catalogo-demo?retryWrites=true&w=majority&appName=EVALIA";
const DB = process.env.MONGODB_DATABASE || "catalogo-demo";
const COL = process.env.MONGODB_COLLECTION || "users-prod";

export const ADMIN_USER = {
  email: "admin@cocina.com",
  password: "admin123",
  name: "Administrador CocinaStore",
  role: "admin",
  cedula: "9000000001",
  phone: "+57 300 999 0000",
  addresses: [],
  payment_methods: [],
  membership: "staff",
  created_at: new Date("2024-06-01T00:00:00.000Z"),
  active: true,
};

async function main() {
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const col = client.db(DB).collection(COL);
    await col.updateOne({ email: ADMIN_USER.email }, { $set: ADMIN_USER }, { upsert: true });
  } finally {
    await client.close();
  }
}

const isMain = process.argv[1]?.endsWith("ensure-admin-user.js");
if (isMain) {
  main()
    .then(() => {
      console.log(`Usuario admin listo: ${ADMIN_USER.email}`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
