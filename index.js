// server/index.js
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/pets";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    mimetype && extname ? cb(null, true) : cb(new Error("Only image files are allowed"));
  },
});

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jbcozto.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

let petsCollection;
let adoptionsCollection;

async function run() {
  try {
    await client.connect();
    const db = client.db("petAdoptionCareDB");
    petsCollection = db.collection("pets");
    adoptionsCollection = db.collection("adoptions");

    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

// POST: Submit pet for adoption
app.post("/api/pets", upload.array("images", 5), async (req, res) => {
  try {
    const petData = req.body;
    const files = req.files;
    if (!files || files.length === 0)
      return res.status(400).json({ success: false, message: "At least one image is required" });

    const imagePaths = files.map((file) => `/uploads/pets/${file.filename}`);

    const newPet = {
      ...petData,
      images: imagePaths,
      status: "pending",
      createdAt: new Date(),
      age: parseInt(petData.age) || 0,
      vaccinated: petData.vaccinated === "true" || petData.vaccinated === true,
      neutered: petData.neutered === "true" || petData.neutered === true,
    };

    const result = await petsCollection.insertOne(newPet);
    res.status(201).json({ success: true, message: "Pet submitted for approval", insertedId: result.insertedId, images: imagePaths });
  } catch (err) {
    console.error("Error submitting pet:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET: Browse available pets
app.get("/api/pets", async (req, res) => {
  try {
    const { status, type, location } = req.query;
    let filter = {};
    if (!status) filter.status = "available";
    else filter.status = status;
    if (type) filter.petType = type;
    if (location) filter.location = { $regex: location, $options: "i" };

    const pets = await petsCollection.find(filter).sort({ createdAt: -1 }).toArray();
    res.json(pets);
  } catch (err) {
    console.error("Error fetching pets:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET: single pet by ID
app.get("/api/pets/:id", async (req, res) => {
  try {
    const pet = await petsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!pet) return res.status(404).json({ message: "Pet not found" });
    res.json(pet);
  } catch (err) {
    console.error("Error fetching pet:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PATCH: update pet status
app.patch("/api/pets/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const result = await petsCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { status } },
      { returnDocument: "after" }
    );
    if (!result.value) return res.status(404).json({ message: "Pet not found" });
    res.json(result.value);
  } catch (err) {
    console.error("Error updating pet status:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/api/adoption-pets", async (req, res) => {
  try {
    const status = req.query.status || "available";
    const pets = await petsCollection.find({ status }).toArray();
    res.json(pets);
  } catch (err) {
    console.error("Error fetching adoption pets:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});




// POST: submit new adoption
app.post("/api/adoptions", async (req, res) => {
  try {
    const adoptionData = { ...req.body, status: "pending", createdAt: new Date() };
    const result = await adoptionsCollection.insertOne(adoptionData);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error("Error submitting adoption:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// Start server after connecting MongoDB
run().then(() => {
  app.listen(port, () => console.log(`Pet Server running on port ${port}`));
});
