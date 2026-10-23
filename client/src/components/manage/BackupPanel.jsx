import { useRef, useState } from 'react';
import api from '../../services/api';
import { errorText } from './shared';

// Backup de conteúdo de curso (equivalente ao backup e à restauração do Moodle, sem dados de alunos).

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file) {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
}

// Exporta e restaura o conteúdo deste curso.
export default function BackupPanel({ course, onCourseChange, onFeedback }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    onFeedback(null);
    try {
      const { data } = await api.get(`/courses/${course.slug}/backup`);
      downloadJson(data, `${course.slug}.atlas-backup.json`);
      onFeedback({ type: 'success', text: 'Backup gerado. O download começou.' });
    } catch (error) {
      onFeedback({ type: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (
      !window.confirm(
        `Substituir TODO o conteúdo de "${course.title}" pelo arquivo "${file.name}"?\n\n` +
          'As seções, recursos e questões atuais serão apagados, junto com o progresso dos alunos neles. ' +
          'Título, configurações, visibilidade e matrículas serão mantidos.'
      )
    ) {
      return;
    }

    setBusy(true);
    onFeedback(null);
    try {
      const payload = await readBackupFile(file);
      const { data } = await api.post(`/courses/${course.slug}/restore`, payload);
      onCourseChange(data.course);
      onFeedback({ type: 'success', text: 'Conteúdo restaurado a partir do backup.' });
    } catch (error) {
      onFeedback({ type: 'error', text: error.message && !error.response ? error.message : errorText(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="manage-stack">
      <div className="manage-item">
        <div className="manage-item-header">
          <div>
            <h3>Exportar conteúdo</h3>
            <p className="muted">
              Gera um arquivo JSON com título, configurações, seções, recursos, questões e projeto final.
              Não inclui alunos, grupos, progresso nem certificados.
            </p>
          </div>
          <button type="button" className="primary-button small" onClick={handleExport} disabled={busy}>
            Baixar backup
          </button>
        </div>
      </div>

      <div className="manage-item">
        <div className="manage-item-header">
          <div>
            <h3>Restaurar conteúdo neste curso</h3>
            <p className="muted">
              Substitui o conteúdo atual pelo do arquivo. Use um backup exportado pelo Atlas - Geração Tech.
              Atenção: o progresso dos alunos nas seções substituídas é removido.
            </p>
          </div>
          <div className="manage-item-actions">
            <button type="button" className="danger-button small" onClick={() => fileRef.current?.click()} disabled={busy}>
              Escolher arquivo...
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={handleRestore}
              aria-label="Arquivo de backup para restaurar"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// Cria um curso novo a partir de um arquivo de backup (fica oculto até ser publicado).
export function ImportCoursePanel({ onImported, onFeedback }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    onFeedback(null);
    try {
      const payload = await readBackupFile(file);
      const { data } = await api.post('/courses/import', payload);
      onImported(data.course);
    } catch (error) {
      onFeedback({ type: 'error', text: error.message && !error.response ? error.message : errorText(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="manage-item">
      <div className="manage-item-header">
        <div>
          <h3>Importar curso de backup</h3>
          <p className="muted">
            Cria um curso novo com o conteúdo do arquivo. Ele fica oculto e sem autoinscrição até você publicá-lo.
          </p>
        </div>
        <button type="button" className="ghost-button small" onClick={() => fileRef.current?.click()} disabled={busy}>
          Importar arquivo...
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleFile}
          aria-label="Arquivo de backup para importar"
        />
      </div>
    </div>
  );
}
