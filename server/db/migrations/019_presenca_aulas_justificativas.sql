-- Ponto dos professores fica no sistema de ponto (ligação futura por API). Não é guardado no Atlas.
drop table if exists ponto_registros;

-- Aulas por turma: o calendário vem do site do GT (external_id = id da aula no site).
-- Depois que o dia termina, a aula é fechada e os alunos sem marcação ficam ausentes.
alter table attendance_sessions
  add column if not exists external_id text,
  add column if not exists origem text not null default 'atlas' check (origem in ('atlas', 'site')),
  add column if not exists fechada boolean not null default false;

create unique index if not exists attendance_sessions_external_idx
  on attendance_sessions (turma_id, external_id) where external_id is not null;

create index if not exists attendance_sessions_aberta_idx
  on attendance_sessions (fechada, session_date) where turma_id is not null;

-- Origem da marcação e tipo de justificativa aceita (aceita = justificada; abonada = abonada pela gestão).
alter table attendance_records
  add column if not exists origem text not null default 'gestao' check (origem in ('aluno', 'gestao', 'importacao', 'automatico')),
  add column if not exists tipo_justificativa text check (tipo_justificativa in ('aceita', 'abonada')),
  add column if not exists marcado_em timestamptz not null default now();

-- Justificativas de falta enviadas pelo aluno e decididas pela gestão.
create table if not exists attendance_justifications (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references attendance_sessions (id) on delete cascade,
  user_id     uuid not null references users (id) on delete cascade,
  motivo      text not null check (length(trim(motivo)) > 0),
  status      text not null default 'pendente' check (status in ('pendente', 'aceita', 'abonada', 'recusada')),
  resposta    text not null default '',
  decided_by  uuid references users (id) on delete set null,
  decided_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- Só uma justificativa pendente por aluno e aula.
create unique index if not exists attendance_justifications_pendente_idx
  on attendance_justifications (session_id, user_id) where status = 'pendente';

create index if not exists attendance_justifications_status_idx
  on attendance_justifications (status, created_at);

alter table attendance_justifications enable row level security;
