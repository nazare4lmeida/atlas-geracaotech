// Gera uma chave de integração (ex.: para o site WordPress). Uso:
//   npm run integracao:chave -- "Site Geração Tech"
// A chave aparece uma única vez. Guarde-a no site; o Atlas guarda só o hash.
require('dotenv').config();
const { generateIntegrationKey, hashIntegrationKey } = require('../services/integrationKeys');
const integracaoRepo = require('../db/integracaoRepo');
const { closePool } = require('../db/pool');

(async () => {
  const nome = String(process.argv[2] || '').trim();
  if (!nome) {
    console.error('Informe um nome para a integração. Ex.: npm run integracao:chave -- "Site Geração Tech"');
    process.exit(1);
  }
  const key = generateIntegrationKey();
  const client = await integracaoRepo.createClient({ nome, keyHash: hashIntegrationKey(key) });
  console.log(`Integração criada: ${client.nome}`);
  console.log(`Chave (guarde agora, ela não será mostrada de novo):\n${key}`);
  await closePool();
})().catch(async (error) => {
  console.error('Falha ao criar a chave:', error.message);
  await closePool();
  process.exit(1);
});
