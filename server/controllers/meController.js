const accessRepo = require('../db/accessRepo');
const courseRepo = require('../db/courseRepo');
const authRepo = require('../db/authRepo');
const meRepo = require('../db/meRepo');
const { progressMapForUser, listCertificatesForUser } = require('../db/progressRepo');
const { serializeCourse, summarizeProgress } = require('../services/courseView');
const { text, phone, uf, avatar, isoDate } = require('../services/validators');
const { sanitizeUser } = require('../services/users');
const httpError = require('../utils/httpError');
const { hojeSP } = require('../utils/periodo');
const { findCourseBySlugOr404 } = require('../services/access');
const { formatCpf, decryptCpf } = require('../services/cpf');
const { gerarDeclaracaoMatricula } = require('../services/declaracaoMatricula');

// Área do aluno: tudo o que é do próprio aluno (perfil, progresso, lembretes, declarações).

function pendingModules(view, entry) {
  const completed = new Set(entry?.completedLessons || []);
  const quizResults = entry?.quizResults || {};
  return (view.modules || [])
    .filter((module) => module.kind !== 'recuperacao')
    .filter((module) => {
      const lessonsDone = module.lessons.every((lesson) => completed.has(lesson.id));
      const quizDone = !(module.quiz || []).length || Boolean(quizResults[module.id]?.passed);
      return !(lessonsDone && quizDone);
    })
    .map((module) => module.title);
}

exports.getOverview = async (req, res) => {
  const userId = req.user.id;
  const [progress, certificates, enrolments, reminders, user] = await Promise.all([
    progressMapForUser(userId),
    listCertificatesForUser(userId),
    accessRepo.listEnrollmentsForUser(userId),
    meRepo.listReminders(userId),
    authRepo.findAuthUserById(userId)
  ]);

  const courses = (await Promise.all(enrolments.map((item) => courseRepo.findCourseById(item.courseId)))).filter(Boolean);

  const items = courses.map((course) => {
    const view = serializeCourse(course, { canManage: false });
    const entry = progress[course.slug];
    const summary = summarizeProgress(view, entry);
    const completed = summary.completedLessons === summary.totalLessons && summary.passedQuizzes === summary.totalQuizzes;
    const status = completed ? 'concluido' : summary.percentage > 0 ? 'em_andamento' : 'nao_iniciado';
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      level: course.level || '',
      estimatedHours: course.estimatedHours || 0,
      accent: course.accent || '#6366f1',
      status,
      percentage: summary.percentage,
      completedLessons: summary.completedLessons,
      totalLessons: summary.totalLessons,
      passedQuizzes: summary.passedQuizzes,
      totalQuizzes: summary.totalQuizzes,
      finalProjectDone: summary.finalProjectDone,
      remainingLessons: summary.totalLessons - summary.completedLessons,
      remainingQuizzes: summary.totalQuizzes - summary.passedQuizzes,
      pendingModules: pendingModules(view, entry).slice(0, 12)
    };
  });

  return res.json({
    profile: sanitizeUser(user || req.user),
    courses: items,
    completedCourses: items.filter((item) => item.status === 'concluido'),
    inProgressCourses: items.filter((item) => item.status === 'em_andamento'),
    certificates,
    reminders,
    reminderSummary: {
      open: reminders.filter((item) => !item.done).length,
      done: reminders.filter((item) => item.done).length
    }
  });
};

exports.updateProfile = async (req, res) => {
  const body = req.body || {};
  const fields = {
    name: text(body.name, { field: 'Nome', min: 2, max: 120, optional: true }),
    phone: phone(body.phone),
    city: text(body.city, { field: 'Cidade', max: 80, optional: true }),
    state: uf(body.state),
    careerGoal: text(body.careerGoal, { field: 'Objetivo', max: 500, optional: true }),
    avatar: avatar(body.avatar)
  };
  // Nome, e-mail e CPF: o aluno só troca o nome. E-mail e CPF são da administração.
  const updated = await meRepo.updateProfile(req.user.id, fields);
  if (!updated) throw httpError(404, 'Conta não encontrada.');
  const fresh = await authRepo.findAuthUserById(req.user.id);
  return res.json({ user: sanitizeUser(fresh) });
};

exports.listReminders = async (req, res) => {
  return res.json({ reminders: await meRepo.listReminders(req.user.id) });
};

exports.createReminder = async (req, res) => {
  const title = text(req.body.title, { field: 'Lembrete', min: 2, max: 200 });
  const dueDate = req.body.dueDate ? isoDate(req.body.dueDate) : null;
  const reminder = await meRepo.createReminder(req.user.id, { title, dueDate });
  return res.status(201).json({ reminder });
};

exports.updateReminder = async (req, res) => {
  const fields = {};
  if (req.body.title !== undefined) fields.title = text(req.body.title, { field: 'Lembrete', min: 2, max: 200 });
  if (req.body.done !== undefined) fields.done = Boolean(req.body.done);
  if (Object.prototype.hasOwnProperty.call(req.body, 'dueDate')) {
    fields.dueDate = req.body.dueDate ? isoDate(req.body.dueDate) : null;
  }
  const reminder = await meRepo.updateReminder(req.user.id, req.params.id, fields);
  if (!reminder) throw httpError(404, 'Lembrete não encontrado.');
  return res.json({ reminder });
};

exports.deleteReminder = async (req, res) => {
  const removed = await meRepo.deleteReminder(req.user.id, req.params.id);
  if (!removed) throw httpError(404, 'Lembrete não encontrado.');
  return res.status(204).end();
};

// Declaração de matrícula em PDF (modelo oficial), gerada na hora para o próprio aluno com matrícula ativa no curso.
exports.matriculaPdf = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  const enrolment = await accessRepo.findEnrollment(course.id, req.user.id);
  if (!enrolment || enrolment.role !== 'student' || enrolment.status !== 'active') {
    throw httpError(403, 'Você não tem matrícula ativa neste curso.');
  }

  const user = await authRepo.findAuthUserById(req.user.id);
  if (!user?.cpfEncrypted) throw httpError(409, 'Seu CPF não está cadastrado. Fale com a gestão.');
  if (!course.estimatedHours) throw httpError(409, 'A carga horária deste curso ainda não foi cadastrada. Fale com a gestão.');

  const pdf = await gerarDeclaracaoMatricula({
    nome: user.name,
    cpf: formatCpf(decryptCpf(user.cpfEncrypted)),
    formacao: course.title,
    cargaHoraria: course.estimatedHours,
    data: hojeSP()
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="declaracao-matricula-${course.slug}.pdf"`);
  return res.send(pdf);
};


// Histórico de acessos da própria conta (para o aluno perceber acessos estranhos).
exports.loginHistory = async (req, res) => {
  const events = await authRepo.listLoginEvents({ userId: req.user.id, limit: 30 });
  return res.json({
    events: events.map((event) => ({ id: event.id, success: event.success, reason: event.reason, ip: event.ip, createdAt: event.createdAt }))
  });
};
// Marca o pop-up de boas-vindas como visto (uma vez por conta, em qualquer navegador).
exports.markWelcomeSeen = async (req, res) => {
  const { query } = require('../db/pool');
  await query('update users set boas_vindas_em = coalesce(boas_vindas_em, now()) where id = $1', [req.user.id]);
  return res.json({ ok: true });
};

// Página inicial: próximas aulas (com o link ao vivo da turma) para alunos e professores.
exports.getHome = async (req, res) => {
  const hoje = hojeSP();
  const proximasAulas = req.user.role === 'admin' ? [] : await meRepo.proximasAulas(req.user.id, hoje);
  return res.json({ hoje, proximasAulas });
};
