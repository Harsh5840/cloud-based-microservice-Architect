require('dotenv').config();
const ThreatIntelClient = require('./threatIntelClient');

// Test configuration
const testConfig = {
  virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY,
  mispUrl: process.env.MISP_URL,
  mispApiKey: process.env.MISP_API_KEY,
  taxiiUrl: process.env.TAXII_URL,
  taxiiUsername: process.env.TAXII_USERNAME,
  taxiiPassword: process.env.TAXII_PASSWORD,
  jsonFeeds: [
    {
      name: 'Test Feed',
      url: 'https://example.com/test-feed.json'
    }
  ]
};

async function testThreatIntelClient() {
  console.log('🧪 Testing Threat Intelligence Client...\n');
  
  const client = new ThreatIntelClient(testConfig);
  
  // Test validation functions
  console.log('Testing validation functions:');
  console.log('✓ Valid IP (192.168.1.1):', client.isValidIP('192.168.1.1'));
  console.log('✗ Invalid IP (999.999.999.999):', client.isValidIP('999.999.999.999'));
  console.log('✓ Valid domain (example.com):', client.isValidDomain('example.com'));
  console.log('✗ Invalid domain (invalid..domain):', client.isValidDomain('invalid..domain'));
  console.log('✓ Valid SHA256 hash:', client.isValidHash('a'.repeat(64)));
  console.log('✗ Invalid hash (too short):', client.isValidHash('abc123'));
  console.log('✓ Valid URL (https://example.com):', client.isValidURL('https://example.com'));
  console.log('✗ Invalid URL (not-a-url):', client.isValidURL('not-a-url'));
  console.log('✓ Valid email (test@example.com):', client.isValidEmail('test@example.com'));
  console.log('✗ Invalid email (invalid-email):', client.isValidEmail('invalid-email'));
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test indicator creation and validation
  console.log('Testing indicator creation:');
  
  const testIndicators = [
    {
      id: 'test-1',
      type: 'ip',
      value: '192.168.1.100',
      confidence: 85,
      severity: 'high',
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      tags: ['malware', 'botnet'],
      source: 'test',
      tlp: 'white'
    },
    {
      id: 'test-2',
      type: 'domain',
      value: 'malicious-site.com',
      confidence: 92,
      severity: 'critical',
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      tags: ['phishing'],
      source: 'test',
      tlp: 'amber'
    },
    {
      id: 'test-3',
      type: 'hash',
      value: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
      confidence: 95,
      severity: 'high',
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      tags: ['malware', 'trojan'],
      source: 'test',
      tlp: 'white'
    }
  ];
  
  const createdIndicators = testIndicators.map(data => client.createThreatIndicator(data)).filter(Boolean);
  console.log(`Created ${createdIndicators.length} valid indicators from ${testIndicators.length} test cases`);
  
  // Test deduplication
  console.log('\nTesting deduplication:');
  const duplicateIndicators = [...createdIndicators, ...createdIndicators]; // Create duplicates
  const deduplicated = client.deduplicateIndicators(duplicateIndicators);
  console.log(`Deduplicated ${duplicateIndicators.length} indicators to ${deduplicated.length} unique indicators`);
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test data transformation helpers
  console.log('Testing data transformation helpers:');
  
  console.log('MISP type mapping:');
  console.log('  ip-src -> ip:', client.mapMISPTypeToStandard('ip-src'));
  console.log('  domain -> domain:', client.mapMISPTypeToStandard('domain'));
  console.log('  sha256 -> hash:', client.mapMISPTypeToStandard('sha256'));
  
  console.log('\nSTIX pattern parsing:');
  const stixPatterns = [
    "[ipv4-addr:value = '192.168.1.1']",
    "[domain-name:value = 'example.com']",
    "[file:hashes.SHA-256 = 'abc123']"
  ];
  
  stixPatterns.forEach(pattern => {
    const parsed = client.parseSTIXPattern(pattern);
    console.log(`  ${pattern} -> type: ${parsed.type}, value: ${parsed.value}`);
  });
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test API calls (only if configured)
  if (testConfig.virusTotalApiKey) {
    console.log('Testing VirusTotal API (this may take a moment due to rate limiting)...');
    try {
      const vtData = await client.getVirusTotalIntel();
      console.log(`✓ Successfully fetched ${vtData.length} indicators from VirusTotal`);
    } catch (error) {
      console.log(`✗ VirusTotal API test failed: ${error.message}`);
    }
  } else {
    console.log('⚠️ VirusTotal API key not configured, skipping API test');
  }
  
  if (testConfig.mispUrl && testConfig.mispApiKey) {
    console.log('Testing MISP API...');
    try {
      const mispData = await client.getMISPIntel();
      console.log(`✓ Successfully fetched ${mispData.length} indicators from MISP`);
    } catch (error) {
      console.log(`✗ MISP API test failed: ${error.message}`);
    }
  } else {
    console.log('⚠️ MISP configuration not complete, skipping API test');
  }
  
  if (testConfig.taxiiUrl && testConfig.taxiiUsername && testConfig.taxiiPassword) {
    console.log('Testing STIX/TAXII API...');
    try {
      const stixData = await client.getSTIXIntel();
      console.log(`✓ Successfully fetched ${stixData.length} indicators from STIX/TAXII`);
    } catch (error) {
      console.log(`✗ STIX/TAXII API test failed: ${error.message}`);
    }
  } else {
    console.log('⚠️ STIX/TAXII configuration not complete, skipping API test');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  console.log('🎉 Threat Intelligence Client testing completed!');
}

// Run the test
testThreatIntelClient().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});