// Layouts de curso e conversão do tema escolhido pelo professor em variáveis CSS.
// Os ids (caderno, classico, terminal, editorial) são os mesmos aceitos pela API (server/services/layouts.js).

export const LAYOUTS = [
  {
    id: 'caderno',
    name: 'Caderno',
    description: 'Papel quadriculado e tinta azul-petróleo. É o visual original da plataforma.',
    swatch: { bg: '#f3f1ec', ink: '#2c3440', accent: '#134771' }
  },
  {
    id: 'classico',
    name: 'Clássico',
    description: 'Cabeçalho colorido, abas arredondadas e cartões com faixa lateral. Parecido com os cursos do Moodle.',
    swatch: { bg: '#ffffff', ink: '#0f2a4a', accent: '#134771' }
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Fundo escuro, títulos em fonte monoespaçada e prefixos de linha de comando.',
    swatch: { bg: '#0e1116', ink: '#d6dde6', accent: '#4ade80' }
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Títulos grandes, aulas separadas por linhas finas e sem caixas.',
    swatch: { bg: '#f7f3ec', ink: '#1c1a17', accent: '#9a3412' }
  }
];

export const FONT_OPTIONS = [
  { id: 'grotesk', label: 'Space Grotesk', stack: '"Space Grotesk", "Segoe UI", system-ui, sans-serif' },
  { id: 'humanista', label: 'DM Sans', stack: '"DM Sans", "Segoe UI", system-ui, sans-serif' },
  { id: 'serifada', label: 'Serifada (Georgia)', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'JetBrains Mono', stack: '"JetBrains Mono", ui-monospace, Menlo, monospace' }
];

export const RADIUS_OPTIONS = [
  { id: 'reto', label: 'Reto', sm: '4px', md: '8px', lg: '10px' },
  { id: 'suave', label: 'Suave', sm: '10px', md: '14px', lg: '18px' },
  { id: 'arredondado', label: 'Arredondado', sm: '18px', md: '24px', lg: '28px' }
];

export const DENSITY_OPTIONS = [
  { id: 'confortavel', label: 'Confortável' },
  { id: 'compacto', label: 'Compacto' }
];

export const DEFAULT_THEME = {
  primary: '#134771',
  accent: '#4E8BB8',
  font: 'grotesk',
  radius: 'suave',
  density: 'confortavel',
  bannerUrl: '',
  logoUrl: ''
};

export function getLayout(id) {
  return LAYOUTS.find((layout) => layout.id === id) || LAYOUTS[0];
}

// Luminância relativa simples: decide se o texto sobre uma cor deve ser claro ou escuro.
export function isDarkColor(hex = '#000000') {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}

// Remove caracteres que poderiam quebrar a declaração url("...") no estilo inline.
function safeUrl(url = '') {
  return url.replace(/["'()\\\s<>]/g, '');
}

// Variáveis CSS do curso. Como sobrescrevem os tokens globais, todos os componentes existentes
// (botões, abas, cartões) passam a usar as cores e a fonte escolhidas, sem regras novas.
export function courseThemeStyle(course = {}) {
  const theme = { ...DEFAULT_THEME, primary: course.accent || DEFAULT_THEME.primary, ...(course.theme || {}) };
  const font = FONT_OPTIONS.find((item) => item.id === theme.font) || FONT_OPTIONS[0];
  const radius = RADIUS_OPTIONS.find((item) => item.id === theme.radius) || RADIUS_OPTIONS[1];

  return {
    '--primary': theme.primary,
    '--primary-soft': `color-mix(in srgb, ${theme.primary} 14%, transparent)`,
    '--primary-ink': isDarkColor(theme.primary) ? '#ffffff' : '#111111',
    '--highlight': theme.accent,
    '--highlight-soft': `color-mix(in srgb, ${theme.accent} 20%, transparent)`,
    '--accent': theme.primary,
    '--font-display': font.stack,
    '--font-body': font.stack,
    '--radius-xs': '6px',
    '--radius-sm': radius.sm,
    '--radius': radius.md,
    '--radius-lg': radius.lg,
    '--banner-url': theme.bannerUrl ? `url("${safeUrl(theme.bannerUrl)}")` : 'none'
  };
}
