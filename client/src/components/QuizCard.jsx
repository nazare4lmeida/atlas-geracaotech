import { useMemo, useState } from 'react';

export default function QuizCard({ quiz, onSubmit, previousResult }) {
  const [answers, setAnswers] = useState(() => new Array(quiz.length).fill(null));
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    return answers.reduce((total, selected, index) => {
      return total + (selected === quiz[index].answer ? 1 : 0);
    }, 0);
  }, [answers, quiz]);

  const passed = score === quiz.length;

  const handleAnswer = (questionIndex, optionIndex) => {
    setAnswers((current) => {
      const next = [...current];
      next[questionIndex] = optionIndex;
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    onSubmit({
      score,
      total: quiz.length,
      passed
    });
  };

  return (
    <form className="quiz-card" onSubmit={handleSubmit}>
      <div className="section-heading">
        <h3>Quiz do módulo</h3>
        <p>É preciso acertar todas as questões para liberar o certificado.</p>
      </div>

      {quiz.map((question, index) => (
        <div key={question.question} className="quiz-question">
          <h4>{index + 1}. {question.question}</h4>
          <div className="quiz-options">
            {question.options.map((option, optionIndex) => (
              <label key={option} className="quiz-option">
                <input
                  type="radio"
                  name={`question-${index}`}
                  checked={answers[index] === optionIndex}
                  onChange={() => handleAnswer(index, optionIndex)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button type="submit" className="primary-button">
        Enviar respostas
      </button>

      {(submitted || previousResult) && (
        <div className={`quiz-feedback ${(previousResult || { passed }).passed ? 'ok' : 'error'}`}>
          {(previousResult || { passed }).passed
            ? 'Parabéns! Você passou neste quiz.'
            : 'Ainda não foi desta vez. Revise as aulas e tente novamente.'}
        </div>
      )}
    </form>
  );
}
