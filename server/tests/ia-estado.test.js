const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calcularEstado } = require('../services/ia/estado');

const envOk = {
  IA_PROVEDOR: 'gemini',
  IA_MODELO: 'modelo-teste',
  IA_API_KEY: 'chave-teste',
  IA_MODULOS_ATIVOS: 'tutor',
};

describe('estado da IA', () => {
  test('desligada no painel: o site continua, modulos off, mesmo configurada', () => {
    const e = calcularEstado({ env: envOk, ligadaNoPainel: false });
    assert.equal(e.ligada, false);
    assert.equal(e.configurada, true);
    assert.equal(e.modulos.tutor, false);
  });

  test('ligada no painel mas sem configuracao: nao quebra, mostra o motivo', () => {
    const e = calcularEstado({ env: {}, ligadaNoPainel: true });
    assert.equal(e.ligada, true);
    assert.equal(e.configurada, false);
    assert.equal(e.modulos.tutor, false);
    assert.match(e.motivo, /IA_PROVEDOR|desligados/);
  });

  test('ligada, configurada e modulo listado: tutor liberado', () => {
    const e = calcularEstado({ env: envOk, ligadaNoPainel: true });
    assert.equal(e.modulos.tutor, true);
    assert.equal(e.provedor, 'gemini');
  });

  test('modulo fora da lista do .env continua off', () => {
    const e = calcularEstado({ env: { ...envOk, IA_MODULOS_ATIVOS: '' }, ligadaNoPainel: true });
    assert.equal(e.modulos.tutor, false);
  });

  test('provedor invalido: nao configurada, nao expoe provedor', () => {
    const e = calcularEstado({ env: { ...envOk, IA_PROVEDOR: 'xpto' }, ligadaNoPainel: true });
    assert.equal(e.configurada, false);
    assert.equal(e.provedor, null);
  });
});
