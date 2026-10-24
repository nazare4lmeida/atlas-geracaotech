const express = require('express');
const accounts = require('../controllers/accountAdminController');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireRole('admin'));

router.post('/:userId/reset-first-access', asyncHandler(accounts.resetFirstAccess));
router.post('/:userId/unlock', asyncHandler(accounts.unlock));
router.post('/:userId/set-password', asyncHandler(accounts.setPassword));

module.exports = router;
