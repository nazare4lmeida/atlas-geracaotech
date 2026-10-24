// Tipos de recurso (aula) e os dados do cartão de encontro ao vivo.
// O encontro guarda dia, início e término em `content` como JSON; o link fica em `url`.

export const LESSON_TYPE_LABELS = {
  video: 'Vídeo',
  page: 'Página de texto',
  link: 'Link externo',
  html: 'Bloco HTML',
  ao_vivo: 'Encontro ao vivo'
};

export const DIAS_DA_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

export function lerEncontro(content = '') {
  try {
    const dados = JSON.parse(content || '{}');
    return {
      dia: typeof dados.dia === 'string' ? dados.dia : '',
      inicio: typeof dados.inicio === 'string' ? dados.inicio : '',
      fim: typeof dados.fim === 'string' ? dados.fim : ''
    };
  } catch {
    return { dia: '', inicio: '', fim: '' };
  }
}

export function montarEncontro({ dia = '', inicio = '', fim = '' }) {
  return JSON.stringify({ dia, inicio, fim });
}
