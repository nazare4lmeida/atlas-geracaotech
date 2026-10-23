const express = require('express');
const dashboard = require('../controllers/dashboardController');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Visão geral da gestão: administração e professores.
router.get('/gestao', requireRole('admin', 'teacher'), asyncHandler(dashboard.gestao));

module.exports = router;
