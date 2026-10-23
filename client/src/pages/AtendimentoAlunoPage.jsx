import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Feedback, errorText } from '../components/manage/shared';
import { formatarMensagem } from '../components/atendimento/formatarMensagem.jsx';
import AnexoMensagem from '../components/atendimento/AnexoMensagem';
import EmojiPicker from '../components/atendimento/EmojiPicker';
import { TIPOS_ACEITOS, lerArquivo } from '../utils/anexos';
import '../styles/atendimento.css';

// Atendimento do aluno: robô de perguntas frequentes e, quando preciso, a equipe pelo mesmo chat.
const INTERVALO_MS = 4000;

const STATUS_ALUNO = {
  bot: { label: 'Assistente virtual', hint: 'Escolha um assunto ou escreva sua dúvida.' },
  aberto: { label: 'Aguardando a equipe', hint: 'Um atendente vai responder por aqui. Horário: seg. a sex., 9h às 17h.' }
};

export default function AtendimentoAlunoPage() {
  const [sessao, setSessao] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [topicos, setTopicos] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const fimRef = useRef(null);
  const ultimoId = useRef(0);

  const carregar = async ({ completo = false } = {}) => {
    try {
      const desde = completo ? 0 : ultimoId.current;
      const { data } = await api.get('/atendimento/aluno/sessao', { params: { desde } });
      setSessao(data.sessao);
      setTopicos(data.topicos);
      if (data.mensagens.length) {
        ultimoId.current = data.mensagens[data.mensagens.length - 1].id;
        setMensagens((atuais) => (completo ? data.mensagens : [...atuais, ...data.mensagens]));
      }
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  useEffect(() => {
    carregar({ completo: true });
    const timer = setInterval(() => carregar(), INTERVALO_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens.length]);

  const enviar = async (event) => {
    event?.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setEnviando(true);
    setFeedback(null);
    try {
      await api.post('/atendimento/aluno/mensagens', { texto: conteudo });
      setTexto('');
      await carregar();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setEnviando(false);
    }
  };

  const inserirEmoji = (emoji) => setTexto((atual) => `${atual}${emoji}`);

  const enviarArquivo = async (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    setEnviando(true);
    setFeedback(null);
    try {
      const anexo = await lerArquivo(arquivo);
      await api.post('/atendimento/aluno/anexo', anexo);
      await carregar();
    } catch (error) {
      setFeedback({ type: 'error', text: error.response ? errorText(error) : error.message });
    } finally {
      setEnviando(false);
    }
  };

  const escolherAssunto = async (topico) => {
    setFeedback(null);
    try {
      await api.post('/atendimento/aluno/assunto', { faqId: topico.id });
      await carregar();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const falarComEquipe = async () => {
    setFeedback(null);
    try {
      await api.post('/atendimento/aluno/falar-com-equipe');
      await carregar();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const comEquipe = sessao?.status === 'aberto';
  const statusInfo = comEquipe
    ? mensagens.some((m) => m.remetente === 'admin')
      ? { label: 'Atendente conectado', hint: 'Você está conversando com a equipe do Geração Tech.' }
      : STATUS_ALUNO.aberto
    : STATUS_ALUNO.bot;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content atend">
        <section className="atend-head">
          <div>
            <span className="eyebrow">Atendimento</span>
            <h1>Fale com o Geração Tech</h1>
            <p>Tire dúvidas sobre o programa, o processo seletivo e as formações. Se precisar, a equipe responde por aqui.</p>
          </div>
        </section>

        <Feedback feedback={feedback} />

        <section className="atend-chat" aria-label="Conversa com o atendimento">
          <header className="atend-chat-head">
            <div>
              <strong>{statusInfo.label}</strong>
              <span className="muted">{statusInfo.hint}</span>
            </div>
            <span className={`atend-status atend-status-${comEquipe ? 'aberto' : 'bot'}`}>{comEquipe ? 'Com a equipe' : 'Robô'}</span>
          </header>

          <div className="atend-mensagens" role="log" aria-live="polite">
            {mensagens.map((m) => (
              <div key={m.id} className={`atend-msg atend-msg-${m.remetente}`}>
                {m.remetente === 'admin' && <span className="atend-autor">Equipe Geração Tech</span>}
                {m.remetente === 'sistema' && <span className="atend-autor">Assistente</span>}
                {m.tipo === 'arquivo' ? (
                  <div className="atend-anexo-bolha"><AnexoMensagem mensagemId={m.id} anexo={m.anexo} /></div>
                ) : (
                  <p>{formatarMensagem(m.conteudo)}</p>
                )}
              </div>
            ))}
            <div ref={fimRef} />
          </div>

          {!comEquipe && topicos.length > 0 && (
            <div className="atend-topicos" aria-label="Assuntos">
              <p>Assuntos frequentes</p>
              <div>
                {topicos.map((t) => (
                  <button key={t.id} type="button" onClick={() => escolherAssunto(t)}>{t.titulo}</button>
                ))}
              </div>
            </div>
          )}

          <form className="atend-entrada" onSubmit={enviar}>
            <div className="atend-entrada-linha">
              <EmojiPicker onPick={inserirEmoji} disabled={enviando} />
              <label className="atend-anexo-btn" title="Enviar imagem ou PDF (até 2 MB)">
                📎
                <input type="file" accept={TIPOS_ACEITOS} onChange={enviarArquivo} disabled={enviando} aria-label="Enviar documento" />
              </label>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                placeholder={comEquipe ? 'Escreva para a equipe…' : 'Digite sua dúvida…'}
                rows={2}
                maxLength={1000}
                aria-label="Mensagem"
              />
            </div>
            <div className="atend-entrada-acoes">
              {!comEquipe && (
                <button type="button" className="ghost-button small" onClick={falarComEquipe}>Falar com a equipe</button>
              )}
              <button type="submit" className="primary-button small" disabled={enviando || !texto.trim()}>
                {enviando ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
