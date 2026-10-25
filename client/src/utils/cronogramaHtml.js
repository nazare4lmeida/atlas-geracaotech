const escapar = (texto) =>
  String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const SITUACAO = { realizada: 'Realizada', prevista: 'Prevista', cancelada: 'Cancelada' };

// Cronograma em HTML para imprimir ou guardar: uma seção por módulo, na ordem do curso.
export function gerarCronogramaHtml({ titulo, subtitulo, aulas }) {
  const dataBr = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const modulos = [];
  const porModulo = new Map();
  aulas.forEach((aula) => {
    const chave = aula.modulo || 'Sem módulo';
    if (!porModulo.has(chave)) {
      porModulo.set(chave, []);
      modulos.push(chave);
    }
    porModulo.get(chave).push(aula);
  });

  const secoes = modulos
    .map((modulo) => {
      const linhas = porModulo
        .get(modulo)
        .map(
          (a) => `<tr class="${a.situacao === 'cancelada' ? 'cancelada' : ''}">
            <td>${escapar(dataBr(a.date))}</td>
            <td>${escapar(a.horario || '—')}</td>
            <td>${escapar(a.titulo || 'Aula')}</td>
            <td>${escapar(a.professor || '—')}</td>
            <td>${escapar(SITUACAO[a.situacao] || a.situacao)}</td>
          </tr>`
        )
        .join('');
      return `<section>
        <h2>${escapar(modulo)}</h2>
        <table>
          <thead><tr><th>Data</th><th>Horário</th><th>Aula</th><th>Professor</th><th>Situação</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
<style>
  body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1d2530; margin: 2rem auto; max-width: 960px; padding: 0 1rem; }
  header { border-bottom: 2px solid #134771; margin-bottom: 1.5rem; padding-bottom: 0.75rem; }
  h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: #134771; }
  header p { margin: 0; color: #5a6470; }
  h2 { font-size: 1.05rem; margin: 1.5rem 0 0.5rem; color: #134771; }
  table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
  th, td { text-align: left; padding: 0.45rem 0.6rem; border-bottom: 1px solid #e2ded5; vertical-align: top; }
  th { background: #eef3f7; font-weight: 600; }
  tr.cancelada td { color: #8a4b45; text-decoration: line-through; }
  @media print { body { margin: 0; } section { break-inside: avoid; } }
</style>
</head>
<body>
<header>
  <h1>${escapar(titulo)}</h1>
  <p>${escapar(subtitulo)}</p>
</header>
${secoes || '<p>Nenhuma aula cadastrada.</p>'}
</body>
</html>`;
}

export function baixarHtml(nomeBase, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeBase.replace(/[^\w-]+/g, '-')}.html`;
  link.click();
  URL.revokeObjectURL(url);
}
