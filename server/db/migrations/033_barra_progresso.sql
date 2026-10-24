-- Barra de progresso configurável e aulas que contam (ou não) nela.
-- conta_progresso: a aula entra no percentual da barra do aluno. Não altera o certificado.
-- barra_progresso: título, mostrar contagem, mostrar percentual e cor (tom) da barra, por curso.

alter table lessons add column if not exists conta_progresso boolean not null default true;
alter table courses add column if not exists barra_progresso jsonb not null default '{}'::jsonb;
