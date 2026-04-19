// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const amqp = require("amqplib");
// const authMiddleware = require("./middleware/auth");

// const app = express();
// app.use(express.json());

// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("Order DB connected"));

// const Order = mongoose.model("Order", {
//   productId: String,
//   quantity: Number
// });

// // RabbitMQ setup
// let channel;
// async function connectQueue() {
//   const connection = await amqp.connect("amqp://localhost");
//   channel = await connection.createChannel();
//   await channel.assertQueue("order_queue");
// }
// connectQueue();

// // Create Order
// app.post("/",authMiddleware, async (req, res) => {
//   const order = await Order.create(req.body);

//   // Send event to queue
//   channel.sendToQueue(
//     "order_queue",
//     Buffer.from(JSON.stringify(order))
//   );

//   res.json(order);
// });

// app.listen(6000, () => console.log("Order Service running on 6000"));

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const amqp = require("amqplib");
const authMiddleware = require("./middleware/auth");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGOURI).then(() => console.log("Order DB connected"));

const Order = mongoose.model("Order", {
  productId: String,
  quantity: Number,
  userId: String,
  status: { type: String, default: "pending" }, // pending → paid → dispatched
  totalAmount: Number,
  createdAt: { type: Date, default: Date.now },
});

let channel;
async function connectQueue() {
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();
  await channel.assertQueue("order.paid");       // payment confirmed → deduct stock + dispatch
  await channel.assertQueue("order.placed");     // placed → payment service picks up
}
connectQueue();

// Place order (customer)
app.post("/", authMiddleware, async (req, res) => {
  const { productId, quantity, pricePerUnit } = req.body;
  const totalAmount = quantity * pricePerUnit;

  const order = await Order.create({
    productId,
    quantity,
    userId: req.user.id,
    totalAmount,
    status: "pending",
  });

  // Notify payment service via queue
  channel.sendToQueue("order.placed", Buffer.from(JSON.stringify(order)));

  res.json({ msg: "Order placed, awaiting payment", order });
});

// Get customer's own orders
app.get("/my", authMiddleware, async (req, res) => {
  res.json(await Order.find({ userId: req.user.id }).sort({ createdAt: -1 }));
});

// Owner sees all orders
app.get("/all", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner") return res.status(403).json({ msg: "Owners only" });
  res.json(await Order.find().sort({ createdAt: -1 }));
});

// Payment service calls this to mark order paid
app.patch("/:id/paid", authMiddleware, async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: "paid" }, { new: true });

  // Push to inventory + dispatch queue
  channel.sendToQueue("order.paid", Buffer.from(JSON.stringify(order)));

  res.json(order);
});

app.listen(6000, () => console.log("Order Service on 6000"));