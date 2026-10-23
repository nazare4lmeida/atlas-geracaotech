import { useEffect } from 'react';

// Janela de boas-vindas mostrada na primeira vez que o aluno abre o curso. Também pode ser reaberta.
export default function WelcomeModal({ firstName, courseTitle, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="welcome-backdrop" onClick={onClose}>
      <div className="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title" onClick={(event) => event.stopPropagation()}>
        <p className="eyebrow">Bem-vindo(a) ao curso</p>
        <h2 id="welcome-title">{firstName ? `Olá, ${firstName}!` : 'Olá!'}</h2>
        <p className="welcome-lead">Você está em <strong>{courseTitle}</strong>. Veja rapidamente como a sala funciona:</p>

        <ol className="welcome-steps">
          <li>
            <strong>Conteúdo à esquerda.</strong> Módulos, unidades e aulas. Clique em qualquer item para ir até ele.
          </li>
          <li>
            <strong>Abrir e fechar.</strong> Cada módulo, unidade e aula se recolhe com um clique no título. Assim fica na tela só o que você está estudando.
          </li>
          <li>
            <strong>Marcar como concluída.</strong> Ao terminar uma aula, marque. A barra de progresso no topo atualiza na hora.
          </li>
          <li>
            <strong>Testes e projeto.</strong> Cada módulo tem um teste no fim. O projeto final e o certificado ficam ao final do curso.
          </li>
          <li>
            <strong>Mais espaço.</strong> Use o botão « no menu da esquerda para recolhê-lo e ler com mais largura.
          </li>
        </ol>

        <div className="welcome-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            Começar o curso
          </button>
        </div>
      </div>
    </div>
  );
}
