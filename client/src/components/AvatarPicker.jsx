import { useState } from 'react';
import { AVATARS } from '../utils/avatars';
import AvatarImg from './AvatarImg';

// Seletor de avatar com todos os modelos, 12 por página.
const POR_PAGINA = 12;

export default function AvatarPicker({ value, onChange }) {
  const [pagina, setPagina] = useState(() => {
    const idx = AVATARS.findIndex((item) => item.id === value);
    return idx >= 0 ? Math.floor(idx / POR_PAGINA) + 1 : 1;
  });
  const totalPaginas = Math.ceil(AVATARS.length / POR_PAGINA);
  const atual = Math.min(pagina, totalPaginas);
  const itens = AVATARS.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);

  return (
    <div className="avatar-picker">
      <div className="myarea-avatars" role="radiogroup" aria-label="Escolha seu avatar">
        {itens.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            aria-label={`Avatar ${label}`}
            title={label}
            className={value === id ? 'is-active' : ''}
            onClick={() => onChange(id)}
          >
            <AvatarImg id={id} alt="" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <nav className="pager avatar-pager" aria-label="Páginas de avatares">
        <button type="button" className="ghost-button small" onClick={() => setPagina(atual - 1)} disabled={atual <= 1}>Anterior</button>
        <span className="muted">Página {atual} de {totalPaginas} · {AVATARS.length} modelos</span>
        <button type="button" className="ghost-button small" onClick={() => setPagina(atual + 1)} disabled={atual >= totalPaginas}>Próxima</button>
      </nav>
    </div>
  );
}
