import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Feedback, errorText } from '../manage/shared';

// Perguntas que o robô responde. Só a administração edita. Uma pergunta inativa não aparece para o aluno.
const VAZIO = { id: null, titulo: '', palavras: '', resposta: '', ordem: 0, ativo: true, revisado: false };

export default function FaqManager() {
  const [itens, setItens] = useState([]);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const carregar = async () => {
    try {
      const { data } = await api.get('/atendimento/gestao/faq');
      setItens(data.faq);
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const salvar = async (event) => {
    event.preventDefault();
    setSalvando(true);
    setFeedback(null);
    const corpo = { ...form };
    try {
      if (form.id) await api.patch(`/atendimento/gestao/faq/${form.id}`, corpo);
      else await api.post('/atendimento/gestao/faq', corpo);
      setForm(null);
      setFeedback({ type: 'success', text: 'Pergunta salva. O robô já usa a versão nova.' });
      await carregar();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (item, campo) => {
    try {
      await api.patch(`/atendimento/gestao/faq/${item.id}`, { ...item, [campo]: !item[campo] });
      await carregar();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  const excluir = async (item) => {
    if (!window.confirm(`Excluir a pergunta “${item.titulo}”?`)) return;
    try {
      await api.delete(`/atendimento/gestao/faq/${item.id}`);
      await carregar();
    } catch (error) {
      setFeedback({ type: 'error', text: errorText(error) });
    }
  };

  return (
    <div className="atend-faq">
      <Feedback feedback={feedback} />

      <div className="atend-faq-aviso">
        <strong>Como funciona:</strong> o aluno clica num assunto ou escreve uma dúvida. O robô procura a palavra-chave mais específica
        que aparece na pergunta e responde com o texto cadastrado. Quando não encontra nada, sugere falar com a equipe.
        Respostas com dados de edição precisam de revisão antes de ficarem ativas.
      </div>

      <div className={`atend-faq-layout${form ? ' has-form' : ''}`}>
        <section className="atend-faq-lista" aria-label="Perguntas cadastradas">
          <header>
            <h2>Perguntas ({itens.length})</h2>
            <button type="button" className="primary-button small" onClick={() => setForm({ ...VAZIO, ordem: (itens.at(-1)?.ordem || 0) + 1 })}>
              Nova pergunta
            </button>
          </header>
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Pergunta</th>
                  <th>Palavras-chave</th>
                  <th>No robô</th>
                  <th>Revisada</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-name"><strong>{item.titulo}</strong></td>
                    <td className="atend-faq-palavras">{item.palavras.split(',').join(' · ')}</td>
                    <td className="nowrap">
                      <button type="button" className={`atend-switch${item.ativo ? ' is-on' : ''}`} onClick={() => alternar(item, 'ativo')} aria-pressed={item.ativo}>
                        {item.ativo ? 'Ativa' : 'Inativa'}
                      </button>
                    </td>
                    <td className="nowrap">
                      <button type="button" className={`atend-switch${item.revisado ? ' is-on' : ''}`} onClick={() => alternar(item, 'revisado')} aria-pressed={item.revisado}>
                        {item.revisado ? 'Sim' : 'Pendente'}
                      </button>
                    </td>
                    <td className="nowrap">
                      <button type="button" className="ghost-button small" onClick={() => setForm({ ...item })}>Editar</button>{' '}
                      <button type="button" className="danger-button small" onClick={() => excluir(item)}>Excluir</button>
                    </td>
                  </tr>
                ))}
                {itens.length === 0 && <tr><td colSpan={5} className="users-empty">Nenhuma pergunta cadastrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {form && (
          <form className="atend-faq-form" onSubmit={salvar}>
            <h2>{form.id ? 'Editar pergunta' : 'Nova pergunta'}</h2>
            <label>
              <span>Título (botão que o aluno vê)</span>
              <input required maxLength={160} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </label>
            <label>
              <span>Palavras-chave, separadas por vírgula</span>
              <input required value={form.palavras} onChange={(e) => setForm({ ...form, palavras: e.target.value })} placeholder="ex.: gratuito, taxa, custo" />
              <small className="muted">Use palavras que o aluno realmente digita. Sem acento não faz diferença.</small>
            </label>
            <label>
              <span>Resposta (use *texto* para negrito)</span>
              <textarea required rows={8} maxLength={4000} value={form.resposta} onChange={(e) => setForm({ ...form, resposta: e.target.value })} />
            </label>
            <div className="atend-faq-par">
              <label>
                <span>Ordem</span>
                <input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} />
              </label>
              <label className="atend-check">
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                <span>Ativa no robô</span>
              </label>
              <label className="atend-check">
                <input type="checkbox" checked={form.revisado} onChange={(e) => setForm({ ...form, revisado: e.target.checked })} />
                <span>Conteúdo revisado</span>
              </label>
            </div>
            <div className="atend-faq-acoes">
              <button type="button" className="ghost-button small" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="primary-button small" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
