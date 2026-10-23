// Mesmas regras de services/passwordPolicy.js do servidor (o servidor é quem decide; aqui é o checklist).
const ACCENTED = /[À-ÖØ-öø-ÿ]/;
const LOWER = /[a-zà-öø-ÿ]/;
const UPPER = /[A-ZÀ-ÖØ-Þ]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[^A-Za-z0-9À-ÖØ-öø-ÿ\s]/;

export const PASSWORD_RULES = [
  { key: 'length', label: 'Entre 8 e 128 caracteres', test: (v) => v.length >= 8 && v.length <= 128 },
  { key: 'upper', label: 'Uma letra maiúscula', test: (v) => UPPER.test(v) },
  { key: 'lower', label: 'Uma letra minúscula', test: (v) => LOWER.test(v) },
  { key: 'digit', label: 'Um número', test: (v) => DIGIT.test(v) },
  { key: 'accent', label: 'Uma letra com acento (á, ã, ç, é…)', test: (v) => ACCENTED.test(v) },
  { key: 'symbol', label: 'Um símbolo (! @ # $ % &…)', test: (v) => SYMBOL.test(v) },
  { key: 'noSpaces', label: 'Sem espaços', test: (v) => !/\s/.test(v) }
];

export function passwordRuleStatus(value) {
  const text = String(value || '');
  return PASSWORD_RULES.map((rule) => ({ key: rule.key, label: rule.label, ok: rule.test(text) }));
}

export function passwordIsStrong(value) {
  return passwordRuleStatus(value).every((rule) => rule.ok);
}
