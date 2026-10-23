import { useState } from 'react';

// Emojis mais usados no atendimento. Clicar insere no fim do texto.
const EMOJIS = ['😀','😊','😉','🙂','😅','😂','🤝','👍','👏','🙏','🎉','✅','❌','⚠️','📌','📎','📄','📅','⏰','🕘','📚','💻','🎓','💼','❤️','👀','❓','❗','💬','📧','🔗','📍'];

export default function EmojiPicker({ onPick, disabled }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="emoji-wrap">
      <button type="button" className="ghost-button small" onClick={() => setAberto(!aberto)} disabled={disabled} aria-expanded={aberto} aria-label="Inserir emoji">😊</button>
      {aberto && (
        <div className="emoji-painel" role="listbox" aria-label="Emojis">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => { onPick(e); setAberto(false); }} aria-label={`Inserir ${e}`}>{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}
