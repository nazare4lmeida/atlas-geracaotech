-- Título da aula extra registrada no ponto do professor.
alter table ponto_professor
  add column if not exists titulo text not null default '';
