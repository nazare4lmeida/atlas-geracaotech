import { useEffect, useState } from 'react';
import api from '../../services/api';
import { errorText } from './shared';

// Acompanhamento da gestão: alunos com bloco vencido e histórico de alterações do curso.
function dataBr(iso = '') {
  const [ano, mes, dia] = String(iso).slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

function dataHoraBr(valor) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? '' : data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export default function AcompanhamentoPanel({ slug, onFeedback }) {
  const [atrasados, setAtrasados] = useState(null);
  const [historico, setHistorico] = useState(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([api.get(`/courses/${slug}/atrasados`), api.get(`/courses/${slug}/historico`)])
      .then(([a, h]) => {
        if (!ativo) return;
        setAtrasados(a.data);
        setHistorico(h.data.historico);
      })
      .catch((error) => onFeedback({ type: 'error', text: errorText(error) }));
    return () => {
      ativo = false;
    };
  }, [slug, onFeedback]);

  return (
    <section className="acompanhamento-panel">
      <h2>Alunos com prazo vencido</h2>
      {!atrasados && <p className="muted">Carregando...</p>}
      {atrasados && atrasados.alunos.length === 0 && <p className="muted">Nenhum aluno com bloco vencido.</p>}
      {atrasados && atrasados.alunos.length > 0 && (
        <table className="manage-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Bloco vencido</th>
              <th>Prazo</th>
              <th>Progresso</th>
            </tr>
          </thead>
          <tbody>
            {atrasados.alunos.flatMap((aluno) =>
              aluno.blocos.map((bloco) => (
                <tr key={`${aluno.userId}-${bloco.titulo}`}>
                  <td>{aluno.nome}</td>
                  <td>{bloco.titulo}</td>
                  <td>{dataBr(bloco.prazo)}</td>
                  <td>{bloco.percentual}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <h2>Histórico de alterações</h2>
      {!historico && <p className="muted">Carregando...</p>}
      {historico && historico.length === 0 && <p className="muted">Nenhuma alteração registrada ainda.</p>}
      {historico && historico.length > 0 && (
        <ul className="historico-lista">
          {historico.map((item, indice) => (
            <li key={`${item.quando}-${indice}`}>
              <strong>{dataHoraBr(item.quando)}</strong> · {item.autor}: {item.detalhe}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
