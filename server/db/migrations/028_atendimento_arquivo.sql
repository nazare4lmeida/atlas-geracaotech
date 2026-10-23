-- Arquivo do atendimento: conversa finalizada pode ser arquivada e sai da lista principal (fica em 'Arquivados').
alter table atendimento_sessoes add column if not exists arquivado_em timestamptz;

create index if not exists atendimento_sessoes_arquivado_idx on atendimento_sessoes (arquivado_em);
