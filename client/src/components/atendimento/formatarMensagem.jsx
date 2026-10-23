// Formata o texto das mensagens sem HTML: *trecho* vira negrito e quebras de linha são preservadas.
export function formatarMensagem(texto) {
  const linhas = String(texto || '').split('\n');
  return linhas.map((linha, i) => (
    <span key={i}>
      {linha.split(/(\*[^*\n]+\*)/g).map((parte, j) =>
        parte.startsWith('*') && parte.endsWith('*') && parte.length > 2 ? <strong key={j}>{parte.slice(1, -1)}</strong> : parte
      )}
      {i < linhas.length - 1 && <br />}
    </span>
  ));
}
