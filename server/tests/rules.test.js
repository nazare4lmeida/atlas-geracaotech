const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeAccess, canDeleteCourse } = require('../services/access');
const { serializeCourse, summarizeProgress } = require('../services/courseView');
const { slugify, moveItem } = require('../utils/ids');
const { toCourseDocument, getCatalogDocuments } = require('../services/catalogImport');

const admin = { id: 'a', role: 'admin' };
const teacher = { id: 't', role: 'teacher' };
const student = { id: 's', role: 'student' };

describe('permissões (computeAccess)', () => {
  test('admin gerencia qualquer curso mesmo sem matrícula', () => {
    const access = computeAccess(admin, null);
    assert.equal(access.canManage, true);
    assert.equal(access.role, 'admin');
  });

  test('docente matriculado como teacher gerencia o curso', () => {
    const access = computeAccess(teacher, { role: 'teacher', status: 'active' });
    assert.equal(access.canManage, true);
    assert.equal(access.role, 'teacher');
  });

  test('aluno matriculado não gerencia o curso', () => {
    const access = computeAccess(student, { role: 'student', status: 'active' });
    assert.equal(access.canManage, false);
    assert.equal(access.role, 'student');
  });

  test('matrícula suspensa bloqueia acesso, inclusive a de docente', () => {
    const access = computeAccess(teacher, { role: 'teacher', status: 'suspended' });
    assert.equal(access.canManage, false);
    assert.equal(access.role, null);
    assert.equal(access.suspended, true);
  });

  test('sem matrícula não há papel no curso', () => {
    const access = computeAccess(student, null);
    assert.equal(access.role, null);
    assert.equal(access.canManage, false);
  });

  test('docente de conta sem matrícula como docente não gerencia o curso', () => {
    const access = computeAccess(teacher, { role: 'student', status: 'active' });
    assert.equal(access.canManage, false);
  });
});

describe('exclusão de curso', () => {
  const course = { createdBy: 't' };

  test('admin pode excluir qualquer curso', () => {
    assert.equal(canDeleteCourse(admin, { createdBy: 'x' }), true);
  });

  test('somente o criador (não-admin) pode excluir', () => {
    assert.equal(canDeleteCourse(teacher, course), true);
    assert.equal(canDeleteCourse({ id: 'outro', role: 'teacher' }, course), false);
  });

  test('cursos sem criador só podem ser excluídos pelo admin', () => {
    assert.equal(canDeleteCourse(teacher, { createdBy: null }), false);
  });
});

describe('visão do curso por papel', () => {
  const course = {
    id: 'c1',
    slug: 'curso',
    title: 'Curso',
    modules: [
      {
        id: 'm1',
        title: 'Visível',
        visible: true,
        lessons: [
          { id: 'l1', title: 'A', type: 'video', url: 'https://x', content: '', visible: true },
          { id: 'l2', title: 'Oculta', type: 'page', content: 'x', visible: false }
        ],
        quiz: [{ id: 'q1', question: 'Q', options: ['a', 'b'], answer: 0 }]
      },
      { id: 'm2', title: 'Oculta', visible: false, lessons: [], quiz: [] }
    ]
  };

  test('aluno não vê seções nem recursos ocultos', () => {
    const view = serializeCourse(course, { canManage: false });
    assert.deepEqual(view.modules.map((m) => m.id), ['m1']);
    assert.deepEqual(view.modules[0].lessons.map((l) => l.id), ['l1']);
  });

  test('gestor vê todos os itens, inclusive ocultos', () => {
    const view = serializeCourse(course, { canManage: true });
    assert.equal(view.modules.length, 2);
    assert.equal(view.modules[0].lessons.length, 2);
  });
});

describe('progresso e certificado', () => {
  const view = {
    modules: [
      { id: 'm1', lessons: [{ id: 'l1' }, { id: 'l2' }], quiz: [] },
      { id: 'm2', lessons: [{ id: 'l3' }], quiz: [] }
    ]
  };

  test('conta apenas aulas que existem na visão (ignora órfãs)', () => {
    const summary = summarizeProgress(view, {
      completedLessons: ['l1', 'removida'],
      quizResults: {},
      finalProjectCompleted: false
    });
    assert.equal(summary.completedLessons, 1);
    assert.equal(summary.totalLessons, 3);
  });

  test('certificado exige todas as aulas, quizzes aprovados e projeto final', () => {
    const complete = {
      completedLessons: ['l1', 'l2', 'l3'],
      quizResults: { m1: { passed: true }, m2: { passed: true } },
      finalProjectCompleted: true
    };
    assert.equal(summarizeProgress(view, complete).certificateEligible, true);

    const noProject = { ...complete, finalProjectCompleted: false };
    assert.equal(summarizeProgress(view, noProject).certificateEligible, false);

    const failedQuiz = { ...complete, quizResults: { m1: { passed: true }, m2: { passed: false } } };
    assert.equal(summarizeProgress(view, failedQuiz).certificateEligible, false);
  });

  test('percentual segue a fórmula original (aulas + quizzes + projeto)', () => {
    const summary = summarizeProgress(view, { completedLessons: ['l1'], quizResults: {}, finalProjectCompleted: false });
    // 1 aula de 3 + 0 de 2 quizzes + 0 de 1 projeto = 1/6
    assert.equal(summary.percentage, Math.round((1 / 6) * 100));
  });
});

describe('utilitários', () => {
  test('slugify gera identificadores de URL válidos', () => {
    assert.equal(slugify('Introdução ao React!'), 'introducao-ao-react');
    assert.equal(slugify('  Node.js  '), 'node-js');
    assert.equal(slugify('!!!'), '');
  });

  test('moveItem troca posições e respeita os limites', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    assert.deepEqual(moveItem(items, 'b', 'up').map((i) => i.id), ['b', 'a', 'c']);
    assert.deepEqual(moveItem(items, 'b', 'down').map((i) => i.id), ['a', 'c', 'b']);
    assert.deepEqual(moveItem(items, 'a', 'up').map((i) => i.id), ['a', 'b', 'c']);
    assert.equal(moveItem(items, 'zzz', 'up'), null);
  });
});

describe('catálogo original', () => {
  test('preserva IDs de seções e aulas para manter o progresso existente', () => {
    const documents = getCatalogDocuments();
    // 6 cursos originais de demonstração + 10 formações do Geração Tech.
    assert.equal(documents.length, 16);

    const logic = documents[0];
    assert.equal(logic.slug, 'logica-de-programacao');
    assert.equal(logic.modules[0].id, 'logic-1');
    assert.equal(logic.modules[0].lessons[0].id, 'logic-1-1');
    assert.equal(logic.modules[0].lessons[0].type, 'video');
    assert.equal(logic.modules[0].quiz[0].id, 'logic-1-q1');
  });

  test('todos os IDs de seção e aula são únicos no catálogo inteiro', () => {
    const ids = [];
    getCatalogDocuments().forEach((course) =>
      course.modules.forEach((module) => {
        ids.push(module.id);
        module.lessons.forEach((lesson) => ids.push(lesson.id));
      })
    );
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe('layouts e tema', () => {
  const { normalizeLayout, normalizeTheme, effectiveTheme } = require('../services/layouts');

  test('aceita os quatro layouts e recusa desconhecidos', () => {
    for (const id of ['caderno', 'classico', 'terminal', 'editorial']) {
      assert.equal(normalizeLayout(id), id);
    }
    assert.equal(normalizeLayout(undefined), 'caderno');
    assert.throws(() => normalizeLayout('neon'), /Valor inválido para layout/);
  });

  test('valida cores, fonte, forma e URLs do tema', () => {
    const theme = normalizeTheme({ primary: '#ABCDEF', font: 'mono', radius: 'reto', density: 'compacto', bannerUrl: 'https://exemplo.com/a.png' });
    assert.equal(theme.primary, '#abcdef');
    assert.equal(theme.font, 'mono');
    assert.throws(() => normalizeTheme({ primary: 'red' }), /#RRGGBB/);
    assert.throws(() => normalizeTheme({ font: 'comic-sans' }), /Valor inválido para fonte/);
    assert.throws(() => normalizeTheme({ logoUrl: 'ftp://x' }), /http/);
  });

  test('tema efetivo usa a cor de destaque antiga como cor principal padrão', () => {
    const effective = effectiveTheme({ accent: '#00C600', theme: {} });
    assert.equal(effective.primary, '#00C600');
    const custom = effectiveTheme({ accent: '#00C600', theme: { primary: '#111111' } });
    assert.equal(custom.primary, '#111111');
  });
});
