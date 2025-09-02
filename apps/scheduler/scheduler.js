require('dotenv').config();
const { CronJob } = require('cron');
const axios = require('axios');

// Configuration
const INGESTOR_URL = process.env.INGESTOR_URL || 'http://ingestor:3002/trigger';
const DEFAULT_CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 */1 * * *'; // Default: every hour
const DATASET_PATHS = process.env.DATASET_PATHS ? JSON.parse(process.env.DATASET_PATHS) : [
  '/data/financial_dataset_1.json',
  '/data/financial_dataset_2.json'
];

/**
 * Trigger the ingestor service to process a specific dataset
 * @param {string} datasetPath - Path to the dataset file
 */
async function triggerIngestor(datasetPath) {
  try {
    console.log(`Triggering ingestor for dataset: ${datasetPath}`);
    
    const response = await axios.post(INGESTOR_URL, {
      datasetPath,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Ingestor triggered successfully: ${response.status}`);
    return true;
  } catch (error) {
    console.error(`Error triggering ingestor for ${datasetPath}:`, error.message);
    return false;
  }
}

/**
 * Schedule jobs for each dataset
 */
function scheduleJobs() {
  console.log('Financial Risk Analyzer - Scheduler Service Starting...');
  console.log(`Using cron schedule: ${DEFAULT_CRON_SCHEDULE}`);
  console.log(`Configured datasets: ${DATASET_PATHS.length}`);
  
  // Create a job for each dataset with staggered timing
  DATASET_PATHS.forEach((datasetPath, index) => {
    // Stagger jobs by 5 minutes to avoid overwhelming the system
    const minute = index * 5;
    const cronSchedule = minute < 60 
      ? DEFAULT_CRON_SCHEDULE.replace(/^\d+/, minute) // Replace minute part
      : DEFAULT_CRON_SCHEDULE;
    
    console.log(`Scheduling dataset ${datasetPath} with cron: ${cronSchedule}`);
    
    const job = new CronJob(
      cronSchedule,
      function() {
        triggerIngestor(datasetPath);
      },
      null, // onComplete
      true, // start
      'UTC' // timezone
    );
    
    // Also trigger immediately on startup if configured
    if (process.env.TRIGGER_ON_STARTUP === 'true') {
      console.log(`Triggering dataset ${datasetPath} immediately on startup`);
      triggerIngestor(datasetPath);
    }
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down scheduler...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down scheduler...');
  process.exit(0);
});

// Start the scheduler
scheduleJobs();