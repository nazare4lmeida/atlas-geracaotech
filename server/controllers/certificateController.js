const certificateRepo = require('../db/certificateRepo');
const httpError = require('../utils/httpError');
const { findCourseBySlugOr404, requireManageAccess } = require('../services/access');
const { validateBackground, sanitizeConfig, sanitizeVerso } = require('../services/certificates');

// Gestão de modelos de certificado (administradores e professores).

exports.listTemplates = async (req, res) => {
  const templates = await certificateRepo.listTemplates();
  return res.json({ templates });
};

exports.getTemplate = async (req, res) => {
  const template = await certificateRepo.findTemplateById(req.params.id);
  if (!template) throw httpError(404, 'Modelo não encontrado.');
  return res.json({ template });
};

exports.createTemplate = async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw httpError(400, 'Dê um nome ao modelo.');

  const backgroundError = validateBackground(req.body.background);
  if (backgroundError) throw httpError(400, backgroundError);

  const verso = sanitizeVerso(req.body.verso);
  if (verso?.error) throw httpError(400, verso.error);

  const template = await certificateRepo.createTemplate({
    name: name.slice(0, 120),
    background: req.body.background,
    config: sanitizeConfig(req.body.config),
    verso: verso ? verso.value : null,
    createdBy: req.user.id
  });
  return res.status(201).json({ template });
};

exports.updateTemplate = async (req, res) => {
  const patch = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) throw httpError(400, 'Dê um nome ao modelo.');
    patch.name = name.slice(0, 120);
  }
  if (req.body.background !== undefined) {
    const backgroundError = validateBackground(req.body.background);
    if (backgroundError) throw httpError(400, backgroundError);
    patch.background = req.body.background;
  }
  if (req.body.config !== undefined) patch.config = sanitizeConfig(req.body.config);
  if (req.body.verso !== undefined) {
    const verso = sanitizeVerso(req.body.verso);
    if (verso?.error) throw httpError(400, verso.error);
    patch.verso = verso ? verso.value : null;
  }

  const template = await certificateRepo.updateTemplate(req.params.id, patch);
  if (!template) throw httpError(404, 'Modelo não encontrado.');
  return res.json({ template });
};

exports.deleteTemplate = async (req, res) => {
  await certificateRepo.deleteTemplate(req.params.id);
  return res.json({ ok: true });
};

// Vincula um modelo a um curso (templateId null remove o vínculo).
exports.setCourseTemplate = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireManageAccess(course, req.user);

  const templateId = req.body.templateId || null;
  if (templateId) {
    const template = await certificateRepo.findTemplateById(templateId);
    if (!template) throw httpError(400, 'Modelo não encontrado.');
  }

  await certificateRepo.setCourseTemplate(course.id, templateId);
  return res.json({ course: { slug: course.slug, certificateTemplateId: templateId } });
};
