require('dotenv').config();
const express = require('express');
const { startConsumer } = require('./kafkaConsumer');
const { initializeDb } = require('./db');
const promClient = require('prom-client');

// Express app setup
const app = express();
const PORT = process.env.PORT || 3001;

// Prometheus metrics setup
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Custom metrics
const processedMessagesCounter = new promClient.Counter({
  name: 'financial_risk_processed_messages_total',
  help: 'Total number of processed financial data messages'
});

const riskScoreHistogram = new promClient.Histogram({
  name: 'financial_risk_score',
  help: 'Distribution of calculated risk scores',
  buckets: [0, 0.2, 0.4, 0.6, 0.8, 1]
});

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Start the server
async function startServer() {
  try {
    // Initialize database connection
    await initializeDb();
    console.log('Database connection established');
    
    // Start Kafka consumer
    await startConsumer({
      onProcessed: () => processedMessagesCounter.inc(),
      onRiskScoreCalculated: (score) => riskScoreHistogram.observe(score)
    });
    console.log('Kafka consumer started');
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`Worker service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start worker service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});

// Start the server
startServer();