const crypto = require('crypto');

// CPF: validação (dígitos verificadores), criptografia em repouso (AES-256-GCM) e hash para busca/unicidade (HMAC).
// A chave vem de CPF_ENCRYPTION_KEY (recomendado) ou, se ausente, de JWT_SECRET. Trocar a chave invalida os CPFs salvos.

function digitsOf(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidCpf(value) {
  const d = digitsOf(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const length of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(d[i]) * (length + 1 - i);
    let check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== Number(d[length])) return false;
  }
  return true;
}

function encryptionKey() {
  const secret = process.env.CPF_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error('CPF_ENCRYPTION_KEY não configurada.');
  return crypto.createHash('sha256').update(secret).digest();
}

function hashCpf(digits) {
  return crypto.createHmac('sha256', encryptionKey()).update(digits).digest('hex');
}

function encryptCpf(digits) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(digits, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64')).join('.');
}

function decryptCpf(payload) {
  const [iv, tag, encrypted] = String(payload).split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function formatCpf(digits) {
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function maskCpf(last2) {
  return last2 ? `***.***.***-${last2}` : '';
}

module.exports = { digitsOf, isValidCpf, hashCpf, encryptCpf, decryptCpf, formatCpf, maskCpf };
