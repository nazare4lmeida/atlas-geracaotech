const courseRepo = require('../db/courseRepo');
const accessRepo = require('../db/accessRepo');
const progressRepo = require('../db/progressRepo');
const httpError = require('../utils/httpError');
const { findCourseBySlugOr404, requireParticipantsAccess, isAdmin, isTeacherAccount } = require('../services/access');
const { serializeCourse, summarizeProgress } = require('../services/courseView');

// Participantes do curso (equivalente a "Participantes" no Moodle), com relatório de progresso.

async function loadManagedCourse(req) {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireParticipantsAccess(course, req.user);
  return course;
}

// Papel de docente só pode ser atribuído por administradores, a contas de professor ou admin.
function assertCanAssignRole(actor, user, role) {
  if (role !== 'teacher') return;

  if (!isAdmin(actor)) {
    throw httpError(403, 'Somente administradores podem atribuir o papel de docente.');
  }

  if (!user || !isTeacherAccount(user)) {
    throw httpError(400, 'Promova a conta para o papel de professor antes de inscrevê-la como docente.');
  }
}

exports.listParticipants = async (req, res) => {
  const course = await loadManagedCourse(req);

  const [participants, groupsByUser, progressByUser, fullCourse] = await Promise.all([
    accessRepo.listParticipants(course.id),
    accessRepo.listGroupMembershipsByUser(course.id),
    progressRepo.progressEntriesForCourse(course.id),
    courseRepo.findCourseById(course.id)
  ]);

  // O relatório mostra o progresso com a mesma visão que o aluno enxerga.
  const studentView = serializeCourse(fullCourse, { canManage: false });

  return res.json({
    participants: participants.map((item) => ({
      userId: item.userId,
      name: item.name,
      email: item.email,
      accountRole: item.accountRole || 'student',
      active: item.active !== false,
      role: item.role,
      status: item.status,
      enrolledAt: item.enrolledAt,
      groups: groupsByUser.get(item.userId) || [],
      progress:
        item.role === 'student'
          ? summarizeProgress(studentView, progressByUser.get(item.userId))
          : null
    }))
  });
};

exports.enrolParticipant = async (req, res) => {
  const course = await loadManagedCourse(req);
  const { userId, email } = req.body;

  let user = null;
  if (userId) {
    user = await accessRepo.findUserById(userId);
  } else if (email) {
    user = await accessRepo.findUserByEmail(String(email).toLowerCase().trim());
  }

  if (!user) {
    throw httpError(404, 'Usuário não encontrado. Confira o e-mail informado.');
  }

  const role = req.body.role === 'teacher' ? 'teacher' : 'student';
  assertCanAssignRole(req.user, user, role);

  if (await accessRepo.findEnrollment(course.id, user.id)) {
    throw httpError(409, 'Este usuário já está inscrito no curso.');
  }

  await accessRepo.createEnrollment(course.id, user.id, role);
  return res.status(201).json({ message: 'Participante inscrito com sucesso.' });
};

exports.updateParticipant = async (req, res) => {
  const course = await loadManagedCourse(req);
  const enrolment = await accessRepo.findEnrollment(course.id, req.params.userId);
  if (!enrolment) {
    throw httpError(404, 'Participante não encontrado neste curso.');
  }

  const fields = {};

  if (req.body.role !== undefined) {
    const role = req.body.role === 'teacher' ? 'teacher' : 'student';
    if (role !== enrolment.role) {
      assertCanAssignRole(req.user, await accessRepo.findUserById(enrolment.userId), role);
    }
    fields.role = role;
  }

  if (req.body.status !== undefined) {
    fields.status = req.body.status === 'suspended' ? 'suspended' : 'active';
  }

  await accessRepo.updateEnrollment(course.id, enrolment.userId, fields);
  return res.json({ message: 'Participante atualizado.' });
};

exports.unenrolParticipant = async (req, res) => {
  const course = await loadManagedCourse(req);
  const enrolment = await accessRepo.findEnrollment(course.id, req.params.userId);
  if (!enrolment) {
    throw httpError(404, 'Participante não encontrado neste curso.');
  }

  // Os grupos do aluno neste curso são limpos automaticamente pelo banco.
  await accessRepo.deleteEnrollment(course.id, enrolment.userId);
  return res.json({ message: 'Participante removido do curso. O progresso dele foi mantido.' });
};
