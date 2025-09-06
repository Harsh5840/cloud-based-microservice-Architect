const { Kafka } = require('kafkajs');
const { processTask } = require('./taskProcessor');
require('dotenv').config();

// Kafka configuration
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:29092';
const CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'financial-risk-worker';
const CONSUMER_GROUP = process.env.KAFKA_CONSUMER_GROUP || 'risk-analyzer-group';
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'financial-data';

// Create Kafka client
const kafka = new Kafka({
  clientId: CLIENT_ID,
  brokers: KAFKA_BROKERS.split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Create consumer
const consumer = kafka.consumer({ groupId: CONSUMER_GROUP });
let isConnected = false;

/**
 * Connect to Kafka if not already connected
 */
async function ensureConnection() {
  if (!isConnected) {
    try {
      await consumer.connect();
      isConnected = true;
      console.log('Connected to Kafka');
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }
}

/**
 * Start consuming messages from Kafka
 * @param {Object} callbacks - Callback functions for metrics
 */
async function startConsumer(callbacks = {}) {
  try {
    await ensureConnection();
    
    // Subscribe to topic
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
    console.log(`Subscribed to topic: ${KAFKA_TOPIC}`);
    
    // Start consuming
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageValue = JSON.parse(message.value.toString());
          console.log(`Received message from partition ${partition}`);
          
          // Process the message
          const result = await processTask(messageValue);
          
          // Update metrics
          if (callbacks.onProcessed) callbacks.onProcessed();
          if (callbacks.onRiskScoreCalculated && result && result.riskScore !== undefined) {
            callbacks.onRiskScoreCalculated(result.riskScore);
          }
          
          console.log(`Processed message with risk score: ${result?.riskScore}`);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });
    
    console.log('Kafka consumer started successfully');
    return true;
  } catch (error) {
    console.error('Failed to start Kafka consumer:', error);
    throw error;
  }
}

/**
 * Gracefully disconnect from Kafka
 */
async function disconnect() {
  if (isConnected) {
    try {
      await consumer.disconnect();
      isConnected = false;
      console.log('Disconnected from Kafka');
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error);
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down consumer...');
  await disconnect();
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down consumer...');
  await disconnect();
});

module.exports = {
  startConsumer,
  disconnect
};