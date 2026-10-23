# Formações, blocos e certificação automática

Status: **desenho aprovado pela gestão, migração 011 criada, código de progresso ainda não alterado.**

## 1. Hierarquia

```
Formação (courses)                 ex.: Desenvolvimento Web Fullstack - 4.0
└── Bloco (course_blocks)          ex.: Bloco 2 - Desenvolvimento Front-end   (uma "fase")
    └── Módulo (sections)          ex.: Unidade 1 - JavaScript básico
        └── Aula (lessons) e Quiz (quiz_questions)
```

- A formação é a unidade de matrícula e de certificado. Não existe certificado por bloco.
- O bloco é a fase do jogo. Concluí-lo gera uma conquista (selo) visível, sem documento.
- O módulo é a unidade de estudo dentro da fase. Os módulos atuais do Moodle (Módulo 1, Módulo 2 etc.) viram blocos, e as unidades dentro deles viram módulos.

## 2. Regras aprovadas

| Tema | Regra |
|---|---|
| Certificado por bloco | Não existe. Só certificado da formação. |
| Desbloqueio | Sequencial. O bloco *n* abre quando o *n-1* está concluído. Blocos com `unlock_mode = 'open'` (avisos, apresentação, arquivos de apoio) ficam sempre abertos. |
| Progresso do bloco | Passos concluídos ÷ passos do bloco. Passo = aula de módulo ou quiz de módulo. Entram só módulos `kind = 'modulo'`. |
| Progresso da formação | Média dos blocos ponderada pela carga horária (`workload_hours`). Se todos os blocos estiverem com carga zero, a média é simples. |
| Bloco concluído | Todas as aulas e todos os quizzes do bloco com aprovação. |
| Revisão | Conteúdo já concluído (aulas e quizzes) fica acessível sempre, mesmo que um bloco posterior esteja bloqueado. O bloqueio vale só para conteúdo ainda não liberado. Revisar não apaga nem altera o progresso nem o desbloqueio. |
| Projetos | A formação pode ter vários projetos (`course_projects`). Só a Fullstack tem dois agora: front-end e back-end. |
| Emissão | Automática, **somente a partir de `certificate_release_at`** (data final da formação). Antes dessa data, nada é emitido, mesmo com todos os critérios atendidos. |
| Conclusão | Todos os blocos concluídos, **todos** os projetos entregues e com nota, nota do projeto de **pelo menos 7**, e (a nota do projeto é a maior **ou** passou de 7). |
| Participação | Todos os blocos concluídos e prova de recuperação com 7 ou mais, quando a conclusão não se aplica. Vale para quem não entregou projeto, e também para quem entregou mas tirou menos no projeto. |
| Nota final | A maior entre a nota do projeto (média, se houver mais de um) e a nota da prova. Fica gravada em `certificates.grade`. |
| Prova de recuperação | Qualquer aluna pode fazer. Módulo com `kind = 'recuperacao'`, uma por formação. A nota vem do quiz, convertida para 0 a 10. **Uma única tentativa**: após o resultado registrado, não aceita novas respostas nem reinício. Fica fora do progresso de conteúdo. |
| Sem certificado | Prova de recuperação abaixo de 7 e conclusão não atingida. |

Exemplos já cobertos por testes (`server/tests/formacaoGrading.test.js`):

| Projeto | Prova | Resultado |
|---|---|---|
| 5 | 7 | participação, nota 7 |
| 8 | 9 | conclusão, nota 9 |
| 7,5 | 6 | conclusão, nota 7,5 |
| não entregue | 7 | participação |
| não entregue | 6 | sem certificado |

A decisão está isolada em `server/services/formacaoGrading.js` (`resolveFormacao`), sem acesso ao banco.
| Upgrade | Participação pode virar conclusão quando o projeto for entregue depois. Conclusão nunca volta para participação. |
| Gestão | Não aprova nem segura certificado. Pode apenas consultar e, se necessário, reemitir (com o mesmo código). |

### Decisões confirmadas

- Nota mínima do projeto para conclusão: **7**.
- Nota do projeto com dois projetos: **média** dos entregues.
- Prova de recuperação: **uma tentativa**.

### Em aberto

1. **Pré-requisito da prova.** Sugiro que a prova só seja liberada depois que todos os blocos estiverem concluídos. Ainda não confirmado; hoje a prova não é bloqueada por isso.

## 3. Mapeamento proposto: Desenvolvimento Web Fullstack - 4.0

Origem: backup Moodle (`fullstack.atlas-backup.json`). A formação tem 11 itens de primeiro nível.

| Bloco | Conteúdo no Moodle | Módulos sugeridos | Modo |
|---|---|---|---|
| 0 - Início | Avisos, Fóruns e Frequências; Apresentação do Curso | Avisos (8 itens), Apresentação (1) | `open` |
| 1 - Introdução ao Desenvolvimento Web | Módulo 1 (164 aulas) + Exercícios de HTML e CSS (7 aulas, 27 questões) | Unidades 1 a 4 do Módulo 1, depois Exercícios HTML/CSS | `sequential` |
| 2 - Desenvolvimento Front-end | Módulo 2 (96 aulas) + Exercícios de JavaScript (6) + Exercícios de React (6) | Unidades 1 e 2 do Módulo 2, depois exercícios JS e React | `sequential` |
| 3 - Back-end | Módulo 3 (130 aulas) + Exercícios de Back-end (13) | Unidades 1 a 3 do Módulo 3, depois exercícios Back-end | `sequential` |
| 4 - Testes Automatizados | Módulo 4 (26 aulas) | Unidades 1 e 2 do Módulo 4 | `sequential` |
| Apoio | Arquivos de Apoio (7) | Arquivos de apoio | `open` |
| Recuperação | Prova de recuperação (a criar) | 1 módulo `kind = 'recuperacao'` | fora do progresso |

Pontos a validar antes de importar:

1. **Exercícios por bloco.** O mapeamento acima é uma sugestão pelo assunto. Confirmar se o exercício de HTML/CSS fica no bloco 1 e se React fica no bloco 2.
2. **Divisão em unidades.** Os títulos das unidades não seguem um padrão único (ex.: "UNIDADE 1", "Módulo 2 - UNIDADE 1", "módulo 3 - UNIDADE 2 | Banco de Dados"). Vou gerar a divisão automaticamente só onde o padrão for claro e deixar o resto para o docente ajustar no editor.
3. **Datas dos blocos.** Os módulos do Moodle têm datas no título (09/09 a 18/09, 20/09 a 17/10, 10/10 a 10/11, 11/11 a 17/11, todas de 2026). Elas viram `starts_at` e `ends_at`. A data final da formação (17/11/2026) é a sugestão para `certificate_release_at`.
4. **Projetos.** A Fullstack tem dois, confirmados: Projeto Front-end (no bloco 2) e Projeto Back-end (no bloco 3). O Moodle também lista "Mini Projeto JavaScript" partes 1 e 2; não entram como projetos finais, a não ser que você diga o contrário. Cada projeto registra a entrega individualmente.
5. **Presença.** A atividade de Frequências não migra. A presença continua sendo proxy por aulas concluídas, como já combinado.

## 4. Schema (migração 011)

Arquivo: `server/db/migrations/011_course_blocks.sql`.

- `course_blocks`: id, course_id, position, title, description, workload_hours, starts_at, ends_at, visible, unlock_mode, timestamps. Posição única por formação.
- `sections.block_id` (nulo para módulos soltos) e `sections.kind` (`modulo` ou `recuperacao`).
- Índice único: no máximo uma prova de recuperação por formação.
- RLS ligado, sem políticas, igual às outras tabelas.

Nada é preenchido pela migração. Os cursos atuais continuam sem blocos até a importação.

### Projetos (migração 012)

Arquivo: `server/db/migrations/012_course_projects.sql`.

- `course_projects`: id, course_id, block_id (opcional, só indica onde aparece na trilha), position, title, description.
- `project_deliveries`: (project_id, user_id), com `delivered_at` e `delivered_by`. A entrega passa a ser registrada pela gestão, e não mais pela aluna.
- Backfill: formações com projeto final cadastrado viram um projeto na posição 0, e as entregas antigas marcadas em `course_progress.final_project_completed` são copiadas. A coluna antiga fica no banco.

### Notas (migração 013)

Arquivo: `server/db/migrations/013_grades.sql`.

- `project_deliveries.grade` (0 a 10), com data e autor da correção.
- `certificates.grade`: nota final usada na emissão.

## 5. Cálculo e emissão (servidor)

Uma função `avaliarFormacao(userId, courseId)` é a única fonte de verdade. Ela:

1. Calcula o progresso de cada bloco e o desbloqueio sequencial.
2. Calcula o progresso geral ponderado.
3. Verifica elegibilidade de conclusão (todos os projetos entregues) e de participação (algum projeto não entregue e prova de recuperação aprovada).
4. Se `now() >= certificate_release_at` e há elegibilidade, emite com `insert ... on conflict do update` que só sobe de participação para conclusão.

Ela roda:
- depois de cada gravação de progresso (aula, quiz, recuperação, entrega do projeto);
- uma vez por dia, como rede de segurança, para cobrir a virada da data de liberação.

O cliente só exibe o resultado. Nenhuma regra de desbloqueio ou elegibilidade fica no navegador.

## 6. Interface (aluna)

- Trilha vertical de blocos, em ordem, como fases de um jogo.
- Cada bloco mostra um estado: concluído (selo), em andamento (o que falta), bloqueado (qual bloco concluir para liberar).
- Barra de progresso geral no topo, com "Próximo passo" em destaque.
- Dentro do bloco: módulos, aulas e quiz, como hoje.
- Rodapé "Certificado": requisitos marcados ou não, em linguagem simples, e a data de liberação.

## 7. Próximos passos (em ordem)

1. Confirmar a leitura da participação (seção 2) e o mapeamento da seção 3.
2. Rodar as migrações 011 e 012 no banco. Ambas foram aplicadas num Postgres 16 local, de 001 a 012, com testes de restrição e de backfill. Falta rodar no Supabase.
3. Repositório e API de blocos: CRUD para a gestão, e endpoint de progresso por bloco.
4. Função `avaliarFormacao` e testes com dados de exemplo (incluindo a virada da data de liberação e o upgrade de participação para conclusão).
5. Prova de recuperação (módulo `kind = 'recuperacao'`) e seu fluxo para participação.
6. Importação do Fullstack com o mapeamento confirmado.
7. Interface de trilha.
8. Geração automática de PDF com `pdf-lib`, pelo template de conclusão ou de participação.

## 8. O que está implementado (rodada atual)

- **Todo curso tem blocos.** Sem plano próprio, cada módulo vira um bloco, em ordem sequencial. Vale para cursos existentes (migração 014), para cursos importados e para módulos criados depois (`createSection`).
- **Plano próprio aplicado automaticamente.** `server/data/blockPlans/` guarda os planos por título da formação. Hoje: Fullstack. O plano roda na importação, na restauração de backup e no `npm run db:migrate` (uma única vez, pela marca `courses.block_plan_applied`). Cópias da formação (ex.: "-2") recebem o mesmo plano pelo título.
- **Estado dos blocos no servidor** (`services/blockProgress.js`): desbloqueio sequencial, bloco concluído, progresso por bloco e geral (ponderado por carga, média simples sem carga). O painel do aluno e as respostas de progresso trazem `blocks`.
- **Guarda de ação:** concluir aula ou responder quiz de bloco bloqueado retorna 403. Revisar conteúdo já concluído continua permitido.
- **Trilha na página do curso:** cada bloco aparece com status (Bloqueado, percentual, Concluído), e seus módulos só abrem quando liberados.
- **Prova de recuperação** fica fora da trilha e do progresso de conteúdo.

### Testado

- Migrações 001 a 014 num Postgres 16 local.
- Backfill da 014 em curso existente: um bloco por módulo, sem repetir na segunda execução.
- Importação do backup da Fullstack: 11 módulos, todos em bloco, dois projetos nos blocos 2 e 3.
- Estado dos blocos no banco: Início aberto, Bloco 1 liberado de início, Blocos 2 a 4 bloqueados, e liberação do Bloco 2 depois de concluir o Bloco 1.
- Suíte do servidor: 53 testes. Build do cliente: ok.

### Ainda não feito

1. **Divisão das unidades dentro de cada bloco da Fullstack.** Hoje o bloco contém os módulos do Moodle (ex.: "Módulo 1" com 164 aulas). A divisão em módulos por unidade ainda precisa ser feita, com a regra de títulos confirmada.
2. **Conteúdo de blocos bloqueados ainda vai na resposta da API.** O bloqueio é só visual na página. Antes de liberar o curso para alunos, o servidor deve omitir o conteúdo de blocos bloqueados.
3. **Edição de blocos pela gestão** (criar, renomear, reordenar, definir carga e modo de desbloqueio). Hoje é feita pelo plano ou pela API de módulos.
4. **Mover um módulo não move o bloco dele.** A ordem dos blocos é a posição própria do bloco.
5. **Carga horária dos blocos** está em 0 no plano da Fullstack; por isso o progresso geral é média simples.
6. **Projetos:** a tela para a gestão lançar nota e registrar entrega ainda não existe.
7. **Emissão automática e nota final** ainda não estão ligadas à decisão `resolveFormacao`.
8. **Aulas de Apoio e Avisos** contam no progresso geral, como as demais aulas.

## 9. Correção de rumo (página do curso)

- **Cursos completos são os cards da biblioteca.** Cada um (Lógica de Programação, HTML & CSS, JavaScript, React, Node.js, Git & GitHub, e a própria Fullstack) continua sendo um curso separado.
- **Dentro de cada curso, os módulos aparecem como cards no mesmo formato dos cursos** (`ModuleCard`), com barra de progresso própria, e a barra total do curso continua no topo.
- **Abrir um módulo** mostra o conteúdo dele abaixo da grade (aulas, quiz).
- **O plano da Fullstack foi removido.** Os módulos do Moodle não são agrupados em blocos. Cada módulo fica no próprio bloco, como padrão.
- O sumário lateral lista os módulos (com cadeado quando bloqueados), sem a camada de bloco.

Pendências desta forma: a regra de desbloqueio sequencial entre módulos continua valendo; ainda não está confirmado se deve valer.

## 10. Estrutura final da Fullstack (formato moderno)

Os seis cards da biblioteca (Lógica de Programação, HTML & CSS, JavaScript, React, Node.js, Git & GitHub) **não são cursos**. São os **blocos** da Fullstack, e servem de modelo para a divisão do conteúdo. Os cursos avulsos com esses nomes serão excluídos; até lá, continuam no catálogo.

Hierarquia e rotas:
- `/cursos/:slug` → grade com os **blocos** (cards com nível, cor, carga horária, barra e "Ver módulo").
- `/cursos/:slug/modulo/:blockId` → os **módulos** do bloco, como cards, com o menu lateral e a barra do bloco.
- Dentro de um módulo, as **unidades** aparecem como cards, e cada unidade mostra as aulas.

Divisão do conteúdo do Moodle (`server/data/blockPlans/fullstack.js`):

| Bloco | Módulos (unidades do Moodle) |
|---|---|
| Lógica de Programação | Avisos e fóruns, Apresentação do curso, Fundamentos da web (Módulo 1 · Unidade 1) |
| HTML & CSS | HTML e CSS (Módulo 1 · Unidade 2), Bootstrap (Módulo 1 · Unidade 4), Exercícios de HTML e CSS |
| JavaScript | JavaScript (Módulo 2 · Unidade 1), Exercícios de JavaScript |
| React | React (Módulo 2 · Unidade 2), Exercícios de React, Testes de front-end (Módulo 4 · Unidade 1) |
| Node.js | Back-end com Node.js, Banco de dados, Autenticação JWT (Módulo 3 · Unidades 1 a 3), Testes de back-end (Módulo 4 · Unidade 2), Exercícios de back-end |
| Git & GitHub | Git e GitHub (Módulo 1 · Unidade 3), Arquivos de apoio |

Projetos: front-end no bloco React; back-end no bloco Node.js.

Pontos a revisar:
1. **Lógica de Programação** não tem conteúdo de lógica no Moodle. Hoje entram os avisos, a apresentação e os fundamentos da web. Se houver material de lógica, a divisão muda só no plano.
2. **Avisos** (8 aulas de aula ao vivo) precisam ser marcados como concluídos para liberar o bloco HTML & CSS.
3. Blocos são **sequenciais**: cada um abre quando o anterior estiver concluído.

Testes: importação do backup com 464 aulas preservadas, seis blocos na ordem certa, módulos na ordem do plano e projetos nos blocos React e Node.js.
