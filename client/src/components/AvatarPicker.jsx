import { useState } from 'react';
import { AVATARS } from '../utils/avatars';
import AvatarImg from './AvatarImg';

// Seletor de avatar por coleção: escolhe a coleção (estilo) e vê todas as suas variações.
const COLECOES = [...new Set(AVATARS.map((item) => item.colecao))];

const nomeColecao = (colecao) => (colecao === 'classicos' ? 'Clássicos' : colecao.replace(/-/g, ' '));

export default function AvatarPicker({ value, onChange }) {
  const doValor = AVATARS.find((item) => item.id === value)?.colecao;
  const [colecao, setColecao] = useState(doValor || COLECOES[0]);
  const itens = AVATARS.filter((item) => item.colecao === colecao);

  return (
    <div className="avatar-picker">
      <label className="avatar-colecao">
        Coleção
        <select value={colecao} onChange={(event) => setColecao(event.target.value)}>
          {COLECOES.map((nome) => (
            <option key={nome} value={nome}>
              {nomeColecao(nome)}
            </option>
          ))}
        </select>
      </label>
      <div className="myarea-avatars" role="radiogroup" aria-label={`Avatares: ${nomeColecao(colecao)}`}>
        {itens.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            aria-label={`${nomeColecao(colecao)}, ${label}`}
            title={label}
            className={value === id ? 'is-active' : ''}
            onClick={() => onChange(id)}
          >
            <AvatarImg id={id} alt="" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className="muted avatar-contagem">
        {itens.length} variações nesta coleção · {COLECOES.length} coleções no total
      </p>
    </div>
  );
}
