require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cron = require('node-cron');

const KafkaService = require('./services/kafkaService');
const AIAnalysisEngine = require('./services/aiAnalysisEngine');
const ModelManager = require('./services/modelManager');
const MetricsCollector = require('./services/metricsCollector');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Services
let kafkaService;
let aiEngine;
let modelManager;
let metricsCollector;

/**
 * Initialize all services
 */
async function initializeServices() {
  try {
    logger.info('Initializing AI Analysis Engine services...');
    
    // Initialize Kafka service
    kafkaService = new KafkaService({
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      clientId: process.env.KAFKA_CLIENT_ID || 'ai-analysis-engine',
      groupId: process.env.KAFKA_GROUP_ID || 'ai-analysis-group'
    });
    
    // Initialize model manager
    modelManager = new ModelManager();
    await modelManager.initialize();
    
    // Initialize metrics collector
    metricsCollector = new MetricsCollector();
    
    // Initialize AI engine
    aiEngine = new AIAnalysisEngine(modelManager, metricsCollector);
    await aiEngine.initialize();
    
    // Connect to Kafka
    await kafkaService.connect();
    
    // Set up message processing
    await kafkaService.subscribe(
      process.env.KAFKA_INPUT_TOPIC || 'threat-intelligence',
      async (message) => {
        try {
          const analysis = await aiEngine.analyzeMessage(message);
          if (analysis) {
            await kafkaService.produce(
              process.env.KAFKA_OUTPUT_TOPIC || 'threat-analysis',
              analysis
            );
          }
        } catch (error) {
          logger.error('Error processing message:', error);
          metricsCollector.recordError('message_processing', error);
        }
      }
    );
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      kafka: kafkaService?.isConnected() || false,
      aiEngine: aiEngine?.isReady() || false,
      modelManager: modelManager?.isReady() || false
    },
    models: modelManager?.getModelStatus() || {},
    metrics: metricsCollector?.getHealthMetrics() || {}
  };
  
  const isHealthy = Object.values(health.services).every(status => status);
  res.status(isHealthy ? 200 : 503).json(health);
});

/**
 * Get model performance metrics
 */
app.get('/metrics', (req, res) => {
  try {
    const metrics = {
      performance: metricsCollector.getPerformanceMetrics(),
      models: modelManager.getModelMetrics(),
      system: metricsCollector.getSystemMetrics()
    };
    res.json(metrics);
  } catch (error) {
    logger.error('Error retrieving metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

/**
 * Analyze threat data endpoint
 */
app.post('/analyze', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'No data provided for analysis' });
    }
    
    const analysis = await aiEngine.analyzeData(data);
    res.json(analysis);
  } catch (error) {
    logger.error('Error in analysis endpoint:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

/**
 * Retrain models endpoint
 */
app.post('/retrain', async (req, res) => {
  try {
    const { modelType } = req.body;
    
    logger.info(`Manual retrain requested for model: ${modelType || 'all'}`);
    const result = await modelManager.retrainModels(modelType);
    
    res.json({
      success: true,
      message: 'Model retraining initiated',
      result
    });
  } catch (error) {
    logger.error('Error in retrain endpoint:', error);
    res.status(500).json({ error: 'Retrain failed' });
  }
});

/**
 * Get model information
 */
app.get('/models', (req, res) => {
  try {
    const models = modelManager.getModelInfo();
    res.json(models);
  } catch (error) {
    logger.error('Error retrieving model info:', error);
    res.status(500).json({ error: 'Failed to retrieve model information' });
  }
});

/**
 * Set up scheduled tasks
 */
function setupScheduledTasks() {
  // Model performance evaluation (every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running scheduled model performance evaluation');
      await modelManager.evaluateModelPerformance();
    } catch (error) {
      logger.error('Error in scheduled model evaluation:', error);
    }
  });
  
  // Model retraining check (every 6 hours)
  cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('Checking if model retraining is needed');
      await modelManager.checkRetrainingNeeded();
    } catch (error) {
      logger.error('Error in scheduled retraining check:', error);
    }
  });
  
  // Metrics cleanup (daily at 2 AM)
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Running scheduled metrics cleanup');
      await metricsCollector.cleanupOldMetrics();
    } catch (error) {
      logger.error('Error in scheduled metrics cleanup:', error);
    }
  });
  
  logger.info('Scheduled tasks configured');
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    if (kafkaService) {
      await kafkaService.disconnect();
    }
    
    if (modelManager) {
      await modelManager.shutdown();
    }
    
    if (metricsCollector) {
      await metricsCollector.flush();
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Start the server
 */
async function startServer() {
  try {
    await initializeServices();
    setupScheduledTasks();
    
    app.listen(PORT, () => {
      logger.info(`AI Analysis Engine server running on port ${PORT}`);
      logger.info('Services ready for threat analysis');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();