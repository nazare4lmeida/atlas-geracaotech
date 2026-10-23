-- Operação do Geração Tech dentro do Atlas. Começa depois da aprovação no site do GT:
-- o site envia cada aluno aprovado e matriculado (API de integração). O Atlas cria a conta,
-- a matrícula na trilha, a turma, a presença e a equipe. Termos assinados no site ficam
-- anexados aqui apenas para conferência. Inscrições, documentos e testes ficam no site.
-- Dados pessoais: CPF criptografado (cpf_encrypted) e indexado por hash (cpf_hash).

create table if not exists sedes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (length(trim(nome)) > 0),
  cidade      text not null default '',
  uf          text not null default '' check (length(uf) <= 2),
  endereco    text not null default '',
  ativa       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Vagas por curso, sede e turno. Não pode haver mais vagas ocupadas do que o total.
create table if not exists vagas (
  id                  uuid primary key default gen_random_uuid(),
  curso_id            uuid not null references courses (id) on delete cascade,
  sede_id             uuid not null references sedes (id) on delete cascade,
  turno               text not null check (length(trim(turno)) > 0),
  vagas_total         integer not null check (vagas_total >= 0),
  vagas_disponiveis   integer not null check (vagas_disponiveis >= 0),
  created_at          timestamptz not null default now(),
  constraint vagas_nao_excede check (vagas_disponiveis <= vagas_total),
  unique (curso_id, sede_id, turno)
);

-- Matrículas: alunos aprovados e matriculados no site do GT, recebidos pela API.
-- Cada matrícula tem uma conta de aluno (user_id) e uma matrícula na trilha (enrollments).
create table if not exists matriculas (
  id                uuid primary key default gen_random_uuid(),
  external_id       text unique,
  cpf_encrypted     text not null,
  cpf_hash          text not null unique,
  cpf_last2         text not null default '',
  nome              text not null check (length(trim(nome)) > 0),
  email             text not null,
  telefone          text not null default '',
  curso_id          uuid not null references courses (id) on delete restrict,
  modalidade        text not null default 'Online' check (modalidade in ('Online', 'Presencial')),
  sede_id           uuid references sedes (id) on delete set null,
  turno             text not null default '',
  situacao          text not null default 'ativo' check (situacao in ('ativo', 'desistente', 'removido', 'concluido')),
  data_matricula    date not null default current_date,
  user_id           uuid unique references users (id) on delete set null,
  data_atualizacao  timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index if not exists matriculas_curso_idx on matriculas (curso_id, situacao);

-- Termos assinados no site (matrícula e aditivo). Guardam só o link e a data, para conferência.
create table if not exists matricula_termos (
  id               uuid primary key default gen_random_uuid(),
  matricula_id     uuid not null references matriculas (id) on delete cascade,
  tipo             text not null default 'matricula' check (tipo in ('matricula', 'aditivo')),
  numero           integer not null default 1,
  link             text not null default '',
  data_assinatura  date,
  created_at       timestamptz not null default now(),
  unique (matricula_id, tipo, numero)
);

-- Turmas: grupo de alunos de um curso, com sede/turno e horário.
create table if not exists turmas (
  id            uuid primary key default gen_random_uuid(),
  curso_id      uuid not null references courses (id) on delete cascade,
  sede_id       uuid references sedes (id) on delete set null,
  nome          text not null check (length(trim(nome)) > 0),
  modalidade    text not null default 'Online' check (modalidade in ('Online', 'Presencial')),
  turno         text not null default '',
  dias_semana   text not null default '',
  horario       text not null default '',
  data_inicio   date,
  data_fim      date,
  ativa         boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists turma_alunos (
  turma_id      uuid not null references turmas (id) on delete cascade,
  matricula_id  uuid not null references matriculas (id) on delete cascade,
  situacao      text not null default 'ativo' check (situacao in ('ativo', 'removido')),
  created_at    timestamptz not null default now(),
  primary key (turma_id, matricula_id)
);

-- Equipe: professores e monitores. Podem ter conta no Atlas (user_id) para ver a própria presença.
create table if not exists equipe (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references users (id) on delete set null,
  nome        text not null check (length(trim(nome)) > 0),
  email       text not null default '',
  telefone    text not null default '',
  funcao      text not null default 'monitor' check (funcao in ('professor', 'monitor')),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists turma_equipe (
  turma_id    uuid not null references turmas (id) on delete cascade,
  equipe_id   uuid not null references equipe (id) on delete cascade,
  primary key (turma_id, equipe_id)
);

-- Ponto dos professores e monitores: um registro por dia e pessoa.
create table if not exists ponto_registros (
  id          uuid primary key default gen_random_uuid(),
  equipe_id   uuid not null references equipe (id) on delete cascade,
  data        date not null,
  entrada     time,
  saida       time,
  observacao  text not null default '',
  created_at  timestamptz not null default now(),
  unique (equipe_id, data)
);

-- Integrações: quem pode chamar a API (ex.: site do GT). Só o hash da chave é guardado.
create table if not exists integracao_clientes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(trim(nome)) > 0),
  chave_hash    text not null unique,
  ativo         boolean not null default true,
  ultimo_uso    timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists integracao_eventos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references integracao_clientes (id) on delete set null,
  tipo        text not null,
  referencia  text not null default '',
  sucesso     boolean not null,
  mensagem    text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists integracao_eventos_idx on integracao_eventos (created_at desc);

alter table sedes enable row level security;
alter table vagas enable row level security;
alter table matriculas enable row level security;
alter table matricula_termos enable row level security;
alter table turmas enable row level security;
alter table turma_alunos enable row level security;
alter table equipe enable row level security;
alter table turma_equipe enable row level security;
alter table ponto_registros enable row level security;
alter table integracao_clientes enable row level security;
alter table integracao_eventos enable row level security;
