-- Avaliação da unidade pela aluna (nota de 1 a 5 e comentário opcional), feita depois de concluir a unidade.
create table if not exists avaliacoes_unidade (
  user_id     uuid not null references users (id) on delete cascade,
  section_id  text not null references sections (id) on delete cascade,
  unidade     text not null default '',
  nota        smallint not null check (nota between 1 and 5),
  comentario  text not null default '',
  created_at  timestamptz not null default now(),
  primary key (user_id, section_id, unidade)
);
