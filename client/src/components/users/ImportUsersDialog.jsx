import { useState } from 'react';
import api from '../../services/api';
import { errorText } from '../manage/shared';
import { downloadTemplate, readSheet, validateRows } from '../../utils/userSheet';

// Importação por planilha: escolhe o arquivo, confere as linhas, mostra o que vai entrar e o que tem erro.
export default function ImportUsersDialog({ onClose, onImported }) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const valid = rows.filter((row) => row.errors.length === 0);
  const invalid = rows.filter((row) => row.errors.length > 0);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setReport(null);
    setError('');
    setFileName(file.name);
    setReading(true);
    try {
      const raw = await readSheet(file);
      if (raw.length === 0) {
        setRows([]);
        setError('A planilha não tem linhas. Use o modelo para conferir as colunas.');
      } else {
        setRows(validateRows(raw));
      }
    } catch {
      setRows([]);
      setError('Não consegui ler este arquivo. Use .xlsx ou .csv.');
    } finally {
      setReading(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setError('');
    try {
      const { data } = await api.post('/users/import', { rows: valid.map((row) => ({ linha: row.linha, ...row.data })) });
      setReport(data.report);
      onImported?.();
    } catch (err) {
      setError(errorText(err, 'Não foi possível importar a planilha.'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Importar planilha de usuários">
      <div className="modal-card import-card">
        <div className="import-head">
          <h2>Importar planilha</h2>
          <button type="button" className="ghost-button small" onClick={onClose}>Fechar</button>
        </div>

        {!report && (
          <>
            <p className="muted">
              Colunas: nome, email, cpf, papel_no_curso, curso, grupo. Cada linha é uma matrícula; o mesmo aluno pode aparecer em vários cursos.
            </p>
            <div className="import-actions">
              <button type="button" className="ghost-button" onClick={downloadTemplate}>Baixar modelo (.xlsx)</button>
              <label className="primary-button import-file">
                {reading ? 'Lendo…' : 'Escolher arquivo (.xlsx ou .csv)'}
                <input type="file" accept=".xlsx,.csv" hidden onChange={handleFile} disabled={reading} />
              </label>
              {fileName && <span className="muted">{fileName}</span>}
            </div>

            {error && <div className="alert error">{error}</div>}

            {rows.length > 0 && (
              <>
                <div className="import-summary">
                  <span className="badge">{rows.length} linhas</span>
                  <span className="badge">{valid.length} prontas</span>
                  {invalid.length > 0 && <span className="badge hidden">{invalid.length} com erro (não serão importadas)</span>}
                </div>

                <div className="table-wrap import-preview">
                  <table className="manage-table">
                    <thead>
                      <tr>
                        <th>Linha</th>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>CPF</th>
                        <th>Papel</th>
                        <th>Curso</th>
                        <th>Grupo</th>
                        <th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.linha} className={row.errors.length ? 'import-row-error' : ''}>
                          <td>{row.linha}</td>
                          <td>{row.data.nome}</td>
                          <td>{row.data.email}</td>
                          <td>{row.data.cpf}</td>
                          <td>{row.data.papel_no_curso}</td>
                          <td>{row.data.curso}</td>
                          <td>{row.data.grupo}</td>
                          <td>{row.errors.length ? row.errors.join('; ') : 'OK'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="import-actions">
                  <button type="button" className="primary-button" onClick={runImport} disabled={importing || valid.length === 0}>
                    {importing ? 'Importando…' : `Importar ${valid.length} linha(s)`}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {report && (
          <div className="import-report" role="status">
            <h3>Importação concluída</h3>
            <ul>
              <li>Contas criadas: <strong>{report.criados}</strong></li>
              <li>Contas já existentes: <strong>{report.existentes}</strong></li>
              <li>Matrículas feitas: <strong>{report.matriculas}</strong></li>
              <li>Grupos criados: <strong>{report.grupos}</strong></li>
            </ul>
            {report.erros.length > 0 && (
              <>
                <p>Linhas que não entraram:</p>
                <ul className="import-errors">
                  {report.erros.map((item) => (
                    <li key={`${item.linha}-${item.mensagem}`}>Linha {item.linha}: {item.mensagem}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="muted">Alunos novos entram com "Primeiro acesso", usando e-mail e CPF.</p>
          </div>
        )}

        {error && report && <div className="alert error">{error}</div>}
      </div>
    </div>
  );
}
