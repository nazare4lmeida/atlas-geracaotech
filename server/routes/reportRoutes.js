const express = require('express');
const reports = require('../controllers/reportController');
const management = require('../controllers/managementController');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Acompanhamento e acessos: somente administradores.
router.use(requireRole('admin'));

router.get('/enrollments', asyncHandler(reports.enrollmentReport));
router.get('/operacao/marcos', asyncHandler(reports.operacaoMarcos));
router.get('/operacao/alunos', asyncHandler(reports.operacaoAlunos));
router.get('/logins', asyncHandler(management.listLogins));

module.exports = router;
