// Filtro de linguagem do fórum: palavrões, ofensas, baixo calão e preconceito.
// A lista padrão é semeada no banco na primeira leitura; a administração pode alterá-la.

const PALAVRAS_PADRAO = [
  'porra', 'caralho', 'merda', 'puta', 'putaria', 'fdp', 'filho da puta', 'vagabunda', 'vagabundo',
  'foda', 'fodase', 'foda se', 'arrombado', 'cuzao', 'cuzona', 'otario', 'otaria', 'babaca', 'idiota',
  'imbecil', 'retardado', 'retardada', 'burro', 'burra', 'nojento', 'nojenta', 'lixo humano',
  'viado', 'veado', 'bicha', 'bixa', 'sapatao', 'macaco', 'preto imundo', 'corno', 'corna'
];

// Troca de letras e números parecidos (p0rra, put@) e remove pontuação (p.u.t.a, foda-se).
const LEET = { '4': 'a', '3': 'e', '1': 'i', '0': 'o', '5': 's', '@': 'a', $: 's' };

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[43105@$]/g, (caractere) => LEET[caractere])
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Devolve as palavras da lista que aparecem no texto (inteiras, sem contar partes de outras palavras).
function encontrarPalavras(texto, lista) {
  const alvo = ` ${normalizar(texto)} `;
  return lista.filter((palavra) => {
    const termo = normalizar(palavra);
    return Boolean(termo) && alvo.includes(` ${termo} `);
  });
}

module.exports = { PALAVRAS_PADRAO, normalizar, encontrarPalavras };
