const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

// Teste de integração completo: sobe a API contra um PostgreSQL REAL e percorre o roteiro manual.
// Só roda com TEST_DATABASE_URL definida. ATENÇÃO: o seed APAGA os dados desse banco.
//   TEST_DATABASE_URL=postgres://... npm test
const TEST_DB = process.env.TEST_DATABASE_URL;
const serverDir = path.join(__dirname, '..');
const PORT = 5099;
const BASE = `http://127.0.0.1:${PORT}/api`;

const suite = TEST_DB ? describe : describe.skip;

suite('API integrada (PostgreSQL)', () => {
  let server;
  const env = {
    ...process.env,
    DATABASE_URL: TEST_DB,
    DATABASE_SSL: process.env.TEST_DATABASE_SSL || 'false',
    JWT_SECRET: 'integration-secret',
    JWT_EXPIRES_IN: '1h',
    PORT: String(PORT),
    NODE_ENV: 'development'
  };

  const tokens = {};

  async function call(method, route, { as, body } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (as) headers.authorization = `Bearer ${tokens[as]}`;
    const response = await fetch(`${BASE}${route}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  async function login(as, email) {
    const { body } = await call('POST', '/auth/login', { body: { email, password: '123456' } });
    tokens[as] = body.token;
    return body.user;
  }

  before(async () => {
    const seeded = spawnSync(process.execPath, ['data/seed.js'], {
      cwd: serverDir,
      env,
      encoding: 'utf8'
    });
    assert.equal(seeded.status, 0, `seed falhou: ${seeded.stderr || seeded.stdout}`);

    server = spawn(process.execPath, ['index.js'], { cwd: serverDir, env });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('API não iniciou a tempo.')), 15000);
      server.stdout.on('data', (chunk) => {
        if (String(chunk).includes('running on port')) {
          clearTimeout(timer);
          resolve();
        }
      });
      server.stderr.on('data', (chunk) => process.stderr.write(chunk));
    });

    await login('admin', 'admin@atlas.local');
    await login('teacher', 'professor@atlas.local');
    await login('student', 'demo@atlas.local');
    await login('student2', 'aluna@atlas.local');
  });

  after(() => {
    if (server) server.kill();
  });

  // Estado compartilhado entre os passos do roteiro.
  const state = {};

  describe('Acesso e papéis', () => {
    test('catálogo público responde sem login e não expõe conteúdo', async () => {
      const { status, body } = await call('GET', '/catalog');
      assert.equal(status, 200);
      assert.equal(body.courses.length, 6);
      assert.equal(body.courses[0].modules, 2);
      assert.equal(body.courses[0].modules === undefined, false);
      assert.equal(body.courses[0].lessons, undefined);
    });

    test('rotas protegidas exigem token', async () => {
      const { status } = await call('GET', '/courses');
      assert.equal(status, 401);
    });

    test('aluno não cria cursos nem acessa gestão de usuários', async () => {
      assert.equal((await call('POST', '/courses', { as: 'student', body: { title: 'X' } })).status, 403);
      assert.equal((await call('GET', '/users', { as: 'student' })).status, 403);
      assert.equal((await call('GET', '/users', { as: 'teacher' })).status, 403);
    });

    test('aluna sem matrícula não acessa curso com autoinscrição desligada', async () => {
      const { status, body } = await call('GET', '/courses/git-github', { as: 'student2' });
      assert.equal(status, 403);
      assert.match(body.message, /não está inscrito/);
    });

    test('aluno acessa curso de autoinscrição e fica matriculado automaticamente', async () => {
      const { status, body } = await call('GET', '/courses/html-css', { as: 'student2' });
      assert.equal(status, 200);
      assert.equal(body.course.permissions.enrolled, true);
      assert.equal(body.course.permissions.canManage, false);
    });

    test('aluno não recebe nenhuma permissão de gestão no curso', async () => {
      const { body } = await call('GET', '/courses/logica-de-programacao', { as: 'student' });
      assert.equal(body.course.permissions.canManage, false);
      assert.equal(body.course.permissions.canDelete, false);
    });
  });

  describe('Cursos: criar, editar, ocultar e excluir', () => {
    test('docente cria um curso e vira docente dele', async () => {
      const { status, body } = await call('POST', '/courses', {
        as: 'teacher',
        body: {
          title: 'Curso de Teste',
          summary: 'Resumo',
          level: 'Intermediário',
          estimatedHours: 3,
          accent: '#22c55e'
        }
      });
      assert.equal(status, 201);
      assert.equal(body.course.slug, 'curso-de-teste');
      assert.equal(body.course.permissions.canManage, true);
      assert.equal(body.course.permissions.canDelete, true);
      state.courseSlug = body.course.slug;
    });

    test('slug duplicado é recusado', async () => {
      const { status } = await call('POST', '/courses', { as: 'teacher', body: { title: 'Curso de Teste' } });
      assert.equal(status, 409);
    });

    test('edita os dados do curso', async () => {
      const { status, body } = await call('PUT', `/courses/${state.courseSlug}`, {
        as: 'teacher',
        body: { title: 'Curso de Teste Editado', accent: 'cor-invalida', estimatedHours: 5 }
      });
      assert.equal(status, 200);
      assert.equal(body.course.title, 'Curso de Teste Editado');
      assert.equal(body.course.accent, '#6366f1', 'cor inválida volta ao padrão');
      assert.equal(body.course.estimatedHours, 5);
    });

    test('professor que não leciona o curso não consegue editá-lo', async () => {
      // O professor do seed leciona os cursos do catálogo; por isso usamos um curso criado pelo admin.
      const created = await call('POST', '/courses', { as: 'admin', body: { title: 'Curso Fora da Equipe' } });
      state.foreignCourse = created.body.course.slug;

      const { status } = await call('PUT', `/courses/${state.foreignCourse}`, {
        as: 'teacher',
        body: { title: 'Invadido' }
      });
      assert.equal(status, 403);
    });

    test('curso oculto some da lista dos alunos, mas continua visível ao docente', async () => {
      await call('PUT', `/courses/${state.courseSlug}`, { as: 'teacher', body: { visible: false } });

      const studentList = await call('GET', '/courses', { as: 'student' });
      assert.equal(studentList.body.courses.some((c) => c.slug === state.courseSlug), false);

      const teacherList = await call('GET', '/courses', { as: 'teacher' });
      assert.equal(teacherList.body.courses.some((c) => c.slug === state.courseSlug), true);

      assert.equal((await call('GET', `/courses/${state.courseSlug}`, { as: 'student' })).status, 404);
      await call('PUT', `/courses/${state.courseSlug}`, { as: 'teacher', body: { visible: true } });
    });

    test('somente o admin ou o criador exclui o curso', async () => {
      const created = await call('POST', '/courses', { as: 'admin', body: { title: 'Curso do Admin' } });
      state.adminCourse = created.body.course.slug;

      const forbidden = await call('DELETE', `/courses/${state.adminCourse}`, { as: 'teacher' });
      assert.equal(forbidden.status, 403);

      const allowed = await call('DELETE', `/courses/${state.adminCourse}`, { as: 'admin' });
      assert.equal(allowed.status, 200);
      assert.equal((await call('GET', `/courses/${state.adminCourse}`, { as: 'admin' })).status, 404);
    });
  });

  describe('Seções, recursos e atividades', () => {
    test('adiciona seção, recurso de vídeo, recurso de página e questão', async () => {
      const section = await call('POST', `/courses/${state.courseSlug}/modules`, {
        as: 'teacher',
        body: { title: 'Seção 1', description: 'Primeira seção' }
      });
      assert.equal(section.status, 201);
      state.sectionId = section.body.course.modules[0].id;

      const video = await call('POST', `/courses/${state.courseSlug}/modules/${state.sectionId}/lessons`, {
        as: 'teacher',
        body: { title: 'Vídeo', type: 'video', url: 'https://www.youtube.com/embed/abc', content: 'Texto' }
      });
      assert.equal(video.status, 201);
      state.videoId = video.body.course.modules[0].lessons[0].id;

      const page = await call('POST', `/courses/${state.courseSlug}/modules/${state.sectionId}/lessons`, {
        as: 'teacher',
        body: { title: 'Leitura', type: 'page', content: 'Conteúdo da página' }
      });
      assert.equal(page.status, 201);
      state.pageId = page.body.course.modules[0].lessons[1].id;

      const question = await call('POST', `/courses/${state.courseSlug}/modules/${state.sectionId}/questions`, {
        as: 'teacher',
        body: { question: 'Quanto é 2+2?', options: ['3', '4', '5'], answer: 1 }
      });
      assert.equal(question.status, 201);
      state.questionId = question.body.course.modules[0].quiz[0].id;
    });

    test('validações: URL inválida, página sem conteúdo, resposta fora do intervalo', async () => {
      const base = `/courses/${state.courseSlug}/modules/${state.sectionId}`;
      assert.equal(
        (await call('POST', `${base}/lessons`, { as: 'teacher', body: { title: 'X', type: 'link', url: 'não é url' } })).status,
        400
      );
      assert.equal(
        (await call('POST', `${base}/lessons`, { as: 'teacher', body: { title: 'X', type: 'page', content: '' } })).status,
        400
      );
      assert.equal(
        (await call('POST', `${base}/questions`, { as: 'teacher', body: { question: 'Q', options: ['a', 'b'], answer: 5 } })).status,
        400
      );
      assert.equal(
        (await call('POST', `${base}/questions`, { as: 'teacher', body: { question: 'Q', options: ['só uma'], answer: 0 } })).status,
        400
      );
    });

    test('edita seção, recurso e questão', async () => {
      const base = `/courses/${state.courseSlug}/modules/${state.sectionId}`;
      const section = await call('PUT', base, { as: 'teacher', body: { title: 'Seção renomeada' } });
      assert.equal(section.body.course.modules[0].title, 'Seção renomeada');

      const lesson = await call('PUT', `${base}/lessons/${state.videoId}`, {
        as: 'teacher',
        body: { title: 'Vídeo editado', visible: false }
      });
      assert.equal(lesson.body.course.modules[0].lessons[0].title, 'Vídeo editado');

      const question = await call('PUT', `${base}/questions/${state.questionId}`, {
        as: 'teacher',
        body: { answer: 0 }
      });
      assert.equal(question.body.course.modules[0].quiz[0].answer, 0);
    });

    test('recurso oculto some para o aluno e continua visível ao docente', async () => {
      const asStudent = await call('GET', `/courses/${state.courseSlug}`, { as: 'student' });
      const studentLessons = asStudent.body.course.modules[0].lessons.map((l) => l.id);
      assert.equal(studentLessons.includes(state.videoId), false);

      const asTeacher = await call('GET', `/courses/${state.courseSlug}`, { as: 'teacher' });
      assert.equal(asTeacher.body.course.modules[0].lessons.some((l) => l.id === state.videoId), true);

      await call('PUT', `/courses/${state.courseSlug}/modules/${state.sectionId}/lessons/${state.videoId}`, {
        as: 'teacher',
        body: { visible: true }
      });
    });

    test('reordena seções e recursos para cima e para baixo', async () => {
      const second = await call('POST', `/courses/${state.courseSlug}/modules`, {
        as: 'teacher',
        body: { title: 'Seção 2' }
      });
      const secondId = second.body.course.modules[1].id;

      const moved = await call('POST', `/courses/${state.courseSlug}/modules/${secondId}/move`, {
        as: 'teacher',
        body: { direction: 'up' }
      });
      assert.deepEqual(moved.body.course.modules.map((m) => m.title), ['Seção 2', 'Seção renomeada']);

      const movedBack = await call('POST', `/courses/${state.courseSlug}/modules/${secondId}/move`, {
        as: 'teacher',
        body: { direction: 'down' }
      });
      assert.deepEqual(movedBack.body.course.modules.map((m) => m.title), ['Seção renomeada', 'Seção 2']);

      const lessonMove = await call(
        'POST',
        `/courses/${state.courseSlug}/modules/${state.sectionId}/lessons/${state.pageId}/move`,
        { as: 'teacher', body: { direction: 'up' } }
      );
      assert.equal(lessonMove.body.course.modules[0].lessons[0].id, state.pageId);

      state.secondSectionId = secondId;
    });

    test('atualiza o projeto final', async () => {
      const { body } = await call('PUT', `/courses/${state.courseSlug}/final-project`, {
        as: 'teacher',
        body: { title: 'Projeto', description: 'Entregue um app' }
      });
      assert.equal(body.course.finalProject.title, 'Projeto');
    });

    test('exclui questão, recurso e seção', async () => {
      const base = `/courses/${state.courseSlug}/modules/${state.sectionId}`;
      const q = await call('DELETE', `${base}/questions/${state.questionId}`, { as: 'teacher' });
      assert.equal(q.body.course.modules[0].quiz.length, 0);

      const l = await call('DELETE', `${base}/lessons/${state.videoId}`, { as: 'teacher' });
      assert.equal(l.body.course.modules[0].lessons.length, 1);

      const s = await call('DELETE', `/courses/${state.courseSlug}/modules/${state.secondSectionId}`, { as: 'teacher' });
      assert.equal(s.body.course.modules.length, 1);
    });

    test('professor que não leciona o curso não edita o conteúdo', async () => {
      const { status } = await call('POST', `/courses/${state.foreignCourse}/modules`, {
        as: 'teacher',
        body: { title: 'Invasão' }
      });
      assert.equal(status, 403);
    });
  });

  describe('Participantes (matrículas e papéis no curso)', () => {
    test('lista participantes com papel, status e progresso dos alunos', async () => {
      const { status, body } = await call('GET', `/courses/${state.courseSlug}/participants`, { as: 'teacher' });
      assert.equal(status, 200);
      const teacherRow = body.participants.find((p) => p.email === 'professor@atlas.local');
      assert.equal(teacherRow.role, 'teacher');
      assert.equal(teacherRow.progress, null);
    });

    test('matricula aluna por e-mail e impede matrícula duplicada', async () => {
      const first = await call('POST', `/courses/${state.courseSlug}/participants`, {
        as: 'teacher',
        body: { email: 'aluna@atlas.local', role: 'student' }
      });
      assert.equal(first.status, 201);

      const duplicate = await call('POST', `/courses/${state.courseSlug}/participants`, {
        as: 'teacher',
        body: { email: 'aluna@atlas.local' }
      });
      assert.equal(duplicate.status, 409);
    });

    test('docente só é atribuído a contas de professor e apenas pelo admin', async () => {
      const byTeacher = await call('POST', `/courses/${state.courseSlug}/participants`, {
        as: 'teacher',
        body: { email: 'demo@atlas.local', role: 'teacher' }
      });
      assert.equal(byTeacher.status, 403);

      const notTeacherAccount = await call('POST', `/courses/${state.courseSlug}/participants`, {
        as: 'admin',
        body: { email: 'aluna@atlas.local', role: 'teacher' }
      });
      assert.equal(notTeacherAccount.status, 400);
      assert.match(notTeacherAccount.body.message, /professor/);
    });

    test('suspender matrícula bloqueia o acesso do aluno ao curso', async () => {
      const { status } = await call('PATCH', `/courses/${state.courseSlug}/participants/${(await userId('aluna@atlas.local'))}`, {
        as: 'teacher',
        body: { status: 'suspended' }
      });
      assert.equal(status, 200);

      const blocked = await call('GET', `/courses/${state.courseSlug}`, { as: 'student2' });
      assert.equal(blocked.status, 403);
      assert.match(blocked.body.message, /suspensa/);

      await call('PATCH', `/courses/${state.courseSlug}/participants/${(await userId('aluna@atlas.local'))}`, {
        as: 'teacher',
        body: { status: 'active' }
      });
    });
  });

  describe('Grupos de alunos', () => {
    test('cria grupo e recusa nome duplicado', async () => {
      const created = await call('POST', `/courses/${state.courseSlug}/groups`, {
        as: 'teacher',
        body: { name: 'Equipe 1', description: 'Primeira equipe' }
      });
      assert.equal(created.status, 201);
      state.groupId = created.body.groups.find((g) => g.name === 'Equipe 1').id;

      const duplicate = await call('POST', `/courses/${state.courseSlug}/groups`, {
        as: 'teacher',
        body: { name: 'equipe 1' }
      });
      assert.equal(duplicate.status, 409);
    });

    test('associa aluna matriculada ao grupo', async () => {
      const aluna = await userId('aluna@atlas.local');
      const { status, body } = await call('POST', `/courses/${state.courseSlug}/groups/${state.groupId}/members`, {
        as: 'teacher',
        body: { userIds: [aluna] }
      });
      assert.equal(status, 200);
      const group = body.groups.find((g) => g.id === state.groupId);
      assert.deepEqual(group.members.map((m) => m.email), ['aluna@atlas.local']);
    });

    test('não associa quem não está matriculado no curso', async () => {
      const admin = await userId('admin@atlas.local');
      const { status, body } = await call('POST', `/courses/${state.courseSlug}/groups/${state.groupId}/members`, {
        as: 'teacher',
        body: { userIds: [admin] }
      });
      assert.equal(status, 400);
      assert.match(body.message, /matriculados/);
    });

    test('aluna vê apenas os próprios grupos', async () => {
      const { body } = await call('GET', `/courses/${state.courseSlug}/groups`, { as: 'student2' });
      assert.deepEqual(body.groups.map((g) => g.name), ['Equipe 1']);
      assert.equal(body.groups[0].members, undefined);
    });

    test('renomeia grupo e remove membro', async () => {
      const renamed = await call('PUT', `/courses/${state.courseSlug}/groups/${state.groupId}`, {
        as: 'teacher',
        body: { name: 'Equipe Alfa' }
      });
      assert.equal(renamed.body.groups.find((g) => g.id === state.groupId).name, 'Equipe Alfa');

      const aluna = await userId('aluna@atlas.local');
      const removed = await call('DELETE', `/courses/${state.courseSlug}/groups/${state.groupId}/members/${aluna}`, {
        as: 'teacher'
      });
      assert.equal(removed.body.groups.find((g) => g.id === state.groupId).members.length, 0);
    });

    test('ao sair do curso o aluno é removido dos grupos automaticamente', async () => {
      const aluna = await userId('aluna@atlas.local');
      await call('POST', `/courses/${state.courseSlug}/groups/${state.groupId}/members`, {
        as: 'teacher',
        body: { userIds: [aluna] }
      });

      const removed = await call('DELETE', `/courses/${state.courseSlug}/participants/${aluna}`, { as: 'teacher' });
      assert.equal(removed.status, 200);

      const { body } = await call('GET', `/courses/${state.courseSlug}/groups`, { as: 'teacher' });
      assert.equal(body.groups.find((g) => g.id === state.groupId).members.length, 0);
    });

    test('exclui grupo', async () => {
      const { body } = await call('DELETE', `/courses/${state.courseSlug}/groups/${state.groupId}`, { as: 'teacher' });
      assert.equal(body.groups.some((g) => g.id === state.groupId), false);
    });
  });

  describe('Progresso, certificado e relatório', () => {
    test('aluno conclui aula, faz quiz e vê o progresso no painel', async () => {
      const { body: course } = await call('GET', `/courses/${state.courseSlug}`, { as: 'student' });
      const lessonId = course.course.modules[0].lessons[0].id;
      const moduleId = course.course.modules[0].id;

      assert.equal((await call('POST', `/courses/${state.courseSlug}/progress/lesson`, { as: 'student', body: { lessonId } })).status, 200);
      assert.equal(
        (await call('POST', `/courses/${state.courseSlug}/progress/lesson`, { as: 'student', body: { lessonId: 'id-inexistente' } })).status,
        400
      );

      const quiz = await call('POST', `/courses/${state.courseSlug}/progress/quiz`, {
        as: 'student',
        body: { moduleId, result: { score: 1, total: 1, passed: true } }
      });
      assert.equal(quiz.body.progress.quizResults[moduleId].passed, true);

      const dashboard = await call('GET', '/users/dashboard', { as: 'student' });
      assert.equal(dashboard.body.progress[state.courseSlug].completedLessons.includes(lessonId), true);
    });

    test('certificado só é emitido quando todos os requisitos estão completos', async () => {
      const early = await call('POST', `/courses/${state.courseSlug}/certificate`, { as: 'student' });
      assert.equal(early.status, 400);

      const { body: course } = await call('GET', `/courses/${state.courseSlug}`, { as: 'student' });
      for (const module of course.course.modules) {
        for (const lesson of module.lessons) {
          await call('POST', `/courses/${state.courseSlug}/progress/lesson`, { as: 'student', body: { lessonId: lesson.id } });
        }
        await call('POST', `/courses/${state.courseSlug}/progress/quiz`, {
          as: 'student',
          body: { moduleId: module.id, result: { score: 1, total: 1, passed: true } }
        });
      }
      await call('POST', `/courses/${state.courseSlug}/progress/project`, { as: 'student' });

      const issued = await call('POST', `/courses/${state.courseSlug}/certificate`, { as: 'student' });
      assert.equal(issued.status, 201);
      assert.equal(issued.body.certificate.courseSlug, state.courseSlug);
    });

    test('relatório de participantes mostra o progresso do aluno', async () => {
      const { body } = await call('GET', `/courses/${state.courseSlug}/participants`, { as: 'teacher' });
      const row = body.participants.find((p) => p.email === 'demo@atlas.local');
      assert.equal(row.progress.certificateEligible, true);
      assert.equal(row.progress.percentage, 100);
    });

    test('excluir um recurso remove o progresso ligado a ele (sem contagem órfã)', async () => {
      const { body: course } = await call('GET', `/courses/${state.courseSlug}`, { as: 'teacher' });
      const lesson = course.course.modules[0].lessons[0];
      await call('DELETE', `/courses/${state.courseSlug}/modules/${course.course.modules[0].id}/lessons/${lesson.id}`, { as: 'teacher' });

      const { body: after } = await call('GET', `/courses/${state.courseSlug}/participants`, { as: 'teacher' });
      const row = after.participants.find((p) => p.email === 'demo@atlas.local');
      assert.equal(row.progress.totalLessons, 0);
      assert.equal(row.progress.completedLessons, 0);
    });
  });

  describe('Administração de contas', () => {
    test('admin lista, cria, altera papel e exclui contas', async () => {
      const list = await call('GET', '/users?q=aluna', { as: 'admin' });
      assert.equal(list.body.users.length, 1);

      const created = await call('POST', '/users', {
        as: 'admin',
        body: { name: 'Novo Professor', email: 'novo@atlas.local', password: '123456', role: 'teacher' }
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.user.role, 'teacher');
      assert.equal(created.body.user.passwordHash, undefined);

      const duplicate = await call('POST', '/users', {
        as: 'admin',
        body: { name: 'X', email: 'novo@atlas.local', password: '123456' }
      });
      assert.equal(duplicate.status, 409);

      const promoted = await call('PATCH', `/users/${created.body.user.id}`, {
        as: 'admin',
        body: { role: 'student' }
      });
      assert.equal(promoted.body.user.role, 'student');

      const deleted = await call('DELETE', `/users/${created.body.user.id}`, { as: 'admin' });
      assert.equal(deleted.status, 200);
    });

    test('admin não pode remover o próprio acesso', async () => {
      const self = await userId('admin@atlas.local');
      const demote = await call('PATCH', `/users/${self}`, { as: 'admin', body: { role: 'student' } });
      assert.equal(demote.status, 400);
      const deactivate = await call('PATCH', `/users/${self}`, { as: 'admin', body: { active: false } });
      assert.equal(deactivate.status, 400);
    });

    test('conta desativada não consegue entrar nem usar o token', async () => {
      const id = await userId('aluna@atlas.local');
      await call('PATCH', `/users/${id}`, { as: 'admin', body: { active: false } });

      const login = await call('POST', '/auth/login', { body: { email: 'aluna@atlas.local', password: '123456' } });
      assert.equal(login.status, 403);

      await call('PATCH', `/users/${id}`, { as: 'admin', body: { active: true } });
    });
  });

  describe('Fluxos existentes continuam funcionando', () => {
    test('cadastro, login, perfil e anotações', async () => {
      const register = await call('POST', '/auth/register', {
        body: { name: 'Nova Pessoa', email: 'Nova.Pessoa@Example.com', password: '123456' }
      });
      assert.equal(register.status, 201);
      assert.equal(register.body.user.email, 'nova.pessoa@example.com');
      assert.equal(register.body.user.role, 'student');

      const duplicate = await call('POST', '/auth/register', {
        body: { name: 'Outra', email: 'nova.pessoa@example.com', password: '123456' }
      });
      assert.equal(duplicate.status, 409);

      const login = await call('POST', '/auth/login', {
        body: { email: 'NOVA.PESSOA@example.com', password: '123456' }
      });
      assert.equal(login.status, 200);

      const me = await call('GET', '/auth/me', { as: 'student' });
      assert.equal(me.body.user.email, 'demo@atlas.local');

      const note = await call('POST', '/notes', { as: 'student', body: { title: 'T', content: 'C', tags: ['a'] } });
      assert.equal(note.status, 201);
      assert.ok(note.body.note._id);

      const updated = await call('PUT', `/notes/${note.body.note._id}`, { as: 'student', body: { title: 'T2', content: 'C2' } });
      assert.equal(updated.body.note.title, 'T2');

      const removed = await call('DELETE', `/notes/${note.body.note._id}`, { as: 'student' });
      assert.equal(removed.status, 200);
    });

    test('login com senha errada e token inválido são recusados', async () => {
      const wrong = await call('POST', '/auth/login', { body: { email: 'demo@atlas.local', password: 'errada' } });
      assert.equal(wrong.status, 401);

      tokens.fake = 'token.invalido.aqui';
      const fake = await call('GET', '/courses', { as: 'fake' });
      assert.equal(fake.status, 401);
    });
  });

  describe('backup de conteúdo e formações', () => {
    let exported;
    let importedSlug;

    test('formações do Geração Tech ficam ocultas e fora do catálogo público', async () => {
      const catalog = await call('GET', '/catalog');
      assert.equal(catalog.body.courses.some((course) => course.slug === 'full-cycle'), false);

      const managed = await call('GET', '/courses/full-cycle', { as: 'admin' });
      assert.equal(managed.status, 200);
      assert.equal(managed.body.course.visible, false);
    });

    test('professor exporta backup do curso que leciona, sem dados de alunos', async () => {
      const res = await call('GET', '/courses/logica-de-programacao/backup', { as: 'teacher' });
      assert.equal(res.status, 200);
      assert.equal(res.body.format, 'atlas-backup');
      assert.ok(res.body.course.modules.length > 0);
      assert.equal(JSON.stringify(res.body).includes('password'), false);
      assert.equal(JSON.stringify(res.body).includes('"id"'), false);
      exported = res.body;
    });

    test('aluno não exporta backup', async () => {
      const res = await call('GET', '/courses/logica-de-programacao/backup', { as: 'student' });
      assert.equal(res.status, 403);
    });

    test('importa backup como curso novo, oculto e com o mesmo conteúdo', async () => {
      const res = await call('POST', '/courses/import', { as: 'teacher', body: exported });
      assert.equal(res.status, 201);
      assert.equal(res.body.course.visible, false);
      assert.equal(res.body.course.selfEnrolment, false);
      assert.notEqual(res.body.course.slug, 'logica-de-programacao');
      assert.equal(res.body.course.modules.length, exported.course.modules.length);
      assert.equal(res.body.course.modules[0].title, exported.course.modules[0].title);
      assert.equal(res.body.course.modules[0].lessons.length, exported.course.modules[0].lessons.length);
      importedSlug = res.body.course.slug;
    });

    test('importação recusa arquivo inválido com mensagem clara', async () => {
      const wrongFormat = await call('POST', '/courses/import', { as: 'teacher', body: { format: 'outro' } });
      assert.equal(wrongFormat.status, 400);
      assert.match(wrongFormat.body.message, /Arquivo inválido/);

      const badQuiz = JSON.parse(JSON.stringify(exported));
      badQuiz.course.modules[0].quiz = [{ question: 'Quanto é 1+1?', options: ['2'], answer: 0 }];
      const res = await call('POST', '/courses/import', { as: 'teacher', body: badQuiz });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /alternativas/);
    });

    test('restaurar substitui o conteúdo e mantém título e configurações do curso', async () => {
      const edited = JSON.parse(JSON.stringify(exported));
      edited.course.title = 'Título que não deve mudar';
      edited.course.modules = [
        {
          title: 'Seção restaurada',
          description: '',
          visible: true,
          lessons: [{ title: 'Recurso restaurado', type: 'page', url: '', content: 'Olá', visible: true }],
          quiz: []
        }
      ];

      const res = await call('POST', `/courses/${importedSlug}/restore`, { as: 'teacher', body: edited });
      assert.equal(res.status, 200);
      assert.equal(res.body.course.title, exported.course.title);
      assert.equal(res.body.course.visible, false);
      assert.equal(res.body.course.modules.length, 1);
      assert.equal(res.body.course.modules[0].title, 'Seção restaurada');
    });

    test('aluno não restaura conteúdo de curso', async () => {
      const res = await call('POST', `/courses/${importedSlug}/restore`, { as: 'student', body: exported });
      assert.equal(res.status, 403);
    });
  });

  describe('layout e identidade visual', () => {
    test('layout e cores inválidos são recusados com mensagem clara', async () => {
      const badLayout = await call('PUT', '/courses/logica-de-programacao', { as: 'teacher', body: { layout: 'neon' } });
      assert.equal(badLayout.status, 400);
      assert.match(badLayout.body.message, /Valor inválido para layout/);

      const badColor = await call('PUT', '/courses/logica-de-programacao', { as: 'teacher', body: { theme: { primary: 'azul' } } });
      assert.equal(badColor.status, 400);
      assert.match(badColor.body.message, /#RRGGBB/);

      const badUrl = await call('PUT', '/courses/logica-de-programacao', { as: 'teacher', body: { theme: { bannerUrl: 'javascript:alert(1)' } } });
      assert.equal(badUrl.status, 400);
    });

    test('professor escolhe layout e tema; o curso devolve os valores salvos', async () => {
      const res = await call('PUT', '/courses/logica-de-programacao', {
        as: 'teacher',
        body: { layout: 'classico', accent: '#003366', theme: { primary: '#003366', accent: '#f59e0b', font: 'serifada', radius: 'reto', density: 'compacto' } }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.course.layout, 'classico');
      assert.equal(res.body.course.theme.primary, '#003366');
      assert.equal(res.body.course.theme.font, 'serifada');

      const catalog = await call('GET', '/catalog');
      const item = catalog.body.courses.find((course) => course.slug === 'logica-de-programacao');
      assert.equal(item.layout, 'classico');
    });

    test('restaurar backup mantém o layout escolhido no curso', async () => {
      const backup = await call('GET', '/courses/logica-de-programacao/backup', { as: 'teacher' });
      assert.equal(backup.body.course.layout, 'classico');

      const restored = await call('POST', '/courses/logica-de-programacao/restore', { as: 'teacher', body: backup.body });
      assert.equal(restored.status, 200);
      assert.equal(restored.body.course.layout, 'classico');
    });

    test('importação com layout inválido no backup é recusada', async () => {
      const backup = await call('GET', '/courses/logica-de-programacao/backup', { as: 'teacher' });
      const broken = JSON.parse(JSON.stringify(backup.body));
      broken.course.layout = 'inexistente';
      const res = await call('POST', '/courses/import', { as: 'teacher', body: broken });
      assert.equal(res.status, 400);
    });
  });

  // Recupera o ID de um usuário pelo painel de admin.
  async function userId(email) {
    const { body } = await call('GET', `/users?q=${encodeURIComponent(email)}`, { as: 'admin' });
    return body.users.find((u) => u.email === email).id;
  }
});
