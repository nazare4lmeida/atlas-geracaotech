const atendimento = require('../db/atendimentoRepo');

const dataIso = (valor) => {
  const texto = String(valor || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
};

// Relatório completo (com o conteúdo das conversas): só para extração de acompanhamento.
exports.relatorioGestao = async (req, res) => {
  const linhas = await atendimento.relatorioCompleto({ de: dataIso(req.query.de), ate: dataIso(req.query.ate) });
  return res.json({ linhas });
};
