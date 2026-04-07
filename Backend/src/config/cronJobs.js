const cron = require('node-cron');
const { runMatchingAlgorithm } = require('../services/matchingService');
const SwapRequest = require('../models/SwapRequest');
const Match = require('../models/Match');
const logger = require('../utils/logger');

// Run matching algorithm daily at 2:00 AM
const scheduleMatchingAlgorithm = () => {
  const schedule = process.env.MATCHING_CRON_SCHEDULE || '0 2 * * *';
  
  cron.schedule(schedule, async () => {
    logger.info('Running scheduled matching algorithm...');
    try {
      const result = await runMatchingAlgorithm();
      logger.info(`Scheduled matching complete:`, result);
    } catch (error) {
      logger.error('Scheduled matching algorithm error:', error);
    }
  });

  logger.info(`Matching algorithm scheduled: ${schedule}`);
};

// Expire old swap requests daily at 3:00 AM
const scheduleExpireOldRequests = () => {
  cron.schedule('0 3 * * *', async () => {
    logger.info('Checking for expired swap requests...');
    try {
      const result = await SwapRequest.expireOldRequests();
      logger.info(`Expired ${result} old swap requests`);
    } catch (error) {
      logger.error('Error expiring old requests:', error);
    }
  });

  logger.info('Expire old requests job scheduled: 0 3 * * *');
};

// Expire old matches daily at 3:30 AM
const scheduleExpireOldMatches = () => {
  cron.schedule('30 3 * * *', async () => {
    logger.info('Checking for expired matches...');
    try {
      const result = await Match.updateMany(
        {
          status: { $in: ['pending', 'viewed_by_teacher1', 'viewed_by_teacher2', 'viewed_by_both'] },
          expiresAt: { $lt: new Date() },
        },
        {
          status: 'expired',
        }
      );
      logger.info(`Expired ${result.modifiedCount} old matches`);
    } catch (error) {
      logger.error('Error expiring old matches:', error);
    }
  });

  logger.info('Expire old matches job scheduled: 30 3 * * *');
};

// Initialize all cron jobs
const initializeCronJobs = () => {
  scheduleMatchingAlgorithm();
  scheduleExpireOldRequests();
  scheduleExpireOldMatches();
  logger.info('All cron jobs initialized successfully');
};

module.exports = {
  initializeCronJobs,
  scheduleMatchingAlgorithm,
  scheduleExpireOldRequests,
  scheduleExpireOldMatches,
};
