const crypto = require('crypto');
const { IdempotencyKey } = require('../database/models');

const idempotency = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) {
    return next();
  }
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body || {}) + req.originalUrl)
    .digest('hex');

  try {
    const existing = await IdempotencyKey.findByPk(key);

    if (existing) {
      if (existing.status === 'IN_PROGRESS') {
        return res.status(409).json({
          success: false,
          error: { message: 'A request with this Idempotency-Key is currently being processed.' },
        });
      }
      if (existing.status === 'COMPLETED') {
        const cachedBody = typeof existing.responseBody === 'string'
          ? JSON.parse(existing.responseBody)
          : existing.responseBody;
        return res.status(existing.responseStatus).json(cachedBody);
      }
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await IdempotencyKey.create({
      key,
      userId: req.user ? req.user.id : null,
      requestPath: req.originalUrl,
      requestHash,
      status: 'IN_PROGRESS',
      expiresAt,
    });

    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      try {
        if (res.statusCode < 500) {
          await IdempotencyKey.update(
            {
              status: 'COMPLETED',
              responseStatus: res.statusCode,
              responseBody: body,
            },
            { where: { key } }
          );
        } else {
          await IdempotencyKey.destroy({ where: { key } });
        }
      } catch (err) {
        console.error('Failed to update idempotency key:', err);
      }
      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = idempotency;
