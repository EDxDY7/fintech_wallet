const express = require('express');
const router = express.Router();
const WithdrawalController = require('./withdrawal.controller');
const { requestWithdrawalSchema } = require('./withdrawal.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const idempotency = require('../../middlewares/idempotency.middleware');

router.use(authenticate);

router.post(
  '/',
  idempotency,
  validate(requestWithdrawalSchema),
  WithdrawalController.requestWithdrawal
);

router.get('/my', WithdrawalController.listMyWithdrawals);

module.exports = router;
