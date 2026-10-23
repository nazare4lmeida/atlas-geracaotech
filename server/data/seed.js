require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, withTransaction, closePool } = require('../db/pool');
const { migrate } = require('../db/migrate');
const { importCatalog } = require('../services/catalogImport');

// Recria uma base de demonstração: um usuário de cada papel, o catálogo original,
// matrículas e um grupo. Todas as contas usam a senha 123456.
// ATENÇÃO: apaga usuários, cursos, anotações e progresso. Use apenas em desenvolvimento.
async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  await migrate();

  await withTransaction(async (client) => {
    await client.query(`
      truncate table group_members, course_groups, enrollments, lesson_completions,
        quiz_results, course_progress, certificates, notes, quiz_questions, lessons,
        sections, courses, users
      restart identity cascade
    `);
  });

  await importCatalog();

  const password = await bcrypt.hash('123456', 10);

  const users = {};
  const accounts = [
    { key: 'admin', name: 'Admin Atlas', email: 'admin@atlas.local', role: 'admin' },
    { key: 'teacher', name: 'Professora Atlas', email: 'professor@atlas.local', role: 'teacher' },
    { key: 'student', name: 'Demo Atlas', email: 'demo@atlas.local', role: 'student', careerGoal: 'Full stack developer' },
    { key: 'student2', name: 'Aluna Teste', email: 'aluna@atlas.local', role: 'student' }
  ];

  for (const account of accounts) {
    const { rows } = await query(
      `insert into users (name, email, password_hash, role, career_goal)
       values ($1, $2, $3, $4, $5) returning id`,
      [account.name, account.email, password, account.role, account.careerGoal || '']
    );
    users[account.key] = rows[0].id;
  }

  const { rows: courses } = await query('select id, slug from courses order by created_at, slug');
  const firstCourse = courses[0];

  // Curso com autoinscrição desligada, para testar a regra de matrícula manual.
  await query("update courses set self_enrolment = false where slug = 'git-github'");

  await query(
    `insert into lesson_completions (user_id, lesson_id) values ($1, 'logic-1-1')`,
    [users.student]
  );

  await withTransaction(async (client) => {
    for (const course of courses) {
      await client.query(
        `insert into enrollments (course_id, user_id, role) values ($1, $2, 'teacher'), ($1, $3, 'student')`,
        [course.id, users.teacher, users.student]
      );
    }
    // A aluna só está matriculada no primeiro curso (os demais são de autoinscrição).
    await client.query(
      `insert into enrollments (course_id, user_id, role) values ($1, $2, 'student')`,
      [firstCourse.id, users.student2]
    );
  });

  const { rows: groupRows } = await query(
    `insert into course_groups (course_id, name, description)
     values ($1, 'Turma A', 'Grupo de demonstração') returning id`,
    [firstCourse.id]
  );

  await query(
    `insert into group_members (group_id, course_id, user_id)
     values ($1, $2, $3), ($1, $2, $4)`,
    [groupRows[0].id, firstCourse.id, users.student, users.student2]
  );

  await query(
    `insert into notes (user_id, title, content, tags) values ($1, $2, $3, $4)`,
    [
      users.student,
      'Primeira anotação',
      'Lembre-se: const evita reatribuição e melhora legibilidade.',
      ['javascript', 'fundamentos']
    ]
  );

  console.log('Base de demonstração criada com sucesso.');
  console.log('Contas (senha 123456):');
  accounts.forEach((account) => console.log(`  ${account.role.padEnd(8)} -> ${account.email}`));
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
