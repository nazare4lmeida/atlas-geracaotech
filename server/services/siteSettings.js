const { query } = require('../db/pool');
const { mediaUrl } = require('./mediaStorage');
const httpError = require('../utils/httpError');

// Só valores desta lista são aceitos: o editor escolhe, nunca digita CSS.
const FONTES = ['sistema', 'inter', 'roboto', 'lora'];
const LARGURAS = ['estreita', 'padrao', 'larga'];
const PADRAO = {
  corPrimaria: null,
  corDestaque: null,
  fonte: 'sistema',
  imagemFundoCaminho: null,
  opacidadeFundo: 90,
  larguraConteudo: 'padrao'
};

function cor(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor !== 'string' || !/^#[0-9a-f]{6}$/i.test(valor)) {
    throw httpError(400, 'Cor inválida. Use o formato #RRGGBB.');
  }
  return valor.toLowerCase();
}

function normalizar(entrada = {}) {
  let opacidade = Number(entrada.opacidadeFundo);
  if (!Number.isFinite(opacidade)) opacidade = PADRAO.opacidadeFundo;
  const caminho = entrada.imagemFundoCaminho || null;
  if (caminho !== null && (typeof caminho !== 'string' || caminho.length > 300 || !/^[\w\-/.]+$/.test(caminho) || caminho.includes('..'))) {
    throw httpError(400, 'Imagem de fundo inválida.');
  }
  return {
    corPrimaria: cor(entrada.corPrimaria),
    corDestaque: cor(entrada.corDestaque),
    fonte: FONTES.includes(entrada.fonte) ? entrada.fonte : 'sistema',
    imagemFundoCaminho: caminho,
    opacidadeFundo: Math.min(100, Math.max(0, Math.round(opacidade))),
    larguraConteudo: LARGURAS.includes(entrada.larguraConteudo) ? entrada.larguraConteudo : 'padrao'
  };
}

// Link assinado é novo a cada leitura (o da imagem expira em horas).
function paraCliente(valor) {
  const c = normalizar({ ...PADRAO, ...(valor || {}) });
  return { ...c, imagemFundo: c.imagemFundoCaminho ? mediaUrl(c.imagemFundoCaminho) : null };
}

async function buscarAparencia() {
  const { rows } = await query(`select valor from site_settings where chave = 'aparencia'`);
  return paraCliente(rows[0]?.valor);
}

async function salvarAparencia(entrada, userId) {
  const valor = normalizar(entrada);
  await query(
    `insert into site_settings (chave, valor, atualizado_em, atualizado_por)
     values ('aparencia', $1, now(), $2)
     on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = excluded.atualizado_por`,
    [JSON.stringify(valor), userId]
  );
  return paraCliente(valor);
}

module.exports = { buscarAparencia, salvarAparencia };
