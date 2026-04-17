const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");

const app = express();
app.use(cors());

// Auth routes
app.use("/auth", createProxyMiddleware({
  target: "http://localhost:4000",
  changeOrigin: true,
  pathRewrite: {
    "^/auth": ""
  }
}));

// Product routes
app.use("/product", createProxyMiddleware({
  target: "http://localhost:5000",
  changeOrigin: true,
  pathRewrite: {
    "^/product": ""
  }
}));

app.listen(3000, () => console.log("API Gateway running on 3000"));