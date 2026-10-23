-- Link da aula ao vivo da turma (Meet, Zoom etc.). Aparece na página inicial de alunos e professores.
alter table turmas
  add column if not exists link_ao_vivo text not null default '';
