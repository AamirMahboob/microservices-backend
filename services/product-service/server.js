// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const authMiddleware = require("./middleware/auth");
// const app = express();
// app.use(cors());
// app.use(express.json());


// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("Product DB connected"));

// const Product = mongoose.model("Product", {
//   name: String,
//   price: Number
// });
// app.use((req, res, next) => {
//   console.log("Incoming:", req.method, req.url);
//   next();
// });

// // Get products
// app.get("/products",authMiddleware, async (req, res) => {
//   const data = await Product.find();
//   res.json(data);
// });

// // Add product
// app.post("/products",authMiddleware, async (req, res) => {
//   const product = await Product.create(req.body);
//   res.json(product);
// });

// app.listen(5000, () => console.log("Product Service running on 5000"));


require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("./middleware/auth");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGOURI).then(() => console.log("Product DB connected"));

const Product = mongoose.model("Product", {
  name: String,
  price: Number,
  description: String,
});

// Supplier Order (owner restocks warehouse)
const SupplierOrder = mongoose.model("SupplierOrder", {
  productId: String,
  quantity: Number,
  pricePerUnit: Number,
  supplierName: String,
  status: { type: String, default: "received" }, // received → stored
  createdAt: { type: Date, default: Date.now },
});

// --- Products ---
app.get("/products", async (req, res) => {
  res.json(await Product.find());
});

app.post("/products", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner") return res.status(403).json({ msg: "Owners only" });
  res.json(await Product.create(req.body));
});

// --- Supplier Orders (owner orders stock FROM supplier) ---
app.post("/supplier-orders", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner") return res.status(403).json({ msg: "Owners only" });
  const order = await SupplierOrder.create(req.body);

  // After storing, notify inventory via HTTP (or you can use RabbitMQ)
  const axios = require("axios");
  await axios.post("http://localhost:7000/", {
    productId: req.body.productId,
    quantity: req.body.quantity,
    operation: "add",
  }, { headers: { Authorization: req.headers.authorization } }).catch(() => {});

  res.json(order);
});

app.get("/supplier-orders", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner") return res.status(403).json({ msg: "Owners only" });
  res.json(await SupplierOrder.find().sort({ createdAt: -1 }));
});

app.listen(5000, () => console.log("Product Service on 5000"));