-- Mural: a conversa pode ser de uma turma ou de um grupo de curso (turma e grupo são o mesmo espaço para o aluno).
alter table turma_posts alter column turma_id drop not null;
alter table turma_posts add column if not exists grupo_id uuid references course_groups (id) on delete cascade;
alter table turma_posts drop constraint if exists turma_posts_espaco_check;
alter table turma_posts add constraint turma_posts_espaco_check check ((turma_id is not null) <> (grupo_id is not null));
create index if not exists turma_posts_grupo_idx on turma_posts (grupo_id, fixado desc, created_at desc);

-- Fórum: conversa aberta pelos alunos (antes "dúvida"). Avisos continuam só da equipe.
alter table turma_posts drop constraint if exists turma_posts_tipo_check;
update turma_posts set tipo = 'forum' where tipo = 'duvida';
alter table turma_posts alter column tipo set default 'forum';
alter table turma_posts add constraint turma_posts_tipo_check check (tipo in ('aviso', 'forum'));

-- Ocultação pela moderação (o conteúdo some para os alunos, mas fica registrado).
alter table turma_posts add column if not exists ocultado boolean not null default false;
alter table turma_respostas add column if not exists ocultada boolean not null default false;

-- Denúncias feitas pelos participantes e decididas pela moderação.
create table if not exists mural_denuncias (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid references turma_posts (id) on delete cascade,
  resposta_id   uuid references turma_respostas (id) on delete cascade,
  autor_id      uuid not null references users (id) on delete cascade,
  motivo        text not null default '' check (length(motivo) <= 300),
  status        text not null default 'pendente' check (status in ('pendente', 'resolvida')),
  decisao       text check (decisao in ('manter', 'ocultar', 'expulsar')),
  decidida_por  uuid references users (id) on delete set null,
  decidida_em   timestamptz,
  created_at    timestamptz not null default now(),
  check ((post_id is not null) <> (resposta_id is not null))
);

create index if not exists mural_denuncias_status_idx on mural_denuncias (status, created_at);

-- Palavras bloqueadas no fórum (a administração edita a lista).
create table if not exists mural_palavras (
  palavra     text primary key check (length(trim(palavra)) between 2 and 40),
  created_at  timestamptz not null default now()
);

-- Registro das expulsões do curso (quem, de qual curso, quem decidiu e o motivo).
create table if not exists mural_expulsoes (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses (id) on delete cascade,
  user_id     uuid not null references users (id) on delete cascade,
  motivo      text not null default '',
  por_id      uuid references users (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table mural_denuncias enable row level security;
alter table mural_palavras enable row level security;
alter table mural_expulsoes enable row level security;
