import { useState } from 'react';
import api from '../../services/api';
import { errorText, FormActions } from '../manage/shared';

// Formulário do cronograma (administração): gerar aulas por grade de dias e horários, criar uma aula avulsa
// ou editar uma aula. Cada regra da grade tem seus dias da semana e seu horário, por exemplo:
// Seg/Qua 08:00-10:00 e Ter/Qui 19:00-21:00.

const DIAS = [
  { valor: 1, rotulo: 'Seg' },
  { valor: 2, rotulo: 'Ter' },
  { valor: 3, rotulo: 'Qua' },
  { valor: 4, rotulo: 'Qui' },
  { valor: 5, rotulo: 'Sex' },
  { valor: 6, rotulo: 'Sáb' },
  { valor: 0, rotulo: 'Dom' }
];

const PREDEFINIDOS = [
  { rotulo: 'Seg a sex', dias: [1, 2, 3, 4, 5] },
  { rotulo: 'Seg/Qua', dias: [1, 3] },
  { rotulo: 'Ter/Qui', dias: [2, 4] },
  { rotulo: 'Sáb', dias: [6] }
];

const NOMES_DIA = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, sáb: 6, dom: 0 };
const HORARIO = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

function diasDoTexto(texto) {
  const dias = new Set();
  String(texto || '')
    .toLowerCase()
    .split(/[\s/,;|-]+/)
    .filter(Boolean)
    .forEach((parte) => {
      const chave = parte.slice(0, 3);
      if (chave in NOMES_DIA) dias.add(NOMES_DIA[chave]);
    });
  return [...dias];
}

function dataBr(iso) {
  return iso ? `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
}

export default function AulaFormulario({ modo, turma, aula, onDone, onCancel }) {
  const [inicio, setInicio] = useState(turma?.dataInicio || '');
  const [fim, setFim] = useState(turma?.dataFim || '');
  const [grade, setGrade] = useState(() => [
    { dias: diasDoTexto(turma?.diasSemana), horario: turma?.horario || '' }
  ]);
  const [data, setData] = useState(aula?.date || '');
  const [horario, setHorario] = useState(aula?.horario || turma?.horario || '');
  const [modulo, setModulo] = useState(aula?.modulo || '');
  const [titulo, setTitulo] = useState(aula?.titulo || '');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const atualizarRegra = (indice, campos) => {
    setGrade((atual) => atual.map((regra, i) => (i === indice ? { ...regra, ...campos } : regra)));
  };

  const alternarDia = (indice, valor) => {
    const regra = grade[indice];
    const dias = regra.dias.includes(valor) ? regra.dias.filter((d) => d !== valor) : [...regra.dias, valor];
    atualizarRegra(indice, { dias });
  };

  const adicionarRegra = () => setGrade((atual) => [...atual, { dias: [], horario: '' }]);
  const removerRegra = (indice) => setGrade((atual) => atual.filter((_, i) => i !== indice));

  const gradeValida = grade.length > 0 && grade.every((r) => r.dias.length > 0 && (!r.horario || HORARIO.test(r.horario)));

  async function enviar(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (modo === 'gerar') {
        const { data: resposta } = await api.post(`/docente/turmas/${turma.id}/aulas/gerar`, {
          inicio,
          fim,
          grade: grade.map((r) => ({ dias: r.dias, horario: r.horario || '' })),
          titulo
        });
        const feriados = resposta.feriados?.length
          ? ` Feriados pulados: ${resposta.feriados.map(dataBr).join(', ')}.`
          : '';
        onDone(`${resposta.criadas} aula(s) criada(s). ${resposta.ignoradas} já existiam e foram mantidas.${feriados}`);
      } else if (modo === 'avulsa') {
        await api.post(`/docente/turmas/${turma.id}/aulas`, { data, horario, modulo, titulo });
        onDone('Aula avulsa criada.');
      } else {
        await api.patch(`/docente/aulas/${aula.sessionId}`, { data, horario, modulo, titulo });
        onDone('Aula atualizada.');
      }
    } catch (error) {
      setErro(errorText(error));
    } finally {
      setEnviando(false);
    }
  }

  const titulos = {
    gerar: 'Gerar aulas pelo período',
    avulsa: 'Nova aula avulsa',
    editar: 'Editar aula'
  };

  return (
    <form className="surface-card docente-form" onSubmit={enviar}>
      <header className="docente-form-cabecalho">
        <h2>{titulos[modo]}</h2>
        <p className="muted">{turma?.curso} · {turma?.nome}</p>
      </header>

      {modo === 'gerar' && (
        <>
          <div className="docente-grade">
            <label>
              <span>Início</span>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
            </label>
            <label>
              <span>Fim</span>
              <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} required />
            </label>
          </div>

          <div className="docente-regras">
            {grade.map((regra, indice) => (
              <fieldset key={indice} className="docente-regra">
                <legend>Regra {indice + 1}</legend>
                <div className="docente-predefinidos">
                  {PREDEFINIDOS.map((p) => (
                    <button key={p.rotulo} type="button" className="ghost-button small" onClick={() => atualizarRegra(indice, { dias: p.dias })}>
                      {p.rotulo}
                    </button>
                  ))}
                </div>
                <div className="docente-dias">
                  {DIAS.map((dia) => (
                    <label key={dia.valor} className={regra.dias.includes(dia.valor) ? 'is-on' : ''}>
                      <input type="checkbox" checked={regra.dias.includes(dia.valor)} onChange={() => alternarDia(indice, dia.valor)} />
                      {dia.rotulo}
                    </label>
                  ))}
                </div>
                <label className="docente-campo">
                  <span>Horário desta regra</span>
                  <input
                    value={regra.horario}
                    onChange={(e) => atualizarRegra(indice, { horario: e.target.value })}
                    placeholder="08:00-10:00"
                    pattern="([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d"
                    title="Use o formato HH:MM-HH:MM"
                  />
                </label>
                {grade.length > 1 && (
                  <button type="button" className="ghost-button small" onClick={() => removerRegra(indice)}>Remover regra</button>
                )}
              </fieldset>
            ))}
            {grade.length < 10 && (
              <button type="button" className="ghost-button small" onClick={adicionarRegra}>Adicionar outra regra de dias</button>
            )}
          </div>
          <p className="muted docente-nota">
            Feriados nacionais são pulados e datas que já têm aula não são duplicadas. Um dia que aparece em duas regras vale a primeira.
          </p>
        </>
      )}

      {(modo === 'avulsa' || modo === 'editar') && (
        <label className="docente-campo">
          <span>Data</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </label>
      )}

      {modo !== 'gerar' && (
        <div className="docente-grade">
          <label>
            <span>Horário</span>
            <input
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              placeholder="08:00-10:00"
              pattern="([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d"
              title="Use o formato HH:MM-HH:MM"
            />
          </label>
          <label>
            <span>Módulo</span>
            <input value={modulo} onChange={(e) => setModulo(e.target.value)} maxLength={120} />
          </label>
        </div>
      )}
      {modo !== 'gerar' && (
        <label className="docente-campo">
          <span>Tópico da aula</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} placeholder="Ex.: Laços de repetição" />
        </label>
      )}
      {modo === 'gerar' && (
        <label className="docente-campo">
          <span>Tópico padrão (opcional)</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} placeholder="Pode ser ajustado depois, aula a aula" />
        </label>
      )}

      {erro && <p className="docente-erro" role="alert">{erro}</p>}

      <FormActions
        submitLabel={enviando ? 'Salvando…' : modo === 'gerar' ? 'Gerar aulas' : 'Salvar'}
        onCancel={onCancel}
        disabled={enviando || (modo === 'gerar' && !gradeValida)}
      />
    </form>
  );
}
