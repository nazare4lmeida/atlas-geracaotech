-- Última aula aberta pelo aluno em cada curso (modo leitura). Permite retomar de onde parou, em qualquer dispositivo.
-- Uma linha por aluno e curso; é sobrescrita a cada aula nova. Não afeta progresso nem certificado.

create table if not exists posicao_leitura (
  user_id     uuid not null references users (id) on delete cascade,
  course_id   uuid not null references courses (id) on delete cascade,
  lesson_id   text not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- Mesma política das demais tabelas: RLS ligado, sem políticas (acesso só pelo servidor).
alter table posicao_leitura enable row level security;
