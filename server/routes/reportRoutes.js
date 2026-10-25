const express = require('express');
const reports = require('../controllers/reportController');
const management = require('../controllers/managementController');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Acompanhamento: administração e gestão. Logins continuam só da administração.

router.get('/enrollments', requireRole('admin', 'gestao'), asyncHandler(reports.enrollmentReport));
router.get('/operacao/marcos', requireRole('admin', 'gestao'), asyncHandler(reports.operacaoMarcos));
router.get('/operacao/alunos', requireRole('admin', 'gestao'), asyncHandler(reports.operacaoAlunos));
router.get('/logins', requireRole('admin'), asyncHandler(management.listLogins));

module.exports = router;
