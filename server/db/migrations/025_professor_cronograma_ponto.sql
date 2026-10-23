-- Portabilidade do cronograma do GT para o Atlas, vínculo professor–turma, ponto do professor e arquivos.

-- Aulas: status (ativa ou cancelada, mantendo o histórico), tipo (regular ou extra) e professor da aula.
alter table attendance_sessions
  add column if not exists status_aula text not null default 'ativa' check (status_aula in ('ativa', 'cancelada')),
  add column if not exists tipo text not null default 'regular' check (tipo in ('regular', 'extra')),
  add column if not exists professor_id uuid references users (id) on delete set null;

-- Quem ministra a turma (um ou mais professores).
create table if not exists turma_professores (
  turma_id   uuid not null references turmas (id) on delete cascade,
  user_id    uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (turma_id, user_id)
);
create index if not exists turma_professores_user_idx on turma_professores (user_id);

-- Ponto do professor: entrada e saída por aula regular ou aula extra. Sem GPS.
create table if not exists ponto_professor (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  turma_id    uuid references turmas (id) on delete set null,
  session_id  uuid references attendance_sessions (id) on delete set null,
  data        date not null,
  tipo        text not null default 'aula' check (tipo in ('aula', 'extra')),
  entrada     timestamptz,
  saida       timestamptz,
  observacao  text not null default '',
  origem      text not null default 'professor' check (origem in ('professor', 'gestao')),
  corrigido   boolean not null default false,
  criado_em   timestamptz not null default now(),
  check (entrada is not null or saida is not null)
);
create index if not exists ponto_professor_user_data_idx on ponto_professor (user_id, data);

-- Arquivos que o professor guarda no próprio perfil (imagem ou PDF, até 2 MB).
create table if not exists professor_arquivos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  nome        text not null,
  tipo        text not null,
  tamanho     integer not null,
  dados       text not null,
  criado_em   timestamptz not null default now()
);
create index if not exists professor_arquivos_user_idx on professor_arquivos (user_id);

alter table turma_professores enable row level security;
alter table ponto_professor enable row level security;
alter table professor_arquivos enable row level security;
