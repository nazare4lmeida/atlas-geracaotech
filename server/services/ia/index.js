// Ponto unico de acesso a IA no Atlas. O resto do sistema chama gerarResposta() e nao conhece o provedor.
// Trocar de IA = mudar IA_PROVEDOR, IA_MODELO e IA_API_KEY no .env. Nenhum codigo muda.
const { IaErro } = require('./erro');
const { lerConfig, moduloAtivo, validarConfig } = require('./config');

const ADAPTADORES = {
  anthropic: require('./provedores/anthropic'),
  openai: require('./provedores/openai'),
  gemini: require('./provedores/gemini'),
};

const MAX_MENSAGENS = 20;
const MAX_CARACTERES_MENSAGEM = 8000;

function normalizarMensagens(mensagens) {
  if (!Array.isArray(mensagens) || mensagens.length === 0) {
    throw new IaErro('entrada', 'Envie ao menos uma mensagem.', 400);
  }
  if (mensagens.length > MAX_MENSAGENS) {
    throw new IaErro('entrada', `Use no máximo ${MAX_MENSAGENS} mensagens.`, 400);
  }
  return mensagens.map((m) => {
    const papel = m && m.role === 'assistant' ? 'assistant' : 'user';
    const conteudo = typeof m?.content === 'string' ? m.content.trim() : '';
    if (!conteudo) throw new IaErro('entrada', 'Há uma mensagem vazia.', 400);
    if (conteudo.length > MAX_CARACTERES_MENSAGEM) {
      throw new IaErro('entrada', `Cada mensagem pode ter até ${MAX_CARACTERES_MENSAGEM} caracteres.`, 400);
    }
    return { role: papel, content: conteudo };
  });
}

// Chamada generica. Devolve { texto, provedor, modelo, tokensEntrada, tokensSaida }.
async function gerarResposta(
  { modulo, sistema = '', mensagens, maxTokens },
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  if (!moduloAtivo(modulo, env)) {
    throw new IaErro('desativado', 'Este recurso de IA não está ativo.', 503);
  }
  const cfg = lerConfig(env);
  validarConfig(cfg);

  const msgs = normalizarMensagens(mensagens);
  const limite = Math.min(Number(maxTokens) || cfg.maxTokensSaida, cfg.maxTokensSaida);
  const adaptador = ADAPTADORES[cfg.provedor];

  const r = await adaptador.chamar({
    chave: cfg.chave,
    modelo: cfg.modelo,
    baseUrl: cfg.baseUrl,
    sistema,
    mensagens: msgs,
    maxTokens: limite,
    timeoutMs: cfg.timeoutMs,
    fetchImpl,
  });

  return { ...r, provedor: cfg.provedor, modelo: cfg.modelo };
}

module.exports = { gerarResposta, normalizarMensagens, IaErro };
