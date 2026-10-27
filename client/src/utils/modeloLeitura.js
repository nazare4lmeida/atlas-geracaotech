// Forma de exibição escolhida pelo aluno: "original" (como foi escrito) ou "atlas" (organizado).
// Fica no navegador de cada pessoa. Se o armazenamento não estiver disponível, vale só na tela atual.
export const CHAVE_MODELO = 'atlas-leitura-modelo';

export function lerModelo() {
  try {
    return localStorage.getItem(CHAVE_MODELO) === 'organizado' ? 'atlas' : 'original';
  } catch {
    return 'original';
  }
}

export function guardarModelo(valor) {
  try {
    localStorage.setItem(CHAVE_MODELO, valor === 'atlas' ? 'organizado' : 'original');
  } catch {
    // Sem armazenamento (navegação privada, por exemplo): a escolha vale só nesta tela.
  }
}
