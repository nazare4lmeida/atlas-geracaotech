import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Feedback, errorText } from '../components/manage/shared';
import { formatarMensagem } from '../components/atendimento/formatarMensagem.jsx';
import AnexoMensagem from '../components/atendimento/AnexoMensagem';
import EmojiPicker from '../components/atendimento/EmojiPicker';
import { TIPOS_ACEITOS, lerArquivo } from '../utils/anexos';
import FaqManager from '../components/atendimento/FaqManager';
import '../styles/atendimento.css';

// Atendimento da gestão: fila de conversas, resposta em tempo quase real e perguntas do robô (administração).
const INTERVALO_FILA_MS = 6000;
const INTERVALO_CONVERSA_MS = 4000;

const FILTROS = [
  { value: 'abertos', label: 'Aguardando equipe', hint: 'Alunos que pediram atendimento humano' },
  { value: 'robo', label: 'Com o robô', hint: 'Conversas que ainda estão no assistente' },
  { value: 'finalizados', label: 'Finalizados', hint: 'Atendimentos encerrados, ainda não arquivados' },
  { value: 'arquivados', label: 'Arquivados', hint: 'Conversas encerradas e guardadas' },
  { value: 'todos', label: 'Todos', hint: 'Todas as conversas, sem as arquivadas' }
];

const STATUS_TEXT = { bot: 'Robô', aberto: 'Aguardando', finalizado: 'Finalizado' };

function horaCurta(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  return mesmoDia
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function AtendimentoGestaoPage() {
  const { isAdmin, isAtendente } = useAuth();
  const [aba, setAba] = useState('conversas');
  const [filtro, setFiltro] = useState('abertos');
  const [sessoes, setSessoes] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [resposta, setResposta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [resumo, setResumo] = useState(null);
  const fimRef = useRef(null);
  const ultimoId = useRef(0);

  const carregarFila = async () => {
    try {
      const [fila, numeros] = await Promise.all([
        api.get('/atendimento/gestao/sessoes', { params: { filtro } }),
        api.get('/atendimento/gestao/resumo')
      ]);
      setSessoes(fila.data.sessoes);
      setResumo(numeros.data.resumo);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const carregarConversa = async (id, { completo = false } = {}) => {
    if (!id) return;
    try {
      const desde = completo ? 0 : ultimoId.current;
      const { data } = await api.get(`/atendimento/gestao/sessoes/${id}`, { params: { desde } });
      setSelecionada(data.sessao);
      if (data.mensagens.length) {
        ultimoId.current = data.mensagens[data.mensagens.length - 1].id;
        setMensagens((atuais) => (completo ? data.mensagens : [...atuais, ...data.mensagens]));
      }
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  // Fila: atualiza sozinha e acompanha o filtro escolhido.
  useEffect(() => {
    if (aba !== 'conversas') return undefined;
    carregarFila();
    const timer = setInterval(carregarFila, INTERVALO_FILA_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, filtro]);

  // Conversa aberta: troca de aluno zera o histórico exibido e puxa tudo de novo.
  useEffect(() => {
    if (!selecionada?.id) return undefined;
    ultimoId.current = 0;
    setMensagens([]);
    carregarConversa(selecionada.id, { completo: true });
    const timer = setInterval(() => carregarConversa(selecionada.id), INTERVALO_CONVERSA_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionada?.id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens.length]);

  const enviarResposta = async (event) => {
    event?.preventDefault();
    const texto = resposta.trim();
    if (!texto || !selecionada || enviando) return;
    setEnviando(true);
    setFeedback(null);
    try {
      await api.post(`/atendimento/gestao/sessoes/${selecionada.id}/mensagens`, { texto });
      setResposta('');
      await carregarConversa(selecionada.id);
      carregarFila();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setEnviando(false);
    }
  };

  const inserirEmoji = (emoji) => setResposta((atual) => `${atual}${emoji}`);

  const enviarArquivo = async (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo || !selecionada) return;
    setEnviando(true);
    setFeedback(null);
    try {
      const anexo = await lerArquivo(arquivo);
      await api.post(`/atendimento/gestao/sessoes/${selecionada.id}/anexo`, anexo);
      await carregarConversa(selecionada.id);
      carregarFila();
    } catch (error) {
      setFeedback({ type: 'error', text: error.response ? errorText(error) : error.message });
    } finally {
      setEnviando(false);
    }
  };

  // Arquivar: conversa encerrada sai da lista principal; continua acessível em "Arquivados".
  const arquivar = async () => {
    if (!selecionada || !window.confirm(`Arquivar a conversa de ${selecionada.aluno?.nome}? Ela sai da lista principal.`)) return;
    try {
      await api.post(`/atendimento/gestao/sessoes/${selecionada.id}/arquivar`);
      setFeedback({ type: 'success', text: 'Conversa arquivada.' });
      setSelecionada(null);
      carregarFila();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const finalizar = async () => {
    if (!selecionada || !window.confirm(`Finalizar o atendimento de ${selecionada.aluno?.nome}?`)) return;
    try {
      await api.post(`/atendimento/gestao/sessoes/${selecionada.id}/finalizar`);
      setFeedback({ type: 'success', text: 'Atendimento finalizado.' });
      await carregarConversa(selecionada.id);
      carregarFila();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const totalAguardando = useMemo(() => sessoes.filter((s) => s.status === 'aberto' && s.naoLidasGestao > 0).length, [sessoes]);
  const finalizado = selecionada?.status === 'finalizado';

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content atend atend-gestao">
        <section className="atend-head">
          <div>
            <span className="eyebrow">Gestão</span>
            <h1>Atendimento</h1>
            <p>
              {isAtendente
                ? 'Conversas dos alunos com o assistente e com a equipe. Responda por aqui e encerre quando resolver.'
                : 'Acompanhamento do atendimento: fila, conversas e números. Quem responde aos alunos é o atendente.'}
            </p>
          </div>
          <div className="atend-abas" role="tablist">
            <button type="button" role="tab" aria-selected={aba === 'conversas'} className={aba === 'conversas' ? 'is-active' : ''} onClick={() => setAba('conversas')}>
              Conversas {totalAguardando > 0 && <span className="atend-badge">{totalAguardando}</span>}
            </button>
            {isAdmin && (
              <button type="button" role="tab" aria-selected={aba === 'faq'} className={aba === 'faq' ? 'is-active' : ''} onClick={() => setAba('faq')}>
                Perguntas do robô
              </button>
            )}
          </div>
        </section>

        <Feedback feedback={feedback} />

        {resumo && (
          <section className="atend-resumo" aria-label="Números do atendimento">
            <div><strong>{resumo.aguardando}</strong><span>aguardando a equipe</span></div>
            <div><strong>{resumo.comNovas}</strong><span>com mensagens novas</span></div>
            <div><strong>{resumo.robo}</strong><span>com o robô</span></div>
            <div><strong>{resumo.finalizadosHoje}</strong><span>encerrados hoje</span></div>
            <div><strong>{resumo.finalizados7Dias}</strong><span>encerrados em 7 dias</span></div>
            <div><strong>{resumo.minutosMedios7Dias ?? '—'}{resumo.minutosMedios7Dias != null ? ' min' : ''}</strong><span>duração média (7 dias)</span></div>
          </section>
        )}

        {aba === 'faq' && isAdmin ? (
          <FaqManager />
        ) : (
          <div className="atend-layout">
            <aside className="atend-fila" aria-label="Fila de conversas">
              <div className="atend-filtros" role="radiogroup" aria-label="Filtrar conversas">
                {FILTROS.map((f) => (
                  <button key={f.value} type="button" role="radio" aria-checked={filtro === f.value} title={f.hint} className={filtro === f.value ? 'is-active' : ''} onClick={() => setFiltro(f.value)}>
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="atend-filtro-hint">{FILTROS.find((f) => f.value === filtro)?.hint}</p>

              <ul className="atend-lista">
                {sessoes.map((s) => (
                  <li key={s.id}>
                    <button type="button" className={`atend-item${selecionada?.id === s.id ? ' is-active' : ''}`} onClick={() => setSelecionada(s)}>
                      <span className="atend-item-topo">
                        <strong>{s.aluno?.nome}</strong>
                        <span className="muted">{horaCurta(s.ultimaMensagemEm)}</span>
                      </span>
                      <span className="atend-item-meio">
                        <span className={`atend-status atend-status-${s.status}`}>{STATUS_TEXT[s.status]}</span>
                        {s.naoLidasGestao > 0 && <span className="atend-badge">{s.naoLidasGestao} nova(s)</span>}
                      </span>
                      <span className="atend-item-ultima">{s.ultimaTexto ? s.ultimaTexto.replace(/\*/g, '').slice(0, 90) : 'Sem mensagens'}</span>
                    </button>
                  </li>
                ))}
                {sessoes.length === 0 && <li className="atend-vazio">Nenhuma conversa neste filtro.</li>}
              </ul>
            </aside>

            <section className="atend-conversa" aria-label="Conversa selecionada">
              {!selecionada ? (
                <div className="atend-vazio-grande">
                  <strong>Escolha uma conversa</strong>
                  <span className="muted">Os atendimentos pedidos pelos alunos aparecem em “Aguardando equipe”.</span>
                </div>
              ) : (
                <>
                  <header className="atend-conversa-head">
                    <div>
                      <strong>{selecionada.aluno?.nome}</strong>
                      <span className="muted">{selecionada.aluno?.email}{selecionada.atendenteNome ? ` · atendido por ${selecionada.atendenteNome}` : ''}</span>
                    </div>
                    <div className="atend-conversa-acoes">
                      <span className={`atend-status atend-status-${selecionada.status}`}>{STATUS_TEXT[selecionada.status]}</span>
                      {!finalizado && isAtendente && (
                        <button type="button" className="ghost-button small" onClick={finalizar}>Finalizar atendimento</button>
                      )}
                      {finalizado && isAtendente && filtro !== 'arquivados' && (
                        <button type="button" className="ghost-button small" onClick={arquivar}>Arquivar conversa</button>
                      )}
                    </div>
                  </header>

                  <div className="atend-mensagens atend-mensagens-gestao" role="log" aria-live="polite">
                    {mensagens.map((m) => (
                      <div key={m.id} className={`atend-msg atend-msg-${m.remetente === 'aluno' ? 'aluno' : m.remetente === 'admin' ? 'admin' : 'sistema'}`}>
                        <span className="atend-autor">
                          {m.remetente === 'aluno' ? selecionada.aluno?.nome : m.remetente === 'admin' ? (m.autorNome || 'Equipe') : 'Robô'}
                          {' · '}{horaCurta(m.createdAt)}
                        </span>
                        {m.tipo === 'arquivo' ? (
                          <div className="atend-anexo-bolha"><AnexoMensagem mensagemId={m.id} anexo={m.anexo} /></div>
                        ) : (
                          <p>{formatarMensagem(m.conteudo)}</p>
                        )}
                      </div>
                    ))}
                    <div ref={fimRef} />
                  </div>

                  {finalizado ? (
                    <p className="atend-rodape muted">Atendimento encerrado. Se o aluno escrever de novo, uma nova conversa é aberta.</p>
                  ) : !isAtendente ? (
                    <p className="atend-rodape muted">Modo acompanhamento: esta conversa é respondida pelo atendente.</p>
                  ) : (
                    <form className="atend-entrada" onSubmit={enviarResposta}>
                      <div className="atend-entrada-linha">
                        <EmojiPicker onPick={inserirEmoji} disabled={enviando} />
                        <label className="atend-anexo-btn" title="Enviar imagem ou PDF ao aluno (até 2 MB)">
                          📎
                          <input type="file" accept={TIPOS_ACEITOS} onChange={enviarArquivo} disabled={enviando} aria-label="Enviar documento ao aluno" />
                        </label>
                        <textarea
                          value={resposta}
                          onChange={(e) => setResposta(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              enviarResposta();
                            }
                          }}
                          placeholder="Responder como equipe (Enter envia, Shift+Enter quebra a linha)"
                          rows={2}
                          maxLength={1000}
                          aria-label="Resposta"
                        />
                      </div>
                      <div className="atend-entrada-acoes">
                        <button type="submit" className="primary-button small" disabled={enviando || !resposta.trim()}>
                          {enviando ? 'Enviando…' : 'Responder'}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
