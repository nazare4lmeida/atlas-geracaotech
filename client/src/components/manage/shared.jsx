// Utilitários compartilhados pelas telas de gestão.

export function errorText(error, fallback = 'Não foi possível concluir a ação.') {
  return error?.response?.data?.message || fallback;
}

export function Feedback({ feedback }) {
  if (!feedback) return null;
  return (
    <div className={`alert ${feedback.type === 'error' ? 'error' : 'success'} manage-feedback`} role="status">
      {feedback.text}
    </div>
  );
}

export function FormActions({ submitLabel, onCancel, disabled = false }) {
  return (
    <div className="editor-actions">
      <button type="submit" className="primary-button small" disabled={disabled}>
        {submitLabel}
      </button>
      {onCancel && (
        <button type="button" className="ghost-button small" onClick={onCancel}>
          Cancelar
        </button>
      )}
    </div>
  );
}
