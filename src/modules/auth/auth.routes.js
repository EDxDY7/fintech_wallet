const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');
const { registerSchema, loginSchema } = require('./auth.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authLimiter } = require('../../middlewares/rateLimiter.middleware');

router.post('/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.get('/profile', authenticate, AuthController.getProfile);

module.exports = router;
