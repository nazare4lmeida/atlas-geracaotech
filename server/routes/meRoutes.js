const express = require('express');
const me = require('../controllers/meController');
const attendance = require('../controllers/attendanceController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/boas-vindas', asyncHandler(me.markWelcomeSeen));
router.get('/overview', asyncHandler(me.getOverview));
router.get('/home', asyncHandler(me.getHome));
router.patch('/profile', asyncHandler(me.updateProfile));
router.get('/reminders', asyncHandler(me.listReminders));
router.post('/reminders', asyncHandler(me.createReminder));
router.patch('/reminders/:id', asyncHandler(me.updateReminder));
router.delete('/reminders/:id', asyncHandler(me.deleteReminder));
// Declaração de matrícula: gerada na hora, em PDF, para o próprio aluno (sem aprovação da gestão).
router.get('/declarations/matricula/:slug', asyncHandler(me.matriculaPdf));
router.get('/logins', asyncHandler(me.loginHistory));
router.get('/attendance', asyncHandler(attendance.studentAttendance));

module.exports = router;
