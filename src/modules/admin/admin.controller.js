const AdminService = require('./admin.service');

class AdminController {
  static async getPendingWithdrawals(req, res, next) {
    try {
      const pending = await AdminService.getPendingWithdrawals();
      res.status(200).json({
        success: true,
        data: pending,
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getReconciliation(req, res, next) {
    try {
      const reconciliation = await AdminService.reconcileLedger();
      res.status(200).json({
        success: true,
        data: reconciliation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveWithdrawal(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.approveWithdrawal(id);

      res.status(200).json({
        success: true,
        message: 'Withdrawal approved and settled successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectWithdrawal(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await AdminService.rejectWithdrawal(id, reason);

      res.status(200).json({
        success: true,
        message: 'Withdrawal rejected and funds refunded to available balance',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReports(req, res, next) {
    try {
      const reports = await AdminService.getSystemReports();
      res.status(200).json({
        success: true,
        data: reports,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
