const { Kafka } = require('kafkajs');
require('dotenv').config();

// Kafka configuration
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:9092';
const CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'financial-risk-ingestor';

// Create Kafka client
const kafka = new Kafka({
  clientId: CLIENT_ID,
  brokers: KAFKA_BROKERS.split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Create producer
const producer = kafka.producer();
let isConnected = false;

/**
 * Connect to Kafka if not already connected
 */
async function ensureConnection() {
  if (!isConnected) {
    try {
      await producer.connect();
      isConnected = true;
      console.log('Connected to Kafka');
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }
}

/**
 * Produce a message to a Kafka topic
 * @param {string} topic - Kafka topic
 * @param {object} message - Message to send
 */
async function produceMessage(topic, message) {
  try {
    await ensureConnection();
    
    // Add message metadata
    const messageWithMetadata = {
      ...message,
      producer_timestamp: Date.now()
    };
    
    // Send to Kafka
    await producer.send({
      topic,
      messages: [
        { value: JSON.stringify(messageWithMetadata) }
      ],
    });
    
    return true;
  } catch (error) {
    console.error(`Error producing message to ${topic}:`, error);
    throw error;
  }
}

/**
 * Gracefully disconnect from Kafka
 */
async function disconnect() {
  if (isConnected) {
    try {
      await producer.disconnect();
      isConnected = false;
      console.log('Disconnected from Kafka');
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error);
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down producer...');
  await disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down producer...');
  await disconnect();
  process.exit(0);
});

module.exports = {
  produceMessage,
  disconnect
};