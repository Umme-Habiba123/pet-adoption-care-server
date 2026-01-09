const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const app = express();
const port = process.env.port || 5000;

// Middleware--
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jbcozto.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("petAdoptionCareDB"); //database name
    const usersCollection = db.collection("users"); //collection name
    const petsCollection = db.collection("pets");
    const adoptionsCollection = db.collection("adoptions");

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );




    
  } finally {
    // Keep connection open
  }
}
run().catch(console.dir);

// sample route
app.get("/", (req, res) => {
  res.send("Pet Care server is running");
});

// start the server---
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});