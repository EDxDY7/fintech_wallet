const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { initModels } = require('./database/models');
const logger = require('./utils/logger');


require('./queues/withdrawal.worker');

const PORT = process.env.PORT || 7000;

const startServer = async () => {
  try {
    await initModels();
    const server = app.listen(PORT, () => {
      logger.info(`=============================================>`);
      logger.info(` Fintech Wallet Service running on port ${PORT}`);
      logger.info(` Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(` Health Check: http://localhost:${PORT}/health`);
      logger.info(`=============================================>`);
    });

    
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} signal received. Closing HTTP server gracefully.`);
      server.close(() => {
        logger.info('HTTP server closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start application server:', error);
    process.exit(1);
  }
};

startServer();
