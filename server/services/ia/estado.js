// Estado da IA para o sistema: o administrador liga/desliga (ligadaNoPainel) e o .env diz se
// a IA esta configurada e quais modulos existem. O site nunca depende disso para funcionar.
const { lerConfig, validarConfig } = require('./config');

const MODULOS_CONHECIDOS = ['tutor'];

function calcularEstado({ env = process.env, ligadaNoPainel = false } = {}) {
  const cfg = lerConfig(env);

  let configurada = true;
  let motivo = '';
  try {
    validarConfig(cfg);
  } catch (erro) {
    configurada = false;
    motivo = erro.message;
  }

  const modulos = {};
  for (const m of MODULOS_CONHECIDOS) {
    // Um modulo so funciona com: IA ligada no painel + IA configurada + modulo listado no .env.
    modulos[m] = Boolean(ligadaNoPainel && configurada && cfg.modulos.includes(m));
  }

  return {
    ligada: Boolean(ligadaNoPainel),
    configurada,
    motivo,
    provedor: configurada ? cfg.provedor : null,
    modulos,
  };
}

module.exports = { calcularEstado, MODULOS_CONHECIDOS };
