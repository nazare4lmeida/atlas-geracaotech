-- Tentativa atual do quiz de cada módulo: respostas da aluna e a correção feita pelo servidor.
create table if not exists quiz_attempts (
  user_id     uuid not null references users (id) on delete cascade,
  section_id  text not null references sections (id) on delete cascade,
  answers     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, section_id)
);
