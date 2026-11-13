-- Registro de cada chamada a IA: quem, qual modulo, qual provedor/modelo e quantos tokens.
-- O texto da pergunta e da resposta NAO e guardado aqui (LGPD e tamanho).
create table if not exists ia_usos (
  id              bigserial primary key,
  usuario_id      text,
  modulo          text not null,
  provedor        text not null,
  modelo          text not null,
  status          text not null check (status in ('ok', 'erro')),
  tokens_entrada  integer,
  tokens_saida    integer,
  codigo_erro     text,
  criado_em       timestamptz not null default now()
);

create index if not exists ia_usos_usuario_idx on ia_usos (usuario_id, criado_em);
