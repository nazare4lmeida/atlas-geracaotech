-- Segurança de acesso, perfil do aluno, lembretes, declarações e presença.
--
-- Segurança: troca obrigatória de senha no primeiro acesso, bloqueio temporário após tentativas
-- erradas, versão do token (senha trocada invalida sessões antigas) e registro de logins.
-- Perfil: avatar escolhido pelo aluno e dados de contato editáveis.
-- Todas as tabelas novas têm RLS habilitado sem políticas (acesso só pelo servidor).

alter table users
  add column if not exists must_change_password boolean not null default false,
  add column if not exists password_changed_at timestamptz,
  add column if not exists failed_login_count integer not null default 0,
  add column if not exists locked_until timestamptz,
  add column if not exists token_version integer not null default 0,
  add column if not exists last_login_at timestamptz,
  add column if not exists avatar text not null default 'avatar-01',
  add column if not exists phone text not null default '',
  add column if not exists city text not null default '',
  add column if not exists state text not null default '';

alter table users
  drop constraint if exists users_state_check,
  add constraint users_state_check check (length(state) <= 2),
  drop constraint if exists users_failed_login_check,
  add constraint users_failed_login_check check (failed_login_count >= 0);

-- Auditoria de logins (sucesso e falha). Não guarda a senha nem o CPF em texto.
create table if not exists login_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users (id) on delete set null,
  identifier  text not null default '',
  ip          text not null default '',
  success     boolean not null,
  reason      text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists login_events_created_idx on login_events (created_at desc);
create index if not exists login_events_user_idx on login_events (user_id, created_at desc);

-- Lembretes pessoais do aluno.
create table if not exists reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  due_date    date,
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reminders_user_idx on reminders (user_id, done, due_date);

-- Pedidos de declaração de matrícula/participação, aprovados pela gestão.
create table if not exists declaration_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users (id) on delete cascade,
  course_id         uuid references courses (id) on delete set null,
  purpose           text not null check (length(trim(purpose)) > 0),
  status            text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  admin_note        text not null default '',
  verification_code text unique,
  requested_at      timestamptz not null default now(),
  decided_at        timestamptz,
  decided_by        uuid references users (id) on delete set null
);

create index if not exists declaration_requests_user_idx on declaration_requests (user_id, requested_at desc);
create index if not exists declaration_requests_status_idx on declaration_requests (status, requested_at);

-- Presença: uma sessão (dia de aula) por curso e um registro por aluno e sessão.
create table if not exists attendance_sessions (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references courses (id) on delete cascade,
  session_date date not null,
  title        text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists attendance_sessions_course_idx on attendance_sessions (course_id, session_date);

create table if not exists attendance_records (
  session_id  uuid not null references attendance_sessions (id) on delete cascade,
  user_id     uuid not null references users (id) on delete cascade,
  status      text not null check (status in ('presente', 'ausente', 'justificado')),
  note        text not null default '',
  recorded_by uuid references users (id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index if not exists attendance_records_user_idx on attendance_records (user_id);

alter table login_events enable row level security;
alter table reminders enable row level security;
alter table declaration_requests enable row level security;
alter table attendance_sessions enable row level security;
alter table attendance_records enable row level security;
