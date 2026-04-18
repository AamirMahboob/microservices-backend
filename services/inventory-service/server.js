require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const amqp = require("amqplib");
const authMiddleware = require("./middleware/auth");

const app = express();
app.use(express.json());

// DB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Inventory DB connected"))
  .catch(err => console.log(err));

// Model
const Inventory = mongoose.model("Inventory", {
  productId: String,
  quantity: Number,
});


// =======================
// RabbitMQ Consumer
// =======================
async function consumeQueue() {
  try {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();

    await channel.assertQueue("order_queue");

    console.log("Waiting for messages...");

    channel.consume("order_queue", async (msg) => {
      if (!msg) return;

      try {
        const order = JSON.parse(msg.content.toString());

        console.log("📦 Received Order:", order);

        await Inventory.findOneAndUpdate(
          { productId: order.productId },
          { $inc: { quantity: -order.quantity } },
          { new: true }
        );

        console.log("✅ Stock updated");

        channel.ack(msg);
      } catch (err) {
        console.error("❌ Error processing message:", err);
        channel.nack(msg, false, false); // reject bad message
      }
    });

  } catch (err) {
    console.error("RabbitMQ connection error:", err);
  }
}

consumeQueue();


// =======================
// REST APIs
// =======================

// Add stock manually
app.post("/", authMiddleware, async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check stock
app.get("/", authMiddleware, async (req, res) => {
  try {
    const data = await Inventory.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Start server
app.listen(7000, () =>
  console.log("Inventory Service running on 7000")
);