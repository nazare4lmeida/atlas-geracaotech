const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verifyCertificate } = require('../controllers/verifyController');

const router = express.Router();

router.get('/:code', asyncHandler(verifyCertificate));

module.exports = router;
