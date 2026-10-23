-- Projetos da formação. Uma formação pode ter vários projetos (ex.: Fullstack tem o projeto de front-end e o de back-end).
--
-- Regras (ver docs/FORMACOES-BLOCOS.md):
--   - Conclusão exige a entrega de todos os projetos da formação.
--   - Sem a entrega de algum projeto, a aluna só chega à participação fazendo a prova de recuperação.
--   - Os projetos são independentes dos blocos. block_id só indica onde o projeto aparece na trilha.
--
-- Substitui course_progress.final_project_completed (boolean único) por entregas registradas por projeto.
-- A coluna antiga continua existindo para não perder dados; o backfill abaixo copia os valores.

create table if not exists course_projects (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references courses (id) on delete cascade,
  block_id     uuid references course_blocks (id) on delete set null,
  position     integer not null check (position >= 0),
  title        text not null check (length(trim(title)) > 0),
  description  text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint course_projects_position_unique unique (course_id, position) deferrable initially deferred
);

create index if not exists course_projects_course_idx on course_projects (course_id);

create table if not exists project_deliveries (
  project_id   uuid not null references course_projects (id) on delete cascade,
  user_id      uuid not null references users (id) on delete cascade,
  delivered_at timestamptz not null default now(),
  delivered_by uuid references users (id) on delete set null,
  primary key (project_id, user_id)
);

create index if not exists project_deliveries_user_idx on project_deliveries (user_id);

-- Backfill: cada formação que já tinha projeto final cadastrado vira um projeto na posição 0.
insert into course_projects (course_id, position, title, description)
select c.id, 0,
       coalesce(nullif(trim(c.final_project_title), ''), 'Projeto final'),
       c.final_project_description
from courses c
where (nullif(trim(c.final_project_title), '') is not null or nullif(trim(c.final_project_description), '') is not null)
  and not exists (select 1 from course_projects p where p.course_id = c.id);

-- Entregas antigas (marcadas como concluídas) passam para o projeto de posição 0.
insert into project_deliveries (project_id, user_id)
select p.id, cp.user_id
from course_progress cp
join course_projects p on p.course_id = cp.course_id and p.position = 0
where cp.final_project_completed
on conflict (project_id, user_id) do nothing;

alter table course_projects enable row level security;
alter table project_deliveries enable row level security;
