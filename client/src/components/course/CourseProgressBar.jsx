const TOM_CLASSE = { primary: '', ok: 'tom-ok', warn: 'tom-warn', danger: 'tom-danger' };

// Barra de progresso fixa no topo do curso. Atualiza a cada aula concluída.
// config (vem do curso): título, se mostra a porcentagem e a contagem, e a cor. Título vazio usa o automático.
export default function CourseProgressBar({ summary, scopeLabel = 'Seu progresso', config = {} }) {
  const { exactPercentage, countedCompleted, countedLessons, completedLessons, totalLessons, passedQuizzes, totalQuizzes, finalProjectDone } = summary;
  // Com poucos itens concluídos, mostra uma casa decimal para o aluno ver o avanço (0,2% em vez de 0%).
  const label = exactPercentage > 0 && exactPercentage < 10 ? exactPercentage.toFixed(1) : Math.round(exactPercentage);
  const titulo = config.titulo || scopeLabel;
  const mostrarPercentual = config.mostrarPercentual !== false;
  const mostrarContagem = config.mostrarContagem !== false;
  const tom = TOM_CLASSE[config.tom] || '';
  return (
    <div className={`course-progress ${tom}`.trim()} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(exactPercentage)} aria-label={titulo}>
      <div className="course-progress-top">
        {mostrarPercentual && <strong className="course-progress-pct">{label}%</strong>}
        <span>{titulo}</span>
        {mostrarContagem && (
          <span className="course-progress-stats">
            {countedCompleted ?? completedLessons}/{countedLessons ?? totalLessons} aulas · {passedQuizzes}/{totalQuizzes} testes{finalProjectDone === null ? '' : finalProjectDone ? ' · projeto entregue' : ' · projeto pendente'}
          </span>
        )}
      </div>
      <div className="course-progress-track">
        <span style={{ width: `${exactPercentage}%` }} />
      </div>
    </div>
  );
}
