import { useCallback, useEffect, useState } from 'react';
import useForm from '../../hooks/useForm';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FormActions, errorText } from './shared';

// Participantes do curso (matrículas e papéis no curso) com o relatório de progresso.
export default function ParticipantsPanel({ slug, onFeedback }) {
  const { isAdmin } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { values, handleChange, reset } = useForm({ email: '', role: 'student' });

  const load = useCallback(async () => {
    const { data } = await api.get(`/courses/${slug}/participants`);
    setParticipants(data.participants);
  }, [slug]);

  useEffect(() => {
    load()
      .catch((error) => onFeedback({ type: 'error', text: errorText(error) }))
      .finally(() => setLoading(false));
  }, [load]);

  // Executa a ação, mostra o resultado e recarrega a lista.
  const run = async (request, successText) => {
    try {
      await request();
      if (successText) onFeedback({ type: 'success', text: successText });
      await load();
      return true;
    } catch (error) {
      onFeedback({ type: 'error', text: errorText(error) });
      return false;
    }
  };

  const handleEnrol = async (event) => {
    event.preventDefault();
    const ok = await run(
      () => api.post(`/courses/${slug}/participants`, { email: values.email, role: values.role }),
      'Participante inscrito.'
    );
    if (ok) reset();
  };

  const changeRole = (participant, role) =>
    run(() => api.patch(`/courses/${slug}/participants/${participant.userId}`, { role }), 'Papel atualizado.');

  const toggleSuspension = (participant) =>
    run(
      () =>
        api.patch(`/courses/${slug}/participants/${participant.userId}`, {
          status: participant.status === 'active' ? 'suspended' : 'active'
        }),
      participant.status === 'active' ? 'Matrícula suspensa.' : 'Matrícula reativada.'
    );

  const removeParticipant = (participant) => {
    if (!window.confirm(`Remover ${participant.name} deste curso? O progresso dele é mantido, mas ele sai dos grupos.`)) return;
    run(() => api.delete(`/courses/${slug}/participants/${participant.userId}`), 'Participante removido.');
  };

  const students = participants.filter((item) => item.role === 'student');
  const teachers = participants.filter((item) => item.role === 'teacher');

  return (
    <div className="manage-stack">
      <form className="surface-card manage-form" onSubmit={handleEnrol}>
        <h2>Inscrever participante</h2>
        <p className="muted">
          Informe o e-mail de uma conta já cadastrada. Para ser docente de um curso, a conta precisa ter papel de professor
          {isAdmin ? '' : ' (somente administradores atribuem o papel de docente)'}.
        </p>
        <div className="form-grid">
          <label>
            <span>E-mail da conta</span>
            <input name="email" type="email" value={values.email} onChange={handleChange} required />
          </label>
          <label>
            <span>Papel no curso</span>
            <select name="role" value={values.role} onChange={handleChange}>
              <option value="student">Aluno</option>
              {isAdmin && <option value="teacher">Docente</option>}
            </select>
          </label>
        </div>
        <FormActions submitLabel="Inscrever" />
      </form>

      <section className="surface-card">
        <div className="section-heading">
          <h2>Participantes</h2>
          <p>
            {students.length} aluno(s) e {teachers.length} docente(s). O progresso mostra o que o aluno já concluiu no curso.
          </p>
        </div>

        {loading ? (
          <p className="muted">Carregando participantes...</p>
        ) : participants.length === 0 ? (
          <p className="muted">Nenhum participante inscrito.</p>
        ) : (
          <div className="table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Papel no curso</th>
                  <th>Situação</th>
                  <th>Progresso</th>
                  <th>Grupos</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant) => (
                  <tr key={participant.userId}>
                    <td>
                      <strong>{participant.name}</strong>
                      <div className="muted manage-url">{participant.email}</div>
                      {!participant.active && <span className="badge hidden">Conta desativada</span>}
                    </td>
                    <td>
                      <select
                        value={participant.role}
                        onChange={(event) => changeRole(participant, event.target.value)}
                        disabled={!isAdmin && participant.role === 'teacher'}
                        aria-label={`Papel de ${participant.name}`}
                      >
                        <option value="student">Aluno</option>
                        <option value="teacher" disabled={!isAdmin}>Docente</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${participant.status === 'active' ? '' : 'hidden'}`}>
                        {participant.status === 'active' ? 'Ativa' : 'Suspensa'}
                      </span>
                    </td>
                    <td>
                      {participant.progress ? (
                        <div className="manage-progress">
                          <strong>{participant.progress.percentage}%</strong>
                          <span className="muted">
                            {participant.progress.completedLessons}/{participant.progress.totalLessons} aulas ·{' '}
                            {participant.progress.passedQuizzes}/{participant.progress.totalQuizzes} testes ·{' '}
                            projeto {participant.progress.finalProjectDone ? 'entregue' : 'pendente'}
                          </span>
                          {participant.progress.certificateEligible && <span className="badge">Apto a certificado</span>}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {participant.groups.length === 0
                        ? <span className="muted">Sem grupo</span>
                        : participant.groups.map((group) => (
                            <span key={group.id} className="tag">{group.name}</span>
                          ))}
                    </td>
                    <td>
                      <div className="manage-item-actions">
                        {participant.role === 'student' && (
                          <button type="button" className="ghost-button small" onClick={() => toggleSuspension(participant)}>
                            {participant.status === 'active' ? 'Suspender' : 'Reativar'}
                          </button>
                        )}
                        <button type="button" className="danger-button small" onClick={() => removeParticipant(participant)}>
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
