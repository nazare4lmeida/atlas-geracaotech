require('dotenv').config();
const { closePool } = require('../db/pool');
const { syncCatalog } = require('../services/catalogImport');

// Adiciona ao banco os cursos do catálogo que ainda não existem (pelo slug).
// Não apaga cursos, matrículas nem progresso. Pode ser executado quantas vezes for preciso.
syncCatalog()
  .then((added) => {
    if (added.length === 0) {
      console.log('Catálogo já está completo. Nenhum curso foi adicionado.');
    } else {
      console.log(`Cursos adicionados (${added.length}):`);
      added.forEach((slug) => console.log(`  + ${slug}`));
    }
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
