const express = require('express');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate
} = require('../controllers/certificateController');

const router = express.Router();

router.use(requireRole('admin'));
router.get('/', asyncHandler(listTemplates));
router.post('/', asyncHandler(createTemplate));
router.get('/:id', asyncHandler(getTemplate));
router.put('/:id', asyncHandler(updateTemplate));
router.delete('/:id', asyncHandler(deleteTemplate));

module.exports = router;