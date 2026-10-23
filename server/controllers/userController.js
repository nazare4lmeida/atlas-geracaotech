const accessRepo = require('../db/accessRepo');
const courseRepo = require('../db/courseRepo');
const { query } = require('../db/pool');
const { progressMapForUser, listCertificatesForUser } = require('../db/progressRepo');
const certificateRepo = require('../db/certificateRepo');
const { serializeCourse } = require('../services/courseView');
const { computeBlocks } = require('../services/blockProgress');
const { evaluateCertificate } = require('../services/certificateEligibility');

// Painel do aluno: progresso, certificados emitidos, solicitações e aptidão por curso.
exports.getDashboard = async (req, res) => {
  const [progress, certificates, notes, enrolments, requests] = await Promise.all([
    progressMapForUser(req.user.id),
    listCertificatesForUser(req.user.id),
    query('select count(*)::int as total from notes where user_id = $1', [req.user.id]),
    accessRepo.listEnrollmentsForUser(req.user.id),
    certificateRepo.listRequestsForUser(req.user.id)
  ]);

  const courses = await Promise.all(enrolments.map((item) => courseRepo.findCourseById(item.courseId)));
  const certificateStatus = {};
  courses.filter(Boolean).forEach((course) => {
    const view = serializeCourse(course, { canManage: false });
    // Estado dos blocos (fases) para a trilha do aluno.
    progress[course.slug] = { ...(progress[course.slug] || {}), blocks: computeBlocks(view, progress[course.slug]) };
    const result = evaluateCertificate(view, progress[course.slug]);
    certificateStatus[course.slug] = { eligibleTipo: result.tipo, percentage: result.percentage, releaseAt: course.certificateReleaseAt || null };
  });
  requests.forEach((row) => {
    certificateStatus[row.slug] = { ...(certificateStatus[row.slug] || {}), requestedAt: row.requested_at };
  });

  return res.json({
    progress,
    notesCount: notes.rows[0].total,
    certificates,
    certificateStatus
  });
};
