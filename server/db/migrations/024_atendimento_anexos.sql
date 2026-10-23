-- Anexos no atendimento: aluno e equipe enviam imagens ou PDF (até 2 MB) que aparecem na conversa.
alter table atendimento_mensagens
  add column if not exists tipo text not null default 'texto' check (tipo in ('texto', 'arquivo')),
  add column if not exists anexo_nome text,
  add column if not exists anexo_tipo text,
  add column if not exists anexo_tamanho integer,
  add column if not exists anexo_dados text;
