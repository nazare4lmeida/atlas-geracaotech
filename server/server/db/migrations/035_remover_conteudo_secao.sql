-- Remove o conteúdo próprio da seção (a edição passa a ser feita no modo leitura, na própria aula).
alter table sections drop column if exists conteudo;
