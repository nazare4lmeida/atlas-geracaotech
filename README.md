# Atlas - Geração Tech

Plataforma educacional focada em lógica de programação e desenvolvimento web. O front-end é React + Vite; a API é Express, e os dados ficam em **PostgreSQL**, hospedado no **Supabase**.

Para instalação, configuração do banco, variáveis de ambiente e o roteiro completo de testes manuais, veja **[TESTING.md](./TESTING.md)**.

## Stack

- **Front-end:** React 18, Vite 6, React Router DOM 6, Axios, CodeMirror 6, DOMPurify 3.2.4 (sanitização do HTML das aulas)
- **Back-end:** Node.js 18+, Express 4, `pg` (driver PostgreSQL), bcryptjs, jsonwebtoken
- **Banco:** PostgreSQL 14+ (Supabase em produção; PostgreSQL local para desenvolvimento)
- **Deploy:** Vercel (`vercel.json` roteia a API e o front-end)

## Arquitetura de dados

- O esquema é versionado em SQL, em `server/db/migrations/`, e aplicado com `npm run db:migrate`.
- A API se conecta por `DATABASE_URL` com o driver `pg`. Não há ORM.
- **Row Level Security** está habilitada em todas as tabelas, sem políticas. A chave pública (`anon`) da API automática do Supabase não lê nem altera dados; só o servidor acessa o banco.
- Integridade é garantida pelo banco: chaves estrangeiras compostas (ex.: membros de grupo só podem existir para alunos matriculados no curso), restrições de unicidade, `CHECK` de papéis, status, tipos de recurso e URLs, e cascatas controladas (excluir um curso remove seções, recursos, matrículas, grupos e progresso).

## Estrutura do projeto

```text
atlas/
├── client/                 # React + Vite
│   └── src/
│       ├── pages/          # telas (aluno, professor/admin e gestão)
│       ├── components/     # componentes; manage/ tem a gestão de cursos
│       ├── context/        # autenticação e tema
│       ├── utils/          # papéis e cálculo de progresso
│       └── styles/         # global.css (base) e manage.css (gestão)
├── server/                 # Express + PostgreSQL
│   ├── controllers/        # regras de cada recurso HTTP
│   ├── routes/             # mapa de rotas e permissões por papel
│   ├── services/           # controle de acesso, visão do curso, importação do catálogo
│   ├── db/                 # pool, migrações, repositórios SQL
│   ├── data/               # seed de demonstração e catálogo original
│   ├── scripts/            # setRole (promover contas)
│   └── tests/              # testes de regras e de integração
├── .env.example
├── vercel.json
├── TESTING.md              # instalação, testes manuais e automatizados
└── README.md
```

## Início rápido

```bash
cd server && npm install
cd ../client && npm install
```

Configure `server/.env` e `client/.env` (veja [TESTING.md](./TESTING.md#4-variáveis-de-ambiente)), então:

```bash
cd server
npm run db:migrate   # cria o esquema
npm run seed         # dados de demonstração (APAGA os dados existentes)
npm run dev          # API em http://localhost:5000

cd ../client
npm run dev          # front-end em http://localhost:5173
```

Contas do seed (senha `123456`): `admin@atlas.local`, `professor@atlas.local`, `demo@atlas.local`, `aluna@atlas.local`.

## Papéis e permissões

Os papéis seguem a lógica: uma conta tem um **papel global** e cada curso tem **papéis de matrícula**.

| Papel da conta    | Pode                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Administrador** | Tudo: criar, editar e excluir qualquer curso; gerenciar contas, papéis e matrículas em qualquer curso                 |
| **Professor**     | Criar cursos (fica como docente deles); gerenciar os cursos que leciona; excluir apenas os cursos que criou           |
| **Aluno**         | Acessar cursos em que está matriculado (ou autoinscrição, quando liberada); progresso, testes, projeto e certificados |

| Papel no curso                | Permissão                                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Docente**                   | Gerencia conteúdo, participantes e grupos do curso. Só contas de professor ou administrador podem ser docentes; só administradores atribuem o papel |
| **Aluno**                     | Acessa o conteúdo e faz as atividades. Só alunos podem ser membros de grupos                                                                        |
| Situação **ativa / suspensa** | Suspensa: a matrícula permanece, mas o acesso é bloqueado                                                                                           |

Contas também podem ser **desativadas** pelo administrador; uma conta desativada não entra no sistema.

## Mapeamento

| Atlas - Geração Tech            |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| Curso                           | Curso (título, slug, resumo, nível, carga horária, publicado, autoinscrição, projeto final) |
| Seção / tópico                  | Módulo (seção), com título, descrição e visibilidade                                        |
| Recurso (vídeo, página, URL)    | Aula, tipo `video`, `page` ou `link`, com visibilidade                                      |
| Atividade (questionário)        | Questões de múltipla escolha por seção, com alternativa correta                             |
| Atividade de entrega            | Projeto final (marcado como concluído pelo aluno)                                           |
| Participantes e papéis no curso | Matrículas com papel `docente` ou `aluno` e situação ativa ou suspensa                      |
| Grupos                          | Grupos do curso, com membros (apenas alunos matriculados)                                   |
| Papéis do site                  | Administrador, professor, aluno                                                             |
| Suspender conta                 | Desativar conta                                                                             |

## Funcionalidades

### Aluno

- Cadastro e login com JWT; rotas protegidas
- Biblioteca de cursos e página inicial com o catálogo
- Aulas em sequência, com vídeo (YouTube), página ou link
- Testes por seção e projeto final
- Progresso, dashboard e certificado gerado no navegador (PNG) quando os requisitos são cumpridos
- Anotações pessoais
- Laboratório de JavaScript (CodeMirror)
- Modo claro e escuro com persistência

### Professor e administrador (Gestão)

- Criar, editar, publicar/ocultar e excluir cursos
- Seções e recursos: criar, editar, ocultar/mostrar, reordenar e excluir
- Questões de teste: criar, editar, reordenar e excluir
- Projeto final: título e descrição
- Participantes: inscrever por e-mail, alterar papel no curso, suspender/reativar e remover
- Grupos: criar, renomear, descrever, excluir e gerenciar membros (alunos matriculados)
- Relatório de progresso por aluno
- Administração de contas (admin): criar, buscar, alterar papel, desativar/reativar e excluir

## Rotas da API

| Método                                              | Rota                                                                                                       | Acesso                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| GET                                                 | `/api/health`                                                                                              | público                                                                               |
| GET                                                 | `/api/catalog`                                                                                             | público                                                                               |
| POST                                                | `/api/auth/register`, `/api/auth/login`                                                                    | público                                                                               |
| GET                                                 | `/api/auth/me`                                                                                             | autenticado                                                                           |
| GET                                                 | `/api/courses`                                                                                             | autenticado (lista conforme visibilidade)                                             |
| POST                                                | `/api/courses`                                                                                             | admin, professor                                                                      |
| GET / PUT / DELETE                                  | `/api/courses/:slug`                                                                                       | visualização conforme matrícula; edição: docente ou admin; exclusão: admin ou criador |
| POST / PUT / DELETE                                 | `/api/courses/:slug/modules[...]` (seções), `.../lessons[...]` (recursos), `.../questions[...]` (questões) | docente ou admin                                                                      |
| POST `.../modules/:id/move`, `.../lessons/:id/move` | reordenar                                                                                                  | docente ou admin                                                                      |
| PUT                                                 | `/api/courses/:slug/final-project`                                                                         | docente ou admin                                                                      |
| GET / POST / PATCH / DELETE                         | `/api/courses/:slug/participants[...]`                                                                     | docente ou admin                                                                      |
| GET / POST / PUT / DELETE                           | `/api/courses/:slug/groups[...]`, `.../groups/:id/members`                                                 | docente ou admin                                                                      |
| POST                                                | `/api/courses/:slug/progress/lesson`, `/progress/quiz`, `/progress/project`, `/certificate`                | aluno matriculado                                                                     |
| GET / POST / PATCH / DELETE                         | `/api/users[...]`                                                                                          | admin                                                                                 |
| GET                                                 | `/api/users/dashboard`                                                                                     | autenticado                                                                           |
| GET / POST / PUT / DELETE                           | `/api/notes[...]`                                                                                          | autenticado                                                                           |

## Variáveis de ambiente

Veja `.env.example` e [TESTING.md](./TESTING.md#4-variáveis-de-ambiente).

**Servidor:** `PORT`, `CLIENT_URL`, `DATABASE_URL`, `DATABASE_SSL`, `DATABASE_POOL_MAX`, `JWT_SECRET`, `JWT_EXPIRES_IN`, e as chaves `SUPABASE_*` reservadas para recursos futuros (Storage, Auth).

**Cliente:** `VITE_API_URL`, `VITE_APP_NAME`, e `VITE_SUPABASE_*` reservadas.

## Testes

```bash
cd server
npm test -- tests/rules.test.js                                  # regras de negócio, sem banco
TEST_DATABASE_URL=postgres://... npm test                        # integração completa (use banco de teste)
cd ../client && npm run build                                    # build do front-end
```

O teste de integração apaga os dados do banco indicado em `TEST_DATABASE_URL`.

## Deploy na Vercel

- Raiz do projeto como **Root Directory**.
- Variáveis de ambiente conforme `.env.example`.
- Para o front-end: build `cd client && npm install && npm run build`, saída `client/dist`.
- Para a API em serverless, use a **string do Transaction pooler** do Supabase (porta 6543) em `DATABASE_URL`, pois cada invocação abre poucas conexões.

## Premissas adotadas

1. Dados de produção do MongoDB não são migrados automaticamente. A base nova começa do zero (com o seed de demonstração opcional).
2. As formações não têm conteúdo nesta plataforma. Elas entram ocultas e devem ser preenchidas por importação de backup e publicadas pelo docente.
3. Cores das formações vieram da imagem "Nossas Formações" da Digital College. IA + Soft Skills não estava na imagem; a cor (#8B5CF6) foi escolhida por mim e pode ser ajustada.
4. Cursos importados por backup ficam ocultos e sem autoinscrição até serem publicados.
5. A autenticação continua sendo JWT próprio; o Supabase Auth não foi adotado para não alterar o fluxo existente.
6. O Supabase é usado como PostgreSQL gerenciado; Storage e Auth ficam para evolução futura.
7. Professores podem criar cursos e ficam como docentes deles; só administradores atribuem o papel de docente a outras contas.
8. Excluir curso é permitido ao administrador ou ao criador do curso.
9. Ao iniciar a API com banco sem cursos, o catálogo original é importado automaticamente.
10. Ids de seções e aulas do catálogo original (ex.: `logic-1`, `logic-1-1`) são preservados, para que o progresso existente continue válido.

## Backup e restauração de conteúdo

Equivalente ao backup/restauração dos cursos que sobem em arquivos, sem dados de alunos. O arquivo é JSON (`*.atlas-backup.json`) e contém título, configurações, seções, recursos, questões e projeto final.

- **Exportar:** Gestão > curso > aba **Backup** > _Baixar backup_. Também disponível pela API: `GET /api/courses/:slug/backup`.
- **Restaurar no curso:** aba **Backup** > _Escolher arquivo_. Substitui seções, recursos e questões; título, configurações, visibilidade e matrículas são mantidos. O progresso dos alunos nas seções substituídas é removido.
- **Importar como curso novo:** Gestão de cursos > _Importar arquivo_. O curso fica oculto e sem autoinscrição até ser publicado.

Os IDs não são exportados: a importação gera IDs novos, então o mesmo arquivo pode ser restaurado ou importado várias vezes.

**Migração do Moodle:** o backup do Moodle (`.mbz`) é convertido para este JSON pelo script `server/scripts/convertMoodleBackup.js`, que gera um arquivo por curso e um relatório com o que foi e o que não foi migrado:

```bash
cd server
node scripts/convertMoodleBackup.js ../backup.mbz ../curso.atlas-backup.json \
  --slug desenvolvedor-full-stack-ia --layout classico --report ../relatorio.md
```

O conversor valida o resultado com a mesma regra da importação. Depois, restaure no curso pela aba **Backup** (ou pela API `POST /api/courses/:slug/restore`). Arquivos anexados no Moodle (`@@PLUGINFILE@@`, imagens e PDFs) não são migrados, pois ainda não há armazenamento de arquivos; o relatório lista essas referências.

## Layouts e identidade visual

Cada curso tem um **layout** escolhido na criação (ou depois, em Gestão > curso > **Configurações**):

- **Caderno**: cabeçalho sóbrio, bordas suaves (padrão).
- **Clássico**: bloco de destaque com a cor principal, fonte serifada nos títulos.
- **Terminal**: fundo escuro, fonte monoespaçada, cantos retos.
- **Editorial**: cabeçalho amplo com banner, tipografia grande.

Além do layout, o docente edita sem mexer em código: cor principal, cor de destaque, fonte, arredondamento, densidade (compacta ou confortável), banner e logo (URLs `http`/`https`). Os valores ficam em `course.layout` e `course.theme` (JSON), validados pelo servidor em `server/services/layouts.js`. O CSS dos layouts está em `client/src/styles/layouts.css`; as opções de cada layout, em `client/src/layouts/registry.js`.

O conteúdo HTML das aulas passa pelo DOMPurify (versão fixada em `client/package.json`) em `client/src/utils/lessonHtml.js`: estilos inline e scripts são removidos, e iframes só são aceitos de provedores de vídeo e apresentação listados no código (YouTube, Vimeo, Google Drive e Docs). Assim, o material se adapta ao layout escolhido.

## Tela do curso (aluno)

- Trilha lateral recolhível: módulo > unidade > aula. Cada bloco abre e fecha; clicar em um item leva até ele.
- Barra de progresso fixa no topo, atualizada a cada aula concluída (com uma casa decimal enquanto o avanço é pequeno).
- Janela de boas-vindas na primeira abertura do curso, guardada no navegador de cada aluno (botão _Como usar_ reabre).
- O menu lateral geral também recolhe; a preferência fica salva no navegador.
- Unidades são o campo `unit` das aulas (migração `003_lesson_unit.sql`). Na migração do Moodle, capítulos "UNIDADE N" formam as unidades.

## Digital College

A página `/digital-college` (também na barra lateral) apresenta as formações da Digital College com a identidade visual de cada uma. A lista é fixa em `client/src/data/digitalCollege.js`. Cada formação mostra "Disponível" quando o curso de mesmo slug está publicado na plataforma.

## Catálogo

- `server/data/courses.js`: os 6 cursos originais de demonstração (ids preservados para o progresso).
- `server/data/formacoes.js`: as 10 formações do Geração Tech, com as cores da identidade visual, ocultas e sem conteúdo até a importação.
- `npm run catalog:sync` adiciona ao banco as formações que faltam, sem apagar nada.

## Limitações conhecidas

- Respostas corretas dos testes são enviadas ao navegador do aluno (comportamento original, mantido).
- Resultados de testes e progresso são registrados pelo cliente com validação de ids, mas não há verificação de tempo ou de tentativas.
- Edições concorrentes seguem o critério "última gravação vence".
- Não há limite de taxa (rate limiting) nas rotas de autenticação.
- `client/src/data/courses.js` não é mais usado pelo front-end e pode ser removido; `server/data/courses.js` continua sendo a fonte do catálogo importado.
- `CODELISTING.md` é um artefato antigo e não reflete esta versão.
