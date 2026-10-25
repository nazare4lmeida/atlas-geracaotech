const courseRepo = require('../db/courseRepo');
const accessRepo = require('../db/accessRepo');
const httpError = require('../utils/httpError');
const { buildAccess, canCreateCourse, findCourseBySlugOr404, requireParticipantsAccess } = require('../services/access');
const { serializeCourse } = require('../services/courseView');
const { buildBackup, importAsNewCourse, restoreIntoCourse } = require('../services/courseBackup');

// Exportação e importação de conteúdo de cursos (backup em JSON).

async function respondWithCourse(res, user, courseId, status = 200) {
  const course = await courseRepo.findCourseById(courseId);
  const enrolment = await accessRepo.findEnrollment(courseId, user.id);
  return res.status(status).json({
    course: serializeCourse(course, buildAccess(user, course, enrolment))
  });
}

exports.exportCourse = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireParticipantsAccess(course, req.user);

  const backup = buildBackup(course);
  res.setHeader('Content-Disposition', `attachment; filename="${course.slug}.atlas-backup.json"`);
  return res.json(backup);
};

exports.importCourse = async (req, res) => {
  if (!canCreateCourse(req.user)) {
    throw httpError(403, 'Você não tem permissão para importar cursos.');
  }

  const courseId = await importAsNewCourse(req.body, req.user);
  return respondWithCourse(res, req.user, courseId, 201);
};

exports.restoreCourse = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireParticipantsAccess(course, req.user);

  const courseId = await restoreIntoCourse(course, req.body);
  return respondWithCourse(res, req.user, courseId);
};
