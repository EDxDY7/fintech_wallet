const WithdrawalService = require('./withdrawal.service');

class WithdrawalController {
  static async requestWithdrawal(req, res, next) {
    try {
      const result = await WithdrawalService.requestWithdrawal({
        userId: req.user.id,
        amount: req.body.amount,
      });

      res.status(201).json({
        success: true,
        message: 'Withdrawal request submitted successfully and queued for settlement',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listMyWithdrawals(req, res, next) {
    try {
      const withdrawals = await WithdrawalService.listUserWithdrawals(req.user.id);
      res.status(200).json({
        success: true,
        data: withdrawals,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WithdrawalController;
