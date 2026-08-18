const sequelize = require("../../config/database");
const User = require("./user");
const Wallet = require("./wallet");
const Product = require("./product");
const Order = require("./order");
const OrderItem = require("./orderItem");
const WalletLedger = require("./walletLedger");
const IdempotencyKey = require("./idempotencyKey");
const Withdrawal = require("./withdrawal");

User.hasOne(Wallet, { foreignKey: 'userId', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Wallet.hasMany(WalletLedger, { foreignKey: 'walletId', as: 'ledgers' });
WalletLedger.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

User.hasMany(Withdrawal, { foreignKey: 'userId', as: 'withdrawals' });
Withdrawal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Wallet.hasMany(Withdrawal, { foreignKey: 'walletId', as: 'withdrawals' });
Withdrawal.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });

const initModels = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established.");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Wallet,
  Product,
  Order,
  OrderItem,
  WalletLedger,
  IdempotencyKey,
  Withdrawal,
  initModels,
};