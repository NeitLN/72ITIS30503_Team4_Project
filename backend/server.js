const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load root .env
const { isSupabaseConfigured } = require('./lib/supabase');
const { success, error } = require('./utils/apiResponse');

const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const brandRoutes = require('./routes/brands');
const cartRoutes = require('./routes/cart');
const profileRoutes = require('./routes/profile');
const sellerRoutes = require('./routes/sellers');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const sellerListingRoutes = require('./routes/sellerListings');
const sellerOrderRoutes = require('./routes/sellerOrders');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  return success(res, { message: 'StyleHub Backend is running' });
});

app.get('/api/health', (req, res) => {
  return success(res, {
    service: 'StyleHub API',
    status: 'ok',
    databaseConfigured: isSupabaseConfigured()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/seller/listings', sellerListingRoutes);
app.use('/api/seller/orders', sellerOrderRoutes);

// 404 Handler
app.use((req, res) => {
  return error(res, 404, 'Route not found');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  return error(res, 500, 'Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
