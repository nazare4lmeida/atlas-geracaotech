const { gerarResposta, IaErro } = require('../services/ia');
const { montarSistemaTutor, textoDeHtml } = require('../services/ia/tutor');
const { calcularEstado } = require('../services/ia/estado');
const { registrarUso, lerLigada, salvarLigada, lerAula } = require('../db/iaRepo');

const MAX_PERGUNTA = 2000;

// Se o banco falhar, a IA aparece como desligada (o site continua funcionando).
async function ligadaNoPainel() {
  try {
    return await lerLigada();
  } catch (erro) {
    return false;
  }
}

// GET /api/ia/estado -> { ligada, configurada, motivo, provedor, modulos: { tutor } }
exports.estado = async (req, res) => {
  res.json(calcularEstado({ ligadaNoPainel: await ligadaNoPainel() }));
};

// PUT /api/ia/estado  { ligada: boolean }  (so administracao)
exports.definirEstado = async (req, res) => {
  const ligada = req.body?.ligada;
  if (typeof ligada !== 'boolean') {
    throw new IaErro('entrada', 'Informe "ligada" como true ou false.', 400);
  }
  await salvarLigada(ligada, req.user && req.user.id);
  res.json(calcularEstado({ ligadaNoPainel: ligada }));
};

// POST /api/ia/tutor  { pergunta, aulaId }  -> { resposta }
// O material da aula e lido no servidor pelo ID; o cliente nao envia texto.
exports.tutor = async (req, res) => {
  const estado = calcularEstado({ ligadaNoPainel: await ligadaNoPainel() });
  if (!estado.modulos.tutor) {
    throw new IaErro('desativado', 'O assistente de IA não está disponível agora.', 503);
  }

  const { pergunta, aulaId } = req.body || {};

  if (typeof pergunta !== 'string' || !pergunta.trim()) {
    throw new IaErro('entrada', 'Escreva a sua pergunta.', 400);
  }
  if (pergunta.length > MAX_PERGUNTA) {
    throw new IaErro('entrada', `A pergunta pode ter até ${MAX_PERGUNTA} caracteres.`, 400);
  }
  const id = Number(aulaId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new IaErro('entrada', 'Informe a aula.', 400);
  }
  const aula = await lerAula(id);
  if (!aula) {
    throw new IaErro('entrada', 'Aula não encontrada.', 404);
  }
  const material = `${aula.title || ''}\n${textoDeHtml(aula.content)}`;

  const usuarioId = req.user && req.user.id;
  try {
    const r = await gerarResposta({
      modulo: 'tutor',
      sistema: montarSistemaTutor(material),
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
