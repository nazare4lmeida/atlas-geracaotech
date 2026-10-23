const express = require('express');
const {
  listNotes,
  createNote,
  updateNote,
  deleteNote
} = require('../controllers/noteController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(listNotes));
router.post('/', asyncHandler(createNote));
router.put('/:id', asyncHandler(updateNote));
router.delete('/:id', asyncHandler(deleteNote));

module.exports = router;
