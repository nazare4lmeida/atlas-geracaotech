// Imagens das aulas ficam num bucket PRIVADO do Supabase Storage.
// O navegador nunca recebe a chave do Supabase nem o endereço do bucket: recebe um link assinado pelo próprio
// servidor (HMAC com JWT_SECRET, com validade). O servidor baixa a imagem e a entrega ao aluno.
const crypto = require('crypto');
const { randomUUID } = require('crypto');

const BUCKET = () => process.env.SUPABASE_MEDIA_BUCKET || 'lesson-media';
const LINK_TTL_SECONDS = 6 * 60 * 60;

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};
const MAX_BYTES = 5 * 1024 * 1024;
const PATH_PATTERN = /^lessons\/[a-f0-9-]{36}\.(jpg|png|webp|gif)$/;

function storageUrl(path) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (!base) throw new Error('SUPABASE_URL não configurada.');
  return `${base}/storage/v1/object/${BUCKET()}/${path}`;
}

function serviceHeaders(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
  return { Authorization: `Bearer ${key}`, apikey: key, ...extra };
}

function validateUpload(buffer, contentType) {
  const ext = ALLOWED_TYPES[String(contentType || '').split(';')[0].trim().toLowerCase()];
  if (!ext) return { error: 'Formato não aceito. Use JPG, PNG, WebP ou GIF.' };
  if (!buffer || buffer.length === 0) return { error: 'Arquivo vazio.' };
  if (buffer.length > MAX_BYTES) return { error: 'A imagem passa de 5 MB.' };
  return { ext };
}

async function uploadMedia(buffer, contentType) {
  const { ext, error } = validateUpload(buffer, contentType);
  if (error) return { error };
  const path = `lessons/${randomUUID()}.${ext}`;
  const response = await fetch(storageUrl(path), {
    method: 'POST',
    headers: serviceHeaders({ 'Content-Type': contentType, 'x-upsert': 'false' }),
    body: buffer
  });
  if (!response.ok) throw new Error(`Falha ao enviar a imagem (${response.status}).`);
  return { path };
}

async function fetchMedia(path) {
  if (!PATH_PATTERN.test(path)) return null;
  const response = await fetch(storageUrl(path), { headers: serviceHeaders() });
  return response.ok ? response : null;
}

function signature(path, expires) {
  const secret = process.env.JWT_SECRET || '';
  return crypto.createHmac('sha256', secret).update(`${path}|${expires}`).digest('hex');
}

function apiBase() {
  if (process.env.API_PUBLIC_URL) return process.env.API_PUBLIC_URL.replace(/\/$/, '');
  return process.env.NODE_ENV === 'production' ? '' : `http://localhost:${process.env.PORT || 5000}`;
}

// Link temporário para a imagem. Usado na serialização das aulas.
function mediaUrl(path) {
  const expires = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
  const query = new URLSearchParams({ p: path, e: String(expires), s: signature(path, expires) });
  return `${apiBase()}/api/media/file?${query.toString()}`;
}

function verifyMediaLink(path, expires, sig) {
  if (!PATH_PATTERN.test(path)) return false;
  const exp = Number(expires);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(signature(path, exp));
  const given = Buffer.from(String(sig || ''));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Troca o src de cada <img data-media="..."> por um link assinado novo (o src salvo pode ter expirado).
function withMediaUrls(html = '') {
  if (!html || !/data-media="/i.test(html)) return html;
  return html.replace(/<img\b([^>]*?)>/gi, (tag) => {
    const match = tag.match(/data-media="([^"]+)"/i);
    if (!match || !PATH_PATTERN.test(match[1])) return tag;
    const attrs = tag.slice(4, -1).replace(/\s*\bsrc="[^"]*"/i, '').replace(/\s*\/?$/, '');
    return `<img${attrs} src="${mediaUrl(match[1])}">`;
  });
}

module.exports = {
  ALLOWED_TYPES,
  MAX_BYTES,
  validateUpload,
  uploadMedia,
  fetchMedia,
  verifyMediaLink,
  mediaUrl,
  withMediaUrls
};
