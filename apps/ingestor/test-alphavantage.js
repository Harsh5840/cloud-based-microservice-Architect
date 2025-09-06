#!/usr/bin/env node

/**
 * Test script for Alpha Vantage integration
 * Usage: node test-alphavantage.js [API_KEY]
 */

require('dotenv').config();
const AlphaVantageClient = require('./alphaVantageClient');

async function testAlphaVantage() {
  const apiKey = process.argv[2] || process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key provided');
    console.log('Usage: node test-alphavantage.js YOUR_API_KEY');
    console.log('Or set ALPHA_VANTAGE_API_KEY in your .env file');
    return;
  }

  console.log('🧪 Testing Alpha Vantage Integration...\n');
  
  const client = new AlphaVantageClient(apiKey);
  
  try {
    // Test 1: Single quote
    console.log('📊 Test 1: Fetching AAPL quote...');
    const appleQuote = await client.getQuote('AAPL');
    console.log('✅ Success!');
    console.log(`   Symbol: ${appleQuote.symbol}`);
    console.log(`   Price: $${appleQuote.price}`);
    console.log(`   Change: ${appleQuote.price_change_percent}%`);
    console.log(`   Sentiment: ${appleQuote.market_sentiment}`);
    console.log(`   Volatility: ${appleQuote.volatility.toFixed(2)}`);
    console.log();

    // Test 2: Multiple quotes
    console.log('📈 Test 2: Fetching multiple quotes...');
    const symbols = ['MSFT', 'GOOGL'];
    const quotes = await client.getMultipleQuotes(symbols);
    console.log(`✅ Fetched ${quotes.length} quotes successfully!`);
    
    quotes.forEach(quote => {
      console.log(`   ${quote.symbol}: $${quote.price} (${quote.price_change_percent > 0 ? '+' : ''}${quote.price_change_percent}%)`);
    });
    console.log();

    // Test 3: Intraday data
    console.log('⏰ Test 3: Fetching intraday data...');
    const intradayData = await client.getIntradayData('AAPL');
    console.log(`✅ Fetched ${intradayData.length} intraday data points!`);
    
    if (intradayData.length > 0) {
      const latest = intradayData[0];
      console.log(`   Latest: ${latest.timestamp}`);
      console.log(`   Price: $${latest.price}`);
      console.log(`   Volume: ${latest.volume.toLocaleString()}`);
    }
    console.log();

    console.log('🎉 All tests passed! Alpha Vantage integration is working correctly.');
    console.log('\n💡 Next steps:');
    console.log('   1. Update your .env file with the API key');
    console.log('   2. Set USE_DEMO_MODE=false');
    console.log('   3. Start the ingestor: npm start');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if your API key is valid');
    console.log('   2. Verify your internet connection');
    console.log('   3. Make sure you haven\'t exceeded daily limits (500 calls/day)');
    console.log('   4. Try again in a few minutes if you hit rate limits');
  }
}

// Run the test
testAlphaVantage();