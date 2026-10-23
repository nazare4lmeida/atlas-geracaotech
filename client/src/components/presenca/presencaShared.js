// Textos e helpers compartilhados pelas telas de presença.

export const STATUS_TEXT = {
  presente: 'Presente',
  ausente: 'Ausente',
  justificado: 'Justificada'
};

export function statusLabel(aula) {
  if (aula.status === null || aula.status === undefined) return 'Sem marcação';
  if (aula.status === 'justificado') {
    return aula.tipoJustificativa === 'abonada' ? 'Abonada' : 'Justificada';
  }
  return STATUS_TEXT[aula.status] || aula.status;
}

// Estado visual: presente/justificada/abonada contam como presença; ausente e sem marcação não.
export function statusTone(aula) {
  if (aula.status === 'presente') return 'is-present';
  if (aula.status === 'justificado') return 'is-justified';
  if (aula.status === 'ausente') return 'is-absent';
  return 'is-pending';
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Lê e grava no sessionStorage com proteção: navegadores privados ou bloqueados podem lançar erro.
export function readSession(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

export function writeSession(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch (error) {
    // Sem armazenamento: o pop-up pode reaparecer, o que não impede o uso.
  }
}
