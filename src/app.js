const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');


const errorHandler = require('./middlewares/errorHandler.middleware');
const { generalLimiter } = require('./middlewares/rateLimiter.middleware');
const correlationMiddleware = require('./middlewares/correlation.middleware');
const logger = require('./utils/logger');

const authRoutes = require('./modules/auth/auth.routes');
const walletRoutes = require('./modules/wallet/wallet.routes');
const orderRoutes = require('./modules/orders/order.routes');
const withdrawalRoutes = require('./modules/withdrawals/withdrawal.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

app.use(correlationMiddleware);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'Fintech Wallet API',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api', orderRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin', adminRoutes);


app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl} - Route Not Found`,
    },
  });
});


app.use(errorHandler);

module.exports = app;
