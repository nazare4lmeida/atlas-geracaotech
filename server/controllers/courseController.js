const courseRepo = require("../db/courseRepo");
const accessRepo = require("../db/accessRepo");
const docenteRepo = require("../db/docenteRepo");
const progressRepo = require("../db/progressRepo");
const httpError = require("../utils/httpError");
const { slugify } = require("../utils/ids");
const {
  buildAccess,
  canDeleteCourse,
  canCreateCourse,
  findCourseBySlugOr404,
  requireViewAccess,
  requireManageAccess,
} = require("../services/access");
const {
  serializeCourse,
  serializeCatalogItem,
  summarizeProgress,
} = require("../services/courseView");
const {
  computeBlocks,
  assertModuleUnlocked,
} = require("../services/blockProgress");
const { normalizeLayout, normalizeTheme } = require("../services/layouts");
const certificateRepo = require("../db/certificateRepo");
const { buildCertificatePayload } = require("../services/certificates");

async function respondWithCourse(res, user, courseId, status = 200) {
  const course = await courseRepo.findCourseById(courseId);
  const enrolment = await accessRepo.findEnrollment(courseId, user.id);
  return res.status(status).json({
    course: serializeCourse(course, buildAccess(user, course, enrolment)),
  });
}

// Progresso do aluno, com o estado de cada bloco (fase) calculado no servidor.
function serializeProgress(slug, entry, view) {
  return {
    courseSlug: slug,
    completedLessons: entry.completedLessons,
    quizResults: entry.quizResults,
    finalProjectCompleted: entry.finalProjectCompleted,
    blocks: view ? computeBlocks(view, entry) : undefined,
  };
}

// Visão que o aluno enxerga (itens ocultos ficam de fora). Usada para validar progresso e certificado.
function studentView(course) {
  return serializeCourse(course, { canManage: false });
}

// ---------- Catálogo público ----------

exports.listCatalog = async (req, res) => {
  const courses = await courseRepo.fetchCourses("where visible");
  return res.json({ courses: courses.map(serializeCatalogItem) });
};

// ---------- Listagem e leitura ----------

exports.listCourses = async (req, res) => {
  const user = req.user;
  const enrolments = await accessRepo.listEnrollmentsForUser(user.id);
  const enrolmentByCourse = new Map(
    enrolments.map((item) => [item.courseId, item]),
  );

  let courses;
  if (user.role === "admin") {
    courses = await courseRepo.fetchCourses();
  } else {
    // Alunos veem cursos publicados. Professores veem só os cursos em que lecionam (sem os demais).
    if (user.role === "teacher") {
      // Cursos que ele leciona = cursos das turmas às quais está vinculado (não as matrículas antigas).
      const turmas = await docenteRepo.turmasDoProfessor(user.id);
      const teachingIds = [
        ...new Set(turmas.map((turma) => turma.cursoId).filter(Boolean)),
      ];
      courses = teachingIds.length
        ? await courseRepo.fetchCourses("where id = any($1::uuid[])", [
            teachingIds,
          ])
        : [];
    } else {
      courses = await courseRepo.fetchCourses("where visible");
    }
  }

  return res.json({
    courses: courses.map((course) =>
      serializeCourse(
        course,
        buildAccess(user, course, enrolmentByCourse.get(course.id)),
      ),
    ),
  });
};

exports.getCourse = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  const access = await requireViewAccess(course, req.user);
  return res.json({
    course: serializeCourse(course, {
      ...access,
      canDelete: canDeleteCourse(req.user, course),
    }),
  });
};

// ---------- Gestão do curso (metadados) ----------

const EDITABLE_FIELDS = [
  "title",
  "key",
  "summary",
  "banner",
  "level",
  "estimatedHours",
  "accent",
  "visible",
  "selfEnrolment",
  "layout",
  "theme",
];

function pickCourseFields(body = {}) {
  const fields = {};

  EDITABLE_FIELDS.forEach((field) => {
    if (body[field] === undefined) return;

    if (field === "estimatedHours") {
      fields.estimatedHours = Math.max(
        0,
        Math.floor(Number(body.estimatedHours) || 0),
      );
    } else if (field === "visible" || field === "selfEnrolment") {
      fields[field] = Boolean(body[field]);
    } else if (field === "accent") {
      fields.accent = /^#[0-9a-f]{6}$/i.test(String(body.accent))
        ? body.accent
        : "#6366f1";
    } else if (field === "layout") {
      fields.layout = normalizeLayout(body.layout);
    } else if (field === "theme") {
      fields.theme = normalizeTheme(body.theme);
    } else {
      fields[field] = String(body[field] ?? "").trim();
    }
  });

  if (body.finalProject && typeof body.finalProject === "object") {
    fields.finalProject = {
      title: String(body.finalProject.title || "").trim(),
      description: String(body.finalProject.description || "").trim(),
    };
  }

  return fields;
}

exports.createCourse = async (req, res) => {
  if (!canCreateCourse(req.user)) {
    throw httpError(403, "Você não tem permissão para criar cursos.");
  }

  const title = String(req.body.title || "").trim();
  if (!title) {
    throw httpError(400, "Informe o título do curso.");
  }

  const slug = slugify(req.body.slug || title);
  if (!slug) {
    throw httpError(
      400,
      "Não foi possível gerar o identificador do curso. Informe um slug.",
    );
  }

  if (await courseRepo.slugExists(slug)) {
    throw httpError(409, "Já existe um curso com este identificador.");
  }

  const fields = pickCourseFields({ ...req.body, title });
  const courseId = await courseRepo.createCourse(
    {
      slug,
      key: fields.key,
      title,
      summary: fields.summary,
      banner: fields.banner,
      level: fields.level,
      estimatedHours: fields.estimatedHours,
      accent: fields.accent,
      visible: fields.visible !== undefined ? fields.visible : true,
      selfEnrolment:
        fields.selfEnrolment !== undefined ? fields.selfEnrolment : true,
      finalProject: fields.finalProject,
      layout: normalizeLayout(req.body.layout),
      theme: req.body.theme ? normalizeTheme(req.body.theme) : {},
      modules: [],
    },
    req.user.id,
  );

  // Quem cria o curso passa a ser o docente dele, como no Moodle.
  await accessRepo.createEnrollment(courseId, req.user.id, "teacher");

  return respondWithCourse(res, req.user, courseId, 201);
};

exports.updateCourse = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireManageAccess(course, req.user);

  await courseRepo.updateCourse(course.id, pickCourseFields(req.body));

  return respondWithCourse(res, req.user, course.id);
};

exports.deleteCourse = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);

  if (!canDeleteCourse(req.user, course)) {
    throw httpError(
      403,
      "Somente administradores ou o criador do curso podem excluí-lo.",
    );
  }

  await courseRepo.deleteCourse(course.id);
  return res.json({ message: "Curso excluído." });
};

// ---------- Progresso do aluno ----------

exports.completeLesson = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireViewAccess(course, req.user);

  const { lessonId } = req.body;
  const view = studentView(course);
  const owner = view.modules.find((module) =>
    module.lessons.some((lesson) => lesson.id === lessonId),
  );
  if (!owner) {
    throw httpError(400, "Aula não encontrada neste curso.");
  }

  // Aula de bloco bloqueado não pode ser concluída. Revisar uma aula já concluída continua permitido.
  const before = await progressRepo.progressEntryForUser(
    req.user.id,
    course.id,
  );
  assertModuleUnlocked(view, computeBlocks(view, before), owner.id, {
    alreadyCompleted: before.completedLessons.includes(lessonId),
  });

  await progressRepo.markLessonCompleted(req.user.id, lessonId);
  const entry = await progressRepo.progressEntryForUser(req.user.id, course.id);
  return res.json({ progress: serializeProgress(course.slug, entry, view) });
};

// Unidade = aulas de um módulo com o mesmo nome de unidade ("" = aulas soltas do módulo).
// A aluna conclui a unidade de uma vez, ao final dela; as aulas ficam concluídas juntas.
function unitLessons(view, moduleId, unit) {
  const module = view.modules.find((item) => item.id === moduleId);
  if (!module) throw httpError(400, "Módulo não encontrado neste curso.");
  const lessons = module.lessons.filter(
    (lesson) => (lesson.unit || "") === (unit || ""),
  );
  if (!lessons.length) throw httpError(400, "Unidade não encontrada neste módulo.");
  return { module, lessons };
}

exports.completeUnit = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireViewAccess(course, req.user);

  const { moduleId, unit = "" } = req.body;
  const view = studentView(course);
  const { module, lessons } = unitLessons(view, moduleId, unit);

  // Unidade de bloco bloqueado não pode ser concluída. Repetir uma unidade já concluída continua permitido.
  const before = await progressRepo.progressEntryForUser(req.user.id, course.id);
  assertModuleUnlocked(view, computeBlocks(view, before), module.id, {
    alreadyCompleted: lessons.every((lesson) => before.completedLessons.includes(lesson.id)),
  });

  for (const lesson of lessons) {
    await progressRepo.markLessonCompleted(req.user.id, lesson.id);
  }
  const entry = await progressRepo.progressEntryForUser(req.user.id, course.id);
  return res.json({ progress: serializeProgress(course.slug, entry, view) });
};

// Avaliação da unidade (nota 1 a 5 e comentário opcional). Só depois que a unidade está concluída.
exports.rateUnit = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireViewAccess(course, req.user);

  const { moduleId, unit = "", nota, comentario = "" } = req.body;
  const valor = Number(nota);
  if (!Number.isInteger(valor) || valor < 1 || valor > 5) {
    throw httpError(400, "A nota deve ser de 1 a 5.");
  }
  const view = studentView(course);
  const { module, lessons } = unitLessons(view, moduleId, unit);

  const entry = await progressRepo.progressEntryForUser(req.user.id, course.id);
  if (!lessons.every((lesson) => entry.completedLessons.includes(lesson.id))) {
    throw httpError(400, "Conclua a unidade antes de avaliar.");
  }

  const texto = String(comentario || "").trim().slice(0, 500);
  await progressRepo.saveUnitRating(req.user.id, module.id, unit || "", valor, texto);
  return res.json({ ok: true });
};

exports.completeProject = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireViewAccess(course, req.user);

  await progressRepo.markProjectCompleted(req.user.id, course.id);
  const entry = await progressRepo.progressEntryForUser(req.user.id, course.id);
  return res.json({
    progress: serializeProgress(course.slug, entry, studentView(course)),
  });
};

// Certificado já emitido pela gestão (a aluna não emite por conta própria).
exports.getCertificate = async (req, res) => {
  const course = await findCourseBySlugOr404(req.params.slug);
  await requireViewAccess(course, req.user);

  const issued = await certificateRepo.findIssuedCertificate(
    req.user.id,
    course.id,
  );
  if (!issued) throw httpError(404, "Certificado ainda não foi emitido.");

  const saved = {
    course_name: course.title,
    issued_at: issued.issued_at,
    auth_code: issued.auth_code,
    tipo: issued.tipo,
  };
  const template = await certificateRepo.findTemplateForCourse(
    course.id,
    issued.tipo,
  );
  return res.json({
    certificate: await certificateResponse(course, req.user, saved, template),
  });
};

async function certificateResponse(course, user, saved, template) {
  return {
    courseSlug: course.slug,
    courseName: saved.course_name,
    issuedAt: saved.issued_at,
    tipo: saved.tipo,
    authCode: saved.auth_code,
    template: await buildCertificatePayload(
      template,
      course,
      user,
      saved.issued_at,
      saved.auth_code,
    ),
  };
}

exports.serializeProgress = serializeProgress;
exports.studentView = studentView;
