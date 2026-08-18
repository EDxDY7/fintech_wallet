const dotenv = require('dotenv');
dotenv.config();

const isUpstash = (process.env.REDIS_HOST || '').includes('upstash.io');

const redisConfig = {
  host: (process.env.REDIS_HOST || '127.0.0.1').replace(/^https?:\/\//, ''),
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  ...(isUpstash ? { tls: { rejectUnauthorized: false } } : {}),
  maxRetriesPerRequest: null,
};

module.exports = { redisConfig };
