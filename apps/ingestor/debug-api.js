const axios = require('axios');
require('dotenv').config();

async function debugAlphaVantageAPI() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const baseUrl = 'https://www.alphavantage.co/query';
  
  console.log('🔍 Debugging Alpha Vantage API...');
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NOT SET'}`);
  
  try {
    // Test with a simple symbol
    const symbol = 'AAPL';
    console.log(`\n📊 Testing with symbol: ${symbol}`);
    
    const response = await axios.get(baseUrl, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: apiKey
      },
      timeout: 15000
    });
    
    console.log('\n📋 Full API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check for different possible response formats
    console.log('\n🔍 Response Analysis:');
    console.log('Keys in response:', Object.keys(response.data));
    
    if (response.data['Global Quote']) {
      console.log('✅ Found Global Quote data');
      console.log('Global Quote keys:', Object.keys(response.data['Global Quote']));
    } else {
      console.log('❌ No Global Quote found');
    }
    
    if (response.data['Error Message']) {
      console.log('❌ API Error:', response.data['Error Message']);
    }
    
    if (response.data['Note']) {
      console.log('⚠️ API Note:', response.data['Note']);
    }
    
    if (response.data['Information']) {
      console.log('ℹ️ API Information:', response.data['Information']);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

debugAlphaVantageAPI();