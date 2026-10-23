const crypto = require('crypto');
const QRCode = require('qrcode');

// Modelos de certificado: validação do que chega do editor e montagem do certificado do aluno.
// Os tokens ({NOME_DO_ALUNO} etc.) são trocados no servidor, na emissão, então o aluno recebe o texto final.

const TOKENS = [
  'NOME_DO_ALUNO',
  'CURSO',
  'PERIODO',
  'CARGA_HORARIA',
  'LOCAL',
  'DATA_EMISSAO',
  'CONTEUDO_PROGRAMATICO',
  'CODIGO_AUTENTICACAO'
];
const FIELD_TYPES = ['texto', 'qrcode'];
const EDITABLE_VARIABLES = ['LOCAL', 'PERIODO', 'CARGA_HORARIA'];
const REFERENCE_WIDTH_PT = 893;
const MAX_BACKGROUND_CHARS = 4 * 1024 * 1024;
const BACKGROUND_PATTERN = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/;

function validateBackground(value) {
  if (!BACKGROUND_PATTERN.test(String(value || ''))) return 'Use uma imagem PNG ou JPG como fundo.';
  if (value.length > MAX_BACKGROUND_CHARS) return 'A imagem de fundo passa de 4 MB.';
  return null;
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function sanitizeField(field) {
  if (!field || typeof field !== 'object') return null;
  return {
    id: String(field.id || crypto.randomUUID()).slice(0, 64),
    tipo: FIELD_TYPES.includes(field.tipo) ? field.tipo : 'texto',
    texto: String(field.texto ?? '').slice(0, 1000),
    x: clampNumber(field.x, 0, 1, 0.1),
    y: clampNumber(field.y, 0, 1, 0.1),
    w: clampNumber(field.w, 0.02, 1, 0.5),
    h: clampNumber(field.h, 0.02, 1, 0.08),
    tamanhoPt: clampNumber(field.tamanhoPt, 6, 120, 16),
    negrito: Boolean(field.negrito),
    cor: /^#[0-9a-fA-F]{6}$/.test(field.cor) ? field.cor : '#091A38',
    alinhamento: ['left', 'center', 'right'].includes(field.alinhamento) ? field.alinhamento : 'left'
  };
}

function sanitizeConfig(input = {}) {
  const variables = {};
  EDITABLE_VARIABLES.forEach((key) => {
    variables[key] = String((input.variaveis || {})[key] ?? '').slice(0, 120);
  });
  const fields = Array.isArray(input.campos) ? input.campos.slice(0, 60).map(sanitizeField).filter(Boolean) : [];
  return {
    largura_pt: REFERENCE_WIDTH_PT,
    altura_pt: clampNumber(input.altura_pt, 200, 2000, 632),
    variaveis: variables,
    campos: fields
  };
}

// Verso: fundo opcional + configuração. Sem fundo, o verso não é emitido.
function sanitizeVerso(input) {
  if (!input || typeof input !== 'object') return null;
  const background = input.background || '';
  if (background) {
    const error = validateBackground(background);
    if (error) return { error };
  }
  return { value: { background, config: sanitizeConfig(input.config) } };
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Conteúdo programático: cada módulo e, abaixo, as unidades dele (as aulas sem unidade não entram).
function programContent(course) {
  return (course.modules || [])
    .map((module) => {
      const lines = [module.title];
      let lastUnit = null;
      (module.lessons || []).forEach((lesson) => {
        if (lesson.unit && lesson.unit !== lastUnit) {
          lines.push(`   ${lesson.unit}`);
          lastUnit = lesson.unit;
        }
      });
      return lines.join('\n');
    })
    .join('\n\n');
}

// Endereço público de verificação (lido pelo QR code e pelo código impresso).
function verificationUrl(authCode) {
  const base = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].replace(/\/$/, '');
  return `${base}/verificar/${authCode}`;
}

function tokenValues(course, user, issuedAt, variables = {}, authCode = '') {
  return {
    CODIGO_AUTENTICACAO: authCode,
    CONTEUDO_PROGRAMATICO: programContent(course),
    NOME_DO_ALUNO: user.name,
    CURSO: course.title,
    PERIODO: variables.PERIODO || '',
    CARGA_HORARIA: variables.CARGA_HORARIA || (course.estimatedHours ? `${course.estimatedHours}h/aula` : ''),
    LOCAL: variables.LOCAL || '',
    DATA_EMISSAO: formatDate(issuedAt)
  };
}

function resolveText(text, values) {
  return String(text).replace(/\{([A-Z_]+)\}/g, (match, key) => (TOKENS.includes(key) ? values[key] : match));
}

// Certificado pronto para desenhar no navegador do aluno (fundo + campos já com o texto final).
async function resolveSide(background, rawConfig, course, user, issuedAt, authCode, qrDataUri) {
  const config = sanitizeConfig(rawConfig);
  const values = tokenValues(course, user, issuedAt, config.variaveis, authCode);
  return {
    background,
    config: {
      ...config,
      campos: config.campos.map((field) =>
        field.tipo === 'qrcode'
          ? { ...field, texto: '', qr: qrDataUri }
          : { ...field, texto: resolveText(field.texto, values) }
      )
    }
  };
}

// Certificado pronto para o aluno. Frente e verso já com texto final e QR code (PNG em data URI).
async function buildCertificatePayload(template, course, user, issuedAt, authCode) {
  if (!template) return null;
  const qrDataUri = await QRCode.toDataURL(verificationUrl(authCode), {
    type: 'image/png',
    width: 300,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#1a1a2e', light: '#ffffff' }
  });
  const front = await resolveSide(template.background, template.config, course, user, issuedAt, authCode, qrDataUri);
  const verso =
    template.verso && template.verso.background
      ? await resolveSide(template.verso.background, template.verso.config, course, user, issuedAt, authCode, qrDataUri)
      : null;
  return { ...front, verso, authCode, verificationUrl: verificationUrl(authCode) };
}

module.exports = {
  TOKENS,
  verificationUrl,
  validateBackground,
  sanitizeConfig,
  sanitizeVerso,
  buildCertificatePayload
};
