import { useMemo, useState } from 'react';

// Calendário mensal de aulas. Cada dia lista as aulas; a cor mostra se a aula é prevista ou realizada.
// Usado pela gestão (com presença) e pelo aluno (com a situação dele).

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function chaveMes(iso) {
  return iso.slice(0, 7);
}

function diasDoMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  const primeiro = new Date(Date.UTC(ano, m - 1, 1));
  const total = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  const celulas = [];
  for (let i = 0; i < primeiro.getUTCDay(); i += 1) celulas.push(null);
  for (let d = 1; d <= total; d += 1) celulas.push(`${mes}-${String(d).padStart(2, '0')}`);
  while (celulas.length % 7 !== 0) celulas.push(null);
  return celulas;
}

function rotuloMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]} de ${ano}`;
}

function deslocar(mes, delta) {
  const [ano, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(ano, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function CalendarioAulas({ aulas, hoje, renderChip, onSelect, emptyText = 'Nenhuma aula cadastrada.' }) {
  const mesInicial = chaveMes(hoje || aulas[0]?.date || new Date().toISOString().slice(0, 10));
  const [mes, setMes] = useState(mesInicial);

  const porDia = useMemo(() => {
    const mapa = {};
    for (const aula of aulas) {
      (mapa[aula.date] ||= []).push(aula);
    }
    return mapa;
  }, [aulas]);

  const celulas = useMemo(() => diasDoMes(mes), [mes]);
  const doMes = aulas.filter((aula) => chaveMes(aula.date) === mes);

  return (
    <section className="cal" aria-label="Calendário de aulas">
      <header className="cal-head">
        <button type="button" className="ghost-button small" onClick={() => setMes(deslocar(mes, -1))} aria-label="Mês anterior">‹</button>
        <strong>{rotuloMes(mes)}</strong>
        <button type="button" className="ghost-button small" onClick={() => setMes(deslocar(mes, 1))} aria-label="Próximo mês">›</button>
        <button type="button" className="ghost-button small" onClick={() => setMes(chaveMes(hoje || mesInicial))}>Hoje</button>
      </header>

      {aulas.length === 0 ? (
        <p className="cal-vazio">{emptyText}</p>
      ) : (
        <>
          <div className="cal-grid" role="grid">
            {DIAS.map((d) => (
              <div key={d} className="cal-dow" role="columnheader">{d}</div>
            ))}
            {celulas.map((iso, i) => {
              if (!iso) return <div key={`v${i}`} className="cal-dia is-vazio" />;
              const lista = porDia[iso] || [];
              const hojeDia = iso === hoje;
              return (
                <div key={iso} className={`cal-dia${hojeDia ? ' is-hoje' : ''}${lista.length ? ' has-aula' : ''}`} role="gridcell">
                  <span className="cal-num">{Number(iso.slice(8))}</span>
                  {lista.map((aula) => (
                    <button
                      key={aula.sessionId}
                      type="button"
                      className={`cal-chip is-${aula.situacao}`}
                      onClick={() => onSelect?.(aula)}
                      title={`${aula.horario || ''} ${aula.titulo || ''}`.trim()}
                    >
                      {renderChip ? renderChip(aula) : <>{aula.horario && <small>{aula.horario}</small>}{aula.titulo || 'Aula'}</>}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="cal-legenda">
            <span><i className="cal-sw is-prevista" /> prevista</span>
            <span><i className="cal-sw is-realizada" /> realizada</span>
          </div>

          <div className="cal-lista">
            <h3>Aulas de {rotuloMes(mes)}</h3>
            {doMes.length === 0 && <p className="cal-vazio">Nenhuma aula neste mês.</p>}
            <ul>
              {doMes.map((aula) => (
                <li key={aula.sessionId}>
                  <span className="cal-lista-data">{aula.date.slice(8)}/{aula.date.slice(5, 7)}</span>
                  <span className="cal-lista-hora">{aula.horario || '—'}</span>
                  <span className="cal-lista-titulo">
                    <strong>{aula.titulo || 'Aula'}</strong>
                    {aula.modulo && <small>{aula.modulo}</small>}
                  </span>
                  <span className="cal-lista-prof">{aula.professor || '—'}</span>
                  <span className={`cal-status is-${aula.situacao}`}>{aula.situacao === 'realizada' ? 'Realizada' : 'Prevista'}</span>
                  {renderChip && <span className="cal-lista-extra">{renderChip(aula, true)}</span>}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
