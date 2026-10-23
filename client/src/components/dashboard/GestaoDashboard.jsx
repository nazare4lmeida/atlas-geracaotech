import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ColumnChart, BarList, DonutChart } from '../charts/Charts';
import { Feedback, errorText } from '../manage/shared';

// Visão geral da gestão: números resumidos e gráficos. Os dados vêm de /api/dashboard/gestao.
const SITUACAO_LABEL = { ativo: 'Ativos', concluido: 'Concluídos', desistente: 'Desistentes', removido: 'Removidos' };
const JUSTIFICATIVA_LABEL = { pendente: 'Em análise', aceita: 'Aceitas', abonada: 'Abonadas', recusada: 'Recusadas' };

export default function GestaoDashboard() {
  const [data, setData] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    api
      .get('/dashboard/gestao')
      .then(({ data: body }) => setData(body))
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }));
  }, []);

  if (!data) {
    return (
      <>
        <Feedback feedback={feedback} />
        {!feedback && <div className="page-state">Carregando a visão geral...</div>}
      </>
    );
  }

  const k = data.kpis;
  const g = data.graficos;

  const cards = [
    { value: k.alunos_ativos, label: 'Alunos ativos', hint: `${k.matriculados} matriculados no total` },
    { value: k.turmas_ativas, label: 'Turmas ativas', hint: 'Sincronizadas do site do GT' },
    { value: k.presencaUltimos30Dias !== null ? `${k.presencaUltimos30Dias}%` : '—', label: 'Presença (30 dias)', hint: 'Presentes e justificadas' },
    { value: k.concluidos, label: 'Concluídos', hint: `${k.certificados} certificados emitidos` },
    { value: k.desistentes, label: 'Desistentes', hint: 'Situação atual' },
    { value: k.justificativas_pendentes, label: 'Justificativas', hint: 'Aguardando decisão', to: '/gestao/justificativas' },
    { value: k.chamados_abertos, label: 'Atendimentos', hint: 'Alunos aguardando a equipe', to: '/gestao/atendimento' }
  ];

  return (
    <div className="gestao-dash">
      <Feedback feedback={feedback} />

      <section className="kpi-grid" aria-label="Números resumidos">
        {cards.map((card) => {
          const body = (
            <>
              <strong>{card.value}</strong>
              <span className="kpi-label">{card.label}</span>
              <small>{card.hint}</small>
            </>
          );
          return card.to ? (
            <Link key={card.label} to={card.to} className="kpi-card is-link">{body}</Link>
          ) : (
            <article key={card.label} className="kpi-card">{body}</article>
          );
        })}
      </section>

      <section className="chart-grid">
        <article className="chart-card chart-wide">
          <header>
            <h2>Matrículas por mês</h2>
            <p>Novas matrículas nos últimos 12 meses.</p>
          </header>
          <ColumnChart data={g.matriculasPorMes} ariaLabel="Matrículas por mês" />
        </article>

        <article className="chart-card">
          <header>
            <h2>Situação dos alunos</h2>
            <p>Quantos estão ativos, concluídos ou desistentes.</p>
          </header>
          <DonutChart data={g.situacao} labels={SITUACAO_LABEL} ariaLabel="Situação dos alunos" />
        </article>

        <article className="chart-card">
          <header>
            <h2>Alunos ativos por curso</h2>
            <p>Os cursos com mais alunos ativos.</p>
          </header>
          <BarList data={g.porCurso} />
        </article>

        <article className="chart-card">
          <header>
            <h2>Presença nas últimas aulas</h2>
            <p>Percentual de presença (presentes e justificadas) em cada aula de turma.</p>
          </header>
          <ColumnChart data={g.presencaAulas} max={100} suffix="%" ariaLabel="Presença nas últimas aulas" />
        </article>

        <article className="chart-card">
          <header>
            <h2>Justificativas de falta</h2>
            <p>Situação das justificativas enviadas pelos alunos.</p>
          </header>
          <DonutChart
            data={g.justificativas}
            labels={JUSTIFICATIVA_LABEL}
            ariaLabel="Justificativas de falta"
          />
        </article>
      </section>
    </div>
  );
}
