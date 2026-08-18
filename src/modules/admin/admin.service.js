const { fn, col, literal } = require('sequelize');
const { randomUUID: uuidv4 } = require('crypto');
const {
  Withdrawal,
  Wallet,
  WalletLedger,
  User,
  sequelize,
} = require('../../database/models');

class AdminService {
  static async getPendingWithdrawals() {
    return await Withdrawal.findAll({
      where: { status: 'PENDING' },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });
  }


  static async approveWithdrawal(withdrawalId) {
    const t = await sequelize.transaction();

    try {
      const withdrawal = await Withdrawal.findOne({
        where: { id: withdrawalId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!withdrawal) {
        const error = new Error('Withdrawal request not found');
        error.statusCode = 404;
        throw error;
      }

      if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'PROCESSING') {
        const error = new Error(`Cannot approve withdrawal in '${withdrawal.status}' status`);
        error.statusCode = 400;
        throw error;
      }

      const wallet = await Wallet.findOne({
        where: { id: withdrawal.walletId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!wallet) {
        const error = new Error('Associated wallet not found');
        error.statusCode = 404;
        throw error;
      }

      const amount = parseFloat(withdrawal.amount);
      const openingAvailable = parseFloat(wallet.availableBalance);
      const openingLocked = parseFloat(wallet.lockedBalance);

      wallet.lockedBalance = Math.max(0, openingLocked - amount);
      await wallet.save({ transaction: t });

      withdrawal.status = 'PROCESSED';
      await withdrawal.save({ transaction: t });

      await WalletLedger.create(
        {
          walletId: wallet.id,
          transactionId: uuidv4(),
          type: 'WITHDRAWAL_PROCESSED',
          entryType: 'DEBIT',
          amount,
          openingBalance: openingAvailable,
          closingBalance: openingAvailable,
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawal.id,
          status: 'SUCCESS',
          metadata: {
            approvedBy: 'ADMIN',
            settledAt: new Date().toISOString(),
          },
        },
        { transaction: t }
      );

      await t.commit();

      return {
        withdrawalId: withdrawal.id,
        status: withdrawal.status,
        settledAmount: amount,
        remainingLockedBalance: parseFloat(wallet.lockedBalance),
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async reconcileLedger() {
    const wallets = await Wallet.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    const reconciliationResults = [];
    let totalDiscrepancies = 0;

    for (const wallet of wallets) {
      const totalCredits = await WalletLedger.sum('amount', {
        where: {
          walletId: wallet.id,
          entryType: 'CREDIT',
          status: 'SUCCESS',
        },
      }) || 0;

      const totalDebits = await WalletLedger.sum('amount', {
        where: {
          walletId: wallet.id,
          entryType: 'DEBIT',
          status: 'SUCCESS',
        },
      }) || 0;

      const ledgerCalculatedBalance = parseFloat((totalCredits - totalDebits).toFixed(4));
      const currentAvailable = parseFloat(wallet.availableBalance);
      const currentLocked = parseFloat(wallet.lockedBalance);
      const actualWalletTotal = parseFloat((currentAvailable + currentLocked).toFixed(4));

      const isBalanced = Math.abs(ledgerCalculatedBalance - actualWalletTotal) < 0.0001;

      if (!isBalanced) {
        totalDiscrepancies += 1;
      }

      reconciliationResults.push({
        walletId: wallet.id,
        user: wallet.user ? { id: wallet.user.id, name: wallet.user.name, email: wallet.user.email } : null,
        actualAvailableBalance: currentAvailable,
        actualLockedBalance: currentLocked,
        actualTotalBalance: actualWalletTotal,
        ledgerTotalCredits: parseFloat(totalCredits.toFixed(4)),
        ledgerTotalDebits: parseFloat(totalDebits.toFixed(4)),
        ledgerCalculatedBalance,
        difference: parseFloat((actualWalletTotal - ledgerCalculatedBalance).toFixed(4)),
        status: isBalanced ? 'MATCHED' : 'DISCREPANCY_DETECTED',
      });
    }

    return {
      auditedAt: new Date().toISOString(),
      totalWalletsAudited: wallets.length,
      discrepanciesCount: totalDiscrepancies,
      isSystemHealthy: totalDiscrepancies === 0,
      details: reconciliationResults,
    };
  }




  static async rejectWithdrawal(withdrawalId, reason = 'Rejected by Administrator') {
    const t = await sequelize.transaction();

    try {
      const withdrawal = await Withdrawal.findOne({
        where: { id: withdrawalId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!withdrawal) {
        const error = new Error('Withdrawal request not found');
        error.statusCode = 404;
        throw error;
      }

      if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'PROCESSING') {
        const error = new Error(`Cannot reject withdrawal in '${withdrawal.status}' status`);
        error.statusCode = 400;
        throw error;
      }

      const wallet = await Wallet.findOne({
        where: { id: withdrawal.walletId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      const amount = parseFloat(withdrawal.amount);
      const openingAvailable = parseFloat(wallet.availableBalance);
      const openingLocked = parseFloat(wallet.lockedBalance);

      wallet.lockedBalance = Math.max(0, openingLocked - amount);
      wallet.availableBalance = openingAvailable + amount;
      await wallet.save({ transaction: t });

      withdrawal.status = 'REJECTED';
      withdrawal.failureReason = reason;
      await withdrawal.save({ transaction: t });

      await WalletLedger.create(
        {
          walletId: wallet.id,
          transactionId: uuidv4(),
          type: 'WITHDRAWAL_REVERSED',
          entryType: 'CREDIT',
          amount,
          openingBalance: openingAvailable,
          closingBalance: openingAvailable + amount,
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawal.id,
          status: 'SUCCESS',
          metadata: {
            rejectedBy: 'ADMIN',
            reason,
          },
        },
        { transaction: t }
      );

      await t.commit();

      return {
        withdrawalId: withdrawal.id,
        status: withdrawal.status,
        reason,
        refundedAmount: amount,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async getSystemReports() {
    const balanceTotals = await Wallet.findOne({
      attributes: [
        [fn('SUM', col('available_balance')), 'totalAvailableBalance'],
        [fn('SUM', col('locked_balance')), 'totalLockedBalance'],
      ],
      raw: true,
    });

    const totalAvailable = parseFloat(balanceTotals?.totalAvailableBalance || 0);
    const totalLocked = parseFloat(balanceTotals?.totalLockedBalance || 0);

    const withdrawalTotals = await Withdrawal.findOne({
      where: { status: 'PROCESSED' },
      attributes: [
        [fn('COUNT', col('id')), 'totalProcessedCount'],
        [fn('SUM', col('amount')), 'totalProcessedAmount'],
      ],
      raw: true,
    });

    const failedTransactions = await WalletLedger.findAll({
      where: { status: 'FAILED' },
      limit: 10,
      order: [['createdAt', 'DESC']],
    });

    const topUsers = await WalletLedger.findAll({
      attributes: [
        'walletId',
        [fn('SUM', col('amount')), 'totalVolume'],
        [fn('COUNT', col('id')), 'transactionCount'],
      ],
      include: [
        {
          model: Wallet,
          as: 'wallet',
          attributes: ['userId'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
      ],
      group: ['walletId', 'wallet.id', 'wallet.user.id'],
      order: [[literal('totalVolume'), 'DESC']],
      limit: 5,
    });

    return {
      wallets: {
        totalAvailableBalance: totalAvailable,
        totalLockedBalance: totalLocked,
        totalPlatformBalance: totalAvailable + totalLocked,
      },
      withdrawals: {
        processedCount: parseInt(withdrawalTotals?.totalProcessedCount || 0, 10),
        processedAmount: parseFloat(withdrawalTotals?.totalProcessedAmount || 0),
      },
      failedTransactionsCount: failedTransactions.length,
      failedTransactionsSample: failedTransactions,
      topUsersByVolume: topUsers.map((item) => ({
        user: item.wallet?.user || null,
        totalVolume: parseFloat(item.get('totalVolume')),
        transactionCount: parseInt(item.get('transactionCount'), 10),
      })),
    };
  }
}

module.exports = AdminService;
