const { randomUUID } = require('crypto');

const correlationMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
};

module.exports = correlationMiddleware;
