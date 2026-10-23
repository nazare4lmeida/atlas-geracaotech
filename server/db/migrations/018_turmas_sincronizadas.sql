-- Turmas são definidas no site do GT e sincronizadas para o Atlas (external_id = código da turma no site).
-- A presença é registrada por turma: cada aula (attendance_sessions) pode pertencer a uma turma.
alter table turmas
  add column if not exists external_id text unique;

alter table attendance_sessions
  add column if not exists turma_id uuid references turmas (id) on delete cascade;

create index if not exists attendance_sessions_turma_idx on attendance_sessions (turma_id, session_date);
