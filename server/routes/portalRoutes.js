const express = require("express");
const portal = require("../controllers/portalController");
const asyncHandler = require("../utils/asyncHandler");

// Portal do aluno: turma e documentos (termos e aditivos).
const router = express.Router();

router.get("/turma", asyncHandler(portal.turmaAtual));
router.get("/documentos", asyncHandler(portal.documentos));

module.exports = router;
