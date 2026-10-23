const { query, withTransaction } = require('./pool');

// Presença por curso: uma sessão (dia de aula) e um registro por aluno matriculado.
// Percentual = (presentes + justificados) sobre as sessões já realizadas (data até hoje).

const STATUSES = ['presente', 'ausente', 'justificado'];

function mapSession(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    date: new Date(row.session_date).toISOString().slice(0, 10),
    title: row.title,
    presentes: row.presentes ?? 0,
    ausentes: row.ausentes ?? 0,
    justificados: row.justificados ?? 0,
    registrados: row.registrados ?? 0,
    alunos: row.alunos ?? 0
  };
}

async function listSessions(courseId) {
  const { rows } = await query(
    `select s.*,
            count(r.user_id) filter (where r.status = 'presente')::int as presentes,
            count(r.user_id) filter (where r.status = 'ausente')::int as ausentes,
            count(r.user_id) filter (where r.status = 'justificado')::int as justificados,
            count(r.user_id)::int as registrados,
            (select count(*)::int from enrollments e where e.course_id = s.course_id and e.role = 'student') as alunos
       from attendance_sessions s
       left join attendance_records r on r.session_id = s.id
      where s.course_id = $1
      group by s.id
      order by s.session_date, s.created_at`,
    [courseId]
  );
  return rows.map(mapSession);
}

async function createSession(courseId, { date, title }) {
  const { rows } = await query(
    'insert into attendance_sessions (course_id, session_date, title) values ($1, $2, $3) returning *',
    [courseId, date, title || '']
  );
  return mapSession({ ...rows[0], presentes: 0, ausentes: 0, justificados: 0, registrados: 0, alunos: 0 });
}

async function findSession(sessionId) {
  const { rows } = await query('select * from attendance_sessions where id = $1', [sessionId]);
  return rows[0] ? mapSession(rows[0]) : null;
}

async function deleteSession(sessionId) {
  const { rowCount } = await query('delete from attendance_sessions where id = $1', [sessionId]);
  return rowCount > 0;
}

// Lista da sessão: todos os alunos matriculados, com o status registrado (ou null).
async function sessionRecords(sessionId, courseId) {
  const { rows } = await query(
    `select u.id as user_id, u.name, u.email, u.cpf_last2, r.status, r.note, r.origem, r.tipo_justificativa
       from enrollments e
       join users u on u.id = e.user_id
       left join attendance_records r on r.user_id = u.id and r.session_id = $1
      where e.course_id = $2 and e.role = 'student'
      order by u.name`,
    [sessionId, courseId]
  );
  return rows.map((row) => ({
    userId: row.user_id,
    name: row.name,
    email: row.email,
    cpfMasked: row.cpf_last2 ? `***.***.***-${row.cpf_last2}` : '',
    status: row.status || null,
    note: row.note || '',
    origem: row.origem || null,
    tipoJustificativa: row.tipo_justificativa || null
  }));
}

// Grava vários registros de uma vez. Só alunos matriculados no curso da sessão são aceitos.
// tipo (só com status justificado): 'aceita' ou 'abonada'. origem: 'gestao' (padrão) ou 'importacao'.
async function upsertRecords(sessionId, courseId, records, recordedBy, origem = 'gestao') {
  return withTransaction(async (client) => {
    const { rows: enrolled } = await client.query(
      "select user_id from enrollments where course_id = $1 and role = 'student'",
      [courseId]
    );
    const allowed = new Set(enrolled.map((row) => row.user_id));
    let saved = 0;
    for (const record of records) {
      if (!allowed.has(record.userId)) continue;
      if (record.status === null) {
        await client.query('delete from attendance_records where session_id = $1 and user_id = $2', [sessionId, record.userId]);
      } else {
        const tipo = record.status === 'justificado' ? record.tipo || 'aceita' : null;
        await client.query(
          `insert into attendance_records (session_id, user_id, status, note, recorded_by, updated_at, origem, tipo_justificativa, marcado_em)
           values ($1, $2, $3, $4, $5, now(), $6, $7, now())
           on conflict (session_id, user_id)
           do update set status = excluded.status, note = excluded.note, recorded_by = excluded.recorded_by,
                         updated_at = now(), origem = excluded.origem, tipo_justificativa = excluded.tipo_justificativa,
                         marcado_em = excluded.marcado_em`,
          [sessionId, record.userId, record.status, record.note || '', recordedBy, origem, tipo]
        );
      }
      saved += 1;
    }
    return saved;
  });
}

// Presença do próprio aluno, curso a curso.
async function studentAttendance(userId) {
  const { rows } = await query(
    `select c.id as course_id, c.title, c.slug,
            count(s.id) filter (where s.session_date <= current_date)::int as sessoes,
            count(r.user_id) filter (where r.status = 'presente' and s.session_date <= current_date)::int as presentes,
            count(r.user_id) filter (where r.status = 'justificado' and s.session_date <= current_date)::int as justificados,
            count(r.user_id) filter (where r.status = 'ausente' and s.session_date <= current_date)::int as ausentes
       from enrollments e
       join courses c on c.id = e.course_id
       left join attendance_sessions s on s.course_id = c.id
       left join attendance_records r on r.session_id = s.id and r.user_id = e.user_id
      where e.user_id = $1 and e.role = 'student'
      group by c.id, c.title, c.slug
      order by c.title`,
    [userId]
  );
  return rows.map((row) => {
    const attended = row.presentes + row.justificados;
    return {
      courseId: row.course_id,
      slug: row.slug,
      title: row.title,
      sessoes: row.sessoes,
      presentes: row.presentes,
      justificados: row.justificados,
      ausentes: row.ausentes,
      percentual: row.sessoes ? Math.round((attended / row.sessoes) * 100) : null
    };
  });
}

// Dados para a visão da gestão: uma linha por aluno e sessão (exportação e relatórios).
async function attendanceRowsForCourse(courseId) {
  const { rows } = await query(
    `select s.session_date, s.title as session_title, u.name, u.email, u.cpf_last2, r.status, r.note
       from attendance_sessions s
       join enrollments e on e.course_id = s.course_id and e.role = 'student'
       join users u on u.id = e.user_id
       left join attendance_records r on r.session_id = s.id and r.user_id = u.id
      where s.course_id = $1
      order by s.session_date, u.name`,
    [courseId]
  );
  return rows.map((row) => ({
    date: new Date(row.session_date).toISOString().slice(0, 10),
    sessionTitle: row.session_title,
    name: row.name,
    email: row.email,
    cpfMasked: row.cpf_last2 ? `***.***.***-${row.cpf_last2}` : '',
    status: row.status || '',
    note: row.note || ''
  }));
}

module.exports = {
  STATUSES,
  listSessions,
  createSession,
  findSession,
  deleteSession,
  sessionRecords,
  upsertRecords,
  studentAttendance,
  attendanceRowsForCourse,
  presenceByEnrollment
};

// Presença de todos os alunos, por matrícula: Map("cursoId:alunoId" -> { sessoes, presentes, ... }).
async function presenceByEnrollment() {
  const { rows } = await query(
    `select e.course_id, e.user_id,
            count(s.id) filter (where s.session_date <= current_date)::int as sessoes,
            count(r.user_id) filter (where r.status = 'presente' and s.session_date <= current_date)::int as presentes,
            count(r.user_id) filter (where r.status = 'justificado' and s.session_date <= current_date)::int as justificados,
            count(r.user_id) filter (where r.status = 'ausente' and s.session_date <= current_date)::int as ausentes
       from enrollments e
       left join attendance_sessions s on s.course_id = e.course_id
       left join attendance_records r on r.session_id = s.id and r.user_id = e.user_id
      where e.role = 'student'
      group by e.course_id, e.user_id`
  );
  const map = new Map();
  for (const row of rows) {
    const attended = row.presentes + row.justificados;
    map.set(`${row.course_id}:${row.user_id}`, {
      sessoes: row.sessoes,
      presentes: row.presentes,
      justificados: row.justificados,
      ausentes: row.ausentes,
      percentual: row.sessoes ? Math.round((attended / row.sessoes) * 100) : null
    });
  }
  return map;
}

