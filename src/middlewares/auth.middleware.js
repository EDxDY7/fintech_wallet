const jwt = require('jsonwebtoken');
const { User } = require('../database/models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required. Missing or malformed token.' },
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_12345');

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token. User no longer exists.' },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token has expired.' },
      });
    }
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid authentication token.' },
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden. You do not have permission to perform this action.' },
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
