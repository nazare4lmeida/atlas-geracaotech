const crypto = require('crypto');

// Chaves de integração (ex.: site WordPress). A chave é mostrada uma única vez na criação;
// no banco fica só o hash SHA-256.
const PREFIX = 'atl_';

function generateIntegrationKey() {
  return PREFIX + crypto.randomBytes(32).toString('base64url');
}

function hashIntegrationKey(rawKey) {
  return crypto.createHash('sha256').update(String(rawKey || '')).digest('hex');
}

module.exports = { generateIntegrationKey, hashIntegrationKey, PREFIX };
