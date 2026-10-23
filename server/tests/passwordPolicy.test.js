const test = require('node:test');
const assert = require('node:assert/strict');
const { passwordProblems, passwordChecks } = require('../services/passwordPolicy');

test('aceita senha que cumpre todas as regras', () => {
  assert.deepEqual(passwordProblems('Ç4ntinho!Forte'), []);
});

test('exige maiúscula, minúscula, número, acento e símbolo', () => {
  const problems = passwordProblems('senhafraca');
  assert.ok(problems.some((p) => p.includes('maiúscula')));
  assert.ok(problems.some((p) => p.includes('número')));
  assert.ok(problems.some((p) => p.includes('símbolo')));
  assert.ok(problems.some((p) => p.includes('acento')));
});

test('exige tamanho mínimo de 8 caracteres', () => {
  assert.ok(passwordProblems('Aç1!xyz').some((p) => p.includes('entre 8')));
  assert.equal(passwordProblems('Aç1!xyzw').length, 0);
});

test('recusa espaços', () => {
  assert.ok(passwordProblems('Aç1! xyzw').some((p) => p.includes('espaços')));
});

test('recusa senha que contém o CPF (com ou sem máscara)', () => {
  const problems = passwordProblems('Aç1!123.456.789-09', { cpfDigits: '12345678909' });
  assert.ok(problems.some((p) => p.includes('CPF')));
});

test('recusa senha que contém o início do e-mail', () => {
  const problems = passwordProblems('Aç1!joaosilva', { email: 'joaosilva@exemplo.com' });
  assert.ok(problems.some((p) => p.includes('e-mail')));
});

test('recusa senhas comuns, mesmo com maiúscula e símbolo', () => {
  assert.ok(passwordProblems('senha123').some((p) => p.includes('comum')));
});

test('checklist reflete cada regra separadamente', () => {
  const checks = passwordChecks('Ã1!');
  assert.equal(checks.upper, true);
  assert.equal(checks.lower, false);
  assert.equal(checks.accent, true);
  assert.equal(checks.length, false);
});
