require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Auth DB connected"))
  .catch(err => console.log(err));

// Model
const User = mongoose.model("User", {
  email: String,
  password: String
});

// Signup
app.post("/signup", async (req, res) => {
  console.log("SIGNUP HIT")
  const user = await User.create(req.body);
  console.log("USER CREATED:", user);
  res.json(user);
});

// Login
const jwt = require("jsonwebtoken");

app.post("/login", async (req, res) => {
  console.log("LOGIN HIT");
  const user = await User.findOne(req.body);
  console.log("USER FOUND:", user);

  if (!user) return res.status(401).json({ msg: "Invalid" });

  const token = jwt.sign({ id: user._id }, "secret");
  res.json({ token });
});

app.listen(4000, () => console.log("Auth Service running on 4000"));