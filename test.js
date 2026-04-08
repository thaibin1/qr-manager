import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://v_qr_user:QrManager2026!@cluster0.susnio6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db("test");
    const result = await db.command({ ping: 1 });
    console.log("Ping:", result);
  } catch (err) {
    console.error("Connection error:", err);
  } finally {
    await client.close();
  }
}

run();
