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
const amqp = require("amqplib");
const axios = require("axios");
const authMiddleware = require("./middleware/auth");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGOURI).then(() => console.log("Payment DB connected"));

const Payment = mongoose.model("Payment", {
  orderId: String,
  amount: Number,
  method: String,       // "cash", "card", "easypaisa", etc.
  status: { type: String, default: "pending" }, // pending → success → failed
  createdAt: { type: Date, default: Date.now },
});

let channel;
async function connectQueue() {
  const conn = await amqp.connect("amqp://localhost");
  channel = await conn.createChannel();
  await channel.assertQueue("order.placed");
  await channel.assertQueue("payment.done");

  // Listen for new orders to process payment
  channel.consume("order.placed", async (msg) => {
    if (!msg) return;
    const order = JSON.parse(msg.content.toString());
    console.log("💳 Order awaiting payment:", order._id);
    channel.ack(msg);
  });
}
connectQueue();

// Customer submits payment
app.post("/pay", authMiddleware, async (req, res) => {
  const { orderId, amount, method } = req.body;

  // Simulate payment gateway (replace with real Easypaisa/JazzCash SDK)
  const success = true; // always succeeds in dev

  const payment = await Payment.create({
    orderId,
    amount,
    method,
    status: success ? "success" : "failed",
  });

  if (success) {
    // Tell order service the order is paid (using internal token)
    await axios.patch(
      `http://localhost:3000/order/${orderId}/paid`,
      {},
      { headers: { Authorization: req.headers.authorization } }
    );
  }

  res.json({ msg: success ? "Payment successful" : "Payment failed", payment });
});

app.get("/history", authMiddleware, async (req, res) => {
  res.json(await Payment.find().sort({ createdAt: -1 }));
});

app.listen(8000, () => console.log("Payment Service on 8000"));