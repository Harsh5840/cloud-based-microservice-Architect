require('dotenv').config();
const { produceMessage } = require('./kafkaProducer');
const ThreatIntelClient = require('./threatIntelClient');
const cron = require('node-cron');

// Configuration
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'threat-intelligence';
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 300000; // 5 minutes default
const USE_DEMO_MODE = process.env.USE_DEMO_MODE === 'true';

// Threat Intelligence API Configuration
const threatIntelConfig = {
  virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY,
  mispUrl: process.env.MISP_URL,
  mispApiKey: process.env.MISP_API_KEY,
  taxiiUrl: process.env.TAXII_URL,
  taxiiUsername: process.env.TAXII_USERNAME,
  taxiiPassword: process.env.TAXII_PASSWORD,
  jsonFeeds: []
};

// Parse JSON feed configuration
if (process.env.JSON_FEED_URLS && process.env.JSON_FEED_NAMES) {
  const urls = process.env.JSON_FEED_URLS.split(',');
  const names = process.env.JSON_FEED_NAMES.split(',');
  
  for (let i = 0; i < Math.min(urls.length, names.length); i++) {
    threatIntelConfig.jsonFeeds.push({
      name: names[i].trim(),
      url: urls[i].trim()
    });
  }
}

// Initialize Threat Intelligence client
let threatIntelClient = null;
if (!USE_DEMO_MODE && (threatIntelConfig.virusTotalApiKey || threatIntelConfig.mispUrl || threatIntelConfig.taxiiUrl)) {
  threatIntelClient = new ThreatIntelClient(threatIntelConfig);
}

/**
 * Fetch threat intelligence data from configured sources or generate demo data
 */
async function fetchThreatIntelligence() {
  try {
    if (USE_DEMO_MODE || !threatIntelClient) {
      console.log('Generating demo threat intelligence data...');
      return generateDemoThreatData();
    }
    
    console.log('Fetching real threat intelligence from configured sources...');
    const data = await threatIntelClient.getAllThreatIntel();
    return data;
  } catch (error) {
    console.error('Error fetching threat intelligence:', error.message);
    
    if (error.message.includes('API Limit') || error.message.includes('rate limit')) {
      console.log('⚠️ Threat intelligence API rate limit exceeded. Using demo data instead.');
      console.log('💡 Consider upgrading API plans for higher rate limits.');
    } else {
      console.log('🔄 Falling back to demo data due to API error...');
    }
    
    return generateDemoThreatData();
  }
}

/**
 * Generate demo threat intelligence data for testing
 */
function generateDemoThreatData() {
  const demoIndicators = [];
  
  // Generate malicious IPs
  for (let i = 0; i < 5; i++) {
    demoIndicators.push({
      id: `demo_ip_${Date.now()}_${i}`,
      indicator_type: 'ip',
      indicator_value: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      confidence_score: Math.floor(Math.random() * 40) + 60, // 60-100
      severity_level: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
      first_seen: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(), // Last 7 days
      last_seen: new Date().toISOString(),
      tags: ['botnet', 'malware', 'c2'].slice(0, Math.floor(Math.random() * 3) + 1),
      source_feeds: ['demo-feed'],
      tlp_marking: 'white',
      metadata: {
        country: ['US', 'CN', 'RU', 'KP'][Math.floor(Math.random() * 4)],
        asn: `AS${Math.floor(Math.random() * 65535)}`
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Generate malicious domains
  const domains = ['evil-site.com', 'malware-host.net', 'phishing-bank.org', 'fake-update.info', 'trojan-download.biz'];
  for (let i = 0; i < domains.length; i++) {
    demoIndicators.push({
      id: `demo_domain_${Date.now()}_${i}`,
      indicator_type: 'domain',
      indicator_value: domains[i],
      confidence_score: Math.floor(Math.random() * 30) + 70, // 70-100
      severity_level: ['high', 'medium'][Math.floor(Math.random() * 2)],
      first_seen: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(), // Last 30 days
      last_seen: new Date().toISOString(),
      tags: ['phishing', 'malware', 'c2', 'apt'].slice(0, Math.floor(Math.random() * 3) + 1),
      source_feeds: ['demo-feed'],
      tlp_marking: 'white',
      metadata: {
        registrar: 'Demo Registrar',
        creation_date: new Date(Date.now() - Math.random() * 86400000 * 365).toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Generate malicious hashes
  for (let i = 0; i < 3; i++) {
    demoIndicators.push({
      id: `demo_hash_${Date.now()}_${i}`,
      indicator_type: 'hash',
      indicator_value: Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      confidence_score: Math.floor(Math.random() * 20) + 80, // 80-100
      severity_level: 'high',
      first_seen: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(), // Last 3 days
      last_seen: new Date().toISOString(),
      tags: ['malware', 'trojan', 'ransomware'][i] ? [['malware', 'trojan', 'ransomware'][i]] : ['malware'],
      source_feeds: ['demo-feed'],
      tlp_marking: 'white',
      metadata: {
        file_type: ['exe', 'dll', 'pdf'][Math.floor(Math.random() * 3)],
        size: Math.floor(Math.random() * 10000000) + 1000
      },
      timestamp: new Date().toISOString()
    });
  }
  
  return demoIndicators;
}

/**
 * Determine threat risk level based on confidence and severity
 */
function determineThreatRisk(confidence, severity) {
  const severityWeight = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1
  };
  
  const baseRisk = (confidence / 100) * (severityWeight[severity] || 2);
  
  if (baseRisk >= 3.5) return 'critical';
  if (baseRisk >= 2.5) return 'high';
  if (baseRisk >= 1.5) return 'medium';
  return 'low';
}

/**
 * Process and send threat intelligence data to Kafka
 */
async function processAndSendData() {
  const data = await fetchThreatIntelligence();
  
  if (!data || data.length === 0) {
    console.log('No threat intelligence data to process. Skipping...');
    return;
  }
  
  console.log(`Processing ${data.length} threat intelligence indicators`);
  
  // Process each threat indicator
  for (const indicator of data) {
    if (!indicator) continue;
    
    // Calculate risk level
    const riskLevel = determineThreatRisk(indicator.confidence_score, indicator.severity_level);
    
    // Enrich indicator with additional metadata
    const enrichedIndicator = {
      ...indicator,
      risk_level: riskLevel,
      ingestion_timestamp: new Date().toISOString(),
      processing_metadata: {
        ingestor_version: '2.0.0',
        processing_time: new Date().toISOString()
      }
    };
    
    // Send to Kafka
    await produceMessage(KAFKA_TOPIC, {
      timestamp: new Date().toISOString(),
      event_type: 'threat_indicator',
      data: enrichedIndicator,
      source: 'threat-intelligence-ingestor'
    });
  }
  
  console.log('Threat intelligence data successfully sent to Kafka');
  
  // Log summary statistics
  const severityCounts = data.reduce((acc, indicator) => {
    acc[indicator.severity_level] = (acc[indicator.severity_level] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Threat intelligence summary:', {
    total_indicators: data.length,
    severity_breakdown: severityCounts,
    sources: [...new Set(data.flatMap(i => i.source_feeds))]
  });
}

/**
 * Main execution loop
 */
async function startIngestor() {
  console.log('Cybersecurity Threat Intelligence - Ingestor Service Starting...');
  
  if (USE_DEMO_MODE || !threatIntelClient) {
    console.log('🔧 Running in DEMO MODE - generating synthetic threat intelligence');
    console.log(`Polling interval: ${POLLING_INTERVAL}ms`);
  } else {
    console.log('🛡️ Running with REAL threat intelligence sources');
    const configuredSources = [];
    if (threatIntelConfig.virusTotalApiKey) configuredSources.push('VirusTotal');
    if (threatIntelConfig.mispUrl) configuredSources.push('MISP');
    if (threatIntelConfig.taxiiUrl) configuredSources.push('STIX/TAXII');
    if (threatIntelConfig.jsonFeeds.length > 0) configuredSources.push(`${threatIntelConfig.jsonFeeds.length} JSON feeds`);
    
    console.log(`Configured sources: ${configuredSources.join(', ')}`);
    console.log(`Polling interval: ${POLLING_INTERVAL}ms`);
  }
  
  // Initial run
  await processAndSendData();
  
  // Set up polling interval
  setInterval(processAndSendData, POLLING_INTERVAL);
  
  // Set up continuous threat intelligence collection (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    console.log('🔍 Scheduled threat intelligence collection triggered');
    await processAndSendData();
  });
  
  // Set up high-frequency collection during business hours (every 5 minutes, 8 AM - 6 PM UTC)
  cron.schedule('*/5 8-18 * * 1-5', async () => {
    console.log('⚡ High-frequency threat intelligence collection triggered');
    await processAndSendData();
  }, {
    timezone: "UTC"
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down threat intelligence ingestor service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down threat intelligence ingestor service...');
  process.exit(0);
});

// Start the ingestor
startIngestor().catch(err => {
  console.error('Fatal error in threat intelligence ingestor service:', err);
  process.exit(1);
});