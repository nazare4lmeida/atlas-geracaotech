-- Feedback do quiz: explicação geral e explicação por alternativa (mostradas logo após a resposta).
alter table quiz_questions
  add column if not exists explanation text not null default '',
  add column if not exists option_feedback jsonb not null default '[]'::jsonb;
