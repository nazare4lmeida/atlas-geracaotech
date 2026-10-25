import { useState } from 'react';
import api from '../../services/api';
import { errorText } from '../manage/shared';
import { lerEmenta } from '../../utils/ementa';

const DIAS = [
  { valor: 1, rotulo: 'Seg' },
  { valor: 2, rotulo: 'Ter' },
  { valor: 3, rotulo: 'Qua' },
  { valor: 4, rotulo: 'Qui' },
  { valor: 5, rotulo: 'Sex' },
  { valor: 6, rotulo: 'Sáb' },
  { valor: 0, rotulo: 'Dom' }
];

// Gera as aulas (que viram as sessões de presença) entre duas datas, nos dias escolhidos.
// A ementa é opcional: vem de um CSV ou XLSX com as colunas módulo e aula.
export default function GerarCronograma({ tipo, id, onDone, onCancel }) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [dias, setDias] = useState([1, 2, 3, 4, 5]);
  const [horario, setHorario] = useState('');
  const [ementa, setEmenta] = useState([]);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alternarDia = (valor) => setDias((atual) => (atual.includes(valor) ? atual.filter((d) => d !== valor) : [...atual, valor]));

  async function importarEmenta(arquivo) {
    if (!arquivo) return;
    try {
      const itens = await lerEmenta(arquivo);
      if (!itens.length) {
        setErro('Não encontrei aulas no arquivo. Use colunas módulo e aula.');
        return;
      }
      setEmenta(itens);
      setNomeArquivo(arquivo.name);
      setErro('');
    } catch (e) {
      setErro('Não consegui ler o arquivo. Use CSV ou XLSX.');
    }
  }

  async function gerar(event) {
    event.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      const { data } = await api.post(`/presenca/gestao/espacos/${tipo}/${id}/gerar`, { inicio, fim, dias, horario, ementa });
      const sobra = data.sobrandoEmenta ? ` Sobraram ${data.sobrandoEmenta} item(ns) da ementa.` : '';
      const pulo = data.puladas ? ` ${data.puladas} data(s) já tinham aula e foram puladas.` : '';
      onDone(`${data.criadas} aula(s) criada(s).${pulo}${sobra}`);
    } catch (e) {
      setErro(errorText(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="surface-card docente-form" onSubmit={gerar}>
      <h2>Gerar cronograma</h2>
      <p className="muted">As aulas geradas viram as sessões de presença da turma ou do grupo.</p>

      <div className="docente-acoes">
        <label>
          <span>De</span>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </label>
        <label>
          <span>Até</span>
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} required />
        </label>
        <label>
          <span>Horário</span>
          <input placeholder="08:00-10:00" value={horario} onChange={(e) => setHorario(e.target.value)} maxLength={60} />
        </label>
      </div>

      <fieldset>
        <legend>Dias da semana</legend>
        <div className="docente-acoes">
          {DIAS.map((d) => (
            <label key={d.valor} className="docente-check">
              <input type="checkbox" checked={dias.includes(d.valor)} onChange={() => alternarDia(d.valor)} />
              {d.rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        <span>Ementa (opcional, CSV ou XLSX com colunas módulo e aula)</span>
        <input type="file" accept=".csv,.xlsx,.xls,text/csv" onChange={(e) => importarEmenta(e.target.files?.[0])} />
      </label>
      {ementa.length > 0 && (
        <p className="muted">
          {nomeArquivo}: {ementa.length} aula(s). Primeira: {ementa[0].titulo}. Última: {ementa[ementa.length - 1].titulo}.
        </p>
      )}

      {erro && <p className="feedback-error">{erro}</p>}

      <div className="docente-acoes">
        <button type="submit" className="primary-button small" disabled={enviando || !dias.length}>
          {enviando ? 'Gerando…' : 'Gerar aulas'}
        </button>
        <button type="button" className="ghost-button small" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
