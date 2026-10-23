-- Dados da aula que o site do GT informa (horário, módulo e professor). Vazios enquanto o site não enviar.
alter table attendance_sessions
  add column if not exists horario text not null default '',
  add column if not exists modulo text not null default '',
  add column if not exists professor text not null default '';
