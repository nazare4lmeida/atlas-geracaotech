const courseRepo = require('../db/courseRepo');
const attendanceRepo = require('../db/attendanceRepo');
const { requireManageAccess } = require('../services/access');
const { digitsOf, hashCpf } = require('../services/cpf');
const { isoDate } = require('../services/validators');
const httpError = require('../utils/httpError');
const { query } = require('../db/pool');

// Presença: quem gerencia o curso (admin ou professor do curso) registra e importa; o aluno só vê a dele.

async function courseOr404(courseId) {
  const course = await courseRepo.findCourseById(courseId);
  if (!course) throw httpError(404, 'Curso não encontrado.');
  return course;
}

async function manageCourse(courseId, user) {
  const course = await courseOr404(courseId);
  await requireManageAccess(course, user);
  return course;
}

async function sessionCourse(sessionId, user) {
  const session = await attendanceRepo.findSession(sessionId);
  if (!session) throw httpError(404, 'Sessão não encontrada.');
  await manageCourse(session.courseId, user);
  return session;
}

exports.listSessions = async (req, res) => {
  await manageCourse(req.params.courseId, req.user);
  return res.json({ sessions: await attendanceRepo.listSessions(req.params.courseId) });
};

exports.createSession = async (req, res) => {
  await manageCourse(req.params.courseId, req.user);
  const date = isoDate(req.body.date);
  if (!date) throw httpError(400, 'Informe a data da aula.');
  const title = String(req.body.title || '').trim().slice(0, 160);
  const session = await attendanceRepo.createSession(req.params.courseId, { date, title });
  return res.status(201).json({ session });
};

exports.deleteSession = async (req, res) => {
  const session = await sessionCourse(req.params.sessionId, req.user);
  await attendanceRepo.deleteSession(session.id);
  return res.status(204).end();
};

exports.sessionRecords = async (req, res) => {
  const session = await sessionCourse(req.params.sessionId, req.user);
  const students = await attendanceRepo.sessionRecords(session.id, session.courseId);
  return res.json({ session, students });
};

// Grava a presença em lote. status null remove o registro (volta para "não registrado").
exports.saveRecords = async (req, res) => {
  const session = await sessionCourse(req.params.sessionId, req.user);
  const incoming = Array.isArray(req.body.records) ? req.body.records : [];
  if (incoming.length > 1000) throw httpError(400, 'Envie no máximo 1000 registros por vez.');

  const records = incoming.map((record) => {
    const status = record.status === null || record.status === '' ? null : String(record.status);
    if (status !== null && !attendanceRepo.STATUSES.includes(status)) throw httpError(400, 'Status de presença inválido.');
    const tipo = record.tipo === 'abonada' ? 'abonada' : 'aceita';
    return {
      userId: String(record.userId || ''),
      status,
      tipo,
      note: String(record.note || '').slice(0, 300)
    };
  });

  const saved = await attendanceRepo.upsertRecords(session.id, session.courseId, records, req.user.id);
  return res.json({ saved });
};

exports.exportRows = async (req, res) => {
  await manageCourse(req.params.courseId, req.user);
  return res.json({ rows: await attendanceRepo.attendanceRowsForCourse(req.params.courseId) });
};

// Normaliza o status vindo de planilha: aceita "presente", "P", "ausente", "A", "justificado", "J".
function normalizeStatus(value) {
  const text = String(value || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (['presente', 'p', 'presenca', 'sim'].includes(text)) return 'presente';
  if (['ausente', 'a', 'falta', 'nao', 'não'].includes(text)) return 'ausente';
  if (['justificado', 'j', 'justificada', 'justificativa'].includes(text)) return 'justificado';
  return null;
}

// Devolve a data em AAAA-MM-DD ou null (sem lançar erro, para a linha ser apenas marcada como inválida).
function normalizeDate(value) {
  const text = String(value || '').trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  try {
    return isoDate(br ? `${br[3]}-${br[2]}-${br[1]}` : text);
  } catch (error) {
    return null;
  }
}

// Importação de planilha: cada linha tem identificador (CPF ou e-mail do aluno), data, status e observação.
// Linhas com problema são devolvidas com o motivo, sem interromper as demais.
exports.importRows = async (req, res) => {
  const course = await manageCourse(req.params.courseId, req.user);
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (rows.length === 0) throw httpError(400, 'A planilha não tem linhas para importar.');
  if (rows.length > 5000) throw httpError(400, 'Importe no máximo 5000 linhas por vez.');

  const enrolled = await query(
    `select u.id, u.email, u.cpf_hash from enrollments e join users u on u.id = e.user_id
      where e.course_id = $1 and e.role = 'student'`,
    [course.id]
  );
  const byEmail = new Map(enrolled.rows.map((row) => [row.email, row.id]));
  const byCpf = new Map(enrolled.rows.filter((row) => row.cpf_hash).map((row) => [row.cpf_hash, row.id]));

  const sessionCache = new Map();
  const errors = [];
  const sessionsCreated = new Set();
  const prepared = [];

  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    const identifier = String(row.identificador || row.cpf || row.email || '').trim();
    let userId = null;
    if (identifier.includes('@')) userId = byEmail.get(identifier.toLowerCase()) || null;
    else if (digitsOf(identifier).length === 11) userId = byCpf.get(hashCpf(digitsOf(identifier))) || null;
    if (!userId) {
      errors.push({ linha: line, motivo: 'Aluno não encontrado entre os matriculados neste curso.' });
      continue;
    }

    const date = normalizeDate(row.data);
    if (!date) {
      errors.push({ linha: line, motivo: 'Data inválida (use AAAA-MM-DD ou DD/MM/AAAA).' });
      continue;
    }

    const status = normalizeStatus(row.status);
    if (!status) {
      errors.push({ linha: line, motivo: 'Status inválido (use presente, ausente ou justificado).' });
      continue;
    }

    if (!sessionCache.has(date)) {
      const existing = (await attendanceRepo.listSessions(course.id)).find((item) => item.date === date);
      if (existing) {
        sessionCache.set(date, existing.id);
      } else {
        const created = await attendanceRepo.createSession(course.id, { date, title: String(row.sessao || '').slice(0, 160) });
        sessionCache.set(date, created.id);
        sessionsCreated.add(date);
      }
    }

    prepared.push({ sessionId: sessionCache.get(date), userId, status, note: String(row.observacao || '').slice(0, 300) });
  }

  let saved = 0;
  const bySession = new Map();
  for (const item of prepared) {
    if (!bySession.has(item.sessionId)) bySession.set(item.sessionId, []);
    bySession.get(item.sessionId).push({ userId: item.userId, status: item.status, note: item.note });
  }
  for (const [sessionId, records] of bySession.entries()) {
    saved += await attendanceRepo.upsertRecords(sessionId, course.id, records, req.user.id, 'importacao');
  }

  return res.json({ saved, sessionsCreated: sessionsCreated.size, errors: errors.slice(0, 200), totalErros: errors.length });
};

exports.studentAttendance = async (req, res) => {
  return res.json({ courses: await attendanceRepo.studentAttendance(req.user.id) });
};

