const express = require('express');
const { getDashboard } = require('../controllers/userController');
const { listUsers, createUser, updateUser, deleteUser, exportUsers, importUsers } = require('../controllers/adminUserController');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/dashboard', asyncHandler(getDashboard));

// Gestão de contas: somente administradores.
router.get('/', requireRole('admin'), asyncHandler(listUsers));
router.get('/export', requireRole('admin'), asyncHandler(exportUsers));
router.post('/import', requireRole('admin'), asyncHandler(importUsers));
router.post('/', requireRole('admin'), asyncHandler(createUser));
router.patch('/:id', requireRole('admin'), asyncHandler(updateUser));
router.delete('/:id', requireRole('admin'), asyncHandler(deleteUser));

module.exports = router;
