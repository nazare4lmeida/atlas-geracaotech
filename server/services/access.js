const courseRepo = require('../db/courseRepo');
const accessRepo = require('../db/accessRepo');
const httpError = require('../utils/httpError');

// Regras de permissão, no espírito do modelo de papéis do Moodle:
// - admin: acesso total a todos os cursos e usuários (papel de "Administrador do site").
// - teacher (papel de conta): pode criar cursos; gerencia apenas os cursos em que está
//   matriculado como docente (papel de curso "teacher"). Quem cria um curso vira docente dele.
// - student: acessa cursos publicados em que está matriculado (ou inscrição automática).
//
// Os usuários chegam aqui no formato { id, role, ... } e os cursos no formato de courseRepo.

function isAdmin(user) {
  return user?.role === 'admin';
}

function isTeacherAccount(user) {
  return user?.role === 'teacher' || user?.role === 'admin';
}

// Criar e importar cursos é só da administração. Professores editam apenas os cursos que lecionam.
function canCreateCourse(user) {
  return isAdmin(user);
}

// Apenas o administrador ou quem criou o curso pode excluí-lo.
function canDeleteCourse(user, course) {
  if (isAdmin(user)) return true;
  return Boolean(course.createdBy) && String(course.createdBy) === String(user.id);
}

// Calcula, de forma pura, o que um usuário pode fazer em um curso dado sua matrícula.
function computeAccess(user, enrolment) {
  if (isAdmin(user)) {
    return { canManage: true, role: 'admin', enrolment: enrolment || null, suspended: false };
  }

  if (!enrolment) {
    return { canManage: false, role: null, enrolment: null, suspended: false };
  }

  if (enrolment.status === 'suspended') {
    return { canManage: false, role: null, enrolment, suspended: true };
  }

  if (enrolment.role === 'teacher') {
    return { canManage: true, role: 'teacher', enrolment, suspended: false };
  }

  return { canManage: false, role: 'student', enrolment, suspended: false };
}

// Permissões completas usadas nas respostas da API (inclui quem pode excluir o curso).
function buildAccess(user, course, enrolment) {
  return {
    ...computeAccess(user, enrolment),
    canDelete: canDeleteCourse(user, course)
  };
}

async function findCourseBySlugOr404(slug) {
  const course = await courseRepo.findCourseBySlug(String(slug).toLowerCase());
  if (!course) {
    throw httpError(404, 'Curso não encontrado.');
  }
  return course;
}

// Acesso de leitura e progresso. Alunos são matriculados automaticamente quando o curso
// permite autoinscrição (comportamento atual: todos os cursos abrem para qualquer aluno logado).
async function requireViewAccess(course, user) {
  let enrolment = await accessRepo.findEnrollment(course.id, user.id);
  let access = computeAccess(user, enrolment);

  if (access.suspended) {
    throw httpError(403, 'Sua inscrição neste curso está suspensa.');
  }

  if (!access.canManage && course.visible === false) {
    throw httpError(404, 'Curso não encontrado.');
  }

  if (!access.role) {
    // Aluno com matrícula ativa no curso (ou em turma dele) entra mesmo sem autoinscrição na trilha.
    if (user.role !== 'teacher' && (await accessRepo.hasActiveMatriculaInCourse(course.id, user.id))) {
      enrolment = await accessRepo.createEnrollment(course.id, user.id, 'student');
      access = computeAccess(user, enrolment);
      return access;
    }

    // Professor não se matricula sozinho: só leciona o curso quando a administração o vincula a uma turma.
    if (user.role === 'teacher' || course.visible === false || course.selfEnrolment === false) {
      throw httpError(403, 'Você não está inscrito neste curso.');
    }

    enrolment = await accessRepo.createEnrollment(course.id, user.id, 'student');
    access = computeAccess(user, enrolment);
  }

  return access;
}

// Acesso de gestão (conteúdo, participantes e grupos).
async function requireManageAccess(course, user) {
  const enrolment = await accessRepo.findEnrollment(course.id, user.id);
  const access = computeAccess(user, enrolment);

  if (!access.canManage) {
    throw httpError(403, 'Você não tem permissão para gerenciar este curso.');
  }

  return access;
}

module.exports = {
  isAdmin,
  isTeacherAccount,
  canCreateCourse,
  canDeleteCourse,
  computeAccess,
  buildAccess,
  findCourseBySlugOr404,
  requireViewAccess,
  requireManageAccess
};
