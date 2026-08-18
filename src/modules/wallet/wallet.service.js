const { randomUUID: uuidv4 } = require('crypto');
const { Wallet, WalletLedger, sequelize } = require('../../database/models');

class WalletService {
  static async getBalance(userId) {
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
      const error = new Error('Wallet not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      walletId: wallet.id,
      availableBalance: parseFloat(wallet.availableBalance),
      lockedBalance: parseFloat(wallet.lockedBalance),
      totalBalance: parseFloat(wallet.availableBalance) + parseFloat(wallet.lockedBalance),
    };
  }

  static async topup({ userId, amount, metadata = {} }) {
    const t = await sequelize.transaction();

    try {
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

      const openingBalance = parseFloat(wallet.availableBalance);
      const topupAmount = parseFloat(amount);
      const closingBalance = openingBalance + topupAmount;
      const transactionId = uuidv4();
      const topupReferenceId = `TOPUP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      wallet.availableBalance = closingBalance;
      await wallet.save({ transaction: t });

      const ledgerEntry = await WalletLedger.create(
        {
          walletId: wallet.id,
          transactionId,
          type: 'WALLET_TOPUP',
          entryType: 'CREDIT',
          amount: topupAmount,
          openingBalance,
          closingBalance,
          referenceType: 'TOPUP',
          referenceId: topupReferenceId,
          status: 'SUCCESS',
          metadata,
        },
        { transaction: t }
      );

      await t.commit();

      return {
        walletId: wallet.id,
        transactionId: ledgerEntry.transactionId,
        amount: topupAmount,
        openingBalance,
        closingBalance,
        availableBalance: closingBalance,
        status: 'SUCCESS',
        createdAt: ledgerEntry.createdAt,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async getStatement({ userId, page = 1, limit = 10 }) {
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
      const error = new Error('Wallet not found');
      error.statusCode = 404;
      throw error;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await WalletLedger.findAndCountAll({
      where: { walletId: wallet.id },
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      transactions: rows.map((entry) => ({
        id: entry.id,
        transactionId: entry.transactionId,
        type: entry.type,
        entryType: entry.entryType,
        amount: parseFloat(entry.amount),
        openingBalance: parseFloat(entry.openingBalance),
        closingBalance: parseFloat(entry.closingBalance),
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        status: entry.status,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
      })),
    };
  }
}

module.exports = WalletService;
