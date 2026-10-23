// Validações de entrada compartilhadas pelos controladores (o servidor confere tudo, não só o cliente).
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const { AVATARS } = require('./avatarList');
const httpError = require('../utils/httpError');

function text(value, { field, max, min = 0, optional = false }) {
  if (value === undefined || value === null) {
    if (optional) return undefined;
    throw httpError(400, `${field} é obrigatório.`);
  }
  const clean = String(value).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (clean.length < min) throw httpError(400, `${field} é muito curto.`);
  if (clean.length > max) throw httpError(400, `${field} pode ter no máximo ${max} caracteres.`);
  if (!clean && !optional) throw httpError(400, `${field} é obrigatório.`);
  return clean;
}

function phone(value) {
  if (value === undefined) return undefined;
  const digits = String(value).replace(/\D/g, '');
  if (digits && (digits.length < 10 || digits.length > 11)) throw httpError(400, 'Telefone deve ter DDD e número (10 ou 11 dígitos).');
  return digits;
}

function uf(value) {
  if (value === undefined) return undefined;
  const clean = String(value).trim().toUpperCase();
  if (!clean) return '';
  if (!UFS.includes(clean)) throw httpError(400, 'Estado (UF) inválido.');
  return clean;
}

function avatar(value) {
  if (value === undefined) return undefined;
  if (!AVATARS.includes(value)) throw httpError(400, 'Avatar inválido.');
  return value;
}

function isoDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) throw httpError(400, 'Data inválida (use AAAA-MM-DD).');
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw httpError(400, 'Data inválida.');
  return value;
}

module.exports = { text, phone, uf, avatar, isoDate, UFS };
