const accessRepo = require('../db/accessRepo');
const httpError = require('../utils/httpError');
const {
  findCourseBySlugOr404,
  requireParticipantsAccess,
  requireViewAccess
} = require('../services/access');

// Grupos de alunos (equivalente a "Grupos" do Moodle).
// Gestão: admin e docentes do curso. Alunos: apenas os grupos em que estão.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadManagedCourse(req) {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireParticipantsAccess(course, req.user);
  return course;
}

async function listManagedGroups(courseId) {
  return accessRepo.listGroupsWithMembers(courseId);
}

function normalizeGroupName(value) {
  const name = String(value || '').trim();
  if (!name) throw httpError(400, 'Informe o nome do grupo.');
  if (name.length > 80) throw httpError(400, 'O nome do grupo deve ter no máximo 80 caracteres.');
  return name;
}

function normalizeDescription(value) {
  return String(value || '').trim().slice(0, 500);
}

async function findGroupOr404(courseId, groupId) {
  if (!UUID_PATTERN.test(String(groupId))) throw httpError(404, 'Grupo não encontrado.');
  const group = await accessRepo.findGroup(courseId, groupId);
  if (!group) throw httpError(404, 'Grupo não encontrado.');
  return group;
}

async function assertUniqueName(courseId, name, ignoreGroupId = null) {
  if (await accessRepo.groupNameExists(courseId, name, ignoreGroupId)) {
    throw httpError(409, 'Já existe um grupo com este nome neste curso.');
  }
}

exports.listGroups = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  const access = await requireViewAccess(course, req.user);

  if (access.canManage) {
    return res.json({ groups: await listManagedGroups(course.id) });
  }

  const groups = await accessRepo.listGroupsForUser(course.id, req.user.id);
  return res.json({
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description || ''
    }))
  });
};

exports.createGroup = async (req, res) => {
  const course = await loadManagedCourse(req);
  const name = normalizeGroupName(req.body.name);
  await assertUniqueName(course.id, name);

  await accessRepo.createGroup(course.id, { name, description: normalizeDescription(req.body.description) });
  return res.status(201).json({ groups: await listManagedGroups(course.id) });
};

exports.updateGroup = async (req, res) => {
  const course = await loadManagedCourse(req);
  const group = await findGroupOr404(course.id, req.params.groupId);

  const fields = {};
  if (req.body.name !== undefined) {
    fields.name = normalizeGroupName(req.body.name);
    await assertUniqueName(course.id, fields.name, group.id);
  }
  if (req.body.description !== undefined) {
    fields.description = normalizeDescription(req.body.description);
  }

  await accessRepo.updateGroup(group.id, fields);
  return res.json({ groups: await listManagedGroups(course.id) });
};

exports.deleteGroup = async (req, res) => {
  const course = await loadManagedCourse(req);
  const group = await findGroupOr404(course.id, req.params.groupId);

  await accessRepo.deleteGroup(group.id);
  return res.json({ groups: await listManagedGroups(course.id) });
};

// Adiciona um ou vários alunos ao grupo. Só alunos matriculados no curso podem entrar.
exports.addGroupMembers = async (req, res) => {
  const course = await loadManagedCourse(req);
  const group = await findGroupOr404(course.id, req.params.groupId);

  const rawIds = Array.isArray(req.body.userIds)
    ? req.body.userIds
    : req.body.userId
      ? [req.body.userId]
      : [];

  const ids = [...new Set(rawIds.map(String))];
  if (ids.length === 0) {
    throw httpError(400, 'Selecione ao menos um aluno.');
  }
  if (!ids.every((id) => UUID_PATTERN.test(id))) {
    throw httpError(400, 'Identificador de aluno inválido.');
  }

  const enrolledIds = await accessRepo.filterEnrolledStudents(course.id, ids);
  if (enrolledIds.length !== ids.length) {
    throw httpError(400, 'Somente alunos matriculados no curso podem entrar em grupos.');
  }

  await accessRepo.addGroupMembers(course.id, group.id, ids);
  return res.json({ groups: await listManagedGroups(course.id) });
};

exports.removeGroupMember = async (req, res) => {
  const course = await loadManagedCourse(req);
  const group = await findGroupOr404(course.id, req.params.groupId);

  await accessRepo.removeGroupMember(group.id, req.params.userId);
  return res.json({ groups: await listManagedGroups(course.id) });
};
