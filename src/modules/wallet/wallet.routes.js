const express = require('express');
const router = express.Router();
const WalletController = require('./wallet.controller');
const { topupSchema, statementQuerySchema } = require('./wallet.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const idempotency = require('../../middlewares/idempotency.middleware');

router.use(authenticate);

router.get('/balance', WalletController.getBalance);
router.post('/topup', idempotency, validate(topupSchema), WalletController.topup);
router.get('/statement', validate(statementQuerySchema), WalletController.getStatement);

module.exports = router;
