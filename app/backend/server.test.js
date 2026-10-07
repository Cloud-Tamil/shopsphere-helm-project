/**
 * ShopSphere Backend Automated Test Suite
 * Compatible with Node.js built-in test runner (`node --test`)
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('./server');

let server;
let baseUrl;

// Start test server before running assertions
test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

// Teardown test server
test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// Helper for making HTTP requests in tests
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(body); } catch (e) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// ==========================================
// TEST SUITE
// ==========================================

test('ShopSphere Health Probes', async (t) => {
  await t.test('GET /healthz should return 200 OK for Kubernetes Liveness probe', async () => {
    const res = await request('/healthz');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'OK');
    assert.strictEqual(typeof res.body.uptime, 'number');
  });

  await t.test('GET /readyz should return 200 READY for Kubernetes Readiness probe', async () => {
    const res = await request('/readyz');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'READY');
    assert.strictEqual(res.body.ready, true);
  });

  await t.test('GET /api/health should return full service diagnostics', async () => {
    const res = await request('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.ok(res.body.version);
    assert.ok(res.body.database.connected);
  });
});

test('ShopSphere ConfigMap & Environment', async (t) => {
  await t.test('GET /api/config exposes active cluster settings', async () => {
    const res = await request('/api/config');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.environment);
    const expectedCurrency = process.env.DEFAULT_CURRENCY || 'USD';
    assert.strictEqual(res.body.currency, expectedCurrency);
    assert.ok(res.body.endpoints.products);
  });
});

test('ShopSphere Product Catalog Microservice', async (t) => {
  await t.test('GET /api/products returns array of catalog items', async () => {
    const res = await request('/api/products');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
    const item = res.body[0];
    assert.ok(item.id);
    assert.ok(item.name);
    assert.ok(item.price);
  });

  await t.test('GET /api/products with category filter works', async () => {
    const res = await request('/api/products?category=cloud');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    res.body.forEach(item => {
      assert.strictEqual(item.category, 'cloud');
    });
  });

  await t.test('GET /api/products/:id returns specific product', async () => {
    const res = await request('/api/products/1');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, 1);
  });

  await t.test('GET /api/products/999 returns 404 for missing item', async () => {
    const res = await request('/api/products/999');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.code, 'PRODUCT_NOT_FOUND');
  });
});

test('ShopSphere Order & Checkout Engine', async (t) => {
  await t.test('POST /api/orders rejects empty order', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      body: { items: [] }
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('POST /api/orders creates valid order with totals', async () => {
    const res = await request('/api/orders', {
      method: 'POST',
      body: {
        customer: 'test-qa@shopsphere.io',
        items: [
          { id: 1, qty: 2 } // 59.99 * 2 = 119.98
        ]
      }
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.orderId.startsWith('ORD-'));
    assert.strictEqual(res.body.order.items.length, 1);
    assert.strictEqual(res.body.order.subtotal, 119.98);
  });
});
