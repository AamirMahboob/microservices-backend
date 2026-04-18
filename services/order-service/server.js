require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const amqp = require("amqplib");
const authMiddleware = require("./middleware/auth");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Order DB connected"));

const Order = mongoose.model("Order", {
  productId: String,
  quantity: Number
});

// RabbitMQ setup
let channel;
async function connectQueue() {
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();
  await channel.assertQueue("order_queue");
}
connectQueue();

// Create Order
app.post("/",authMiddleware, async (req, res) => {
  const order = await Order.create(req.body);

  // Send event to queue
  channel.sendToQueue(
    "order_queue",
    Buffer.from(JSON.stringify(order))
  );

  res.json(order);
});

app.listen(6000, () => console.log("Order Service running on 6000"));