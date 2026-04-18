require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authMiddleware = require("./middleware/auth");
const app = express();
app.use(cors());
app.use(express.json());


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Product DB connected"));

const Product = mongoose.model("Product", {
  name: String,
  price: Number
});
app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});

// Get products
app.get("/products",authMiddleware, async (req, res) => {
  const data = await Product.find();
  res.json(data);
});

// Add product
app.post("/products",authMiddleware, async (req, res) => {
  const product = await Product.create(req.body);
  res.json(product);
});

app.listen(5000, () => console.log("Product Service running on 5000"));