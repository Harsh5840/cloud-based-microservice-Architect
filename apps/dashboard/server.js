require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const promClient = require('prom-client');
const tradesRoutes = require('./routes/trades');

// Express app setup
const app = express();
const PORT = process.env.PORT || 3000;

// Prometheus metrics setup
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['route', 'method', 'status'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
});

// Middleware
app.use(cors());
app.use(express.json());

// Request duration middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.route?.path || req.path, req.method, res.statusCode)
      .observe(duration);
  });
  next();
});

// API routes
app.use('/api/trades', tradesRoutes);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Dashboard service running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});