const { hashIntegrationKey } = require('../services/integrationKeys');
const integracaoRepo = require('../db/integracaoRepo');

// Autentica chamadas de sistemas externos pelo cabeçalho X-Atlas-Key.
module.exports = async function integrationAuth(req, res, next) {
  try {
    const raw = req.get('x-atlas-key');
    if (!raw) return res.status(401).json({ message: 'Chave de integração ausente.' });
    const client = await integracaoRepo.findActiveClientByKeyHash(hashIntegrationKey(raw));
    if (!client) {
      await integracaoRepo.recordEvent({ tipo: 'autenticacao', sucesso: false, mensagem: 'chave inválida' });
      return res.status(401).json({ message: 'Chave de integração inválida.' });
    }
    req.integration = client;
    integracaoRepo.touchClient(client.id).catch(() => {});
    return next();
  } catch (error) {
    return next(error);
  }
};
