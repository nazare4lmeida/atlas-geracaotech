-- Novos tipos de recurso (aula):
--   html      → bloco HTML livre, com prévia no editor (o aluno vê o mesmo conteúdo, limpo pelo mesmo filtro).
--   ao_vivo   → cartão de encontro ao vivo: link em url; dia, início e término em content (JSON).
-- A restrição antiga (video, page, link) é substituída pela nova lista.

alter table lessons drop constraint if exists lessons_type_check;
alter table lessons
  add constraint lessons_type_check check (type in ('video', 'page', 'link', 'html', 'ao_vivo'));
