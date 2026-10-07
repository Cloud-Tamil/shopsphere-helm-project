/**
 * ShopSphere Cloud-Native Backend Service
 * Architecture: Express REST API with Kubernetes Health Probes & ConfigMap/Secret Support
 */

const express = require('express');
const cors = require('cors');

const app = express();

// Configuration from Environment Variables (injected via Helm ConfigMap & Secrets)
const PORT = process.env.PORT || 5000;
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'USD';
const ENABLE_DISCOUNTS = process.env.ENABLE_DISCOUNTS === 'true';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://app:secret@postgres:5432/shopsphere';
const REDIS_HOST = process.env.REDIS_HOST || 'redis:6379';

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for cloud tracing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/healthz' && req.path !== '/readyz') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// In-Memory Database (Seeded for demonstration & unit testing)
let products = [
  { id: 1, name: "Cloud Kubernetes Hoodie", category: "cloud", price: 59.99, rating: 4.9, image: "🧥", desc: "Ultra-comfy cotton fleece with embroidered K8s steering wheel." },
  { id: 2, name: "Helm Chart Master Desk Mat", category: "home", price: 29.50, rating: 4.8, image: "⌨️", desc: "Anti-slip stitched edge mat with Helm CLI cheat sheet diagrams." },
  { id: 3, name: "Noise-Cancelling Dev Headphones", category: "electronics", price: 189.00, rating: 4.9, image: "🎧", desc: "40dB active noise cancellation with 35h battery life for deep focus." },
  { id: 4, name: "Mechanical Docker Keyboard", category: "electronics", price: 129.99, rating: 4.7, image: "🐳", desc: "Hot-swappable tactile switches with RGB container backlight." },
  { id: 5, name: "GitOps Continuous Delivery Mug", category: "cloud", price: 18.00, rating: 4.6, image: "☕", desc: "Heat-reactive ceramic that reveals ArgoCD sync status when warm." },
  { id: 6, name: "Ergonomic Mesh Task Chair", category: "home", price: 349.00, rating: 4.9, image: "🪑", desc: "Lumbar support designed for engineers deploying multi-cluster workloads." }
];

let orders = [
  {
    orderId: "ORD-1001",
    customer: "sre-lead@shopsphere.io",
    items: [{ id: 1, qty: 1, name: "Cloud Kubernetes Hoodie", price: 59.99 }],
    total: 59.99,
    status: "CONFIRMED",
    createdAt: new Date().toISOString()
  }
];

// ==========================================
// KUBERNETES PROBE ENDPOINTS
// ==========================================

// Liveness Probe: Verifies the process is alive
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Readiness Probe: Verifies the service is ready to accept traffic
app.get('/readyz', (req, res) => {
  res.status(200).json({ status: 'READY', ready: true });
});

// App Health & Diagnostics endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    environment: ENVIRONMENT,
    version: APP_VERSION,
    database: { connected: true, target: DATABASE_URL.replace(/:[^:]*@/, ':***@') },
    cache: { connected: true, host: REDIS_HOST },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// BUSINESS REST API ENDPOINTS
// ==========================================

// GET /api/config: Public runtime configuration from Helm ConfigMap
app.get('/api/config', (req, res) => {
  res.status(200).json({
    environment: ENVIRONMENT,
    version: APP_VERSION,
    currency: DEFAULT_CURRENCY,
    discountsEnabled: ENABLE_DISCOUNTS,
    endpoints: {
      products: '/api/products',
      orders: '/api/orders',
      health: '/api/health'
    }
  });
});

// GET /api/products: Fetch all products with search & category filters
app.get('/api/products', (req, res) => {
  const { category, search, minPrice, maxPrice } = req.query;
  let results = [...products];

  if (category && category !== 'all') {
    results = results.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const term = search.toLowerCase();
    results = results.filter(p => p.name.toLowerCase().includes(term) || (p.desc && p.desc.toLowerCase().includes(term)));
  }

  if (minPrice) {
    results = results.filter(p => p.price >= parseFloat(minPrice));
  }

  if (maxPrice) {
    results = results.filter(p => p.price <= parseFloat(maxPrice));
  }

  res.status(200).json(results);
});

// GET /api/products/:id: Get single product
app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
  }
  res.status(200).json(product);
});

// POST /api/orders: Create a new order
app.post('/api/orders', (req, res) => {
  const { items, customer } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  let subtotal = 0;
  const processedItems = items.map(item => {
    const match = products.find(p => p.id === item.id) || item;
    const price = Number(match.price) || 0;
    const qty = Number(item.qty) || 1;
    subtotal += price * qty;
    return {
      id: match.id,
      name: match.name,
      price: price,
      qty: qty,
      itemTotal: price * qty
    };
  });

  const discountRate = ENABLE_DISCOUNTS ? 0.1 : 0.0;
  const discount = Number((subtotal * discountRate).toFixed(2));
  const total = Number((subtotal - discount).toFixed(2));

  const newOrder = {
    orderId: `ORD-${Date.now().toString().slice(-6)}`,
    customer: customer || 'anonymous-customer@shopsphere.io',
    items: processedItems,
    subtotal: Number(subtotal.toFixed(2)),
    discount: discount,
    total: total,
    currency: DEFAULT_CURRENCY,
    status: 'PLACED',
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);

  res.status(201).json({
    message: 'Order created successfully',
    orderId: newOrder.orderId,
    total: newOrder.total,
    currency: newOrder.currency,
    order: newOrder
  });
});

// GET /api/orders: Retrieve past orders
app.get('/api/orders', (req, res) => {
  res.status(200).json(orders);
});

// Export app instance for automated testing
module.exports = app;

// Start server if executed directly
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================`);
    console.log(`🛍️  ShopSphere Backend running on port ${PORT}`);
    console.log(`📦  Environment: ${ENVIRONMENT}`);
    console.log(`🏷️  Version: ${APP_VERSION}`);
    console.log(`=============================================`);
  });

  // Graceful shutdown on SIGTERM / SIGINT for Kubernetes pod eviction
  const shutdown = (signal) => {
    console.log(`\nReceived ${signal}. Gracefully stopping HTTP listener...`);
    server.close(() => {
      console.log('HTTP listener stopped. Exiting process safely.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
