// Aulas são criadas no site do GT (calendário por turma) e sincronizadas aqui como somente leitura para conferência.
// external_id = id da aula no site. Repetir o envio atualiza a data/título, sem duplicar.
const httpError = require('../utils/httpError');
const { text } = require('./validators');

function dateOf(value, field) {
  const v = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw httpError(400, `${field} inválida (use AAAA-MM-DD).`);
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) throw httpError(400, `${field} inválida.`);
  return v;
}

function parseAulas(body) {
  const turma = text(body?.turma, { field: 'Código da turma', max: 120 });
  const lista = Array.isArray(body?.aulas) ? body.aulas : null;
  if (!lista || lista.length === 0) throw httpError(400, 'Envie ao menos uma aula.');
  if (lista.length > 500) throw httpError(400, 'Envie no máximo 500 aulas por vez.');
  return {
    turma,
    aulas: lista.map((aula) => ({
      externalId: text(aula?.id, { field: 'Id da aula', max: 120 }),
      data: dateOf(aula?.data, 'Data da aula'),
      titulo: String(aula?.titulo || '').trim().slice(0, 160),
      horario: String(aula?.horario || '').trim().slice(0, 40),
      modulo: String(aula?.modulo || '').trim().slice(0, 200),
      professor: String(aula?.professor || '').trim().slice(0, 160)
    }))
  };
}

// Cria ou atualiza as aulas da turma. Devolve quantas foram criadas e atualizadas.
async function upsertAulas(client, body) {
  const { turma, aulas } = parseAulas(body);
  const { rows } = await client.query('select id, curso_id from turmas where external_id = $1', [turma]);
  if (!rows[0]) throw httpError(404, `Turma não encontrada: ${turma}. Envie a turma antes das aulas.`);
  const { id: turmaId, curso_id: cursoId } = rows[0];

  let criadas = 0;
  let atualizadas = 0;
  for (const aula of aulas) {
    const r = await client.query(
      `insert into attendance_sessions (course_id, turma_id, session_date, title, external_id, origem, horario, modulo, professor)
       values ($1, $2, $3, $4, $5, 'site', $6, $7, $8)
       on conflict (turma_id, external_id) where external_id is not null
       do update set session_date = excluded.session_date, title = excluded.title,
                     horario = excluded.horario, modulo = excluded.modulo, professor = excluded.professor
       returning (xmax = 0) as criada`,
      [cursoId, turmaId, aula.data, aula.titulo, aula.externalId, aula.horario, aula.modulo, aula.professor]
    );
    if (r.rows[0].criada) criadas += 1;
    else atualizadas += 1;
  }
  return { turmaId, criadas, atualizadas };
}

module.exports = { upsertAulas, parseAulas };
