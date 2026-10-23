import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import useForm from '../hooks/useForm';
import api from '../services/api';
import '../styles/notes.css';

// Anotações: um caderno de estudo. O formulário é a folha pautada; cada anotação é um cartão colorido.
const TONS = ['highlight', 'primary', 'success', 'danger'];

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const { values, handleChange, reset, setValues } = useForm({
    title: '',
    content: '',
    tags: ''
  });
  const [editingId, setEditingId] = useState(null);

  const loadNotes = async () => {
    const { data } = await api.get('/notes');
    setNotes(data.notes);
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...values,
      tags: values.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    };

    if (editingId) {
      await api.put(`/notes/${editingId}`, payload);
    } else {
      await api.post('/notes', payload);
    }

    setEditingId(null);
    reset();
    loadNotes();
  };

  const handleEdit = (note) => {
    setEditingId(note._id);
    setValues({
      title: note.title,
      content: note.content,
      tags: note.tags.join(', ')
    });
  };

  const handleDelete = async (noteId) => {
    await api.delete(`/notes/${noteId}`);
    if (editingId === noteId) {
      setEditingId(null);
      reset();
    }
    loadNotes();
  };

  const cancelarEdicao = () => {
    setEditingId(null);
    reset();
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content notes-page">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow">Minha área</span>
            <h1>Anotações</h1>
            <p>Registre conceitos importantes, dúvidas, ideias de projeto e resumos de aulas.</p>
          </div>
        </section>

        <div className="notes-board">
          <form className="notes-form" onSubmit={handleSubmit}>
            <h2>{editingId ? 'Editar anotação' : 'Nova anotação'}</h2>

            <label>
              <span>Título</span>
              <input type="text" name="title" value={values.title} onChange={handleChange} required />
            </label>

            <label>
              <span>Conteúdo</span>
              <textarea name="content" rows="8" value={values.content} onChange={handleChange} required />
            </label>

            <label>
              <span>Tags (separadas por vírgula)</span>
              <input type="text" name="tags" value={values.tags} onChange={handleChange} />
            </label>

            <div className="notes-form-actions">
              <button type="submit" className="primary-button small">
                {editingId ? 'Salvar alterações' : 'Criar anotação'}
              </button>
              {editingId && (
                <button type="button" className="ghost-button small" onClick={cancelarEdicao}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <section className="notes-wall" aria-label="Suas anotações">
            {notes.length === 0 && (
              <p className="notes-empty">Nenhuma anotação ainda. Escreva a primeira ao lado.</p>
            )}

            {notes.map((note, index) => (
              <article key={note._id} className={`notes-card tone-${TONS[index % TONS.length]}`}>
                <h3>{note.title}</h3>
                <p>{note.content}</p>
                {note.tags.length > 0 && (
                  <div className="notes-tags">
                    {note.tags.map((tag) => (
                      <span key={tag} className="notes-tag">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="notes-card-actions">
                  <button type="button" className="ghost-button small" onClick={() => handleEdit(note)}>
                    Editar
                  </button>
                  <button type="button" className="ghost-button small" onClick={() => handleDelete(note._id)}>
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
