import { useEffect, useState } from 'react';
import api from '../../services/api';
import { errorText } from '../manage/shared';
import { dataBr } from '../../utils/ponto';

// Partes da "Minha área" do professor: só o que ele ministra (turmas, aulas e arquivos do perfil).

const LIMITE_ARQUIVO = 2 * 1024 * 1024;

// Turmas que o professor ministra. "Ver como aluno" mostra o cronograma exatamente como o aluno vê.
export function TurmasProfessor() {
  const [turmas, setTurmas] = useState(null);
  const [erro, setErro] = useState('');
  const [aberta, setAberta] = useState(null);
  const [cronograma, setCronograma] = useState(null);

  useEffect(() => {
    api
      .get('/docente/perfil')
      .then(({ data }) => setTurmas(data.turmas))
      .catch((error) => setErro(errorText(error)));
  }, []);

  async function verComoAluno(turma) {
    if (aberta === turma.id) {
      setAberta(null);
      return;
    }
    setAberta(turma.id);
    setCronograma(null);
    try {
      const { data } = await api.get(`/docente/perfil/turmas/${turma.id}/cronograma`);
      setCronograma(data.aulas);
    } catch (error) {
      setErro(errorText(error));
    }
  }

  if (erro) return <p className="docente-erro" role="alert">{erro}</p>;
  if (!turmas) return <div className="page-state">Carregando turmas…</div>;
  if (turmas.length === 0) return <p className="muted">Você ainda não está vinculado a nenhuma turma. Peça à administração para vincular.</p>;

  return (
    <div className="docente-turmas">
      {turmas.map((turma) => (
        <article key={turma.id} className="surface-card docente-turma">
          <header>
            <h3>{turma.curso}</h3>
            <p className="muted">
              {turma.nome} · {turma.modalidade} · {turma.turno}
              {turma.diasSemana ? ` · ${turma.diasSemana}` : ''}
              {turma.horario ? ` · ${turma.horario}` : ''}
            </p>
          </header>
          <button type="button" className="ghost-button small" onClick={() => verComoAluno(turma)}>
            {aberta === turma.id ? 'Fechar' : 'Ver como aluno'}
          </button>
          {aberta === turma.id && (
            <div className="docente-visao-aluno">
              <p className="muted">É assim que a turma aparece no cronograma do aluno.</p>
              {!cronograma && <p className="muted">Carregando…</p>}
              {cronograma && cronograma.length === 0 && <p className="muted">Nenhuma aula cadastrada.</p>}
              {cronograma && cronograma.length > 0 && (
                <ul className="docente-lista-aulas">
                  {cronograma.map((aula) => (
                    <li key={aula.sessionId} className={aula.situacao === 'cancelada' ? 'is-cancelada' : ''}>
                      <span className="nowrap">{dataBr(aula.date)}</span>
                      <span>{aula.horario || '—'}</span>
                      <span>{aula.titulo || 'Aula'}</span>
                      <span className={`cron-status is-${aula.situacao}`}>
                        {aula.situacao === 'cancelada' ? 'Cancelada' : aula.situacao === 'realizada' ? 'Realizada' : 'Prevista'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

// Aulas que o professor ministra (das turmas dele e das aulas extras em que é o professor).
export function AulasProfessor() {
  const [aulas, setAulas] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get('/docente/perfil')
      .then(({ data }) => setAulas(data.aulas))
      .catch((error) => setErro(errorText(error)));
  }, []);

  if (erro) return <p className="docente-erro" role="alert">{erro}</p>;
  if (!aulas) return <div className="page-state">Carregando aulas…</div>;
  if (aulas.length === 0) return <p className="muted">Nenhuma aula que você ministre ainda.</p>;

  return (
    <div className="users-table-wrap">
      <table className="users-table">
        <thead>
          <tr><th>Data</th><th>Horário</th><th>Turma</th><th>Título</th><th>Tipo</th><th>Situação</th></tr>
        </thead>
        <tbody>
          {aulas.map((aula) => (
            <tr key={aula.sessionId} className={aula.situacao === 'cancelada' ? 'docente-linha-cancelada' : ''}>
              <td className="nowrap">{dataBr(aula.date)}</td>
              <td className="nowrap">{aula.horario || '—'}</td>
              <td>{aula.curso} · {aula.turma}</td>
              <td>{aula.titulo || 'Aula'}</td>
              <td className="nowrap">{aula.tipo === 'extra' ? 'Extra' : 'Regular'}</td>
              <td className="nowrap">
                <span className={`cron-status is-${aula.situacao === 'cancelada' ? 'cancelada' : 'ativa'}`}>
                  {aula.situacao === 'cancelada' ? 'Cancelada' : 'Ativa'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Arquivos do perfil: imagens e PDFs de até 2 MB, guardados na conta do professor.
export function ArquivosProfessor() {
  const [arquivos, setArquivos] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = () =>
    api
      .get('/docente/arquivos')
      .then(({ data }) => setArquivos(data.arquivos))
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }));

  useEffect(() => {
    carregar();
  }, []);

  function lerComoBase64(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result).replace(/^data:[^;]+;base64,/, ''));
      leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      leitor.readAsDataURL(arquivo);
    });
  }

  async function enviar(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    setFeedback(null);
    if (arquivo.size > LIMITE_ARQUIVO) {
      setFeedback({ type: 'error', text: 'O arquivo pode ter no máximo 2 MB.' });
      return;
    }
    setEnviando(true);
    try {
      const dados = await lerComoBase64(arquivo);
      await api.post('/docente/arquivos', { nome: arquivo.name, dados });
      setFeedback({ type: 'success', text: 'Arquivo enviado.' });
      carregar();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error, 'Não foi possível enviar o arquivo.') });
    } finally {
      setEnviando(false);
    }
  }

  async function baixar(arquivo) {
    try {
      const { data } = await api.get(`/docente/arquivos/${arquivo.id}`);
      const bytes = Uint8Array.from(atob(data.arquivo.dados), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: data.arquivo.tipo }));
      const link = document.createElement('a');
      link.href = url;
      link.download = data.arquivo.nome;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  async function remover(arquivo) {
    if (!window.confirm(`Remover "${arquivo.nome}"?`)) return;
    try {
      await api.delete(`/docente/arquivos/${arquivo.id}`);
      carregar();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  }

  return (
    <div className="docente-arquivos">
      <div className="docente-acoes">
        <label className="primary-button small docente-upload">
          {enviando ? 'Enviando…' : 'Adicionar arquivo'}
          <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" onChange={enviar} disabled={enviando} hidden />
        </label>
        <span className="muted">Imagem ou PDF, até 2 MB.</span>
      </div>

      {feedback && <p className={feedback.type === 'error' ? 'docente-erro' : 'docente-sucesso'} role="status">{feedback.text}</p>}

      {!arquivos && <div className="page-state">Carregando arquivos…</div>}
      {arquivos && arquivos.length === 0 && <p className="muted">Nenhum arquivo guardado no seu perfil.</p>}

      {arquivos && arquivos.length > 0 && (
        <ul className="docente-lista-arquivos">
          {arquivos.map((arquivo) => (
            <li key={arquivo.id} className="surface-card">
              <div>
                <strong>{arquivo.nome}</strong>
                <span className="muted"> · {arquivo.tipo === 'application/pdf' ? 'PDF' : 'Imagem'} · {Math.max(1, Math.round(arquivo.tamanho / 1024))} KB</span>
              </div>
              <div className="docente-acoes">
                <button type="button" className="ghost-button small" onClick={() => baixar(arquivo)}>Baixar</button>
                <button type="button" className="danger-button small" onClick={() => remover(arquivo)}>Remover</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
