import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { errorText } from '../manage/shared';

// Chamada de uma aula: o professor da turma (ou a administração) marca presente, falta ou justificada.
// Limpar a marcação devolve o aluno a "sem chamada".

const OPCOES = [
  { valor: 'presente', rotulo: 'Presente' },
  { valor: 'ausente', rotulo: 'Falta' },
  { valor: 'justificado', rotulo: 'Justificada' }
];

function dataBr(iso) {
  return `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export default function ChamadaAula({ aula, onClose, onChange }) {
  const [alunos, setAlunos] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState('');

  useEffect(() => {
    let ativo = true;
    setAlunos(null);
    setErro('');
    api
      .get(`/docente/aulas/${aula.sessionId}/presenca`)
      .then(({ data }) => ativo && setAlunos(data.alunos))
      .catch((error) => ativo && setErro(errorText(error)));
    return () => {
      ativo = false;
    };
  }, [aula.sessionId]);

  const resumo = useMemo(() => {
    const lista = alunos || [];
    return {
      presentes: lista.filter((a) => a.status === 'presente').length,
      faltas: lista.filter((a) => a.status === 'ausente').length,
      justificadas: lista.filter((a) => a.status === 'justificado').length,
      semMarcacao: lista.filter((a) => !a.status).length
    };
  }, [alunos]);

  async function marcar(aluno, status) {
    setSalvando(aluno.userId);
    setErro('');
    try {
      await api.put(`/docente/aulas/${aula.sessionId}/presenca/${aluno.userId}`, { status });
      setAlunos((atual) =>
        atual.map((a) => (a.userId === aluno.userId ? { ...a, status, origem: status ? 'gestao' : null } : a))
      );
      onChange?.();
    } catch (error) {
      setErro(errorText(error));
    } finally {
      setSalvando('');
    }
  }

  return (
    <section className="surface-card docente-chamada" aria-label={`Chamada de ${dataBr(aula.date)}`}>
      <header className="docente-form-cabecalho">
        <div>
          <h2>Chamada · {dataBr(aula.date)}</h2>
          <p className="muted">{aula.horario || 'Sem horário'}{aula.titulo ? ` · ${aula.titulo}` : ''}</p>
        </div>
        <button type="button" className="ghost-button small" onClick={onClose}>Fechar</button>
      </header>

      <div className="cron-numeros docente-resumo-chamada">
        <div><strong>{resumo.presentes}</strong><span>presentes</span></div>
        <div><strong>{resumo.justificadas}</strong><span>justificadas</span></div>
        <div><strong>{resumo.faltas}</strong><span>faltas</span></div>
        <div><strong>{resumo.semMarcacao}</strong><span>sem marcação</span></div>
      </div>

      {erro && <p className="docente-erro" role="alert">{erro}</p>}
      {!alunos && !erro && <p className="muted">Carregando alunos…</p>}

      {alunos && alunos.length === 0 && <p className="muted">Nenhum aluno matriculado nesta turma.</p>}

      {alunos && alunos.length > 0 && (
        <ul className="docente-chamada-lista">
          {alunos.map((aluno) => (
            <li key={aluno.userId}>
              <span className="docente-chamada-nome">
                {aluno.nome}
                {aluno.origem === 'gestao' && <small> · marcado pela gestão</small>}
              </span>
              <div className="docente-chamada-botoes" role="group" aria-label={`Presença de ${aluno.nome}`}>
                {OPCOES.map((opcao) => (
                  <button
                    key={opcao.valor}
                    type="button"
                    className={`docente-marca is-${opcao.valor}${aluno.status === opcao.valor ? ' is-on' : ''}`}
                    aria-pressed={aluno.status === opcao.valor}
                    disabled={salvando === aluno.userId}
                    onClick={() => marcar(aluno, aluno.status === opcao.valor ? null : opcao.valor)}
                  >
                    {opcao.rotulo}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
