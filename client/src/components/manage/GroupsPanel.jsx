import { useEffect, useState } from 'react';
import useForm from '../../hooks/useForm';
import api from '../../services/api';
import { FormActions, errorText } from './shared';

// Grupos de alunos (equivalente a "Grupos" do Moodle): criar, renomear, excluir
// e associar ou remover alunos matriculados no curso.
function GroupEditForm({ group, onSave, onCancel }) {
  const { values, handleChange } = useForm({ name: group.name, description: group.description || '' });

  return (
    <form
      className="manage-form manage-inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(values);
      }}
    >
      <div className="form-grid">
        <label>
          <span>Nome do grupo</span>
          <input name="name" value={values.name} onChange={handleChange} required maxLength={80} />
        </label>
        <label>
          <span>Descrição</span>
          <input name="description" value={values.description} onChange={handleChange} maxLength={500} />
        </label>
      </div>
      <FormActions submitLabel="Salvar grupo" onCancel={onCancel} />
    </form>
  );
}

export default function GroupsPanel({ slug, onFeedback }) {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [pickedStudent, setPickedStudent] = useState({});
  const { values, handleChange, reset } = useForm({ name: '', description: '' });

  const load = async () => {
    const [groupsRes, participantsRes] = await Promise.all([
      api.get(`/courses/${slug}/groups`),
      api.get(`/courses/${slug}/participants`)
    ]);
    setGroups(groupsRes.data.groups);
    setStudents(participantsRes.data.participants.filter((item) => item.role === 'student'));
  };

  useEffect(() => {
    load()
      .catch((error) => onFeedback({ type: 'error', text: errorText(error) }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const run = async (request, successText) => {
    try {
      const { data } = await request();
      if (data?.groups) setGroups(data.groups);
      if (successText) onFeedback({ type: 'success', text: successText });
      return true;
    } catch (error) {
      onFeedback({ type: 'error', text: errorText(error) });
      return false;
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const ok = await run(() => api.post(`/courses/${slug}/groups`, values), 'Grupo criado.');
    if (ok) reset();
  };

  const handleSave = async (group, values) => {
    const ok = await run(() => api.put(`/courses/${slug}/groups/${group.id}`, values), 'Grupo atualizado.');
    if (ok) setEditingId(null);
  };

  const handleDelete = (group) => {
    if (!window.confirm(`Excluir o grupo "${group.name}"? Os alunos continuam matriculados no curso.`)) return;
    run(() => api.delete(`/courses/${slug}/groups/${group.id}`), 'Grupo excluído.');
  };

  const handleAddMember = async (group) => {
    const userId = pickedStudent[group.id];
    if (!userId) {
      onFeedback({ type: 'error', text: 'Selecione um aluno para adicionar.' });
      return;
    }
    const ok = await run(
      () => api.post(`/courses/${slug}/groups/${group.id}/members`, { userIds: [userId] }),
      'Aluno adicionado ao grupo.'
    );
    if (ok) setPickedStudent((current) => ({ ...current, [group.id]: '' }));
  };

  const handleRemoveMember = (group, member) => {
    run(() => api.delete(`/courses/${slug}/groups/${group.id}/members/${member.id}`), 'Aluno removido do grupo.');
  };

  if (loading) {
    return <p className="muted">Carregando grupos...</p>;
  }

  return (
    <div className="manage-stack">
      <form className="surface-card manage-form" onSubmit={handleCreate}>
        <h2>Novo grupo</h2>
        <div className="form-grid">
          <label>
            <span>Nome do grupo</span>
            <input name="name" value={values.name} onChange={handleChange} required maxLength={80} />
          </label>
          <label>
            <span>Descrição (opcional)</span>
            <input name="description" value={values.description} onChange={handleChange} maxLength={500} />
          </label>
        </div>
        <FormActions submitLabel="Criar grupo" />
      </form>

      {groups.length === 0 && (
        <p className="muted">Nenhum grupo criado. Crie um grupo para organizar equipes ou turmas dentro do curso.</p>
      )}

      {groups.map((group) => {
        const memberIds = new Set(group.members.map((member) => member.id));
        const available = students.filter((student) => !memberIds.has(student.userId));

        return (
          <section key={group.id} className="surface-card">
            <div className="manage-item-header">
              <div>
                <h3>{group.name}</h3>
                {group.description && <p className="muted">{group.description}</p>}
                <span className="muted">{group.members.length} aluno(s)</span>
              </div>
              <div className="manage-item-actions">
                <button type="button" className="ghost-button small" onClick={() => setEditingId(group.id)}>
                  Editar
                </button>
                <button type="button" className="danger-button small" onClick={() => handleDelete(group)}>
                  Excluir grupo
                </button>
              </div>
            </div>

            {editingId === group.id && (
              <GroupEditForm group={group} onSave={(values) => handleSave(group, values)} onCancel={() => setEditingId(null)} />
            )}

            <div className="manage-item-body">
              {group.members.length === 0 && <p className="muted">Nenhum aluno neste grupo.</p>}
              {group.members.map((member) => (
                <div key={member.id} className="manage-row">
                  <div>
                    <strong>{member.name}</strong> <span className="muted manage-url">{member.email}</span>
                  </div>
                  <button type="button" className="danger-button small" onClick={() => handleRemoveMember(group, member)}>
                    Remover do grupo
                  </button>
                </div>
              ))}

              <div className="manage-item-actions manage-add-member">
                <select
                  value={pickedStudent[group.id] || ''}
                  onChange={(event) => setPickedStudent((current) => ({ ...current, [group.id]: event.target.value }))}
                  aria-label={`Aluno para adicionar ao grupo ${group.name}`}
                  disabled={available.length === 0}
                >
                  <option value="">
                    {available.length === 0 ? 'Todos os alunos já estão no grupo' : 'Selecione um aluno matriculado'}
                  </option>
                  {available.map((student) => (
                    <option key={student.userId} value={student.userId}>
                      {student.name} ({student.email})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="primary-button small"
                  onClick={() => handleAddMember(group)}
                  disabled={available.length === 0}
                >
                  Adicionar ao grupo
                </button>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
