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
const authMiddleware = require("./middleware/auth");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGOURI).then(() => console.log("Dispatch DB connected"));

const Dispatch = mongoose.model("Dispatch", {
  orderId: String,
  productId: String,
  quantity: Number,
  userId: String,
  status: { type: String, default: "ready" }, // ready → dispatched → delivered
  dispatchedAt: Date,
});

async function consumeQueue() {
  const conn = await amqp.connect("amqp://localhost");
  const channel = await conn.createChannel();
  await channel.assertQueue("order.paid");

  channel.consume("order.paid", async (msg) => {
    if (!msg) return;
    try {
      const order = JSON.parse(msg.content.toString());
      const dispatch = await Dispatch.create({
        orderId: order._id,
        productId: order.productId,
        quantity: order.quantity,
        userId: order.userId,
        status: "ready",
      });
      console.log("📦 Dispatch record created for order", order._id);
      channel.ack(msg);
    } catch (err) {
      console.error("Dispatch error:", err);
      channel.nack(msg, false, false);
    }
  });
}
consumeQueue();

// Owner marks an item as dispatched
app.patch("/:id/dispatch", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner") return res.status(403).json({ msg: "Owners only" });
  const d = await Dispatch.findByIdAndUpdate(
    req.params.id,
    { status: "dispatched", dispatchedAt: new Date() },
    { new: true }
  );
  res.json(d);
});

// List all dispatches (owner)
app.get("/", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner") return res.status(403).json({ msg: "Owners only" });
  res.json(await Dispatch.find().sort({ dispatchedAt: -1 }));
});

app.listen(9000, () => console.log("Dispatch Service on 9000"));