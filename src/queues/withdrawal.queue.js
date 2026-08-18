const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');

const withdrawalQueue = new Queue('withdrawal-queue', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

module.exports = withdrawalQueue;
