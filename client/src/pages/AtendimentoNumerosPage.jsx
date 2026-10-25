import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Feedback, errorText } from '../components/manage/shared';
import { exportTable } from '../utils/sheetExport';

// Gestão vê só os números do atendimento. O conteúdo das conversas sai apenas no relatório completo.
const NUMEROS = [
  { key: 'aguardando', label: 'Aguardando atendimento' },
  { key: 'comNovas', label: 'Com mensagens novas' },
  { key: 'robo', label: 'Conversando com o robô' },
  { key: 'finalizadosHoje', label: 'Finalizados hoje' },
  { key: 'finalizados7Dias', label: 'Finalizados em 7 dias' },
  { key: 'minutosMedios7Dias', label: 'Tempo médio em 7 dias (min)' },
  { key: 'alunos7Dias', label: 'Alunos atendidos em 7 dias' }
];

const ROTULO_REMETENTE = { aluno: 'Aluno', admin: 'Equipe', sistema: 'Robô' };

const COLUNAS = [
  { key: 'sessao', label: 'Atendimento' },
  { key: 'status', label: 'Situação' },
  { key: 'abertura', label: 'Abertura', value: (r) => formatarDataHora(r.abertura) },
  { key: 'aluno', label: 'Aluno' },
  { key: 'atendente', label: 'Atendente' },
  { key: 'remetente', label: 'Quem enviou', value: (r) => ROTULO_REMETENTE[r.remetente] || r.remetente },
  { key: 'hora', label: 'Hora', value: (r) => formatarDataHora(r.hora) },
  { key: 'conteudo', label: 'Mensagem' }
];

function formatarDataHora(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export default function AtendimentoNumerosPage() {
  const [resumo, setResumo] = useState(null);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [gerando, setGerando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    api
      .get('/atendimento/gestao/resumo')
      .then(({ data }) => setResumo(data.resumo))
      .catch((error) => setFeedback({ type: 'error', text: errorText(error) }));
  }, []);

  async function extrair(formato) {
    setGerando(true);
    setFeedback(null);
    try {
      const { data } = await api.get('/atendimento/gestao/relatorio', { params: { de, ate } });
      if (!data.linhas.length) {
        setFeedback({ type: 'error', text: 'Não há conversas nesse período.' });
        return;
      }
      exportTable(data.linhas, COLUNAS, formato, 'atendimento-relatorio');
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow">Gestão</span>
            <h1>Atendimento</h1>
            <p>Números do atendimento. Para acompanhar as conversas, extraia o relatório completo.</p>
          </div>
        </section>

        <Feedback feedback={feedback} />

        {resumo && (
          <section className="cron-numeros" aria-label="Números do atendimento">
            {NUMEROS.map((n) => (
              <div key={n.key}>
                <strong>{resumo[n.key] ?? '—'}</strong>
                <span>{n.label}</span>
              </div>
            ))}
          </section>
        )}

        <section className="surface-card aparencia-campo">
          <h2>Relatório completo</h2>
          <p className="muted">Traz todas as mensagens do período, com o aluno e a equipe que atendeu.</p>
          <label>
            <span>De</span>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </label>
          <label>
            <span>Até</span>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </label>
          <div className="aparencia-acoes">
            <button type="button" className="ghost-button small" disabled={gerando} onClick={() => extrair('csv')}>CSV</button>
            <button type="button" className="primary-button small" disabled={gerando} onClick={() => extrair('xlsx')}>
              {gerando ? 'Gerando…' : 'Planilha'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
