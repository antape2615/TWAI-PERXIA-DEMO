/**
 * Seed 100 realistic Colombian users into MongoDB.
 *
 * Run: node scripts/seed-users-mongo.js
 *
 * Uses pure JS (no Faker) to avoid extra deps.
 */

const MONGO_URI =
  "mongodb+srv://Evalia:85IXjeMPtpB7OqW9@evalia.pjj2kzb.mongodb.net/catalogo-demo?retryWrites=true&w=majority&appName=EVALIA";
const DB = "catalogo-demo";
const COL = "users-prod";

// -------- Data pools --------

const firstNames = [
  "Alejandra", "Andrés", "Camila", "Carlos", "Carolina", "Catalina", "Daniel",
  "David", "Diana", "Diego", "Eduardo", "Esteban", "Fernanda", "Felipe",
  "Gabriel", "Gloria", "Gustavo", "Isabel", "Javier", "Jorge", "José",
  "Juan", "Juliana", "Laura", "Liliana", "Luis", "Manuel", "María",
  "Mariana", "Mario", "Martín", "Miguel", "Natalia", "Nicolás", "Oscar",
  "Pablo", "Paola", "Patricia", "Pedro", "Rafael", "Ricardo", "Roberto",
  "Rosa", "Sandra", "Santiago", "Sebastián", "Sofía", "Valentina", "Viviana", "Ximena"
];

const lastNames = [
  "García", "Rodríguez", "Martínez", "López", "González", "Hernández",
  "Pérez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez",
  "Díaz", "Cruz", "Morales", "Reyes", "Gutiérrez", "Ortiz", "Ramos",
  "Vargas", "Castillo", "Jiménez", "Moreno", "Romero", "Álvarez", "Ruiz",
  "Mendoza", "Aguilar", "Medina", "Castro", "Herrera", "Rojas", "Delgado",
  "Peña", "Acosta", "Vega", "Guerrero", "Córdoba", "Pineda", "Ospina",
  "Mejía", "Cardona", "Muñoz", "Castaño", "Arias", "Patiño", "Valencia",
  "Salazar", "Duque"
];

const cities = [
  { city: "Bogotá", dept: "Cundinamarca", zip: "110" },
  { city: "Medellín", dept: "Antioquia", zip: "050" },
  { city: "Cali", dept: "Valle del Cauca", zip: "760" },
  { city: "Barranquilla", dept: "Atlántico", zip: "080" },
  { city: "Cartagena", dept: "Bolívar", zip: "130" },
  { city: "Bucaramanga", dept: "Santander", zip: "680" },
  { city: "Pereira", dept: "Risaralda", zip: "660" },
  { city: "Manizales", dept: "Caldas", zip: "170" },
  { city: "Santa Marta", dept: "Magdalena", zip: "470" },
  { city: "Ibagué", dept: "Tolima", zip: "730" },
];

const streets = [
  "Calle", "Carrera", "Avenida", "Transversal", "Diagonal"
];

const addressLabels = ["Casa", "Oficina", "Apartamento", "Finca", "Otro"];

const cardBrands = [
  { prefix: "4", name: "Visa" },
  { prefix: "51", name: "Mastercard" },
  { prefix: "52", name: "Mastercard" },
  { prefix: "36", name: "Diners Club" },
  { prefix: "37", name: "American Express" },
];

// -------- Helpers --------

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad = (n, len = 2) => String(n).padStart(len, "0");

function genCedula() {
  return String(rand(10000000, 1999999999));
}

function genPhone() {
  return `+57 3${rand(10, 29)} ${rand(100, 999)} ${rand(1000, 9999)}`;
}

function genEmail(first, last, i) {
  const domains = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "correo.co"];
  const clean = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const variants = [
    `${clean(first)}.${clean(last)}`,
    `${clean(first)}${clean(last)}${rand(1, 99)}`,
    `${clean(first[0])}${clean(last)}`,
    `${clean(first)}_${clean(last)}`,
  ];
  return `${pick(variants)}@${pick(domains)}`;
}

function genCard() {
  const brand = pick(cardBrands);
  let num = brand.prefix;
  while (num.length < 16) num += rand(0, 9);
  const month = pad(rand(1, 12));
  const year = rand(27, 32);
  return {
    brand: brand.name,
    number: num,
    last_four: num.slice(-4),
    expiry: `${month}/${year}`,
    cvc: String(rand(100, 9999)).padStart(3, "0").slice(0, brand.prefix === "37" ? 4 : 3),
    holder_name: "", // set later
  };
}

function genAddress() {
  const loc = pick(cities);
  return {
    id: `a${Date.now()}${rand(1000, 9999)}`,
    label: pick(addressLabels),
    street: `${pick(streets)} ${rand(1, 180)} #${rand(1, 100)}-${rand(1, 99)}`,
    city: loc.city,
    state: loc.dept,
    zip: `${loc.zip}${pad(rand(1, 99))}${rand(0, 9)}`,
    country: "Colombia",
    phone: genPhone(),
  };
}

function genUser(i) {
  const first = pick(firstNames);
  const last1 = pick(lastNames);
  const last2 = pick(lastNames);
  const fullName = `${first} ${last1} ${last2}`;
  const email = genEmail(first, last1, i);
  // Simple passwords: Firstname + last 4 of cedula
  const cedula = genCedula();
  const password = `${first.toLowerCase()}${cedula.slice(-4)}`;

  const numAddresses = rand(1, 3);
  const addresses = [];
  for (let a = 0; a < numAddresses; a++) addresses.push(genAddress());

  const numCards = rand(1, 2);
  const cards = [];
  for (let c = 0; c < numCards; c++) {
    const card = genCard();
    card.holder_name = fullName.toUpperCase();
    cards.push(card);
  }

  return {
    email,
    password, // stored in plain text for demo/testing purposes
    name: fullName,
    cedula,
    phone: genPhone(),
    date_of_birth: `${rand(1965, 2003)}-${pad(rand(1, 12))}-${pad(rand(1, 28))}`,
    gender: pick(["M", "F"]),
    addresses,
    payment_methods: cards,
    salary: rand(1200000, 25000000),
    membership: pick(["basic", "premium", "gold", "platinum"]),
    created_at: new Date(Date.now() - rand(0, 365 * 2) * 86400000),
    active: true,
  };
}

// -------- Main --------

async function main() {
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("Conectado a MongoDB");

    const db = client.db(DB);
    const col = db.collection(COL);

    // Drop existing if any
    const existing = await col.countDocuments();
    if (existing > 0) {
      console.log(`Colección ${COL} tiene ${existing} docs — eliminando...`);
      await col.drop();
    }

    // Generate 100 users
    const users = [];
    const usedEmails = new Set();
    for (let i = 0; i < 100; i++) {
      let user;
      do {
        user = genUser(i);
      } while (usedEmails.has(user.email));
      usedEmails.add(user.email);
      users.push(user);
    }

    const result = await col.insertMany(users);
    console.log(`✅ ${result.insertedCount} usuarios insertados en ${DB}.${COL}`);

    const { DEMO_USER } = await import("./ensure-demo-user.js");
    await col.updateOne(
      { email: DEMO_USER.email },
      { $set: DEMO_USER },
      { upsert: true },
    );
    console.log(`✅ Usuario demo asegurado: ${DEMO_USER.email}`);

    // Print a few samples
    console.log("\n--- Primeros 5 usuarios (para probar login) ---");
    for (const u of users.slice(0, 5)) {
      console.log(`  📧 ${u.email}  🔑 ${u.password}  💳 ${u.payment_methods[0].number}`);
    }

    // Create index on email
    await col.createIndex({ email: 1 }, { unique: true });
    console.log("\nÍndice único creado en email");
  } finally {
    await client.close();
  }
}

main().catch(console.error);
