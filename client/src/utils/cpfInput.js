// Máscara de CPF para campos de login. Se o texto digitado não começa com dígitos (ou tem letras/@),
// é tratado como e-mail e não recebe máscara.
export function looksLikeEmail(value) {
  return /[a-zA-Z@]/.test(String(value || ''));
}

export function formatCpfInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// Entrada do login: CPF com máscara enquanto digita números; e-mail do jeito que foi digitado.
export function maskIdentifier(value) {
  if (looksLikeEmail(value)) return value;
  return formatCpfInput(value);
}
