-- Mural da turma: avisos fixos (publicados pela equipe) e dúvidas dos alunos com respostas em linha.
create table if not exists turma_posts (
  id          uuid primary key default gen_random_uuid(),
  turma_id    uuid not null references turmas (id) on delete cascade,
  autor_id    uuid not null references users (id) on delete cascade,
  tipo        text not null default 'duvida' check (tipo in ('aviso', 'duvida')),
  titulo      text not null check (length(trim(titulo)) > 0),
  corpo       text not null default '',
  fixado      boolean not null default false,
  resolvido   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists turma_posts_turma_idx on turma_posts (turma_id, fixado desc, created_at desc);

create table if not exists turma_respostas (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references turma_posts (id) on delete cascade,
  autor_id    uuid not null references users (id) on delete cascade,
  corpo       text not null check (length(trim(corpo)) > 0),
  created_at  timestamptz not null default now()
);

create index if not exists turma_respostas_post_idx on turma_respostas (post_id, created_at);
