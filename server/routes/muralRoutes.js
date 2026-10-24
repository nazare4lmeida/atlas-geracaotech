const express = require("express");
const mural = require("../controllers/muralController");
const asyncHandler = require("../utils/asyncHandler");

// Mural da turma: avisos e dúvidas. A regra de acesso fica no controlador.
const router = express.Router();

router.get("/turmas", asyncHandler(mural.listarTurmas));
router.get("/turmas/:turmaId/posts", asyncHandler(mural.listarPosts));
router.post("/turmas/:turmaId/posts", asyncHandler(mural.criarPost));
router.get("/posts/:id", asyncHandler(mural.detalharPost));
router.patch("/posts/:id", asyncHandler(mural.atualizarPost));
router.delete("/posts/:id", asyncHandler(mural.excluirPost));
router.post("/posts/:id/respostas", asyncHandler(mural.responder));
router.delete("/respostas/:id", asyncHandler(mural.excluirResposta));

module.exports = router;
