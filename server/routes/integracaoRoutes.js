const express = require('express');
const integrationAuth = require('../middleware/integrationAuth');
const rateLimit = require('../middleware/rateLimit');
const integracao = require('../controllers/integracaoController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Entrada para sistemas externos (site WordPress). Sempre autenticada por X-Atlas-Key.
// Vercel Cron chama esta rota todo dia, com "Authorization: Bearer CRON_SECRET". Fica antes da chave de integração.
function cronAuth(req, res, next) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.authorization !== `Bearer ${segredo}`) {
    return res.status(401).json({ message: 'Não autorizado.' });
  }
  return next();
}
router.get('/cron/lembretes-prazo', cronAuth, asyncHandler(integracao.lembretesPrazo));

router.use(integrationAuth);
router.use(rateLimit({ windowMs: 60_000, max: 120 }));

router.get('/ping', asyncHandler(integracao.ping));
router.post('/matriculas', asyncHandler(integracao.receberMatricula));
router.post('/turmas', asyncHandler(integracao.receberTurma));
router.post('/aulas', asyncHandler(integracao.receberAulas));
router.post('/lembretes-prazo', asyncHandler(integracao.lembretesPrazo));

module.exports = router;
