-- Atlas - Geração Tech — esquema inicial (PostgreSQL / Supabase)
--
-- Compatível com o banco do Supabase. Todas as tabelas têm RLS habilitado SEM políticas:
-- a chave pública (anon) e a chave authenticated da API automática do Supabase não
-- conseguem ler nem escrever. O servidor acessa o banco pela conexão direta (DATABASE_URL),
-- que pertence ao papel "postgres" e ignora RLS.

-- ---------- Usuários e contas ----------

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) > 0),
  email         text not null unique check (email = lower(email)),
  password_hash text not null,
  role          text not null default 'student' check (role in ('admin', 'teacher', 'student')),
  active        boolean not null default true,
  career_goal   text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- Cursos, seções, recursos e atividades ----------

create table if not exists courses (
  id                          uuid primary key default gen_random_uuid(),
  slug                        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  key                         text not null default '',
  title                       text not null check (length(trim(title)) > 0),
  summary                     text not null default '',
  banner                      text not null default '',
  level                       text not null default 'Iniciante',
  estimated_hours             integer not null default 0 check (estimated_hours >= 0),
  accent                      text not null default '#6366f1' check (accent ~* '^#[0-9a-f]{6}$'),
  visible                     boolean not null default true,
  self_enrolment              boolean not null default true,
  final_project_title         text not null default '',
  final_project_description   text not null default '',
  created_by                  uuid references users (id) on delete set null,
  created_at                  timestamptz not null default clock_timestamp(),
  updated_at                  timestamptz not null default now()
);

-- Seções (equivalente a "Seção/Tópico" do Moodle). IDs textuais preservam os do catálogo original.
create table if not exists sections (
  id          text primary key check (length(id) > 0),
  course_id   uuid not null references courses (id) on delete cascade,
  position    integer not null check (position >= 0),
  title       text not null check (length(trim(title)) > 0),
  description text not null default '',
  visible     boolean not null default true,
  constraint sections_position_unique unique (course_id, position) deferrable initially deferred
);

-- Recursos (equivalente a "Página", "Vídeo" e "URL" do Moodle).
create table if not exists lessons (
  id          text primary key check (length(id) > 0),
  section_id  text not null references sections (id) on delete cascade,
  position    integer not null check (position >= 0),
  title       text not null check (length(trim(title)) > 0),
  type        text not null default 'video' check (type in ('video', 'page', 'link')),
  url         text not null default '',
  content     text not null default '',
  visible     boolean not null default true,
  constraint lessons_position_unique unique (section_id, position) deferrable initially deferred
);

-- Questões do teste de cada seção (atividade "Teste" do Moodle).
create table if not exists quiz_questions (
  id          text primary key check (length(id) > 0),
  section_id  text not null references sections (id) on delete cascade,
  position    integer not null check (position >= 0),
  question    text not null check (length(trim(question)) > 0),
  options     jsonb not null default '[]'::jsonb,
  answer      integer not null check (answer >= 0),
  constraint quiz_options_is_array check (jsonb_typeof(options) = 'array'),
  constraint quiz_options_min_two check (jsonb_array_length(options) >= 2),
  constraint quiz_answer_in_range check (answer < jsonb_array_length(options)),
  constraint quiz_position_unique unique (section_id, position) deferrable initially deferred
);

-- ---------- Participantes (matrículas) e grupos ----------

create table if not exists enrollments (
  course_id    uuid not null references courses (id) on delete cascade,
  user_id      uuid not null references users (id) on delete cascade,
  role         text not null default 'student' check (role in ('teacher', 'student')),
  status       text not null default 'active' check (status in ('active', 'suspended')),
  enrolled_at  timestamptz not null default now(),
  primary key (course_id, user_id)
);

create index if not exists enrollments_user_idx on enrollments (user_id);

create table if not exists course_groups (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 80),
  description text not null default '' check (length(description) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint groups_name_unique unique (course_id, name),
  constraint groups_id_course_unique unique (id, course_id)
);

-- Membro de grupo precisa estar matriculado no curso do grupo (chave composta).
-- Ao remover a matrícula, o aluno sai do grupo automaticamente.
create table if not exists group_members (
  group_id    uuid not null,
  course_id   uuid not null,
  user_id     uuid not null,
  primary key (group_id, user_id),
  constraint group_members_group_fk foreign key (group_id, course_id)
    references course_groups (id, course_id) on delete cascade,
  constraint group_members_enrollment_fk foreign key (course_id, user_id)
    references enrollments (course_id, user_id) on delete cascade
);

create index if not exists group_members_user_idx on group_members (user_id);

-- ---------- Progresso e certificados ----------

create table if not exists lesson_completions (
  user_id      uuid not null references users (id) on delete cascade,
  lesson_id    text not null references lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists quiz_results (
  user_id     uuid not null references users (id) on delete cascade,
  section_id  text not null references sections (id) on delete cascade,
  score       integer not null default 0,
  total       integer not null default 0,
  passed      boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, section_id)
);

create table if not exists course_progress (
  user_id                 uuid not null references users (id) on delete cascade,
  course_id               uuid not null references courses (id) on delete cascade,
  final_project_completed boolean not null default false,
  updated_at              timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists certificates (
  user_id     uuid not null references users (id) on delete cascade,
  course_id   uuid not null references courses (id) on delete cascade,
  course_name text not null,
  issued_at   timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- ---------- Anotações pessoais ----------

create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  content     text not null check (length(trim(content)) > 0),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists notes_user_updated_idx on notes (user_id, updated_at desc);

-- ---------- Segurança (Supabase) ----------

alter table users             enable row level security;
alter table courses           enable row level security;
alter table sections          enable row level security;
alter table lessons           enable row level security;
alter table quiz_questions    enable row level security;
alter table enrollments       enable row level security;
alter table course_groups            enable row level security;
alter table group_members     enable row level security;
alter table lesson_completions enable row level security;
alter table quiz_results      enable row level security;
alter table course_progress   enable row level security;
alter table certificates      enable row level security;
alter table notes             enable row level security;
