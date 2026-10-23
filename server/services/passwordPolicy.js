// Política de senha do Atlas. Vale para a troca no primeiro acesso, para trocas posteriores e para
// senhas definidas pela gestão. A regra é aplicada no servidor; o cliente só mostra o mesmo checklist.

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

// Senhas comuns e padrões fáceis que não podem ser usados, mesmo cumprindo as regras.
const COMMON = new Set([
  'senha', 'senha123', 'password', 'password1', 'qwerty', 'qwerty123', 'abc123', '123456', '12345678',
  'atlas', 'atlas123', 'geracao', 'geracaotech', 'mudar123', 'trocar123', 'admin', 'admin123'
]);

const ACCENTED = /[À-ÖØ-öø-ÿ]/; // letras latinas com acento (á, ã, ç, é, ô…)
const LOWER = /[a-zà-öø-ÿ]/;
const UPPER = /[A-ZÀ-ÖØ-Þ]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[^A-Za-z0-9À-ÖØ-öø-ÿ\s]/;

// Regras cumpridas por uma senha, para o checklist da tela.
function passwordChecks(password) {
  const value = String(password || '');
  return {
    length: value.length >= MIN_LENGTH && value.length <= MAX_LENGTH,
    upper: UPPER.test(value),
    lower: LOWER.test(value),
    digit: DIGIT.test(value),
    accent: ACCENTED.test(value),
    symbol: SYMBOL.test(value),
    noSpaces: !/\s/.test(value)
  };
}

// Devolve a lista de problemas (vazia quando a senha é aceita).
// `context` evita senhas que contenham o próprio CPF ou o início do e-mail.
function passwordProblems(password, context = {}) {
  const value = String(password || '');
  const checks = passwordChecks(value);
  const problems = [];

  if (!checks.length) problems.push(`Use entre ${MIN_LENGTH} e ${MAX_LENGTH} caracteres.`);
  if (!checks.upper) problems.push('Inclua pelo menos uma letra maiúscula.');
  if (!checks.lower) problems.push('Inclua pelo menos uma letra minúscula.');
  if (!checks.digit) problems.push('Inclua pelo menos um número.');
  if (!checks.accent) problems.push('Inclua pelo menos uma letra com acento (á, ã, ç, é…).');
  if (!checks.symbol) problems.push('Inclua pelo menos um símbolo (ex.: ! @ # $ % &).');
  if (!checks.noSpaces) problems.push('A senha não pode ter espaços.');

  const lowered = value.toLowerCase();
  if (COMMON.has(lowered)) problems.push('Esta senha é comum demais. Escolha outra.');

  const cpfDigits = String(context.cpfDigits || '');
  if (cpfDigits.length === 11 && value.replace(/\D/g, '').includes(cpfDigits)) {
    problems.push('A senha não pode conter o seu CPF.');
  }

  const localPart = String(context.email || '').split('@')[0].toLowerCase();
  if (localPart.length >= 4 && lowered.includes(localPart)) {
    problems.push('A senha não pode conter o início do seu e-mail.');
  }

  return problems;
}

module.exports = { passwordProblems, passwordChecks, MIN_LENGTH, MAX_LENGTH };
