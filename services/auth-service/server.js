// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");

// const app = express();
// app.use(cors());
// app.use(express.json());

// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("Auth DB connected"))
//   .catch(err => console.log(err));

// // Model
// const User = mongoose.model("User", {
//   email: String,
//   password: String
// });

// // Signup
// app.post("/signup", async (req, res) => {
//   console.log("SIGNUP HIT")
//   const user = await User.create(req.body);
//   console.log("USER CREATED:", user);
//   res.json(user);
// });

// // Login
// const jwt = require("jsonwebtoken");

// app.post("/login", async (req, res) => {
//   console.log("LOGIN HIT");
//   const user = await User.findOne(req.body);
//   console.log("USER FOUND:", user);

//   if (!user) return res.status(401).json({ msg: "Invalid" });

//   const token = jwt.sign({ id: user._id }, "secret");
//   res.json({ token });
// });

// app.listen(4000, () => console.log("Auth Service running on 4000"));


require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGOURI).then(() => console.log("Auth DB connected"));

const User = mongoose.model("User", {
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "customer" }, // "owner" or "customer"
});

app.post("/signup", async (req, res) => {
  const { email, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed, role });
  res.json({ msg: "Signed up", id: user._id });
});

app.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password)))
    return res.status(401).json({ msg: "Invalid credentials" });

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secret");
  res.json({ token, role: user.role });
});

app.listen(4000, () => console.log("Auth Service on 4000"));