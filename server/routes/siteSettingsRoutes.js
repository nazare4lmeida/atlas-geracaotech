const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/siteSettingsController');

const router = express.Router();

// Leitura pública: o tema é aplicado antes do login. Gravação: admin e editor.
router.get('/aparencia', asyncHandler(controller.obterAparencia));
router.put('/aparencia', authMiddleware, requireRole('admin', 'editor'), asyncHandler(controller.salvarAparencia));

module.exports = router;
