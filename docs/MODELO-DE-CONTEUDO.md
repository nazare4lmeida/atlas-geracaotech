# Modelo de conteúdo das aulas

Todas as aulas são exibidas com este desenho, em qualquer curso. O que muda por curso são só as cores
(tema do curso: cor principal, cor de destaque, fonte, arredondamento, densidade).

Referência visual: `docs/modelo-conteudo.html` (modelo original usado no Moodle).

## Regras de exibição (aplicadas automaticamente pelo motor)

| Conteúdo de origem | Como aparece |
|---|---|
| Texto antes do primeiro título | Cartão de tópico (`atlas-topic`) com barra de acento |
| Título `h1` a `h4` | Título de seção (`atlas-section-title`) dentro de um cartão `atlas-section` |
| Parágrafo com "Dica", "Nota", "Observação", "Importante", "Resumo" | Nota (`atlas-note`) com ícone |
| Parágrafo com "Atenção" | Nota de alerta (`atlas-note--warn`) |
| "Correto!" / "Incorreto." | Feedback verde ou vermelho |
| "Teste seu Conhecimento" (alternativas com resposta do Moodle) | Quiz interativo: a escolha fica verde (certa) ou vermelha (errada), a certa é destacada e só então aparece o feedback da escolha |
| Estrutura de bloco do Moodle (caixa com ícone, cartão de parabéns, linha de ícone + título) | Mantida como caixa (`atlas-box`, `atlas-row`, `atlas-stack`) com tom pela cor de fundo; não é achatada |
| Trecho de código (`pre`, `code`) | Bloco escuro com rolagem horizontal |
| Vídeo (YouTube, Vimeo, Drive) | Quadro 16:9 na largura da coluna |
| Imagem não migrada | Aviso de texto alternativo |
| Marcadores "•" digitados à mão | Removidos; a lista usa o marcador do modelo |
| Emojis | Removidos |
| Estilos inline do autor | Ignorados; o desenho vem do modelo |
| Modo escuro | Todas as superfícies vêm do tema; o layout Clássico não fixa cores claras |

## Implementação

- `client/src/utils/contentTemplate.js`: lê estilos inline e marca papéis (tópico, chip, nota...).
- `client/src/utils/lessonDocument.js`: organiza o conteúdo nas seções do modelo.
- `client/src/styles/course.css`: desenho (`atlas-*`) com as variáveis do tema.

O conteúdo guardado no banco não muda: o modelo é aplicado na exibição. Assim qualquer aula
nova, importada ou digitada, sai no mesmo padrão sem edição manual.

## Edição do material (editor visual)

- O professor edita o texto direto na aula: negrito, itálico, sublinhado, títulos, listas e links.
- Cores: só os tons do tema (`lc-primary`, `lc-danger`, `lc-ok`, `lc-warn`). A cor do curso muda com o tema; não há cor fixa no conteúdo.
- Imagens: enviadas para o bucket privado `lesson-media` (limite de 5 MB; JPG, PNG, WebP ou GIF). Ficam salvas como `data-media`, e o servidor monta o link de visualização a cada leitura (validade de 6 horas).
- Tamanho: Pequena, Média, Grande ou Original, pelo atributo `width`.
- Aulas com cartões, quiz ou mídia embutida (vindas do Moodle) abrem em HTML, para não serem achatadas. Esse é o limite atual do editor visual.
