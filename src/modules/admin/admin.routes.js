const express = require('express');
const router = express.Router();
const AdminController = require('./admin.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

router.use(authenticate, authorize('admin'));

router.get('/withdrawals/pending', AdminController.getPendingWithdrawals);
router.post('/withdrawals/:id/approve', AdminController.approveWithdrawal);
router.post('/withdrawals/:id/reject', AdminController.rejectWithdrawal);
router.get('/reports', AdminController.getReports);
router.get('/reconciliation', AdminController.getReconciliation);

module.exports = router;
