-- Emissão pela gestão: dois modelos por curso (conclusão e participação), data de liberação,
-- tipo do certificado emitido e solicitações feitas pela aluna.
alter table courses
  add column if not exists certificate_participacao_template_id uuid references certificate_templates (id) on delete set null,
  add column if not exists certificate_release_at timestamptz;

alter table certificates
  add column if not exists tipo text not null default 'conclusao' check (tipo in ('conclusao', 'participacao'));

create table if not exists certificate_requests (
  user_id      uuid not null references users (id) on delete cascade,
  course_id    uuid not null references courses (id) on delete cascade,
  requested_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
