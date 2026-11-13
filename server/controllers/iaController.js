const { gerarResposta, IaErro } = require('../services/ia');
const { montarSistemaTutor } = require('../services/ia/tutor');
const { registrarUso } = require('../db/iaRepo');

const MAX_PERGUNTA = 2000;
const MAX_CONTEXTO = 20000;

// POST /api/ia/tutor  { pergunta, contexto? }  -> { resposta }
exports.tutor = async (req, res) => {
  const { pergunta, contexto = '' } = req.body || {};

  if (typeof pergunta !== 'string' || !pergunta.trim()) {
    throw new IaErro('entrada', 'Escreva a sua pergunta.', 400);
  }
  if (pergunta.length > MAX_PERGUNTA) {
    throw new IaErro('entrada', `A pergunta pode ter até ${MAX_PERGUNTA} caracteres.`, 400);
  }
  if (typeof contexto !== 'string' || contexto.length > MAX_CONTEXTO) {
    throw new IaErro('entrada', 'O material enviado é grande demais.', 400);
  }

  const usuarioId = req.user && req.user.id;
  try {
    const r = await gerarResposta({
      modulo: 'tutor',
      sistema: montarSistemaTutor(contexto),
      mensagens: [{ role: 'user', content: pergunta }],
    });
    await registrarUso({
      usuarioId, modulo: 'tutor', provedor: r.provedor, modelo: r.modelo,
      status: 'ok', tokensEntrada: r.tokensEntrada, tokensSaida: r.tokensSaida,
    }).catch(() => {});
    return res.json({ resposta: r.texto });
  } catch (erro) {
    const codigo = erro instanceof IaErro ? erro.codigo : 'erro';
    if (codigo !== 'entrada') {
      await registrarUso({
        usuarioId, modulo: 'tutor', provedor: process.env.IA_PROVEDOR, modelo: process.env.IA_MODELO,
        status: 'erro', codigoErro: codigo,
      }).catch(() => {});
    }
    throw erro;
  }
};
