const express = require('express');
const { login, me, changePassword } = require('../controllers/authController');
const rateLimit = require('../middleware/rateLimit');
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Sem cadastro público: contas são criadas e importadas pela gestão.
// Limite de tentativas por IP (além do bloqueio por conta).
router.post('/login', rateLimit({ windowMs: 15 * 60_000, max: 20 }), asyncHandler(login));
router.post('/change-password', authMiddleware, rateLimit({ windowMs: 15 * 60_000, max: 20 }), asyncHandler(changePassword));
router.get('/me', authMiddleware, asyncHandler(me));

module.exports = router;
