-- Fórum do curso: publicação que não pertence a uma turma nem a um grupo, visível a todo o curso.
-- Equipe (admin, atendente, gestão, editor) pode abrir em qualquer curso; aluno e professor, nos seus.
-- Garante as colunas da 037 (o banco pode ter registrado essa migração sem concluí-la).
alter table turma_posts alter column turma_id drop not null;
alter table turma_posts add column if not exists grupo_id uuid references course_groups (id) on delete cascade;
alter table turma_posts add column if not exists curso_id uuid references courses (id) on delete cascade;

alter table turma_posts drop constraint if exists turma_posts_espaco_check;
alter table turma_posts add constraint turma_posts_espaco_check
  check ((turma_id is not null)::int + (grupo_id is not null)::int + (curso_id is not null)::int = 1);

create index if not exists turma_posts_curso_idx on turma_posts (curso_id);
