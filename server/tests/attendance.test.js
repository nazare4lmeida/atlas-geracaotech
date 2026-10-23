const test = require('node:test');
const assert = require('node:assert/strict');

// Regras puras da presença: normalização de status e de datas vindas de planilha.
// (A função não é exportada, então testamos pelo comportamento público do módulo de validação e pelas constantes.)
const { isoDate } = require('../services/validators');
const repo = require('../db/attendanceRepo');

test('status aceitos pela presença', () => {
  assert.deepEqual(repo.STATUSES, ['presente', 'ausente', 'justificado']);
});

test('data ISO válida e inválida', () => {
  assert.equal(isoDate('2026-10-22'), '2026-10-22');
  assert.throws(() => isoDate('2026-02-30'));
  assert.throws(() => isoDate('22/10/2026'));
});
