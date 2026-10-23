// Recebe um aluno aprovado e matriculado no site do GT e o registra no Atlas:
// conta de aluno (criada se não existir), matrícula na trilha, termos anexados e situação.
// O CPF identifica o aluno. Numa atualização, só os campos enviados são alterados.
const { withTransaction } = require('../db/pool');
const httpError = require('../utils/httpError');
const { digitsOf, isValidCpf, hashCpf, encryptCpf } = require('./cpf');
const { text, phone } = require('./validators');
const { upsertTurma, setTurmaDoAluno } = require('./turmaSync');

const SITUACAO = {
  ativo: { situacao: 'ativo', enrollment: 'active' },
  concluido: { situacao: 'concluido', enrollment: 'active' },
  desistente: { situacao: 'desistente', enrollment: 'suspended' },
  removido: { situacao: 'removido', enrollment: 'suspended' }
};
const MODALIDADES = ['Online', 'Presencial'];
const TERMO_TIPOS = ['matricula', 'aditivo'];

function dateValue(value, field) {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = String(value).trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime())) {
    throw httpError(400, `${field} inválida (use dd/mm/aaaa).`);
  }
  return iso;
}

function parseMatricula(body) {
  const digits = digitsOf(body.cpf);
  if (!isValidCpf(digits)) throw httpError(400, 'CPF inválido. Informe os 11 dígitos.');

  // Nome, e-mail e curso são obrigatórios só na criação (ver upsertMatricula).
  let email;
  if (body.email !== undefined && body.email !== '') {
    email = text(body.email, { field: 'E-mail', max: 160 }).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'E-mail inválido.');
  }

  const situacaoKey = body.situacao === undefined || body.situacao === '' ? 'ativo' : String(body.situacao).trim().toLowerCase();
  if (!SITUACAO[situacaoKey]) throw httpError(400, 'Situação inválida. Use ativo, concluido, desistente ou removido.');

  let modalidade;
  if (body.modalidade !== undefined && body.modalidade !== '') {
    if (!MODALIDADES.includes(body.modalidade)) throw httpError(400, 'Modalidade inválida. Use Online ou Presencial.');
    modalidade = body.modalidade;
  }

  const termos = Array.isArray(body.termos) ? body.termos.map((termo) => {
    const tipo = String(termo.tipo || 'matricula').toLowerCase();
    if (!TERMO_TIPOS.includes(tipo)) throw httpError(400, `Tipo de termo inválido: ${termo.tipo}.`);
    const numero = termo.numero === undefined ? 1 : Number(termo.numero);
    if (!Number.isInteger(numero) || numero < 1 || numero > 99) throw httpError(400, 'Número de termo inválido.');
    return {
      tipo,
      numero,
      link: String(termo.link || '').slice(0, 500),
      data_assinatura: dateValue(termo.data_assinatura, 'Data de assinatura')
    };
  }) : [];

  return {
    cpfDigits: digits,
    externalId: body.external_id !== undefined && body.external_id !== '' ? text(body.external_id, { field: 'external_id', max: 120 }) : undefined,
    nome: body.nome !== undefined && body.nome !== '' ? text(body.nome, { field: 'Nome', max: 160 }) : undefined,
    email,
    telefone: body.telefone !== undefined ? phone(body.telefone) : undefined,
    curso: body.curso !== undefined && body.curso !== '' ? text(body.curso, { field: 'Curso (slug)', max: 120 }) : undefined,
    modalidade,
    sede: body.sede !== undefined && body.sede !== '' ? text(body.sede, { field: 'Sede', max: 120 }) : undefined,
    turno: body.turno !== undefined ? text(body.turno, { field: 'Turno', max: 40, optional: true }) : undefined,
    situacao: SITUACAO[situacaoKey],
    dataMatricula: dateValue(body.data_matricula, 'Data da matrícula'),
    termos,
    turma: body.turma === undefined ? undefined : body.turma,
  };
}

async function findOrCreateAccount(client, data, cpfHash, matricula) {
  const byCpf = await client.query('select id, email from users where cpf_hash = $1', [cpfHash]);
  if (byCpf.rows[0]) {
    if (data.nome !== undefined || data.email !== undefined) {
      const email = data.email !== undefined ? data.email : byCpf.rows[0].email;
      const taken = await client.query('select 1 from users where email = $1 and id <> $2', [email, byCpf.rows[0].id]);
      if (taken.rows[0]) throw httpError(409, 'Este e-mail já está em uso por outra conta do Atlas.');
      await client.query('update users set name = coalesce($2, name), email = $3, updated_at = now() where id = $1', [byCpf.rows[0].id, data.nome || null, email]);
    }
    return { id: byCpf.rows[0].id, created: false };
  }
  if (matricula) throw httpError(409, 'A matrícula existe, mas a conta de aluno não foi encontrada.');
  const byEmail = await client.query('select id from users where email = $1', [data.email]);
  if (byEmail.rows[0]) throw httpError(409, 'Este e-mail já está em uso por outra conta do Atlas.');

  const { rows } = await client.query(
    `insert into users (name, email, password_hash, role, active, cpf_encrypted, cpf_hash, cpf_last2, must_change_password)
     values ($1, $2, null, 'student', true, $3, $4, $5, true) returning id`,
    [data.nome, data.email, encryptCpf(data.cpfDigits), cpfHash, data.cpfDigits.slice(-2)]
  );
  return { id: rows[0].id, created: true };
}

async function upsertMatricula(body) {
  const data = parseMatricula(body);
  const cpfHash = hashCpf(data.cpfDigits);

  return withTransaction(async (client) => {
    const existing = await client.query('select id from matriculas where cpf_hash = $1 for update', [cpfHash]);
    const isNew = !existing.rows[0];
    if (isNew && (!data.nome || !data.email || !data.curso)) {
      throw httpError(400, 'Nome, e-mail e curso são obrigatórios para uma nova matrícula.');
    }

    let courseId;
    if (data.curso !== undefined) {
      const course = await client.query('select id from courses where slug = $1', [data.curso]);
      if (!course.rows[0]) throw httpError(400, `Curso não encontrado: ${data.curso}.`);
      courseId = course.rows[0].id;
    } else {
      const current = await client.query('select curso_id from matriculas where cpf_hash = $1', [cpfHash]);
      courseId = current.rows[0].curso_id;
    }

    let sedeId;
    if (data.sede !== undefined) {
      const sede = await client.query('select id from sedes where lower(nome) = lower($1)', [data.sede]);
      if (!sede.rows[0]) throw httpError(400, `Sede não cadastrada: ${data.sede}.`);
      sedeId = sede.rows[0].id;
    }

    const account = await findOrCreateAccount(client, data, cpfHash, existing.rows[0]);

    // Matrícula na trilha: ativa ou suspensa conforme a situação.
    await client.query(
      `insert into enrollments (course_id, user_id, role, status) values ($1, $2, 'student', $3)
       on conflict (course_id, user_id) do update set status = excluded.status`,
      [courseId, account.id, data.situacao.enrollment]
    );

    const fields = {
      external_id: data.externalId, nome: data.nome, email: data.email, telefone: data.telefone,
      curso_id: courseId, modalidade: data.modalidade, sede_id: sedeId, turno: data.turno,
      situacao: data.situacao.situacao, data_matricula: data.dataMatricula
    };
    const present = Object.keys(fields).filter((key) => fields[key] !== undefined);

    let matriculaId;
    let created;
    if (existing.rows[0]) {
      created = false;
      matriculaId = existing.rows[0].id;
      const sets = present.map((key, i) => `${key} = $${i + 2}`);
      await client.query(
        `update matriculas set ${[...sets, 'user_id = $' + (present.length + 2), 'data_atualizacao = now()'].join(', ')} where id = $1`,
        [matriculaId, ...present.map((key) => fields[key]), account.id]
      );
    } else {
      created = true;
      const cols = ['cpf_encrypted', 'cpf_hash', 'cpf_last2', 'user_id', ...present];
      const params = [encryptCpf(data.cpfDigits), cpfHash, data.cpfDigits.slice(-2), account.id, ...present.map((key) => fields[key])];
      const { rows } = await client.query(
        `insert into matriculas (${cols.join(', ')}) values (${params.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
        params
      );
      matriculaId = rows[0].id;
    }

    // Quem saiu do curso sai também das turmas.
    if (data.situacao.situacao === 'desistente' || data.situacao.situacao === 'removido') {
      await client.query(`update turma_alunos set situacao = 'removido' where matricula_id = $1`, [matriculaId]);
    }

    // Turma atual: enviada pelo site. null remove de todas as turmas; ausente mantém como está.
    if (data.turma !== undefined) {
      const emCurso = data.situacao.situacao === 'ativo' || data.situacao.situacao === 'concluido';
      const turmaId = data.turma === null || !emCurso ? null : await upsertTurma(client, { curso: data.curso, ...data.turma });
      await setTurmaDoAluno(client, matriculaId, turmaId);
    }

    for (const termo of data.termos) {
      await client.query(
        `insert into matricula_termos (matricula_id, tipo, numero, link, data_assinatura)
         values ($1, $2, $3, $4, $5)
         on conflict (matricula_id, tipo, numero) do update
           set link = excluded.link, data_assinatura = excluded.data_assinatura`,
        [matriculaId, termo.tipo, termo.numero, termo.link, termo.data_assinatura || null]
      );
    }

    return { id: matriculaId, created, contaCriada: account.created };
  });
}

module.exports = { upsertMatricula, parseMatricula };
