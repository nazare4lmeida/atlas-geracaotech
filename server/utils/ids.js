const crypto = require('crypto');

// Gera identificadores legíveis para seções, recursos e questões
// (ex.: "mod-3fa91c2b"). Os IDs já existentes (ex.: "logic-1-1") são preservados.
function newId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

// Converte um título em slug de URL (ex.: "Introdução ao React" -> "introducao-ao-react").
function slugify(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Move um item de uma lista (array simples) para cima ou para baixo.
// Retorna uma nova lista; se o movimento não for possível, retorna a lista original.
function moveItem(items, itemId, direction) {
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) return null;

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return [...items];

  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

module.exports = { newId, slugify, moveItem };
