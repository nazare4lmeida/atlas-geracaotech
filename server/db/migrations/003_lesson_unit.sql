-- Unidade dentro da seção (módulo): aulas com o mesmo nome de unidade são agrupadas.
-- Vazio = aula diretamente na seção.
alter table lessons
  add column if not exists unit text not null default '';
