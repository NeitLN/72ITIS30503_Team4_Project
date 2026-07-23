const express = require('express');
const adminTransactionService = require('../services/adminTransactionService');
const { authenticateUser, requireDatabaseAdmin } = require('../middleware/auth');
const { success, error } = require('../utils/apiResponse');

const router = express.Router();
router.use(authenticateUser, requireDatabaseAdmin);

function handleAdminTransactionError(err, res, fallbackMessage) {
  if (err?.status) return error(res, err.status, err.message, err.details, err.code);
  console.error(fallbackMessage, { code: err?.code || 'UNEXPECTED_ERROR' });
  return error(res, 500, 'Đã xảy ra lỗi hệ thống.', undefined, 'INTERNAL_ERROR');
}

router.get('/summary', async (req, res) => {
  try {
    const summary = await adminTransactionService.getTransactionSummary(req.user);
    return success(res, summary);
  } catch (err) {
    return handleAdminTransactionError(err, res, 'Admin transaction summary failed:');
  }
});

router.get('/', async (req, res) => {
  try {
    const { rows, meta } = await adminTransactionService.listTransactions(req.user, req.query);
    return success(res, rows, meta);
  } catch (err) {
    return handleAdminTransactionError(err, res, 'Admin transaction list failed:');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const transaction = await adminTransactionService.getTransaction(req.user, req.params.id);
    return success(res, transaction);
  } catch (err) {
    return handleAdminTransactionError(err, res, 'Admin transaction detail failed:');
  }
});

router.post('/:id/actions', async (req, res) => {
  try {
    const result = await adminTransactionService.transitionTransaction(req.user, req.params.id, req.body);
    return success(res, result);
  } catch (err) {
    return handleAdminTransactionError(err, res, 'Admin transaction action failed:');
  }
});

module.exports = router;
