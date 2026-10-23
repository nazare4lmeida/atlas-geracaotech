import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Feedback, errorText } from '../components/manage/shared';
import { formatarMinutos, hora, dataBr, mesAtual, hojeISO } from '../utils/ponto';
import '../styles/docente.css';

// Ponto do professor, sem GPS. Bate entrada e saída na aula de hoje da turma escolhida.
// Pode haver mais de uma turma no dia (uma após a outra) e aulas extras, que entram no histórico.
export default function ProfessorPontoPage() {
  const [hoje, setHoje] = useState(hojeISO());
  const [aulas, setAulas] = useState([]);
  const [registrosHoje, setRegistrosHoje] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [periodo, setPeriodo] = useState(() => mesAtual());
  const [historico, setHistorico] = useState({ registros: [], totalMinutos: 0 });
  const [extraAberto, setExtraAberto] = useState(false);
  const [extra, setExtra] = useState({ turmaId: '', data: '', inicio: '', fim: '', titulo: '', observacao: '' });
  const [feedback, setFeedback] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const aberto = useMemo(() => registrosHoje.find((r) => r.entrada && !r.saida), [registrosHoje]);

  function carregarHoje() {
    return api
      .get('/docente/ponto/hoje')
      .then(({ data }) => {
        setHoje(data.hoje);
        setAulas(data.aulas);
        setRegistrosHoje(data.registros);
      })
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }));
  }

  function carregarHistorico() {
    return api
      .get('/docente/ponto', { params: { de: periodo.de, ate: periodo.ate } })
      .then(({ data }) => setHistorico({ registros: data.registros, totalMinutos: data.totalMinutos }))
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }));
  }

  useEffect(() => {
    carregarHoje();
    api.get('/docente/turmas').then(({ data }) => setTurmas(data.turmas)).catch(() => {});
  }, []);

  // Atualiza a janela de entrada a cada minuto, sem recarregar a página.
  useEffect(() => {
    const intervalo = setInterval(carregarHoje, 60000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo.de, periodo.ate]);

  async function executar(acao, mensagem) {
    setOcupado(true);
    setFeedback(null);
    try {
      await acao();
      setFeedback({ type: 'success', text: mensagem });
      await Promise.all([carregarHoje(), carregarHistorico()]);
      return true;
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
      return false;
    } finally {
      setOcupado(false);
    }
  }

  const entrar = (aula) =>
    executar(() => api.post('/docente/ponto/entrada', { sessionId: aula.sessionId }), `Entrada registrada em ${aula.turma}.`);

  const sair = (registro) =>
    executar(() => api.post(`/docente/ponto/${registro.id}/saida`), 'Saída registrada.');

  async function registrarExtra(event) {
    event.preventDefault();
    const ok = await executar(
      () => api.post('/docente/ponto/extra', extra),
      'Aula extra registrada no seu ponto.'
    );
    if (ok) {
      setExtra({ turmaId: '', data: '', inicio: '', fim: '', titulo: '', observacao: '' });
      setExtraAberto(false);
    }
  }

  function textoJanela(janela) {
    if (!janela) return '';
    if (janela.semHorario) return 'Aula sem horário definido: entrada liberada o dia todo.';
    if (janela.situacao === 'antes') return `Entrada liberada a partir de ${hora(janela.abre)}.`;
    if (janela.situacao === 'depois') return `Janela de entrada encerrada às ${hora(janela.fecha)}.`;
    return `Entrada aberta até ${hora(janela.fecha)}.`;
  }

  const totalHoje = registrosHoje.reduce((soma, r) => soma + (r.minutos || 0), 0);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content docente-ponto">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow">Professor</span>
            <h1>Meu ponto</h1>
            <p>Bata entrada e saída na aula da turma que você ministra hoje. O ponto não usa localização.</p>
          </div>
        </section>

        <Feedback feedback={feedback} />

        <section className="surface-card docente-bloco">
          <header className="docente-bloco-cabecalho">
            <h2>Hoje · {dataBr(hoje)}</h2>
            <span className="muted">Total de hoje: {formatarMinutos(totalHoje)}</span>
          </header>

          {aberto && (
            <p className="docente-aviso">
              Ponto aberto desde {hora(aberto.entrada)}{aberto.turma ? ` (${aberto.turma})` : ''}. Registre a saída antes de entrar em outra aula.
            </p>
          )}

          {aulas.length === 0 && <p className="muted">Você não tem aula de turma marcada para hoje.</p>}

          <ul className="docente-aulas-hoje">
            {aulas.map((aula) => {
              const registro = registrosHoje.find((r) => r.sessionId === aula.sessionId);
              return (
                <li key={aula.sessionId}>
                  <div>
                    <strong>{aula.turma}</strong>
                    <span className="muted"> · {aula.curso}</span>
                    <div className="muted">{aula.horario || 'Sem horário'}{aula.titulo ? ` · ${aula.titulo}` : ''}</div>
                  </div>
                  <div className="docente-ponto-acao">
                    {!registro && (
                      <div className="docente-entrada">
                        <span className={`docente-janela is-${aula.janela?.situacao || 'aberta'}`}>
                          {textoJanela(aula.janela)}
                        </span>
                        <button
                          type="button"
                          className="primary-button small"
                          disabled={ocupado || Boolean(aberto) || aula.janela?.situacao !== 'aberta'}
                          title={aberto ? 'Registre a saída do ponto aberto antes.' : undefined}
                          onClick={() => entrar(aula)}
                        >
                          Bater entrada
                        </button>
                      </div>
                    )}
                    {registro && !registro.saida && (
                      <button type="button" className="primary-button small" disabled={ocupado} onClick={() => sair(registro)}>
                        Bater saída
                      </button>
                    )}
                    {registro && registro.saida && (
                      <span className="docente-concluido">{hora(registro.entrada)} – {hora(registro.saida)}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {registrosHoje.some((r) => r.tipo === 'extra') && (
            <div className="docente-extras-hoje">
              <span className="docente-rotulo">Aulas extras de hoje</span>
              {registrosHoje.filter((r) => r.tipo === 'extra').map((r) => (
                <div key={r.id} className="docente-extra-linha">
                  {r.titulo || 'Aula extra'}{r.turma ? ` · ${r.turma}` : ''} · {hora(r.entrada)} – {hora(r.saida)}
                </div>
              ))}
            </div>
          )}

          <div className="docente-acoes">
            <button type="button" className="ghost-button small" onClick={() => setExtraAberto((v) => !v)}>
              {extraAberto ? 'Fechar aula extra' : 'Registrar aula extra'}
            </button>
          </div>

          {extraAberto && (
            <form className="docente-extra-form" onSubmit={registrarExtra}>
              <label className="docente-campo">
                <span>Turma (opcional)</span>
                <select value={extra.turmaId} onChange={(e) => setExtra({ ...extra, turmaId: e.target.value })}>
                  <option value="">Sem turma</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.curso} · {t.nome}</option>
                  ))}
                </select>
              </label>
              <div className="docente-grade">
                <label>
                  <span>Data</span>
                  <input type="date" value={extra.data || hoje} onChange={(e) => setExtra({ ...extra, data: e.target.value })} required />
                </label>
                <label>
                  <span>Início</span>
                  <input type="time" value={extra.inicio} onChange={(e) => setExtra({ ...extra, inicio: e.target.value })} required />
                </label>
                <label>
                  <span>Término</span>
                  <input type="time" value={extra.fim} onChange={(e) => setExtra({ ...extra, fim: e.target.value })} required />
                </label>
              </div>
              <label className="docente-campo">
                <span>Título</span>
                <input value={extra.titulo} onChange={(e) => setExtra({ ...extra, titulo: e.target.value })} maxLength={200} required />
              </label>
              <label className="docente-campo">
                <span>Observação (obrigatória)</span>
                <textarea
                  rows={3}
                  value={extra.observacao}
                  onChange={(e) => setExtra({ ...extra, observacao: e.target.value })}
                  maxLength={1000}
                  required
                  placeholder="Ex.: reposição da aula de 20/10"
                />
              </label>
              <div className="docente-acoes">
                <button type="submit" className="primary-button small" disabled={ocupado}>Registrar aula extra</button>
              </div>
            </form>
          )}
        </section>

        <section className="surface-card docente-bloco">
          <header className="docente-bloco-cabecalho">
            <h2>Histórico</h2>
            <div className="docente-periodo">
              <label>
                <span>De</span>
                <input type="date" value={periodo.de} onChange={(e) => setPeriodo({ ...periodo, de: e.target.value })} />
              </label>
              <label>
                <span>Até</span>
                <input type="date" value={periodo.ate} onChange={(e) => setPeriodo({ ...periodo, ate: e.target.value })} />
              </label>
            </div>
          </header>

          <p className="docente-total">
            Total no período: <strong>{formatarMinutos(historico.totalMinutos)}</strong>
          </p>

          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Data</th><th>Tipo</th><th>Turma / título</th><th>Entrada</th><th>Saída</th><th>Duração</th><th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {historico.registros.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{dataBr(r.data)}</td>
                    <td className="nowrap">{r.tipo === 'extra' ? 'Extra' : 'Aula'}</td>
                    <td>{r.tipo === 'extra' ? `${r.titulo || 'Aula extra'}${r.turma ? ` · ${r.turma}` : ''}` : r.turma || '—'}</td>
                    <td className="nowrap">{hora(r.entrada)}</td>
                    <td className="nowrap">{r.saida ? hora(r.saida) : <span className="docente-aberto">aberto</span>}</td>
                    <td className="nowrap">{r.minutos !== null ? formatarMinutos(r.minutos) : '—'}</td>
                    <td>
                      {r.observacao || '—'}
                      {r.corrigido && <small className="docente-origem"> · corrigido pela gestão</small>}
                    </td>
                  </tr>
                ))}
                {historico.registros.length === 0 && (
                  <tr><td colSpan={7} className="users-empty">Nenhum registro neste período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
