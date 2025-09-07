require('dotenv').config();
const { produceMessage } = require('./kafkaProducer');
const AlphaVantageClient = require('./alphaVantageClient');
const cron = require('node-cron');

// Configuration
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'financial-data';
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 300000; // 5 minutes default for real data
const USE_DEMO_MODE = process.env.USE_DEMO_MODE === 'true';

// Stock symbols to track
const SYMBOLS = (process.env.SYMBOLS || 'AAPL,MSFT,GOOGL,AMZN,TSLA').split(',');

// Initialize Alpha Vantage client
let alphaVantageClient = null;
if (ALPHA_VANTAGE_API_KEY && !USE_DEMO_MODE) {
  alphaVantageClient = new AlphaVantageClient(ALPHA_VANTAGE_API_KEY);
}

/**
 * Fetch financial data from Alpha Vantage or generate demo data
 */
async function fetchFinancialData() {
  try {
    if (USE_DEMO_MODE || !alphaVantageClient) {
      console.log('Generating demo financial data...');
      return generateDemoData();
    }
    
    console.log(`Fetching real financial data for symbols: ${SYMBOLS.join(', ')}`);
    const data = await alphaVantageClient.getMultipleQuotes(SYMBOLS);
    return data;
  } catch (error) {
    console.error('Error fetching financial data:', error.message);
    
    if (error.message.includes('API Limit')) {
      console.log('⚠️ Alpha Vantage API rate limit exceeded. Using demo data instead.');
      console.log('💡 Consider upgrading to a premium Alpha Vantage plan for unlimited requests.');
    } else {
      console.log('🔄 Falling back to demo data due to API error...');
    }
    
    return generateDemoData();
  }
}

/**
 * Generate demo financial data for testing
 */
function generateDemoData() {
  const demoSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'JPM', 'JNJ'];
  
  // Realistic price ranges for each stock (approximate)
  const priceRanges = {
    'AAPL': [170, 200],
    'MSFT': [350, 420],
    'GOOGL': [130, 170],
    'AMZN': [140, 180],
    'TSLA': [200, 300],
    'NVDA': [800, 1200],
    'META': [450, 550],
    'NFLX': [400, 600],
    'JPM': [140, 180],
    'JNJ': [150, 170]
  };
  
  return demoSymbols.map(symbol => {
    const [minPrice, maxPrice] = priceRanges[symbol] || [100, 200];
    const basePrice = Math.random() * (maxPrice - minPrice) + minPrice;
    const changePercent = (Math.random() - 0.5) * 8; // -4% to +4% change
    const volume = Math.floor(Math.random() * 50000000) + 5000000; // 5M to 55M volume
    
    return {
      id: `${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: symbol,
      timestamp: new Date().toISOString(),
      price: basePrice,
      open: basePrice * (1 + (Math.random() - 0.5) * 0.02),
      high: basePrice * (1 + Math.random() * 0.03),
      low: basePrice * (1 - Math.random() * 0.03),
      close: basePrice,
      volume: volume,
      price_change_percent: changePercent,
      volatility: Math.random() * 50 + 10, // 10-60 volatility
      market_sentiment: determineSentiment(changePercent)
    };
  });
}

/**
 * Determine market sentiment based on price change
 */
function determineSentiment(changePercent) {
  if (changePercent > 3) return 'very_bullish';
  if (changePercent > 1) return 'bullish';
  if (changePercent > -1) return 'neutral';
  if (changePercent > -3) return 'bearish';
  return 'very_bearish';
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
  
  if (USE_DEMO_MODE || !ALPHA_VANTAGE_API_KEY) {
    console.log('🔧 Running in DEMO MODE - generating synthetic data');
    console.log(`Polling interval: ${POLLING_INTERVAL}ms`);
  } else {
    console.log('📈 Running with REAL Alpha Vantage data');
    console.log(`Tracking symbols: ${SYMBOLS.join(', ')}`);
    console.log(`Polling interval: ${POLLING_INTERVAL}ms`);
  }
  
  // Initial run
  await processAndSendData();
  
  // Set up polling interval
  setInterval(processAndSendData, POLLING_INTERVAL);
  
  // Also set up a cron job for market hours (9:30 AM - 4:00 PM EST, Mon-Fri)
  // This runs every 5 minutes during market hours
  cron.schedule('*/5 9-16 * * 1-5', async () => {
    console.log('📊 Market hours data collection triggered');
    await processAndSendData();
  }, {
    timezone: "America/New_York"
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down ingestor service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down ingestor service...');
  process.exit(0);
});

// Start the ingestor
startIngestor().catch(err => {
  console.error('Fatal error in ingestor service:', err);
  process.exit(1);
});