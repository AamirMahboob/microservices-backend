// const express = require("express");
// const { createProxyMiddleware } = require("http-proxy-middleware");
// const cors = require("cors");

// const app = express();
// app.use(cors());

// // Auth routes
// app.use("/auth", createProxyMiddleware({
//   target: "http://localhost:4000",
//   changeOrigin: true,
//   pathRewrite: {
//     "^/auth": ""
//   }
// }));

// // Product routes
// app.use("/product", createProxyMiddleware({
//     target: "http://localhost:5000",
//     changeOrigin: true,
//     // pathRewrite: {
//     //   "^/product": ""   // only this line
//     // }
//   }));

//   app.use("/order", createProxyMiddleware({
//     target: "http://localhost:6000",
//     changeOrigin: true,
//     pathRewrite: {
//       "^/order": ""
//     }
//   }));
  
  
//   // 🏬 INVENTORY SERVICE
//   app.use("/inventory", createProxyMiddleware({
//     target: "http://localhost:7000",
//     changeOrigin: true,
//     pathRewrite: {
//       "^/inventory": ""
//     }
//   }));

// app.listen(3000, () => console.log("API Gateway running on 3000"));

const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");

const app = express();
app.use(cors());

const proxy = (target, strip) => createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite: strip ? { [`^${strip}`]: "" } : undefined,
});

app.use("/auth",     proxy("http://localhost:4000", "/auth"));
app.use("/product",  proxy("http://localhost:5000"));
app.use("/order",    proxy("http://localhost:6000", "/order"));
app.use("/inventory",proxy("http://localhost:7000", "/inventory"));
app.use("/payment",  proxy("http://localhost:8000", "/payment"));
app.use("/dispatch", proxy("http://localhost:9000", "/dispatch"));

app.listen(3000, () => console.log("API Gateway on 3000"));