const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeBlocks, overallPercentage, assertModuleUnlocked } = require('../services/blockProgress');

// Formação: Início (aberto), Bloco A (2 aulas + quiz), Bloco B (1 aula), Apoio (aberto).
const view = {
  blocks: [
    { id: 'i', title: 'Início', position: 0, unlockMode: 'open', workloadHours: 0 },
    { id: 'a', title: 'A', position: 1, unlockMode: 'sequential', workloadHours: 40 },
    { id: 'b', title: 'B', position: 2, unlockMode: 'sequential', workloadHours: 10 },
    { id: 'p', title: 'Apoio', position: 3, unlockMode: 'open', workloadHours: 0 }
  ],
  modules: [
    { id: 'm-ini', blockId: 'i', kind: 'modulo', lessons: [{ id: 'l-ini' }], quiz: [] },
    { id: 'm-a', blockId: 'a', kind: 'modulo', lessons: [{ id: 'l-a1' }, { id: 'l-a2' }], quiz: [{ id: 'q1' }] },
    { id: 'm-b', blockId: 'b', kind: 'modulo', lessons: [{ id: 'l-b1' }], quiz: [] },
    { id: 'm-rec', blockId: null, kind: 'recuperacao', lessons: [], quiz: [{ id: 'qr' }] },
    { id: 'm-apoio', blockId: 'p', kind: 'modulo', lessons: [{ id: 'l-p' }], quiz: [] }
  ]
};

const byId = (blocks, id) => blocks.find((block) => block.id === id);

describe('estado dos blocos', () => {
  test('no início, só o bloco aberto e o primeiro sequencial estão liberados', () => {
    const blocks = computeBlocks(view, { completedLessons: [], quizResults: {} });
    assert.equal(byId(blocks, 'i').unlocked, true);
    assert.equal(byId(blocks, 'a').unlocked, true);
    assert.equal(byId(blocks, 'b').unlocked, false);
    assert.equal(byId(blocks, 'p').unlocked, true);
  });

  test('bloco sequencial só conta como concluído com aulas e quiz aprovados', () => {
    const entry = { completedLessons: ['l-a1', 'l-a2'], quizResults: { 'm-a': { passed: false } } };
    const blocks = computeBlocks(view, entry);
    assert.equal(byId(blocks, 'a').completed, false);
    assert.equal(byId(blocks, 'b').unlocked, false);
  });

  test('ao concluir o bloco A, o bloco B é liberado', () => {
    const entry = { completedLessons: ['l-a1', 'l-a2'], quizResults: { 'm-a': { passed: true } } };
    const blocks = computeBlocks(view, entry);
    assert.equal(byId(blocks, 'a').completed, true);
    assert.equal(byId(blocks, 'b').unlocked, true);
  });

  test('bloco aberto não trava os seguintes', () => {
    const blocks = computeBlocks(view, { completedLessons: [], quizResults: {} });
    // o bloco Apoio é aberto; o bloco B continua bloqueado pelo A, não pelo Apoio
    assert.equal(byId(blocks, 'b').unlocked, false);
  });

  test('a prova de recuperação não entra em nenhum bloco', () => {
    const blocks = computeBlocks(view, { completedLessons: [], quizResults: { 'm-rec': { passed: true } } });
    blocks.forEach((block) => assert.ok(!block.moduleIds.includes('m-rec')));
  });

  test('bloco sem passos conta como concluído, para não travar a sequência', () => {
    const empty = { blocks: [{ id: 'e', title: 'Vazio', position: 0, unlockMode: 'sequential' }, { id: 'z', title: 'Z', position: 1, unlockMode: 'sequential' }], modules: [{ id: 'mz', blockId: 'z', lessons: [{ id: 'lz' }], quiz: [] }] };
    const blocks = computeBlocks(empty, { completedLessons: [], quizResults: {} });
    assert.equal(byId(blocks, 'e').completed, true);
    assert.equal(byId(blocks, 'z').unlocked, true);
  });
});

describe('guarda de ação em bloco bloqueado', () => {
  const blocks = computeBlocks(view, { completedLessons: [], quizResults: {} });

  test('recusa aula de bloco bloqueado', () => {
    assert.throws(() => assertModuleUnlocked(view, blocks, 'm-b'), (error) => error.statusCode === 403);
  });

  test('permite aula de bloco liberado', () => {
    assert.doesNotThrow(() => assertModuleUnlocked(view, blocks, 'm-a'));
  });

  test('permite revisar conteúdo já concluído, mesmo em bloco bloqueado', () => {
    assert.doesNotThrow(() => assertModuleUnlocked(view, blocks, 'm-b', { alreadyCompleted: true }));
  });

  test('módulo de recuperação não sofre bloqueio de bloco', () => {
    assert.doesNotThrow(() => assertModuleUnlocked(view, blocks, 'm-rec'));
  });
});

describe('progresso geral da formação', () => {
  test('pondera pela carga horária dos blocos', () => {
    const blocks = [
      { totalSteps: 2, percentage: 100, workloadHours: 40 },
      { totalSteps: 2, percentage: 0, workloadHours: 10 }
    ];
    assert.equal(overallPercentage(blocks), 80);
  });

  test('sem carga horária, usa média simples', () => {
    const blocks = [
      { totalSteps: 2, percentage: 100, workloadHours: 0 },
      { totalSteps: 2, percentage: 0, workloadHours: 0 }
    ];
    assert.equal(overallPercentage(blocks), 50);
  });
});
