const { MongoClient } = require("mongodb");
const { config } = require("./config");

let database;
let client;

const seedProducts = [
  { name: "Abhyanga Body Oil", description: "Warm · Grounding · Restorative", price: 899, category: "body-care", published: true, stock: 25 },
  { name: "Golden Turmeric Latte", description: "Warming · Comforting · Daily", price: 499, category: "wellness", published: true, stock: 25 },
  { name: "Calm Evening Tea", description: "Floral · Gentle · Restful", price: 549, category: "tea", published: true, stock: 25 }
];

const seedAvailability = [
  { day: 0, enabled: false, start: "10:00", end: "14:00" },
  { day: 1, enabled: true, start: "10:00", end: "17:00" },
  { day: 2, enabled: true, start: "10:00", end: "17:00" },
  { day: 3, enabled: true, start: "10:00", end: "17:00" },
  { day: 4, enabled: true, start: "10:00", end: "17:00" },
  { day: 5, enabled: true, start: "10:00", end: "17:00" },
  { day: 6, enabled: false, start: "10:00", end: "14:00" }
];

async function connectDatabase() {
  if (!config.mongoUri) {
    console.warn("MONGODB_URI is not configured; using in-memory data for local development.");
    database = null;
    return;
  }
  client = new MongoClient(config.mongoUri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    family: 4,
    tls: true,
    retryWrites: true
  });
  try {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await client.connect();
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
    if (lastError) throw lastError;
    database = client.db(config.mongoDb);
    await database.collection("products").createIndex({ published: 1 });
    await database.collection("appointments").createIndex({ date: 1, time: 1 }, { unique: true });
    await database.collection("orders").createIndex({ createdAt: -1 });
    await database.collection("availability").createIndex({ day: 1 }, { unique: true });
    if (await database.collection("availability").countDocuments() === 0) {
      await database.collection("availability").insertMany(seedAvailability);
    }
    if (await database.collection("products").countDocuments() === 0) {
      await database.collection("products").insertMany(seedProducts.map((product) => ({
        ...product,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })));
      console.log(`Seeded ${seedProducts.length} products into MongoDB.`);
    }
  } catch (error) {
    await client.close().catch(() => {});
    database = null;
    if (process.env.NODE_ENV === "production") {
      const reason = error?.cause?.code || error?.code || "unknown";
      throw new Error(`MongoDB connection failed after 3 attempts (${reason}). Check Atlas Network Access, Railway egress access, and the complete MONGODB_URI.`);
    }
    console.warn(`MongoDB is unavailable (${error.code || error.message}); using in-memory data for local development.`);
  }
}

function collection(name) {
  if (database) return database.collection(name);
  return null;
}

const memory = {
  products: seedProducts.map((product, index) => ({ ...product, _id: `seed-${index + 1}` })),
  appointments: [],
  orders: [],
  messages: [],
  profiles: [],
  addresses: [],
  documents: []
  ,availability: [
    { day: 1, enabled: true, start: "10:00", end: "17:00" },
    { day: 2, enabled: true, start: "10:00", end: "17:00" },
    { day: 3, enabled: true, start: "10:00", end: "17:00" },
    { day: 4, enabled: true, start: "10:00", end: "17:00" },
    { day: 5, enabled: true, start: "10:00", end: "17:00" },
    { day: 6, enabled: false, start: "10:00", end: "14:00" },
    { day: 0, enabled: false, start: "10:00", end: "14:00" }
  ]
};

function store(name) {
  if (database) {
    const native = collection(name);
    const normalizeFilter = (filter = {}) => {
      if (typeof filter._id === "string" && /^[a-f\d]{24}$/i.test(filter._id)) {
        const { ObjectId } = require("mongodb");
        return { ...filter, _id: new ObjectId(filter._id) };
      }
      return filter;
    };
    return {
      findMany: async (filter = {}) => native.find(normalizeFilter(filter)).sort({ createdAt: -1 }).toArray(),
      insert: async (item) => {
        const result = await native.insertOne(item);
        return { ...item, _id: result.insertedId };
      },
      findOne: async (filter) => native.findOne(normalizeFilter(filter)),
      updateOne: async (filter, update) => {
        const normalized = normalizeFilter(filter);
        await native.updateOne(normalized, { $set: update });
        return native.findOne(normalized);
      }
    };
  }
  return {
    async findMany(filter = {}) {
      return memory[name].filter((item) => Object.entries(filter).every(([key, value]) => item[key] === value));
    },
    async insert(item) {
      const record = { ...item, _id: `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
      memory[name].push(record);
      return record;
    },
    async findOne(filter) {
      return memory[name].find((item) => Object.entries(filter).every(([key, value]) => item[key] === value)) || null;
    },
    async updateOne(filter, update) {
      const item = memory[name].find((entry) => Object.entries(filter).every(([key, value]) => entry[key] === value));
      if (!item) return null;
      Object.assign(item, update);
      return item;
    }
  };
}

module.exports = { connectDatabase, collection, store, memory };
