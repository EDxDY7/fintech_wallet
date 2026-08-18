const { randomUUID: uuidv4 } = require('crypto');
const { Product, Order, OrderItem, Wallet, WalletLedger, sequelize } = require('../../database/models');

class OrderService {
  static async listProducts() {
    return await Product.findAll({
      order: [['createdAt', 'DESC']],
    });
  }

  static async createProduct({ name, price, inventoryQuantity }) {
    return await Product.create({
      name,
      price,
      inventoryQuantity,
    });
  }

  static async getOrderDetails(orderId, userId, userRole) {
    const whereClause = { id: orderId };
    if (userRole !== 'admin') {
      whereClause.userId = userId;
    }

    const order = await Order.findOne({
      where: whereClause,
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'price'] }],
        },
      ],
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    return order;
  }

  static async createOrder({ userId, items, metadata = {} }) {
    const t = await sequelize.transaction();

    try {
      const sortedItemRequests = [...items].sort((a, b) =>
        a.productId.localeCompare(b.productId)
      );

      const productIds = sortedItemRequests.map((item) => item.productId);
      const products = await Product.findAll({
        where: { id: productIds },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (products.length !== productIds.length) {
        const error = new Error('One or more selected products do not exist');
        error.statusCode = 404;
        throw error;
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalAmount = 0;
      const orderItemsToCreate = [];

      for (const item of sortedItemRequests) {
        const product = productMap.get(item.productId);

        if (product.inventoryQuantity < item.quantity) {
          const error = new Error(
            `Insufficient stock for product "${product.name}". Available: ${product.inventoryQuantity}, Requested: ${item.quantity}`
          );
          error.statusCode = 400;
          throw error;
        }

        const unitPrice = parseFloat(product.price);
        const itemTotal = unitPrice * item.quantity;
        totalAmount += itemTotal;

        orderItemsToCreate.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
        });
      }

      const wallet = await Wallet.findOne({
        where: { userId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!wallet) {
        const error = new Error('Wallet not found');
        error.statusCode = 404;
        throw error;
      }

      const availableBalance = parseFloat(wallet.availableBalance);
      if (availableBalance < totalAmount) {
        const error = new Error(
          `Insufficient wallet balance. Required: $${totalAmount.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`
        );
        error.statusCode = 400;
        throw error;
      }

      for (const item of sortedItemRequests) {
        const product = productMap.get(item.productId);
        product.inventoryQuantity -= item.quantity;
        await product.save({ transaction: t });
      }

      const openingBalance = availableBalance;
      const closingBalance = openingBalance - totalAmount;
      wallet.availableBalance = closingBalance;
      await wallet.save({ transaction: t });

      const order = await Order.create(
        {
          userId,
          totalAmount,
          status: 'PAID',
        },
        { transaction: t }
      );

      for (const orderItem of orderItemsToCreate) {
        await OrderItem.create(
          {
            orderId: order.id,
            productId: orderItem.productId,
            quantity: orderItem.quantity,
            unitPrice: orderItem.unitPrice,
          },
          { transaction: t }
        );
      }

      await WalletLedger.create(
        {
          walletId: wallet.id,
          transactionId: uuidv4(),
          type: 'ORDER_PAYMENT',
          entryType: 'DEBIT',
          amount: totalAmount,
          openingBalance,
          closingBalance,
          referenceType: 'ORDER',
          referenceId: order.id,
          status: 'SUCCESS',
          metadata: {
            orderId: order.id,
            itemCount: items.length,
            ...metadata,
          },
        },
        { transaction: t }
      );

      await t.commit();

      return {
        orderId: order.id,
        totalAmount,
        status: order.status,
        availableBalance: closingBalance,
        items: orderItemsToCreate,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async cancelAndRefundOrder({ orderId, userId, userRole, reason = 'Order cancelled' }) {
    const t = await sequelize.transaction();

    try {
      const whereClause = { id: orderId };
      if (userRole !== 'admin') {
        whereClause.userId = userId;
      }

      const order = await Order.findOne({
        where: whereClause,
        include: [{ model: OrderItem, as: 'items' }],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
      }

      if (order.status !== 'PAID') {
        const error = new Error(`Cannot cancel/refund order in '${order.status}' status`);
        error.statusCode = 400;
        throw error;
      }

      for (const item of order.items) {
        const product = await Product.findByPk(item.productId, {
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (product) {
          product.inventoryQuantity += item.quantity;
          await product.save({ transaction: t });
        }
      }

      const wallet = await Wallet.findOne({
        where: { userId: order.userId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!wallet) {
        const error = new Error('Associated wallet not found');
        error.statusCode = 404;
        throw error;
      }

      const refundAmount = parseFloat(order.totalAmount);
      const openingBalance = parseFloat(wallet.availableBalance);
      const closingBalance = openingBalance + refundAmount;

      wallet.availableBalance = closingBalance;
      await wallet.save({ transaction: t });

      order.status = 'CANCELLED';
      await order.save({ transaction: t });

      const ledgerEntry = await WalletLedger.create(
        {
          walletId: wallet.id,
          transactionId: uuidv4(),
          type: 'REFUND',
          entryType: 'CREDIT',
          amount: refundAmount,
          openingBalance,
          closingBalance,
          referenceType: 'ORDER',
          referenceId: order.id,
          status: 'SUCCESS',
          metadata: {
            orderId: order.id,
            reason,
            refundedAt: new Date().toISOString(),
          },
        },
        { transaction: t }
      );

      await t.commit();

      return {
        orderId: order.id,
        status: order.status,
        refundedAmount: refundAmount,
        availableBalance: closingBalance,
        transactionId: ledgerEntry.transactionId,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = OrderService;
