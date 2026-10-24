-- Conteúdo da seção (formatado, como nas aulas). A descrição curta continua no cabeçalho da seção.
alter table sections add column if not exists conteudo text not null default '';
