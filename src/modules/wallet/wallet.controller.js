const WalletService = require('./wallet.service');

class WalletController {
  static async getBalance(req, res, next) {
    try {
      const balance = await WalletService.getBalance(req.user.id);
      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  static async topup(req, res, next) {
    try {
      const result = await WalletService.topup({
        userId: req.user.id,
        amount: req.body.amount,
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      res.status(200).json({
        success: true,
        message: 'Wallet topped up successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getStatement(req, res, next) {
    try {
      const { page, limit } = req.query;
      const statement = await WalletService.getStatement({
        userId: req.user.id,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: statement,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WalletController;
