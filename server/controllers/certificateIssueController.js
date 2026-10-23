const courseRepo = require('../db/courseRepo');
const accessRepo = require('../db/accessRepo');
const progressRepo = require('../db/progressRepo');
const certificateRepo = require('../db/certificateRepo');
const httpError = require('../utils/httpError');
const { findCourseBySlugOr404, requireManageAccess, requireViewAccess } = require('../services/access');
const { serializeCourse } = require('../services/courseView');
const { evaluateCertificate } = require('../services/certificateEligibility');

// Emissão de certificados pela gestão. A aluna só solicita; quem gera é a gestão (um a um ou em lote).

const EMPTY_ENTRY = { completedLessons: [], quizResults: {}, finalProjectCompleted: false };
const TIPO_LABEL = { conclusao: 'conclusão', participacao: 'participação' };

function studentView(course) {
  return serializeCourse(course, { canManage: false });
}

async function loadManagedCourse(req) {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireManageAccess(course, req.user);
  return course;
}

// Configurações do curso: modelos (conclusão e participação) e data de liberação.
exports.updateCourseSettings = async (req, res) => {
  const course = await loadManagedCourse(req);
  const fields = {};

  if ('templateId' in req.body) {
    const templateId = req.body.templateId || null;
    if (templateId && !(await certificateRepo.findTemplateById(templateId))) throw httpError(400, 'Modelo não encontrado.');
    fields.templateId = templateId;
  }
  if ('participacaoTemplateId' in req.body) {
    const templateId = req.body.participacaoTemplateId || null;
    if (templateId && !(await certificateRepo.findTemplateById(templateId))) throw httpError(400, 'Modelo não encontrado.');
    fields.participacaoTemplateId = templateId;
  }
  if ('releaseAt' in req.body) {
    const value = req.body.releaseAt ? new Date(req.body.releaseAt) : null;
    if (value && Number.isNaN(value.getTime())) throw httpError(400, 'Data de liberação inválida.');
    fields.releaseAt = value;
  }

  await certificateRepo.updateCourseCertificateSettings(course.id, fields);
  return res.json({ ok: true });
};

// Lista de alunos com aptidão, solicitação e certificado emitido.
exports.getEligibility = async (req, res) => {
  const course = await loadManagedCourse(req);
  const view = studentView(await courseRepo.findCourseById(course.id));

  const [participants, entries, requests, issued] = await Promise.all([
    accessRepo.listParticipants(course.id),
    progressRepo.progressEntriesForCourse(course.id),
    certificateRepo.listRequestsForCourse(course.id),
    certificateRepo.listIssuedForCourse(course.id)
  ]);

  const requestedAt = new Map(requests.map((row) => [String(row.user_id), row.requested_at]));
  const issuedBy = new Map(issued.map((row) => [String(row.user_id), row]));

  const students = participants
    .filter((item) => item.role === 'student')
    .map((item) => {
      const result = evaluateCertificate(view, entries.get(item.userId) || EMPTY_ENTRY);
      const done = issuedBy.get(String(item.userId));
      return {
        userId: item.userId,
        name: item.name,
        email: item.email,
        active: item.active !== false,
        ...result,
        requestedAt: requestedAt.get(String(item.userId)) || null,
        issued: done ? { tipo: done.tipo, issuedAt: done.issued_at, authCode: done.auth_code } : null,
        releaseAt: course.certificateReleaseAt || null
      };
    });

  return res.json({
    students,
    releaseAt: course.certificateReleaseAt || null,
    templates: {
      conclusao: Boolean(course.certificateTemplateId),
      participacao: Boolean(course.certificateParticipacaoTemplateId)
    }
  });
};

// Gera certificados: userIds (um ou vários) ou, sem lista, todos os aptos; onlyRequested limita a quem solicitou.
exports.generateCertificates = async (req, res) => {
  const course = await loadManagedCourse(req);
  const view = studentView(await courseRepo.findCourseById(course.id));
  const entries = await progressRepo.progressEntriesForCourse(course.id);
  const participants = (await accessRepo.listParticipants(course.id)).filter((item) => item.role === 'student');
  const requested = new Set((await certificateRepo.listRequestsForCourse(course.id)).map((row) => String(row.user_id)));

  const userIds = Array.isArray(req.body.userIds) ? new Set(req.body.userIds.map(String)) : null;
  const onlyRequested = Boolean(req.body.onlyRequested);

  const report = { emitidos: 0, conclusao: 0, participacao: 0, ignorados: 0, erros: [] };

  for (const item of participants) {
    const id = String(item.userId);
    if (userIds && !userIds.has(id)) continue;
    if (onlyRequested && !requested.has(id)) continue;

    const result = evaluateCertificate(view, entries.get(item.userId) || EMPTY_ENTRY);
    if (!result.tipo) {
      report.ignorados += 1;
      continue;
    }

    try {
      const template = await certificateRepo.findTemplateForCourse(course.id, result.tipo);
      if (!template) {
        report.erros.push({ email: item.email, mensagem: `O curso não tem modelo de ${TIPO_LABEL[result.tipo]} configurado.` });
        continue;
      }

      const issued = await certificateRepo.issueCertificate(item.userId, course.id, course.title, result.tipo);
      if (!issued) {
        report.ignorados += 1;
        continue;
      }
      await certificateRepo.ensureAuthCode(item.userId, course.id, course.slug);
      report.emitidos += 1;
      report[result.tipo] += 1;
    } catch (error) {
      console.error('[certificados] emissão:', error.message);
      report.erros.push({ email: item.email, mensagem: 'Erro ao emitir. Tente de novo.' });
    }
  }

  return res.json({ report });
};

// Aluna solicita a emissão quando já atende aos requisitos de algum certificado.
exports.requestCertificate = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireViewAccess(course, req.user);

  const view = studentView(course);
  const entry = await progressRepo.progressEntryForUser(req.user.id, course.id);
  const result = evaluateCertificate(view, entry);

  if (!result.tipo) {
    throw httpError(400, 'Você ainda não atende aos requisitos de certificado deste curso.');
  }

  await certificateRepo.requestCertificate(req.user.id, course.id);
  return res.status(201).json({ tipo: result.tipo, releaseAt: course.certificateReleaseAt || null });
};

