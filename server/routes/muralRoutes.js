const express = require("express");
const mural = require("../controllers/muralController");
const requireRole = require("../middleware/roleMiddleware");
const asyncHandler = require("../utils/asyncHandler");

// Mural: espaços (turmas e grupos), publicações, respostas, denúncias e filtro de palavras.
// A regra de acesso a cada espaço fica no controlador.
const router = express.Router();

router.get("/espacos", asyncHandler(mural.listarEspacos));
router.get("/espacos/:tipo/:id/posts", asyncHandler(mural.listarPosts));
router.post("/espacos/:tipo/:id/posts", asyncHandler(mural.criarPost));

router.get("/posts/:id", asyncHandler(mural.detalharPost));
router.patch("/posts/:id", asyncHandler(mural.atualizarPost));
router.delete("/posts/:id", asyncHandler(mural.excluirPost));
router.post("/posts/:id/respostas", asyncHandler(mural.responder));

router.patch("/respostas/:id", asyncHandler(mural.ocultarResposta));
router.delete("/respostas/:id", asyncHandler(mural.excluirResposta));

// Denúncias e expulsão do curso.
router.post("/denuncias", asyncHandler(mural.denunciar));
router.get("/denuncias", requireRole("admin", "atendente", "gestao", "teacher"), asyncHandler(mural.listarDenuncias));
router.post("/denuncias/:id/decisao", requireRole("admin", "atendente", "gestao", "teacher"), asyncHandler(mural.decidirDenuncia));
router.post("/expulsar", requireRole("admin", "teacher"), asyncHandler(mural.expulsarAutor));

// Lista de palavras bloqueadas: a administração altera; a equipe lê.
router.get("/filtro", requireRole("admin", "atendente", "gestao", "teacher"), asyncHandler(mural.lerFiltro));
router.put("/filtro", requireRole("admin"), asyncHandler(mural.salvarFiltro));

module.exports = router;
