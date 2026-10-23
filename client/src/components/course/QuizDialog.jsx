import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { errorText } from '../manage/shared';

const LETTERS = 'ABCDEFGHIJ';

// Quiz do módulo em pop-up. Cada resposta é corrigida na hora: a correta fica verde, a errada vermelha,
// e o aluno vê por que errou (feedback da alternativa) e a explicação da questão.
// Quiz do módulo em pop-up. A correção vem do servidor: cada resposta é conferida na hora
// (a correta fica verde, a errada vermelha), com o feedback da alternativa e a explicação.
export default function QuizDialog({ quiz, moduleTitle, previousResult, loadAttempt, onAnswer, onRetry, onClose }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showResult, setShowResult] = useState(false);

  const total = quiz.length;
  const answeredCount = quiz.filter((question) => answers[question.id]).length;
  const finished = total > 0 && answeredCount === total;
  const score = quiz.filter((question) => answers[question.id]?.correct).length;
  const passed = finished && score === total;

  const current = quiz[index];
  const feedback = current ? answers[current.id] : null;

  useEffect(() => {
    let active = true;
    loadAttempt()
      .then((data) => active && setAnswers(data.answers || {}))
      .catch((err) => active && setError(errorText(err, 'Não foi possível carregar o quiz.')))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const choose = async (optionIndex) => {
    if (feedback || busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await onAnswer(current.id, optionIndex);
      setAnswers(data.answers || {});
    } catch (err) {
      setError(errorText(err, 'Não foi possível registrar a resposta. Tente de novo.'));
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => {
    if (index < total - 1) {
      setIndex(index + 1);
      return;
    }
    setShowResult(true);
  };

  const retry = async () => {
    setError('');
    try {
      await onRetry();
      setAnswers({});
      setIndex(0);
      setShowResult(false);
    } catch (err) {
      setError(errorText(err, 'Não foi possível reiniciar o quiz.'));
    }
  };

  const feedbackFor = (optionIndex) => (feedback?.optionFeedback || [])[optionIndex] || '';

  return createPortal(
    <div className="quiz-backdrop" onClick={onClose}>
      <div className="quiz-dialog" role="dialog" aria-modal="true" aria-label={`Quiz: ${moduleTitle}`} onClick={(event) => event.stopPropagation()}>
        <header className="quiz-dialog-head">
          <div>
            <p className="quiz-kicker">Quiz do módulo</p>
            <h2>{moduleTitle}</h2>
          </div>
          <button type="button" className="quiz-close" onClick={onClose} aria-label="Fechar quiz">
            <Icon name="close" size={16} />
          </button>
        </header>

        {!ready && <p className="quiz-lead">Carregando quiz…</p>}
        {error && <div className="alert error">{error}</div>}

        {ready && showResult && finished ? (
          <div className="quiz-result">
            <p className="quiz-score">{score}/{total}</p>
            <h3>{passed ? 'Você acertou tudo!' : 'Ainda não foi desta vez'}</h3>
            <p className="quiz-lead">
              {passed
                ? 'Módulo aprovado. Você pode seguir para a próxima seção.'
                : 'Revise as explicações das questões que errou e tente de novo.'}
            </p>
            <div className="quiz-dialog-actions">
              {!passed && (
                <button type="button" className="primary-button" onClick={retry}>
                  Refazer o quiz
                </button>
              )}
              <button type="button" className="ghost-button" onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        ) : ready && current ? (
          <>
            <div className="quiz-progress">
              <span>Questão {index + 1} de {total}</span>
              <div className="quiz-progress-track">
                <span style={{ width: `${((index + (feedback ? 1 : 0)) / total) * 100}%` }} />
              </div>
            </div>

            <h3 className="quiz-question">{current.question}</h3>

            <div className="quiz-choices">
              {current.options.map((option, optionIndex) => {
                const isCorrect = feedback && optionIndex === feedback.correctIndex;
                const isPicked = feedback && feedback.option === optionIndex;
                let state = '';
                if (feedback && isCorrect) state = 'is-correct';
                else if (feedback && isPicked) state = 'is-wrong';
                return (
                  <button
                    key={`${option}-${optionIndex}`}
                    type="button"
                    className={`quiz-choice ${state}`}
                    onClick={() => choose(optionIndex)}
                    disabled={Boolean(feedback) || busy}
                  >
                    <span className="quiz-letter">{LETTERS[optionIndex]}</span>
                    <span className="quiz-choice-text">{option}</span>
                    {feedback && isCorrect && <span className="quiz-mark">Correta</span>}
                    {feedback && isPicked && !isCorrect && <span className="quiz-mark">Sua resposta</span>}
                  </button>
                );
              })}
            </div>

            {feedback && (
              <div className={`quiz-feedback-box ${feedback.correct ? 'is-correct' : 'is-wrong'}`} role="status">
                <strong>{feedback.correct ? 'Isso mesmo!' : 'Não é essa.'}</strong>
                {feedbackFor(feedback.option) && <p>{feedbackFor(feedback.option)}</p>}
                {feedback.explanation && <p className="quiz-explanation">{feedback.explanation}</p>}
              </div>
            )}

            <div className="quiz-dialog-actions">
              {previousResult?.passed && !feedback && index === 0 && (
                <span className="quiz-note">Você já foi aprovado neste quiz.</span>
              )}
              <button type="button" className="primary-button" onClick={goNext} disabled={!feedback}>
                {index < total - 1 ? 'Próxima questão' : 'Ver resultado'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
