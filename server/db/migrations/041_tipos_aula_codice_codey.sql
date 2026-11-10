-- Novos tipos de recurso (aula) para os espaços de código:
--   codice → sala do Codice (editor colaborativo, a turma escreve junto); link em url.
--   codey  → jogo de programação Codey; link em url.
-- Os dois aparecem incorporados na própria aula, como o vídeo.

alter table lessons drop constraint if exists lessons_type_check;
alter table lessons
  add constraint lessons_type_check check (type in ('video', 'page', 'link', 'html', 'ao_vivo', 'codice', 'codey'));
