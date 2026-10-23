-- Blocos (fases) dentro de uma formação (curso).
--
-- Hierarquia após esta migração:
--   courses (formação)  →  course_blocks (blocos / fases)  →  sections (módulos / unidades)  →  lessons + quiz
--
-- Regras de negócio (ver docs/FORMACOES-BLOCOS.md):
--   - Não há certificado por bloco. Bloco concluído gera selo/conquista na interface.
--   - Blocos com unlock_mode = 'sequential' liberam em ordem: o bloco n só abre quando o n-1 está concluído.
--   - Blocos com unlock_mode = 'open' ficam sempre liberados (avisos, apresentação, arquivos de apoio).
--   - A liberação de certificados (certificate_release_at, em courses) é a data final da formação.
--
-- Esta migração só cria a estrutura. Nenhum dado é alterado: sections.block_id começa nulo,
-- e o curso continua funcionando como antes até os blocos serem preenchidos.

create table if not exists course_blocks (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references courses (id) on delete cascade,
  position        integer not null check (position >= 0),
  title           text not null check (length(trim(title)) > 0),
  description     text not null default '',
  workload_hours  integer not null default 0 check (workload_hours >= 0),
  starts_at       date,
  ends_at         date,
  visible         boolean not null default true,
  unlock_mode     text not null default 'sequential' check (unlock_mode in ('sequential', 'open')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint course_blocks_position_unique unique (course_id, position) deferrable initially deferred,
  constraint course_blocks_dates_order check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create index if not exists course_blocks_course_idx on course_blocks (course_id);

-- Módulos (sections) passam a pertencer a um bloco. Nulo = módulo solto (compatibilidade com cursos atuais).
alter table sections
  add column if not exists block_id uuid references course_blocks (id) on delete set null,
  add column if not exists kind text not null default 'modulo' check (kind in ('modulo', 'recuperacao'));

create index if not exists sections_block_idx on sections (block_id);

-- Só pode existir uma prova de recuperação por curso. Ela não entra no progresso de bloco;
-- serve apenas para emitir participação quando o projeto final não foi entregue.
create unique index if not exists sections_one_recovery_per_course
  on sections (course_id) where kind = 'recuperacao';

-- Mesma política das demais tabelas: RLS ligado, sem políticas (acesso só pelo servidor).
alter table course_blocks enable row level security;
