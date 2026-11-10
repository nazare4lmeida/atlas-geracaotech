-- Histórico de alterações do curso (quem mudou o quê e quando). Só para a gestão.
create table if not exists course_history (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses (id) on delete cascade,
  user_id     uuid references users (id) on delete set null,
  acao        text not null check (length(trim(acao)) > 0),
  detalhe     text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists course_history_course_idx on course_history (course_id, created_at desc);

-- Mesma política das demais tabelas: RLS ligado, acesso só pelo servidor.
alter table course_history enable row level security;
