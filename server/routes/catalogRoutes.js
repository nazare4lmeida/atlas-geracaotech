const express = require('express');
const { listCatalog } = require('../controllers/courseController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Catálogo público (sem login), usado na página inicial.
router.get('/', asyncHandler(listCatalog));

module.exports = router;
