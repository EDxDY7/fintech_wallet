const OrderService = require('./order.service');

class OrderController {
  static async listProducts(req, res, next) {
    try {
      const products = await OrderService.listProducts();
      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createProduct(req, res, next) {
    try {
      const product = await OrderService.createProduct(req.body);
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createOrder(req, res, next) {
    try {
      const result = await OrderService.createOrder({
        userId: req.user.id,
        items: req.body.items,
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      res.status(201).json({
        success: true,
        message: 'Order created and paid successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderDetails(req, res, next) {
    try {
      const order = await OrderService.getOrderDetails(
        req.params.id,
        req.user.id,
        req.user.role
      );

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrder(req, res, next) {
    try {
      const result = await OrderService.cancelAndRefundOrder({
        orderId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        reason: req.body.reason,
      });

      res.status(200).json({
        success: true,
        message: 'Order successfully cancelled and refunded to wallet',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OrderController;
