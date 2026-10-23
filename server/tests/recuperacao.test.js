const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { summarizeProgress } = require('../services/courseView');

const courseView = {
  modules: [
    { id: 'm1', kind: 'modulo', lessons: [{ id: 'l1' }, { id: 'l2' }] },
    { id: 'rec', kind: 'recuperacao', lessons: [] }
  ]
};

describe('prova de recuperação fora do progresso de conteúdo', () => {
  test('o módulo de recuperação não conta como quiz nem como passo', () => {
    const s = summarizeProgress(courseView, { completedLessons: ['l1', 'l2'], quizResults: {}, finalProjectCompleted: false });
    assert.equal(s.totalQuizzes, 1);
    assert.equal(s.totalLessons, 2);
  });

  test('módulo de recuperação com resultado não altera o progresso de conteúdo', () => {
    const s = summarizeProgress(courseView, { completedLessons: ['l1'], quizResults: { rec: { passed: true } } });
    assert.equal(s.passedQuizzes, 0);
  });
});
