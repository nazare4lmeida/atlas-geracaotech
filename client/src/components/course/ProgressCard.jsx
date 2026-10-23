// Card padrão da biblioteca: usado para cursos, módulos e unidades. Mesmo markup e mesmas classes em todos.
// `action` é um elemento (link ou botão) que vai no rodapé, à direita.
export default function ProgressCard({ accent, level, badge, title, description, percentage, footer, action }) {
  return (
    <article className="course-card" style={{ '--accent': accent }}>
      <div className="course-card-top">
        <span className="course-level">{level}</span>
        <span className="course-badge">{badge}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="progress-block">
        <div className="progress-meta">
          <span>Progresso</span>
          <strong>{percentage}%</strong>
        </div>
        <div className="progress-bar">
          <span style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <div className="card-footer">
        <span>{footer}</span>
        {action}
      </div>
    </article>
  );
}
