const { Worker } = require('bullmq');
const { randomUUID: uuidv4 } = require('crypto');
const { redisConfig } = require('../config/redis');
const { Withdrawal, Wallet, WalletLedger, sequelize } = require('../database/models');
const logger = require('../utils/logger');

const processWithdrawalSettlement = async (job) => {
  const { withdrawalId } = job.data;
  logger.info(`[Worker] Processing withdrawal settlement job: ${job.id}, withdrawalId: ${withdrawalId}, attempt: ${job.attemptsMade + 1}`);

  const t = await sequelize.transaction();

  try {
    const withdrawal = await Withdrawal.findOne({
      where: { id: withdrawalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!withdrawal) {
      await t.rollback();
      logger.warn(`[Worker] Withdrawal ${withdrawalId} not found. Skipping.`);
      return;
    }

    if (withdrawal.status === 'PROCESSED' || withdrawal.status === 'REJECTED') {
      await t.rollback();
      logger.info(`[Worker] Withdrawal ${withdrawalId} is already in state: ${withdrawal.status}. Skipping.`);
      return;
    }

    withdrawal.status = 'PROCESSING';
    withdrawal.retryCount = job.attemptsMade;
    await withdrawal.save({ transaction: t });

    const wallet = await Wallet.findOne({
      where: { id: withdrawal.walletId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!wallet) {
      throw new Error(`Wallet ${withdrawal.walletId} associated with withdrawal not found`);
    }

    const isSimulatedFailure = false; 
    if (isSimulatedFailure) {
      throw new Error('Simulated external banking gateway timeout/failure');
    }

    const withdrawalAmount = parseFloat(withdrawal.amount);
    const openingAvailable = parseFloat(wallet.availableBalance);
    const openingLocked = parseFloat(wallet.lockedBalance);

    wallet.lockedBalance = Math.max(0, openingLocked - withdrawalAmount);
    await wallet.save({ transaction: t });

    withdrawal.status = 'PROCESSED';
    await withdrawal.save({ transaction: t });

    await WalletLedger.create(
      {
        walletId: wallet.id,
        transactionId: uuidv4(),
        type: 'WITHDRAWAL_PROCESSED',
        entryType: 'DEBIT',
        amount: withdrawalAmount,
        openingBalance: openingAvailable,
        closingBalance: openingAvailable,
        referenceType: 'WITHDRAWAL',
        referenceId: withdrawal.id,
        status: 'SUCCESS',
        metadata: {
          jobId: job.id,
          settledAt: new Date().toISOString(),
        },
      },
      { transaction: t }
    );

    await t.commit();
    logger.info(`[Worker] Successfully processed and settled withdrawal ${withdrawalId}`);
  } catch (error) {
    await t.rollback();
    logger.error(`[Worker] Error processing withdrawal ${withdrawalId}: ${error.message}`);
    throw error; 
  }
};

const withdrawalWorker = new Worker(
  'withdrawal-queue',
  processWithdrawalSettlement,
  {
    connection: redisConfig,
    concurrency: 2,
  }
);

withdrawalWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
    const { withdrawalId } = job.data;
    logger.error(`[Worker DLQ] Withdrawal ${withdrawalId} exhausted all ${job.attemptsMade} retries. Initiating refund rollback.`);

    const t = await sequelize.transaction();
    try {
      const withdrawal = await Withdrawal.findOne({
        where: { id: withdrawalId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (withdrawal && withdrawal.status !== 'PROCESSED') {
        const wallet = await Wallet.findOne({
          where: { id: withdrawal.walletId },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        if (wallet) {
          const amount = parseFloat(withdrawal.amount);
          const openingAvailable = parseFloat(wallet.availableBalance);
          const openingLocked = parseFloat(wallet.lockedBalance);

          wallet.lockedBalance = Math.max(0, openingLocked - amount);
          wallet.availableBalance = openingAvailable + amount;
          await wallet.save({ transaction: t });

          withdrawal.status = 'FAILED';
          withdrawal.failureReason = err.message || 'Exhausted retry attempts without settlement';
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
                reason: withdrawal.failureReason,
                failedJobId: job.id,
              },
            },
            { transaction: t }
          );

          await t.commit();
          logger.info(`[Worker DLQ] Balance successfully refunded to available balance for withdrawal ${withdrawalId}`);
        } else {
          await t.rollback();
        }
      } else {
        await t.rollback();
      }
    } catch (reversalErr) {
      await t.rollback();
      logger.error(`[Worker DLQ] Critical failure while reversing withdrawal ${withdrawalId}: ${reversalErr.message}`);
    }
  }
});

module.exports = withdrawalWorker;
