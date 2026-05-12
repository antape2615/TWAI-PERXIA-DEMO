/**
 * Garantiza el usuario demo usado por pruebas automatizadas y el README.
 * Run: node scripts/ensure-demo-user.js
 */

const MONGO_URI =
  "mongodb+srv://Evalia:85IXjeMPtpB7OqW9@evalia.pjj2kzb.mongodb.net/catalogo-demo?retryWrites=true&w=majority&appName=EVALIA";
const DB = "catalogo-demo";
const COL = "users-prod";

export const DEMO_USER = {
  email: "demo@cocina.com",
  password: "demo123",
  name: "Usuario Demo CocinaStore",
  cedula: "1000000001",
  phone: "+57 300 123 4567",
  date_of_birth: "1990-01-15",
  gender: "F",
  addresses: [
    {
      id: "a-demo-home",
      label: "Casa",
      street: "Carrera 7 # 45-12",
      city: "Bogotá",
      state: "Cundinamarca",
      zip: "110111",
      country: "Colombia",
      phone: "+57 300 123 4567",
    },
  ],
  payment_methods: [
    {
      brand: "Visa",
      number: "4111111111111111",
      last_four: "1111",
      expiry: "12/30",
      cvc: "123",
      holder_name: "USUARIO DEMO COCINASTORE",
    },
  ],
  salary: 4500000,
  membership: "premium",
  created_at: new Date("2024-01-01T00:00:00.000Z"),
  active: true,
};

async function main() {
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const col = client.db(DB).collection(COL);
    const result = await col.updateOne(
      { email: DEMO_USER.email },
      { $set: DEMO_USER },
      { upsert: true },
    );
  } finally {
    await client.close();
  }
}

const isMain = process.argv[1]?.endsWith("ensure-demo-user.js");
if (isMain) {
  main()
    .then(() => {
      console.log(`Usuario demo listo: ${DEMO_USER.email}`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
