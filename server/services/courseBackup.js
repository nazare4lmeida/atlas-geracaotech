const courseRepo = require('../db/courseRepo');
const { planForCourse, applyBlockPlan } = require('./blockPlans');
const accessRepo = require('../db/accessRepo');
const { withTransaction } = require('../db/pool');
const httpError = require('../utils/httpError');
const { newId, slugify } = require('../utils/ids');
const { normalizeLayout, normalizeTheme } = require('./layouts');

// Backup de conteúdo de curso (equivalente ao "backup/restauração" do Moodle, sem dados de alunos).
// O arquivo inclui título, configurações, seções, recursos, questões e projeto final.
// IDs não são exportados: a importação gera IDs novos, então o mesmo backup pode ser restaurado várias vezes.

const BACKUP_FORMAT = 'atlas-backup';
const BACKUP_VERSION = 1;
const LESSON_TYPES = ['video', 'page', 'link', 'html', 'ao_vivo', 'codice', 'codey'];
const LIMITS = { modules: 200, lessons: 300, questions: 100, options: 10 };

function readText(value, max, label) {
  const text = String(value ?? '').trim();
  if (text.length > max) {
    throw httpError(400, `${label} é muito longo (máximo de ${max} caracteres).`);
  }
  return text;
}

function buildBackup(course) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    course: {
      slug: course.slug,
      key: course.key || '',
      title: course.title,
      summary: course.summary || '',
      banner: course.banner || '',
      level: course.level || '',
      estimatedHours: course.estimatedHours || 0,
      accent: course.accent || '',
      layout: course.layout || 'caderno',
      theme: course.theme || {},
      finalProject: {
        title: course.finalProject?.title || '',
        description: course.finalProject?.description || ''
      },
      modules: course.modules.map((module) => ({
        title: module.title,
        description: module.description || '',
        visible: module.visible !== false,
        lessons: module.lessons.map((lesson) => ({
          title: lesson.title,
          unit: lesson.unit || '',
          type: lesson.type,
          url: lesson.url || '',
          content: lesson.content || '',
          visible: lesson.visible !== false
        })),
        quiz: module.quiz.map((question) => ({
          question: question.question,
          options: question.options,
          answer: question.answer,
          explanation: question.explanation || '',
          optionFeedback: question.optionFeedback || []
        }))
      }))
    }
  };
}

// Valida o arquivo recebido e devolve o curso pronto para o banco, com IDs novos.
// Qualquer campo fora do formato gera erro 400 com mensagem em português.
function parseBackup(payload) {
  if (!payload || typeof payload !== 'object' || payload.format !== BACKUP_FORMAT) {
    throw httpError(400, 'Arquivo inválido. Use um backup exportado pelo Atlas - Geração Tech.');
  }
  if (payload.version !== BACKUP_VERSION) {
    throw httpError(400, 'Versão de backup não suportada.');
  }

  const source = payload.course;
  if (!source || typeof source !== 'object') {
    throw httpError(400, 'O backup não contém dados de curso.');
  }

  const title = readText(source.title, 160, 'O título do curso');
  if (!title) {
    throw httpError(400, 'O backup não tem título de curso.');
  }

  if (!Array.isArray(source.modules)) {
    throw httpError(400, 'O backup não contém a lista de seções.');
  }
  if (source.modules.length > LIMITS.modules) {
    throw httpError(400, `O curso pode ter no máximo ${LIMITS.modules} seções.`);
  }

  const modules = source.modules.map((module) => {
    const moduleTitle = readText(module?.title, 160, 'O título da seção');
    if (!moduleTitle) {
      throw httpError(400, 'Há uma seção sem título no backup.');
    }

    const lessonsInput = Array.isArray(module.lessons) ? module.lessons : [];
    const quizInput = Array.isArray(module.quiz) ? module.quiz : [];
    if (lessonsInput.length > LIMITS.lessons || quizInput.length > LIMITS.questions) {
      throw httpError(400, `A seção "${moduleTitle}" excede o limite de recursos ou questões.`);
    }

    const lessons = lessonsInput.map((lesson) => {
      const lessonTitle = readText(lesson?.title, 160, 'O título do recurso');
      if (!lessonTitle) {
        throw httpError(400, `A seção "${moduleTitle}" tem um recurso sem título.`);
      }
      if (!LESSON_TYPES.includes(lesson?.type)) {
        throw httpError(400, `O recurso "${lessonTitle}" tem um tipo inválido.`);
      }

      const url = readText(lesson.url, 2000, 'A URL');
      const content = readText(lesson.content, 50000, 'O conteúdo');

      // Vídeo, link e espaços de código precisam de URL http(s). Página, bloco HTML e encontro ao vivo não exigem.
      const exigeUrl = ['video', 'link', 'codice', 'codey'].includes(lesson.type);
      if (exigeUrl && !/^https?:\/\//i.test(url)) {
        throw httpError(400, `O recurso "${lessonTitle}" precisa de uma URL começando com http:// ou https://.`);
      }
      if (lesson.type === 'page' && !content) {
        throw httpError(400, `O recurso "${lessonTitle}" é do tipo página e precisa de conteúdo.`);
      }

      return {
        id: newId('les'),
        title: lessonTitle,
        unit: readText(lesson.unit, 160, 'O nome da unidade'),
        type: lesson.type,
        url: ['page', 'html'].includes(lesson.type) ? '' : url,
        content,
        visible: lesson.visible !== false
      };
    });

    const quiz = quizInput.map((question) => {
      const questionText = readText(question?.question, 1000, 'O enunciado da questão');
      const options = Array.isArray(question?.options)
        ? question.options.map((option) => readText(option, 500, 'A alternativa')).filter(Boolean)
        : [];
      const answer = Number(question?.answer);

      if (!questionText) {
        throw httpError(400, `A seção "${moduleTitle}" tem uma questão sem enunciado.`);
      }
      if (options.length < 2 || options.length > LIMITS.options) {
        throw httpError(400, `A questão "${questionText}" precisa de 2 a ${LIMITS.options} alternativas.`);
      }
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
        throw httpError(400, `A questão "${questionText}" tem uma alternativa correta inválida.`);
      }

      const explanation = readText(question?.explanation, 1000, 'A explicação da questão');
      const optionFeedback = Array.isArray(question?.optionFeedback)
        ? question.optionFeedback.slice(0, LIMITS.options).map((item) => readText(item, 500, 'O feedback da alternativa'))
        : [];

      return { id: newId('q'), question: questionText, options, answer, explanation, optionFeedback };
    });

    return {
      id: newId('mod'),
      title: moduleTitle,
      description: readText(module.description, 2000, 'A descrição da seção'),
      visible: module.visible !== false,
      lessons,
      quiz
    };
  });

  return {
    slug: slugify(source.slug || title) || 'curso-importado',
    key: readText(source.key, 80, 'A chave do curso'),
    title,
    summary: readText(source.summary, 1000, 'O resumo'),
    banner: readText(source.banner, 1000, 'O banner'),
    level: readText(source.level, 60, 'O nível') || 'Iniciante',
    estimatedHours: Math.max(0, Math.floor(Number(source.estimatedHours) || 0)),
    accent: /^#[0-9a-f]{6}$/i.test(String(source.accent)) ? source.accent : '#6366f1',
    layout: normalizeLayout(source.layout),
    theme: source.theme ? normalizeTheme(source.theme) : {},
    finalProject: {
      title: readText(source.finalProject?.title, 160, 'O título do projeto final'),
      description: readText(source.finalProject?.description, 4000, 'A descrição do projeto final')
    },
    modules
  };
}

// Cria um curso novo a partir do backup. Fica oculto e sem autoinscrição até o docente publicar.
async function importAsNewCourse(payload, user) {
  const doc = parseBackup(payload);

  let slug = doc.slug;
  let suffix = 2;
  while (await courseRepo.slugExists(slug)) {
    slug = `${doc.slug}-${suffix}`;
    suffix += 1;
  }

  const courseId = await courseRepo.createCourse(
    { ...doc, slug, visible: false, selfEnrolment: false },
    user.id
  );
  await accessRepo.createEnrollment(courseId, user.id, 'teacher');
  return courseId;
}

// Substitui o conteúdo de um curso existente pelo do backup.
// Mantém título, configurações, visibilidade e matrículas. Progresso nas seções antigas é removido.
async function restoreIntoCourse(course, payload) {
  const doc = parseBackup(payload);

  await withTransaction(async (client) => {
    await courseRepo.replaceModules(client, course.id, doc.modules);
    await client.query(
      `update courses set final_project_title = $2, final_project_description = $3, updated_at = now()
       where id = $1`,
      [course.id, doc.finalProject.title, doc.finalProject.description]
    );
    // Formação com plano próprio volta para a organização de blocos do plano.
    const plan = planForCourse(course);
    if (plan) {
      await applyBlockPlan(client, course.id, plan);
    }
  });

  return course.id;
}

module.exports = { BACKUP_FORMAT, buildBackup, parseBackup, importAsNewCourse, restoreIntoCourse };
