-- Audiência do bloco: quem vê o bloco no curso.
--   todas     → todos os alunos (padrão)
--   online    → só alunos de turmas (ou matrículas) Online
--   presencial → só alunos de turmas (ou matrículas) Presenciais
-- Professores, editores e administração veem todos os blocos.
alter table course_blocks
  add column if not exists audience text not null default 'todas'
    check (audience in ('todas', 'online', 'presencial'));
