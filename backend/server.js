const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   Static Route
========================= */

app.get("/", (req, res) => {
  res.send("StyleHub Backend Running");
});

app.get("/about", (req, res) => {
  res.send("About StyleHub");
});

app.get("/contact", (req, res) => {
  res.send("Contact Page Loaded Successfully");
});

app.get("/privacy-policy", (req, res) => {
  res.send("Privacy Policy");
});

app.get("/delivery-terms", (req, res) => {
  res.send("Delivery Terms");
});

app.get("/sell", (req, res) => {
  res.send("Sell on StyleHub");
});

/* =========================
   API Route
========================= */

app.get("/api/products", (req, res) => {
  res.json([
    {
      id: 1,
      name: "T-Shirt",
      price: 20,
    },
    {
      id: 2,
      name: "Sneakers",
      price: 50,
    },
  ]);
});

/* =========================
   Dynamic Routes
========================= */

app.get("/api/products/:id", (req, res) => {
  res.json({
    productId: req.params.id,
  });
});

app.get("/api/categories", (req, res) => {
  res.json([]);
});

app.get("/api/cart", (req, res) => {
  res.json({ items: [] });
});

app.get("/api/orders", (req, res) => {
  res.json([]);
});

app.get("/api/profile", (req, res) => {
  res.json({ user: null });
});

app.get("/category/:slug", (req, res) => {
  res.send(`Category: ${req.params.slug}`);
});

app.get("/product/:id", (req, res) => {
  res.send(`Product ID: ${req.params.id}`);
});

/* =========================
   Server
========================= */

const PORT = 8080;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});