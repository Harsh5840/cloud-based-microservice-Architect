require('dotenv').config();
const { produceMessage } = require('./kafkaProducer');
const axios = require('axios');

// Configuration
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'financial-data';
const DATA_SOURCE_URL = process.env.DATA_SOURCE_URL || 'https://api.example.com/financial-data';
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 60000; // 1 minute default

/**
 * Fetch financial data from API or replay from dataset
 */
async function fetchFinancialData() {
  try {
    console.log('Fetching financial data...');
    const response = await axios.get(DATA_SOURCE_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching financial data:', error.message);
    return null;
  }
}

/**
 * Process and send data to Kafka
 */
async function processAndSendData() {
  const data = await fetchFinancialData();
  
  if (!data) {
    console.log('No data to process. Skipping...');
    return;
  }
  
  // If data is an array, send each item individually
  if (Array.isArray(data)) {
    console.log(`Processing ${data.length} financial records`);
    for (const item of data) {
      await produceMessage(KAFKA_TOPIC, {
        timestamp: new Date().toISOString(),
        data: item,
        source: 'financial-api'
      });
    }
  } else {
    // Send single data point
    await produceMessage(KAFKA_TOPIC, {
      timestamp: new Date().toISOString(),
      data: data,
      source: 'financial-api'
    });
  }
  
  console.log('Data successfully sent to Kafka');
}

/**
 * Main execution loop
 */
async function startIngestor() {
  console.log('Financial Risk Analyzer - Ingestor Service Starting...');
  console.log(`Polling interval: ${POLLING_INTERVAL}ms`);
  
  // Initial run
  await processAndSendData();
  
  // Set up polling interval
  setInterval(processAndSendData, POLLING_INTERVAL);
}

// Start the ingestor
startIngestor().catch(err => {
  console.error('Fatal error in ingestor service:', err);
  process.exit(1);
});