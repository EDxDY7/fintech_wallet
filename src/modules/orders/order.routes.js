const express = require('express');
const router = express.Router();
const OrderController = require('./order.controller');
const { createProductSchema, createOrderSchema } = require('./order.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const idempotency = require('../../middlewares/idempotency.middleware');

router.get('/products', OrderController.listProducts);
router.post(
  '/products',
  authenticate,
  authorize('admin'),
  validate(createProductSchema),
  OrderController.createProduct
);

router.post(
  '/orders',
  authenticate,
  idempotency,
  validate(createOrderSchema),
  OrderController.createOrder
);

router.get('/orders/:id', authenticate, OrderController.getOrderDetails);
router.post('/orders/:id/cancel', authenticate, OrderController.cancelOrder);

module.exports = router;
