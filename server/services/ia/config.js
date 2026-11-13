// Configuracao da IA, lida do .env (instrucoes completas em server/.env.example).
// A chave fica so no servidor: nunca vai para o navegador.
const { IaErro } = require('./erro');

const PROVEDORES = ['anthropic', 'openai', 'gemini'];

function lerConfig(env = process.env) {
  return {
    provedor: (env.IA_PROVEDOR || 'desativado').trim().toLowerCase(),
    modelo: (env.IA_MODELO || '').trim(),
    chave: (env.IA_API_KEY || '').trim(),
    baseUrl: (env.IA_BASE_URL || '').trim(),
    timeoutMs: Number(env.IA_TIMEOUT_MS) || 30000,
    maxTokensSaida: Number(env.IA_MAX_TOKENS_SAIDA) || 800,
    modulos: (env.IA_MODULOS_ATIVOS || '')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
  };
}

// Um modulo so funciona se o provedor estiver escolhido E o modulo estiver na lista IA_MODULOS_ATIVOS.
function moduloAtivo(modulo, env = process.env) {
  const cfg = lerConfig(env);
  return cfg.provedor !== 'desativado' && cfg.modulos.includes(modulo);
}

function validarConfig(cfg) {
  if (cfg.provedor === 'desativado') {
    throw new IaErro('desativado', 'Os recursos de IA estão desligados.');
  }
  if (!PROVEDORES.includes(cfg.provedor)) {
    throw new IaErro('config', `IA_PROVEDOR inválido: "${cfg.provedor}". Use anthropic, openai ou gemini.`, 500);
  }
  if (!cfg.modelo) throw new IaErro('config', 'IA_MODELO não definido.', 500);
  if (!cfg.chave) throw new IaErro('config', 'IA_API_KEY não definida.', 500);
}

module.exports = { lerConfig, moduloAtivo, validarConfig, PROVEDORES };
