const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.json({ success: true, data: { message: 'Backend is running' } });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy' } });
});

app.get('/api/products', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/products/:slug', (req, res) => {
  res.json({ success: true, data: { slug: req.params.slug } });
});

app.get('/api/categories', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/cart', (req, res) => {
  res.json({ success: true, data: { items: [] } });
});

app.post('/api/cart', (req, res) => {
  res.json({ success: true, data: { message: 'Added to cart' } });
});

app.post('/api/orders', (req, res) => {
  res.json({ success: true, data: { message: 'Order created' } });
});

app.get('/api/profile', (req, res) => {
  res.json({ success: true, data: { message: 'Profile details' } });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
