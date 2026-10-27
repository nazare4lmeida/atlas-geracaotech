import { useAuth } from '../context/AuthContext';
import { answerInlineQuiz, looksLikeHtml, personalizeText, sanitizeLessonHtml } from '../utils/lessonHtml';
import '../styles/aulas-blocos.css';

// Exibe o conteúdo de uma aula. Texto simples continua como texto; HTML é limpo e exibido no layout do curso.
export default function LessonBody({ content, modelo = 'original' }) {
  const { user } = useAuth();
  const name = user?.name || '';

  if (!content) return null;

  if (looksLikeHtml(content)) {
    // Quizzes embutidos respondem ao clique (delegação: o HTML é inserido direto).
    const onClick = (event) => {
      const option = event.target.closest?.('button[data-quiz-target]');
      if (option) answerInlineQuiz(option);
    };
    return (
      <div
        className="lesson-content lesson-html"
        onClick={onClick}
        dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(content, { name, modelo }) }}
      />
    );
  }

  return <p className="lesson-content lesson-text">{personalizeText(content, { name })}</p>;
}
