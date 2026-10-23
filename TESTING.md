# Testes locais — Atlas - Geração Tech

Este guia cobre a instalação, a configuração do banco (Supabase ou PostgreSQL local), a execução e o roteiro de testes manuais de todas as funcionalidades.

## 1. Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | 18.18+ (recomendado 22 LTS) | o servidor usa `node --test` e `fetch` nativo |
| npm | 9+ | vem com o Node |
| PostgreSQL | 14+ | opcional se usar o Supabase; obrigatório para os testes de integração locais |
| Conta Supabase | — | opcional para desenvolvimento local |

## 2. Instalação

```bash
cd atlas
cd server && npm install
cd ../client && npm install
```

## 3. Banco de dados

O projeto usa **PostgreSQL**, o mesmo banco do Supabase. O esquema fica em `server/db/migrations/` e é aplicado com um comando.

### Opção A — Supabase (recomendada)

1. Crie um projeto no Supabase.
2. Em **Project Settings > Database > Connection string**, copie a string de conexão.
3. Crie `server/.env` (veja a seção 4) com `DATABASE_URL` e `DATABASE_SSL=true`.
4. Aplique o esquema:

```bash
cd server
npm run db:migrate
```

Alternativa: copie o conteúdo de `server/db/migrations/001_initial_schema.sql` e execute no **SQL Editor** do Supabase.

> Todas as tabelas já nascem com **RLS habilitado e sem políticas**. Isso impede que a chave pública (`anon`) da API automática do Supabase leia ou altere dados. Só o servidor, pela conexão direta, acessa o banco.

### Opção B — PostgreSQL local (Docker)

```bash
docker run -d --name atlas-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=atlas -p 5432:5432 postgres:16
```

No `server/.env`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/atlas
DATABASE_SSL=false
```

Depois rode `npm run db:migrate` dentro de `server/`.

## 4. Variáveis de ambiente

Crie `server/.env` (copie as variáveis de servidor de `.env.example`):

```
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgres://postgres:postgres@localhost:5432/atlas
DATABASE_SSL=false
JWT_SECRET=troque-por-uma-chave-longa-e-aleatoria
JWT_EXPIRES_IN=7d
```

Crie `client/.env`:

```
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Atlas - Geração Tech
```

## 5. Dados de demonstração e primeiro administrador

> **Não consigo entrar (admin, professor ou aluno)?** As contas de demonstração só existem depois de `npm run seed`. Se você nunca rodou o seed nesse banco, nenhuma conta existe. Rode `npm run db:migrate` e depois `npm run seed` dentro de `server/` (a pasta `server`, não `client`). Se preferir criar a sua conta, use **Criar conta** em `/cadastro` e depois promova-a com `npm run set-role -- seu@email.com admin`.

```bash
cd server
npm run seed
```

O seed **apaga** usuários, cursos, anotações e progresso do banco apontado por `DATABASE_URL`. Use apenas em desenvolvimento. Ele cria estas contas (senha `123456`):

| Papel | E-mail |
|---|---|
| Administrador | `admin@atlas.local` |
| Professor | `professor@atlas.local` |
| Aluno | `demo@atlas.local` |
| Aluno (sem matrícula no curso fechado) | `aluna@atlas.local` |

Também importa o catálogo completo: os 6 cursos originais de demonstração e as 10 formações do Geração Tech (Marketing Digital + IA, Data Analytics + IA, Desenvolvedor Full Stack + IA, Claude Expert, Desenvolvimento de IA Generativa, UX/UI Design + IA, Gestor em Projetos Ágeis, Python para Dados + IA, Full Cycle e IA + Soft Skills). Cria o grupo "Turma A" e deixa o curso **Git & GitHub** com autoinscrição desligada.

As formações entram **ocultas e sem conteúdo**, porque o conteúdo ainda vem do Moodle. Para que apareçam para os alunos, importe o backup do curso (seção 8.9) e publique-o na tela de configurações.

**Banco que já tem dados (sem apagar nada):** para adicionar as formações que faltam, rode dentro de `server/`:

```bash
npm run catalog:sync
```

Em um banco que já tenha usuários, promova alguém para administrador com:

```bash
npm run set-role -- seu@email.com admin
```

Ao iniciar a API com um banco vazio (sem cursos), o catálogo original é importado automaticamente.

## 6. Subir a aplicação

Em dois terminais:

```bash
# terminal 1 — API (http://localhost:5000)
cd server
npm run dev

# terminal 2 — front-end (http://localhost:5173)
cd client
npm run dev
```

Abra `http://localhost:5173`.

## 7. Testes automatizados

```bash
cd server

# Regras de negócio (não precisam de banco)
npm test -- tests/rules.test.js

# Integração completa: sobe a API contra um PostgreSQL real e percorre o roteiro.
# ATENÇÃO: o seed apaga os dados do banco indicado. Use um banco de teste.
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/atlas_test npm test
```

No front-end, verifique o build:

```bash
cd client
npm run build
```

## 8. Roteiro de testes manuais

Use o seed (seção 5). Abra uma janela anônima para cada papel, ou saia e entre com outra conta.

### 8.1 Acesso e papéis

| # | Ação | Resultado esperado |
|---|---|---|
| 1 | Entre como `demo@atlas.local` e abra **Cursos** | 6 cursos listados |
| 2 | Verifique o menu | Não há "Gestão" nem "Usuários" |
| 3 | Acesse `/gestao/cursos` digitando na barra de endereços | Mensagem "Acesso restrito" |
| 4 | Entre como `aluna@atlas.local` e abra `/cursos/git-github` | "Você não está inscrito neste curso" (autoinscrição desligada) |
| 5 | Como `aluna@atlas.local`, abra `/cursos/html-css` | Curso abre e a aluna fica matriculada automaticamente |
| 6 | Entre como `professor@atlas.local` e abra **Gestão** | Lista com os cursos que você leciona |
| 7 | Entre como `admin@atlas.local` e abra **Usuários** | Lista de contas, com busca e filtro por papel |
| 8 | Como o professor, abra `/gestao/usuarios` | "Acesso restrito" |

### 8.2 Cursos: criar, editar, ocultar, excluir

| # | Ação | Resultado esperado |
|---|---|---|
| 9 | Professor: **Gestão > Novo curso**, título "Meu curso de teste", clique em "Criar e configurar" | Abre a tela de gestão do curso; slug `meu-curso-de-teste` |
| 10 | Aba **Configurações**: altere o nível e a carga horária, salve | Mensagem "Configurações salvas." e valores atualizados |
| 11 | Desmarque "Curso publicado" e salve | Como `demo@atlas.local`, o curso some da biblioteca e `/cursos/meu-curso-de-teste` dá "Curso não encontrado" |
| 12 | Marque novamente "Curso publicado" | Curso volta a aparecer para o aluno |
| 13 | Tente criar outro curso com o mesmo título | Erro "Já existe um curso com este identificador" |
| 14 | Como `professor@atlas.local`, abra o curso "Lógica de Programação" pela gestão e tente salvar uma alteração | Permitido (o professor leciona todos os cursos do seed) |
| 15 | Como admin, crie um curso (**Gestão > Novo curso**). Como `professor@atlas.local`, acesse `/gestao/cursos/<slug-do-curso>` | "Você não tem permissão para gerenciar este curso" (professor não leciona esse curso) |
| 16 | Como professor, exclua o curso "Meu curso de teste" | Curso removido da lista |
| 17 | Como professor, tente excluir o curso criado pelo admin (passo 15) | Não aparece o botão "Excluir"; se chamado diretamente, erro 403 |
| 18 | Como admin, exclua o curso criado no passo 15 | Curso removido |

### 8.3 Seções, recursos e atividades

Use o curso de teste criado no passo 9 (ou crie outro).

| # | Ação | Resultado esperado |
|---|---|---|
| 19 | Aba **Conteúdo** > "+ Nova seção" > "Semana 1" > "Criar seção" | Seção aparece na lista |
| 20 | Expanda "Semana 1" > "+ Adicionar recurso": tipo **Vídeo**, título "Aula 1", URL `https://www.youtube.com/embed/zOjov-2OZ0E` | Recurso listado com o rótulo "Vídeo" |
| 21 | Adicione um recurso tipo **Página** sem conteúdo | Erro "Recursos do tipo página precisam de conteúdo" |
| 22 | Adicione um recurso tipo **Link externo** com URL `exemplo.com` (sem https) | Erro "Informe uma URL válida" |
| 23 | Adicione um recurso tipo **Página** com texto | Recurso criado |
| 24 | "+ Adicionar questão": enunciado "2+2?", alternativas `3`, `4`, `5`, correta = `2` | Questão listada com "Correta: 4" |
| 25 | Adicione questão com correta = `9` (fora do intervalo) | Erro "Indique qual alternativa é a correta" |
| 26 | Clique em **Editar** numa questão, troque a correta para `3`, salve | "Correta: 5" |
| 27 | Use **Subir/Descer** em uma seção e em um recurso | A ordem muda; Subir na primeira e Descer na última ficam desabilitados |
| 28 | Clique em **Ocultar** num recurso | Badge "Oculto". Como aluno, o recurso some da página do curso |
| 29 | Clique em **Mostrar** no mesmo recurso | Volta a aparecer para o aluno |
| 30 | **Editar** uma seção e renomeie | Título atualizado |
| 31 | **Excluir** um recurso | Recurso removido |
| 32 | **Excluir** uma seção | Seção e seus itens removidos |
| 33 | Em **Projeto final**, preencha título e descrição, salve | "Projeto final salvo." |

### 8.4 Participantes (matrículas e papéis no curso)

| # | Ação | Resultado esperado |
|---|---|---|
| 34 | Aba **Participantes** | Lista com o professor (docente) e os alunos matriculados |
| 35 | Inscreva `aluna@atlas.local` com papel "Aluno" | Aluna aparece na lista |
| 36 | Inscreva a mesma aluna de novo | Erro "Este usuário já está inscrito no curso" |
| 37 | Inscreva um e-mail inexistente | Erro "Usuário não encontrado" |
| 38 | Como professor, tente promover um aluno a Docente (campo de papel na tabela) | Opção "Docente" desabilitada |
| 39 | Como admin, inscreva `aluna@atlas.local` com papel "Docente" | Erro "Promova a conta para o papel de professor..." (conta de aluno) |
| 40 | Clique em **Suspender** em uma aluna matriculada | Situação "Suspensa". Como a aluna, abrir o curso mostra "Sua inscrição neste curso está suspensa" |
| 41 | Clique em **Reativar** | Acesso volta |
| 42 | Veja a coluna **Progresso** de um aluno que concluiu aulas (como o `demo@atlas.local` no seed) | Percentual, aulas, testes e projeto, além de "Apto a certificado" quando completo |

### 8.5 Grupos

| # | Ação | Resultado esperado |
|---|---|---|
| 43 | Aba **Grupos** > criar "Equipe A" com descrição | Grupo listado com "0 aluno(s)" |
| 44 | Crie outro grupo chamado "equipe a" (minúsculas) | Erro "Já existe um grupo com este nome" |
| 45 | Em "Equipe A", selecione `aluna@atlas.local` e clique em "Adicionar ao grupo" | Aluna aparece na lista do grupo |
| 46 | Selecione um administrador ou conta não matriculada (se disponível no seletor) | Não aparece no seletor; a API recusa com "Somente alunos matriculados..." |
| 47 | Clique em **Remover do grupo** | Aluna sai do grupo |
| 48 | Renomeie o grupo com **Editar** | Nome atualizado |
| 49 | Entre como `aluna@atlas.local` e abra `/cursos/<slug>/` do curso com grupos | Ela vê apenas os próprios grupos, sem a lista de colegas |
| 50 | Como professor, remova a aluna do curso (**Remover**) | Ela sai da lista de participantes e também dos grupos |
| 51 | **Excluir grupo** | Grupo removido; os alunos continuam matriculados |

### 8.6 Progresso, quizzes e certificado (fluxo do aluno)

| # | Ação | Resultado esperado |
|---|---|---|
| 52 | Como `demo@atlas.local`, abra "Lógica de Programação" e clique em "Marcar como concluída" numa aula | Botão muda para "Aula concluída"; barra de progresso sobe |
| 53 | Responda o quiz de uma seção, errando uma questão, e envie | "Ainda não foi desta vez" |
| 54 | Responda certo e envie | "Parabéns! Você passou neste quiz." |
| 55 | Tente gerar certificado em um curso incompleto (em **Certificados**) | Botão desabilitado |
| 56 | Conclua todas as aulas, todos os quizzes e marque o projeto final | Aviso "Requisitos completos..." e botão de gerar certificado habilitado |
| 57 | Gere o certificado, visualize e baixe o PNG | Certificado gerado e download funcionando |
| 58 | Recarregue o dashboard | Certificado e progresso mantidos |

### 8.7 Administração de contas (admin)

| # | Ação | Resultado esperado |
|---|---|---|
| 59 | **Usuários > Nova conta**: crie um professor | Conta criada e listada |
| 60 | Crie uma conta com e-mail já usado | Erro "Já existe uma conta com este e-mail" |
| 61 | Altere o papel de um aluno para Professor | Papel atualizado na tabela |
| 62 | **Desativar** uma conta | Situação "Desativada"; o login dessa conta retorna erro |
| 63 | **Reativar** a mesma conta | Login volta a funcionar |
| 64 | Tente desativar ou rebaixar a própria conta | Botões desabilitados; a API recusa com mensagem clara |
| 65 | **Excluir** uma conta de teste | Conta removida, com matrículas, grupos e progresso |

### 8.8 Funções que já existiam (regressão)

| # | Ação | Resultado esperado |
|---|---|---|
| 66 | **Cadastro** com e-mail em maiúsculas | Conta criada com e-mail em minúsculas |
| 67 | Login com a mesma conta usando maiúsculas | Entra normalmente |
| 68 | Login com senha errada | "Credenciais inválidas." |
| 69 | **Anotações**: criar, editar, excluir e buscar tags | Tudo funciona; anotações ordenadas pela última edição |
| 70 | **Editor** (laboratório JavaScript): rodar o código de exemplo | Saída "Olá, Atlas - Geração Tech!" |
| 71 | **Dark mode / Light mode** | Alterna e persiste ao recarregar |
| 72 | **Perfil** | Mostra nome, e-mail, papel, objetivo e data de cadastro |
| 73 | **Página inicial** sem login | Lista os 6 cursos do catálogo |
| 74 | Aluno sem login acessa `/dashboard` | Redireciona para `/entrar` |

### 8.9 Backup, restauração e Digital College

| # | Ação | Resultado esperado |
|---|---|---|
| 75 | Como professor, abra "Lógica de Programação" > aba **Backup** > **Baixar backup** | Baixa `logica-de-programacao.atlas-backup.json` |
| 76 | Na mesma aba, **Escolher arquivo...** e envie o arquivo baixado no passo 75 | Pede confirmação; ao confirmar, mostra "Conteúdo restaurado a partir do backup." e o conteúdo permanece igual |
| 77 | Em **Gestão de cursos**, **Importar arquivo...** com o mesmo JSON | Cria `logica-de-programacao-2`, oculto e sem autoinscrição, com o mesmo conteúdo |
| 78 | Edite o JSON, troque o campo `"type"` de um recurso para `"ftp"` e importe | Erro "O recurso ... tem um tipo inválido." |
| 79 | Como aluno, tente `GET /api/courses/logica-de-programacao/backup` (ou restaure um backup pela API) | Erro 403 |
| 80 | Como `demo@atlas.local`, abra `/digital-college` | 9 formações com as cores da Digital College; todas "Em breve" enquanto não houver curso publicado |
| 81 | Como admin, publique uma formação importada e volte à página da Digital College | A formação aparece como "Disponível" e abre o curso |
| 82 | Na barra lateral de qualquer usuário logado, clique em **Digital College** | Abre a mesma página |

## 9. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `DATABASE_URL is not configured` | `server/.env` ausente | Crie o arquivo (seção 4) |
| `Esquema não encontrado` | Migração não aplicada | `npm run db:migrate` |
| `self-signed certificate` ao conectar no Supabase | SSL/CA | Mantenha `DATABASE_SSL=true` (padrão) |
| `ENOTFOUND db.<ref>.supabase.co` em Vercel/IPv4 | Host direto só com IPv6 em alguns planos | Use o "Transaction pooler" (porta 6543) |
| Front-end sem dados | `VITE_API_URL` apontando para outra porta | Ajuste `client/.env` e reinicie o Vite |
| CORS bloqueado | `CLIENT_URL` diferente da origem do front | Ajuste `CLIENT_URL` (aceita lista separada por vírgula) |
| Não consigo entrar com nenhuma conta | `npm run seed` nunca foi rodado nesse banco | Rode `npm run db:migrate` e `npm run seed` em `server/`, ou crie conta em `/cadastro` e use `npm run set-role` |
| Formações não aparecem para o aluno | Estão ocultas até serem publicadas | Publique o curso em **Gestão > curso > Configurações**; ou rode `npm run catalog:sync` se faltarem no banco |

## Roteiro: layouts, tema e migração do Moodle

Pré-requisito: banco migrado (`npm run db:migrate`) e seed executado (`npm run seed`), ambos dentro de `server/`.

1. **Criar curso com layout:** entre como professor@atlas.local > Gestão de cursos > *Novo curso* e escolha um layout no campo *Layout*. Salve e confirme que o curso abre com o layout escolhido.
2. **Editar identidade visual:** abra o curso > Gestão > **Configurações**. Troque o layout (a prévia muda na hora), a cor principal, a cor de destaque, a fonte, o arredondamento e a densidade. Salve e recarregue a página do curso: as mudanças devem permanecer.
3. **Banner e logo:** informe uma URL `https://` de imagem em *Banner* e em *Logo*. Uma URL `http://` ou fora de formato deve ser recusada com mensagem em português.
4. **Material se adapta:** cadastre uma página (tipo *Página*) com HTML contendo `style="color:red"`, `<script>` e um iframe do YouTube. Abra a aula como aluno: o estilo inline e o script não devem aparecer, e o vídeo deve carregar.
5. **Converter um backup do Moodle:** dentro de `server/`, rode `node scripts/convertMoodleBackup.js <arquivo.mbz> <saida.json> --slug <slug> --layout classico --report <relatorio.md>`. O relatório lista o que foi migrado e o que ficou de fora.
6. **Restaurar no curso:** Gestão > curso > aba **Backup** > *Escolher arquivo* e selecione o JSON gerado. Seções, aulas e questões devem aparecer; título, layout e matrículas são mantidos.

7. **Tela do aluno:** entre como aluno e abra um curso. Na primeira vez aparece a janela de boas-vindas (depois fica disponível pelo botão *Como usar*). Confira:
   - o menu lateral recolhe pelo botão « e o conteúdo ocupa a tela;
   - a trilha à esquerda mostra módulos > unidades > aulas, e recolhe pelo botão ‹;
   - cada módulo, unidade e aula abre e fecha pelo título;
   - ao marcar uma aula como concluída, a barra no topo e a trilha atualizam na hora;
   - o nome do aluno aparece no lugar de `{GENERICO:type=NomeUsuario}`, e os vídeos do Moodle carregam como vídeo, não como texto.
8. **Unidades:** em Gestão > curso > seção, cada recurso tem o campo *Unidade (opcional)*. Recursos com o mesmo nome de unidade ficam agrupados na tela do aluno.

9. **Quiz do módulo:** abra uma seção e clique em *Fazer o quiz*. Cada resposta é corrigida na hora (correta em verde, errada em vermelho), com o motivo e a explicação. Ao final, o resultado é salvo. Em Gestão > curso > seção > questões, *Feedback por alternativa* e *Explicação geral* aparecem para o professor.

10. **Modelo de conteúdo:** toda aula é exibida no desenho de `docs/MODELO-DE-CONTEUDO.md`. Confira em uma aula com notas (Dica, Nota), código e listas. Só as cores mudam por curso (em Gestão > curso > Configurações). Confira também: o bloco com ícone e o cartão "Parabéns" aparecem inteiros; os quizzes "Teste seu Conhecimento" pintam a escolha em verde/vermelho ao clicar; o modo escuro escurece o conteúdo.

### Limites conhecidos da migração

- Arquivos anexados (`@@PLUGINFILE@@`: imagens e PDFs) não são migrados; não há armazenamento de arquivos ainda.
- Atividades de presença e a pasta "Conteúdo de Aprofundamento" não são migradas.
- Tentativas e notas de questionários do Moodle não são migradas.
- Capítulos de livro e rótulos viram páginas.
- O projeto final é migrado só como título e descrição (não há entrega de arquivo).
- Questões de múltipla escolha com mais de uma resposta correta são ignoradas e listadas no relatório.
- Cursos importados ficam ocultos e sem autoinscrição até o docente publicar.

## Roteiro: editor visual de aulas

1. Crie a variável `SUPABASE_MEDIA_BUCKET` e confirme que `SUPABASE_SERVICE_ROLE_KEY` está no `.env` do servidor. Reinicie a API.
2. Em Gestão > curso > Seção > Recurso, abra uma aula de texto simples e use **Inserir imagem**. A imagem deve aparecer no editor.
3. Selecione uma imagem e troque o tamanho (Pequena/Média/Grande) e confira na aula do aluno.
4. Selecione uma palavra, aplique uma cor e salve. Confira que a cor aparece na aula, e que o modo escuro ajusta o tom.
5. Abra uma aula do Moodle (com cartões e quiz). Ela deve abrir em HTML, com o aviso explicando o motivo.
