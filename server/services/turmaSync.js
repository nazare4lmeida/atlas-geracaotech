// Turmas são definidas no site do GT e sincronizadas aqui (external_id = código da turma no site).
// A composição de alunos segue o que o site envia: quem não está mais na turma é marcado como removido.
const httpError = require('../utils/httpError');
const { text } = require('./validators');

const MODALIDADES = ['Online', 'Presencial'];

function parseTurma(body) {
  if (!body || typeof body !== 'object') throw httpError(400, 'Dados da turma inválidos.');
  const modalidade = body.modalidade && body.modalidade !== '' ? body.modalidade : undefined;
  if (modalidade !== undefined && !MODALIDADES.includes(modalidade)) throw httpError(400, 'Modalidade inválida. Use Online ou Presencial.');
  const dateOf = (value, field) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw httpError(400, `${field} inválida (use AAAA-MM-DD).`);
    return String(value);
  };
  return {
    codigo: text(body.codigo, { field: 'Código da turma', max: 120 }),
    nome: body.nome !== undefined && body.nome !== '' ? text(body.nome, { field: 'Nome da turma', max: 160 }) : undefined,
    curso: body.curso !== undefined && body.curso !== '' ? text(body.curso, { field: 'Curso (slug)', max: 120 }) : undefined,
    sede: body.sede !== undefined && body.sede !== '' ? text(body.sede, { field: 'Sede', max: 120 }) : undefined,
    modalidade,
    turno: body.turno !== undefined ? text(body.turno, { field: 'Turno', max: 40, optional: true }) : undefined,
    dias_semana: body.dias_semana !== undefined ? text(body.dias_semana, { field: 'Dias da semana', max: 60, optional: true }) : undefined,
    horario: body.horario !== undefined ? text(body.horario, { field: 'Horário', max: 60, optional: true }) : undefined,
    data_inicio: dateOf(body.data_inicio, 'Data de início'),
    data_fim: dateOf(body.data_fim, 'Data de término'),
    ativa: body.ativa === undefined ? undefined : Boolean(body.ativa)
  };
}

// Cria ou atualiza a turma pelo código do site. Devolve o id interno.
async function upsertTurma(client, body) {
  const data = parseTurma(body);
  const found = await client.query('select id from turmas where external_id = $1 for update', [data.codigo]);

  let courseId;
  if (data.curso !== undefined) {
    const c = await client.query('select id from courses where slug = $1', [data.curso]);
    if (!c.rows[0]) throw httpError(400, `Curso não encontrado: ${data.curso}.`);
    courseId = c.rows[0].id;
  }
  let sedeId;
  if (data.sede !== undefined) {
    const sd = await client.query('select id from sedes where lower(nome) = lower($1)', [data.sede]);
    if (!sd.rows[0]) throw httpError(400, `Sede não cadastrada: ${data.sede}.`);
    sedeId = sd.rows[0].id;
  }

  const fields = { nome: data.nome, curso_id: courseId, sede_id: sedeId, modalidade: data.modalidade, turno: data.turno,
    dias_semana: data.dias_semana, horario: data.horario, data_inicio: data.data_inicio, data_fim: data.data_fim, ativa: data.ativa };
  const present = Object.keys(fields).filter((key) => fields[key] !== undefined);

  if (found.rows[0]) {
    if (present.length) {
      await client.query(`update turmas set ${present.map((k, i) => `${k} = $${i + 2}`).join(', ')} where id = $1`,
        [found.rows[0].id, ...present.map((k) => fields[k])]);
    }
    return found.rows[0].id;
  }
  if (!data.nome || !courseId) throw httpError(400, 'Nome e curso são obrigatórios para uma nova turma.');
  const cols = ['external_id', 'curso_id', ...present.filter((k) => k !== 'curso_id')];
  const values = [data.codigo, courseId, ...present.filter((k) => k !== 'curso_id').map((k) => fields[k])];
  const { rows } = await client.query(
    `insert into turmas (${cols.join(', ')}) values (${values.map((_, i) => `$${i + 1}`).join(', ')}) returning id`, values);
  return rows[0].id;
}

// Define a turma atual de um aluno: ativa na turma informada e removida das demais.
async function setTurmaDoAluno(client, matriculaId, turmaId) {
  await client.query(`update turma_alunos set situacao = 'removido' where matricula_id = $1 and ($2::uuid is null or turma_id <> $2)`, [matriculaId, turmaId || null]);
  if (turmaId) {
    await client.query(
      `insert into turma_alunos (turma_id, matricula_id, situacao) values ($1, $2, 'ativo')
       on conflict (turma_id, matricula_id) do update set situacao = 'ativo'`,
      [turmaId, matriculaId]);
  }
}

module.exports = { upsertTurma, setTurmaDoAluno, parseTurma };
