require('dotenv').config();
const { query, closePool } = require('../db/pool');

// Uso: npm run set-role -- <email> <admin|teacher|student>
// Serve para criar o primeiro administrador em um banco já existente.
async function main() {
  const [email, role] = process.argv.slice(2);
  const validRoles = ['admin', 'teacher', 'student', 'atendente', 'gestao', 'editor'];

  if (!email || !validRoles.includes(role)) {
    console.error('Uso: npm run set-role -- <email> <admin|teacher|student>');
    process.exitCode = 1;
    return;
  }

  const { rows } = await query(
    'update users set role = $2, updated_at = now() where email = $1 returning email, role',
    [email.toLowerCase().trim(), role]
  );

  if (rows.length === 0) {
    console.error(`Nenhum usuário encontrado com o e-mail ${email}.`);
    process.exitCode = 1;
  } else {
    console.log(`Papel de ${rows[0].email} definido como "${rows[0].role}".`);
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
