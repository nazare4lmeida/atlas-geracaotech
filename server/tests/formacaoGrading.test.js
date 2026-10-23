const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { resolveFormacao } = require('../services/formacaoGrading');

const entregue = (grade) => ({ delivered: true, grade });
const nao = { delivered: false, grade: null };

describe('formação: conclusão e participação', () => {
  test('blocos não concluídos: em andamento, mesmo com prova boa', () => {
    const r = resolveFormacao({ blocksDone: false, projects: [entregue(9)], examGrade: 10 });
    assert.equal(r.status, 'em_andamento');
    assert.equal(r.tipo, null);
  });

  test('projeto 5 e prova 7: participação, nota final 7', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(5)], examGrade: 7 });
    assert.equal(r.tipo, 'participacao');
    assert.equal(r.finalGrade, 7);
  });

  test('projeto 8 e prova 9: conclusão (passou de 7 no projeto), nota final 9', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(8)], examGrade: 9 });
    assert.equal(r.tipo, 'conclusao');
    assert.equal(r.finalGrade, 9);
  });

  test('projeto 7,5 e prova 6: conclusão, porque a maior nota é do projeto', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(7.5)], examGrade: 6 });
    assert.equal(r.tipo, 'conclusao');
    assert.equal(r.finalGrade, 7.5);
  });

  test('sem projeto entregue e prova 7: participação', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [nao], examGrade: 7 });
    assert.equal(r.tipo, 'participacao');
  });

  test('sem projeto entregue e prova 6: sem certificado', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [nao], examGrade: 6 });
    assert.equal(r.status, 'sem_certificado');
    assert.equal(r.tipo, null);
  });

  test('sem projeto entregue e sem prova: aguardando prova', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [nao], examGrade: null });
    assert.equal(r.status, 'aguardando_prova');
    assert.equal(r.tipo, null);
  });

  test('projeto entregue sem nota ainda: aguardando nota, sem certificado', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(null)], examGrade: null });
    assert.equal(r.status, 'aguardando_nota');
    assert.equal(r.tipo, null);
  });

  test('dois projetos, só um entregue: não é conclusão; prova 8 dá participação', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(9), nao], examGrade: 8 });
    assert.equal(r.tipo, 'participacao');
    assert.equal(r.finalGrade, 9);
  });

  test('dois projetos entregues: média conta como nota do projeto', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(8), entregue(6)], examGrade: 9 });
    // média 7 não passa de 7, e a prova (9) é maior que o projeto → participação
    assert.equal(r.projectGrade, 7);
    assert.equal(r.tipo, 'participacao');
    assert.equal(r.finalGrade, 9);
  });

  test('dois projetos entregues com média acima de 7: conclusão', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(9), entregue(8)], examGrade: 10 });
    assert.equal(r.tipo, 'conclusao');
  });

  test('formação sem projetos: conclusão com os blocos', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [], examGrade: null });
    assert.equal(r.tipo, 'conclusao');
  });

  test('projeto abaixo de 7 não dá conclusão, mesmo sendo a maior nota (sem prova)', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(6)], examGrade: null });
    assert.equal(r.tipo, null);
    assert.equal(r.status, 'aguardando_prova');
  });

  test('projeto 6 e prova 7: participação, não conclusão', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(6)], examGrade: 7 });
    assert.equal(r.tipo, 'participacao');
    assert.equal(r.finalGrade, 7);
  });

  test('projeto 6 e prova 5: sem certificado', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(6)], examGrade: 5 });
    assert.equal(r.status, 'sem_certificado');
  });

  test('projeto 7 e prova 9: participação (7 não supera a prova)', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(7)], examGrade: 9 });
    assert.equal(r.tipo, 'participacao');
  });

  test('projeto 7 sem prova: conclusão (é a maior nota e atinge o mínimo)', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [entregue(7)], examGrade: null });
    assert.equal(r.tipo, 'conclusao');
  });

  test('qualquer aluna pode fazer a prova: prova sem projeto entregue conta', () => {
    const r = resolveFormacao({ blocksDone: true, projects: [nao], examGrade: 10 });
    assert.equal(r.tipo, 'participacao');
    assert.equal(r.finalGrade, 10);
  });
});
