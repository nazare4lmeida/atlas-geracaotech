import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { exportTable } from '../../utils/sheetExport';
import { errorText } from '../manage/shared';

// Relatório de presença: filtros, tabela por aluno e espaço, exportação em planilha ou HTML.
const COLUNAS = [
  { key: 'curso', label: 'Curso' },
  { key: 'tipo', label: 'Tipo', value: (r) => (r.tipo === 'grupo' ? 'Grupo' : 'Turma') },
  { key: 'espaco', label: 'Turma ou grupo' },
  { key: 'modalidade', label: 'Modalidade' },
  { key: 'nome', label: 'Aluno' },
  { key: 'email', label: 'E-mail' },
  { key: 'aulas', label: 'Aulas realizadas' },
  { key: 'presentes', label: 'Presenças' },
  { key: 'justificadas', label: 'Justificadas' },
  { key: 'abonadas', label: 'Abonadas' },
  { key: 'faltas', label: 'Faltas' },
  { key: 'percentual', label: 'Presença (%)', value: (r) => (r.percentual === null ? '' : `${r.percentual}%`) }
];

const FILTROS_VAZIOS = { cursoId: '', tipo: '', modalidade: '', de: '', ate: '', busca: '' };

const escapar = (valor) =>
  String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export default function RelatorioPresenca({ cursos = [] }) {
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [linhas, setLinhas] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const buscar = (atuais = filtros) => {
    const params = Object.fromEntries(Object.entries(atuais).filter(([, valor]) => valor));
    setCarregando(true);
    setErro('');
    return api
      .get('/presenca/gestao/relatorio', { params })
      .then(({ data }) => setLinhas(data.linhas || []))
      .catch((error) => setErro(errorText(error, 'Não foi possível gerar o relatório.')))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    buscar(FILTROS_VAZIOS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totais = useMemo(() => {
    const lista = linhas || [];
    const alunos = new Set(lista.map((l) => l.userId)).size;
    const contam = lista.reduce((s, l) => s + l.presentes + l.justificadas + l.abonadas, 0);
    const possiveis = lista.reduce((s, l) => s + l.aulas, 0);
    return { alunos, espacos: new Set(lista.map((l) => l.espacoId)).size, media: possiveis ? Math.round((contam / possiveis) * 100) : null };
  }, [linhas]);

  function exportarHtml() {
    const cabecalho = COLUNAS.map((c) => `<th>${escapar(c.label)}</th>`).join('');
    const corpo = (linhas || [])
      .map((linha) => `<tr>${COLUNAS.map((c) => `<td>${escapar(c.value ? c.value(linha) : linha[c.key])}</td>`).join('')}</tr>`)
      .join('');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Relatório de presença</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#1f2933}h1{font-size:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd2d9;padding:6px 8px;font-size:13px;text-align:left}th{background:#eef2f7}</style></head><body><h1>Relatório de presença</h1><p>Gerado em ${escapar(new Date().toLocaleString('pt-BR'))}. ${(linhas || []).length} registro(s).</p><table><thead><tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody></table></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `presenca-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const campo = (rotulo, nome, tipo = 'text', extra = {}) => (
    <label>
      <span>{rotulo}</span>
      <input type={tipo} value={filtros[nome]} onChange={(e) => setFiltros({ ...filtros, [nome]: e.target.value })} {...extra} />
    </label>
  );

  return (
    <section className="presenca-relatorio">
      <form
        className="presenca-filtros"
        onSubmit={(event) => {
          event.preventDefault();
          buscar();
        }}
      >
        <label>
          <span>Curso</span>
          <select value={filtros.cursoId} onChange={(e) => setFiltros({ ...filtros, cursoId: e.target.value })}>
            <option value="">Todos os cursos</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Tipo</span>
          <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
            <option value="">Turmas e grupos</option>
            <option value="turma">Só turmas</option>
            <option value="grupo">Só grupos</option>
          </select>
        </label>
        <label>
          <span>Modalidade</span>
          <select value={filtros.modalidade} onChange={(e) => setFiltros({ ...filtros, modalidade: e.target.value })}>
            <option value="">Todas</option>
            <option value="Online">Online</option>
            <option value="Presencial">Presencial</option>
            <option value="Grupo">Grupo</option>
          </select>
        </label>
        {campo('De (data da aula)', 'de', 'date')}
        {campo('Até (data da aula)', 'ate', 'date')}
        {campo('Buscar aluno, e-mail ou turma', 'busca', 'search', { placeholder: 'Ex.: Maria, GT4-F-S01' })}
        <div className="presenca-filtros-acoes">
          <button type="submit" className="primary-button small" disabled={carregando}>{carregando ? 'Gerando...' : 'Aplicar filtros'}</button>
          <button
            type="button"
            className="ghost-button small"
            onClick={() => {
              setFiltros(FILTROS_VAZIOS);
              buscar(FILTROS_VAZIOS);
            }}
          >
            Limpar
          </button>
        </div>
      </form>

      {erro && <div className="alert error">{erro}</div>}

      <div className="presenca-resumo-geral">
        <div><strong>{totais.alunos}</strong><span>alunos</span></div>
        <div><strong>{totais.espacos}</strong><span>turmas e grupos</span></div>
        <div><strong>{totais.media !== null ? `${totais.media}%` : '—'}</strong><span>presença média</span></div>
      </div>

      <div className="presenca-exportar">
        <button type="button" className="ghost-button small" disabled={!linhas?.length} onClick={() => exportTable(linhas, COLUNAS, 'xlsx', 'presenca')}>
          Exportar planilha (.xlsx)
        </button>
        <button type="button" className="ghost-button small" disabled={!linhas?.length} onClick={() => exportTable(linhas, COLUNAS, 'csv', 'presenca')}>
          Exportar CSV
        </button>
        <button type="button" className="ghost-button small" disabled={!linhas?.length} onClick={exportarHtml}>
          Exportar HTML
        </button>
      </div>

      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              {COLUNAS.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(linhas || []).map((linha) => (
              <tr key={`${linha.espacoId}:${linha.userId}`}>
                {COLUNAS.map((c) => (
                  <td key={c.key}>{c.value ? c.value(linha) : linha[c.key]}</td>
                ))}
              </tr>
            ))}
            {linhas && linhas.length === 0 && (
              <tr><td colSpan={COLUNAS.length} className="users-empty">Nenhum registro com estes filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
