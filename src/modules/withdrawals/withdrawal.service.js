const { randomUUID: uuidv4 } = require('crypto');
const { Withdrawal, Wallet, WalletLedger, sequelize } = require('../../database/models');
const withdrawalQueue = require('../../queues/withdrawal.queue');

class WithdrawalService {
  static async requestWithdrawal({ userId, amount }) {
    const t = await sequelize.transaction();

    try {
      const withdrawalAmount = parseFloat(amount);

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
      if (availableBalance < withdrawalAmount) {
        const error = new Error(
          `Insufficient available balance. Requested: $${withdrawalAmount.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`
        );
        error.statusCode = 400;
        throw error;
      }

      const openingBalance = availableBalance;
      const closingBalance = openingBalance - withdrawalAmount;

      wallet.availableBalance = closingBalance;
      wallet.lockedBalance = parseFloat(wallet.lockedBalance) + withdrawalAmount;
      await wallet.save({ transaction: t });

      const withdrawal = await Withdrawal.create(
        {
          userId,
          walletId: wallet.id,
          amount: withdrawalAmount,
          status: 'PENDING',
        },
        { transaction: t }
      );

      await WalletLedger.create(
        {
          walletId: wallet.id,
          transactionId: uuidv4(),
          type: 'WITHDRAWAL_REQUEST',
          entryType: 'DEBIT',
          amount: withdrawalAmount,
          openingBalance,
          closingBalance,
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawal.id,
          status: 'PENDING',
          metadata: {
            withdrawalId: withdrawal.id,
            transferredToLocked: true,
          },
        },
        { transaction: t }
      );

      await t.commit();

      await withdrawalQueue.add(
        'process-withdrawal',
        { withdrawalId: withdrawal.id },
        { jobId: `withdrawal_${withdrawal.id}` }
      );

      return {
        withdrawalId: withdrawal.id,
        amount: withdrawalAmount,
        status: withdrawal.status,
        availableBalance: closingBalance,
        lockedBalance: parseFloat(wallet.lockedBalance),
        createdAt: withdrawal.createdAt,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async listUserWithdrawals(userId) {
    return await Withdrawal.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });
  }
}

module.exports = WithdrawalService;
