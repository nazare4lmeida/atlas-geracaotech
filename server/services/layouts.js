const httpError = require('../utils/httpError');

// Layouts e identidade visual dos cursos. O professor escolhe um layout ao criar o curso;
// o material é exibido dentro dele, e as cores/fonte podem ser ajustadas sem editar código.
// As listas abaixo são a fonte da verdade: o front-end usa os mesmos ids.

const LAYOUTS = ['caderno', 'classico', 'terminal', 'editorial'];
const FONTS = ['grotesk', 'humanista', 'serifada', 'mono'];
const RADII = ['reto', 'suave', 'arredondado'];
const DENSITIES = ['confortavel', 'compacto'];
const DEFAULT_LAYOUT = 'caderno';

const DEFAULT_THEME = {
  primary: '#134771',
  accent: '#4E8BB8',
  font: 'grotesk',
  radius: 'suave',
  density: 'confortavel',
  bannerUrl: '',
  logoUrl: ''
};

const HEX = /^#[0-9a-f]{6}$/i;

function requireOneOf(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw httpError(400, `Valor inválido para ${label.toLowerCase()}. Opções: ${allowed.join(', ')}.`);
  }
  return value;
}

function requireUrl(value, label) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!/^https?:\/\//i.test(text) || text.length > 2000) {
    throw httpError(400, `${label} precisa ser uma URL começando com http:// ou https://.`);
  }
  return text;
}

// Valida o layout enviado. Desconhecido vira erro (não silencia valores errados).
function normalizeLayout(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_LAYOUT;
  return requireOneOf(String(value), LAYOUTS, 'Layout');
}

// Valida e completa o tema. Campos ausentes assumem o padrão.
function normalizeTheme(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const theme = { ...DEFAULT_THEME };

  for (const color of ['primary', 'accent']) {
    if (source[color] !== undefined) {
      if (!HEX.test(String(source[color]))) {
        throw httpError(400, `A cor ${color === 'primary' ? 'principal' : 'de destaque'} precisa estar no formato #RRGGBB.`);
      }
      theme[color] = String(source[color]).toLowerCase();
    }
  }
  if (source.font !== undefined) theme.font = requireOneOf(source.font, FONTS, 'Fonte');
  if (source.radius !== undefined) theme.radius = requireOneOf(source.radius, RADII, 'Forma');
  if (source.density !== undefined) theme.density = requireOneOf(source.density, DENSITIES, 'Densidade');
  if (source.bannerUrl !== undefined) theme.bannerUrl = requireUrl(source.bannerUrl, 'O banner');
  if (source.logoUrl !== undefined) theme.logoUrl = requireUrl(source.logoUrl, 'O logo');

  return theme;
}

// Tema efetivo de um curso: a cor principal padrão é a cor de destaque antiga do curso (coluna accent).
function effectiveTheme(course) {
  const stored = course.theme && typeof course.theme === 'object' ? course.theme : {};
  return { ...DEFAULT_THEME, primary: course.accent || DEFAULT_THEME.primary, ...stored };
}

module.exports = {
  LAYOUTS,
  FONTS,
  RADII,
  DENSITIES,
  DEFAULT_LAYOUT,
  DEFAULT_THEME,
  normalizeLayout,
  normalizeTheme,
  effectiveTheme
};
