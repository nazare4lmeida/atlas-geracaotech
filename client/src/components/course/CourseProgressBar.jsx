// Barra de progresso fixa no topo do curso. Atualiza a cada aula concluída.
export default function CourseProgressBar({ summary, scopeLabel = 'Seu progresso' }) {
  const { exactPercentage, completedLessons, totalLessons, passedQuizzes, totalQuizzes, finalProjectDone } = summary;
  // Com poucos itens concluídos, mostra uma casa decimal para o aluno ver o avanço (0,2% em vez de 0%).
  const label = exactPercentage > 0 && exactPercentage < 10 ? exactPercentage.toFixed(1) : Math.round(exactPercentage);
  return (
    <div className="course-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(exactPercentage)} aria-label="Seu progresso no curso">
      <div className="course-progress-top">
        <strong className="course-progress-pct">{label}%</strong>
        <span>{scopeLabel}</span>
        <span className="course-progress-stats">
          {completedLessons}/{totalLessons} aulas · {passedQuizzes}/{totalQuizzes} testes{finalProjectDone === null ? '' : finalProjectDone ? ' · projeto entregue' : ' · projeto pendente'}
        </span>
      </div>
      <div className="course-progress-track">
        <span style={{ width: `${exactPercentage}%` }} />
      </div>
    </div>
  );
}
