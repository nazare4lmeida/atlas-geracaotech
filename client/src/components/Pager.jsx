// Paginação reutilizável: mostra "de X a Y", tamanho da página e Anterior/Próxima.
export default function Pager({ total, page, pageSize, sizes = [10, 25, 50], onPage, onPageSize }) {
  const pages = Math.max(Math.ceil(total / pageSize), 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pager">
      <span className="muted">{total === 0 ? 'Nenhum resultado' : `Mostrando ${from}–${to} de ${total}`}</span>
      <label className="pager-size">
        <span>Por página</span>
        <select value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}>
          {sizes.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </label>
      <div className="pager-buttons">
        <button type="button" className="ghost-button small" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
        <span>Página {page} de {pages}</span>
        <button type="button" className="ghost-button small" disabled={page >= pages} onClick={() => onPage(page + 1)}>Próxima</button>
      </div>
    </div>
  );
}
