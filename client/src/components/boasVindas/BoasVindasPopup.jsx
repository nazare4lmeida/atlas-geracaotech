import { useState } from 'react';
import api from '../../services/api';
import Icon from '../Icon';

// Boas-vindas do primeiro acesso do aluno: explica em poucos passos como usar o Atlas.
// Fechar (ou "Entendi") marca como visto na conta, então não aparece de novo em outro navegador.
const PASSOS = [
  { titulo: 'Marque sua presença', texto: 'No dia da aula, marque sua presença até 23h59. Ao entrar, o Atlas mostra as aulas de hoje.' },
  { titulo: 'Justifique faltas', texto: 'Em "Minha presença", envie a justificativa de uma falta. A gestão analisa e responde.' },
  { titulo: 'Acompanhe seus cursos', texto: 'Em "Cursos" você vê as trilhas, os módulos e o seu progresso.' },
  { titulo: 'Certificado e declarações', texto: 'O certificado é emitido pela gestão quando você conclui o curso. A declaração de matrícula você gera na hora, em PDF, pela sua área.' }
];

export default function BoasVindasPopup({ userName, onClose }) {
  const [saving, setSaving] = useState(false);

  const fechar = async () => {
    setSaving(true);
    try {
      await api.post('/me/boas-vindas');
    } catch (error) {
      // Se falhar, o pop-up fecha assim mesmo; ele pode reaparecer no próximo acesso.
    } finally {
      onClose();
    }
  };

  const primeiroNome = (userName || '').split(' ')[0];

  return (
    <div className="modal-backdrop presenca-backdrop" role="dialog" aria-modal="true" aria-labelledby="boas-vindas-title">
      <div className="modal-card presenca-popup boas-vindas-popup">
        <div className="presenca-popup-head">
          <h2 id="boas-vindas-title">Bem-vinda(o){primeiroNome ? `, ${primeiroNome}` : ''}!</h2>
          <button type="button" className="icon-button" onClick={fechar} aria-label="Fechar" disabled={saving}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="presenca-popup-text">Este é o Atlas, sua área do Geração Tech. Veja os principais pontos:</p>
        <ol className="boas-vindas-passos">
          {PASSOS.map((passo) => (
            <li key={passo.titulo}>
              <strong>{passo.titulo}</strong>
              <span>{passo.texto}</span>
            </li>
          ))}
        </ol>
        <div className="presenca-popup-actions">
          <button type="button" className="primary-button small" onClick={fechar} disabled={saving}>
            {saving ? 'Salvando...' : 'Entendi'}
          </button>
        </div>
      </div>
    </div>
  );
}
