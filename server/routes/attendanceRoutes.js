const express = require('express');
const attendance = require('../controllers/attendanceController');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Registro de presença: admin e professores (a permissão por curso é conferida em cada rota).
router.use(requireRole('admin', 'teacher'));

router.get('/courses/:courseId/sessions', asyncHandler(attendance.listSessions));
router.post('/courses/:courseId/sessions', asyncHandler(attendance.createSession));
router.get('/courses/:courseId/export', asyncHandler(attendance.exportRows));
router.post('/courses/:courseId/import', asyncHandler(attendance.importRows));
router.get('/sessions/:sessionId/records', asyncHandler(attendance.sessionRecords));
router.put('/sessions/:sessionId/records', asyncHandler(attendance.saveRecords));
router.delete('/sessions/:sessionId', asyncHandler(attendance.deleteSession));

module.exports = router;
