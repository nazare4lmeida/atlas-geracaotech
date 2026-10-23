# Init.dev - Code Listing\n\n## .env.example\n\n```bash\n# Root variables used by both apps

NODE_ENV=development

# Server

PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/init-dev
JWT_SECRET=change-me-with-a-long-random-string
JWT_EXPIRES_IN=7d

# Supabase placeholders for future media, analytics or auth integrations

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_ID=your-project-id

# Client

VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Init.dev
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
\n`\n\n## README.md\n\n`md\n# Init.dev

Init.dev is a full-stack educational platform focused on programming logic and modern web development. The project is split into a React + Vite client and an Express + MongoDB API, with environment placeholders prepared for Supabase integrations.

## Stack

- **Front-end:** React, Vite, React Router DOM, Axios
- **Back-end:** Node.js, Express, Mongoose, Bcrypt.js, Jsonwebtoken
- **Editor:** CodeMirror 6
- **Certificates:** Browser-generated PNG certificate download
- **Deployment:** Vercel-ready with `vercel.json`

## Important architecture note

The requested stack combines **Mongoose/MongoDB** with **Supabase**. Because Supabase is PostgreSQL-first and Mongoose is MongoDB-only, this starter keeps the application data layer in MongoDB through `MONGO_URI` and includes **Supabase environment placeholders** so the project is already prepared for future integrations such as media storage, edge functions, or analytics.

## Project structure

```text
init-dev/
├── client/
├── server/
├── .env.example
├── vercel.json
└── README.md
```

## Local setup

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Create environment files

Copy `.env.example` into:

- `server/.env`
- `client/.env`

Then adjust the values.

### 3. Start the API

```bash
cd server
npm run dev
```

### 4. Start the client

```bash
cd client
npm run dev
```

## Main features

- JWT authentication with protected routes
- Personal notes per authenticated student
- Course platform with:
  - Logic
  - HTML/CSS
  - JavaScript
  - React
  - Node.js
  - Git & GitHub
- Sequential modules and detailed lessons
- Video placeholders using YouTube embeds
- Module quizzes
- Final project completion tracking
- Progress bars and achievement badges
- Integrated JavaScript sandbox editor
- Automatic certificate generation when course requirements are met
- Dark mode and light mode with persistence

## Environment variables

### Server

- `PORT`
- `CLIENT_URL`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`

### Client

- `VITE_API_URL`
- `VITE_APP_NAME`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Deploy on Vercel

This repository already includes a `vercel.json` routing the Express API and the Vite front-end.

### Recommended structure on Vercel

- Import the repo
- Set **Root Directory** to project root
- Add environment variables from `.env.example`
- Build command for client: `cd client && npm install && npm run build`
- Output directory: `client/dist`

### Serverless API

The Express server is exposed through `server/index.js` and routed by `vercel.json`.

## How to create the zip

From the project parent folder:

```bash
zip -r init-dev.zip init-dev -x "*/node_modules/*" "*/dist/*"
```

On Windows PowerShell:

```powershell
Compress-Archive -Path .\init-dev\* -DestinationPath .\init-dev.zip -Force
```

\n`\n\n## client/index.html\n\n`html\n<!doctype html>

<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Init.dev</title>
    <meta
      name="description"
      content="Plataforma educacional moderna para lógica de programação e desenvolvimento web."
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
\n```\n\n## client/package.json\n\n```json\n{
  "name": "init-dev-client",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@codemirror/lang-javascript": "^6.2.2",
    "@codemirror/state": "^6.4.1",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@codemirror/view": "^6.36.1",
    "@uiw/react-codemirror": "^4.23.10",
    "axios": "^1.8.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.2.2"
  }
}
\n```\n\n## client/src/App.jsx\n\n```javascript\nimport { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import NotesPage from './pages/NotesPage';
import EditorPage from './pages/EditorPage';
import CertificatesPage from './pages/CertificatesPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
return (
<Routes>
<Route element={<AppShell />}>
<Route index element={<HomePage />} />
<Route path="/entrar" element={<LoginPage />} />
<Route path="/cadastro" element={<RegisterPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cursos"
          element={
            <ProtectedRoute>
              <CoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cursos/:slug"
          element={
            <ProtectedRoute>
              <CourseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/anotacoes"
          element={
            <ProtectedRoute>
              <NotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificados"
          element={
            <ProtectedRoute>
              <CertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>

);
}
\n`\n\n## client/src/components/AppShell.jsx\n\n`javascript\nimport { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppShell() {
return (

<div className="app-shell">
<Navbar />
<main className="main-content">
<Outlet />
</main>
</div>
);
}
\n`\n\n## client/src/components/CertificatePreview.jsx\n\n`javascript\nexport default function CertificatePreview({ name, courseName, issuedAt }) {
return (
<div className="certificate-preview" id="certificate-preview">
<div className="certificate-border">
<span className="eyebrow">Certificado de conclusão</span>
<h2>Init.dev</h2>
<p>Certificamos que</p>
<h3>{name}</h3>
<p>concluiu com aproveitamento a trilha</p>
<h4>{courseName}</h4>
<p>Data de emissão: {issuedAt}</p>
</div>
</div>
);
}
\n`\n\n## client/src/components/CodeEditorPanel.jsx\n\n`javascript\nimport { useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

const starterCode = `function saudacao(nome) {
return "Olá, " + nome + "!";
}

console.log(saudacao("Init.dev"));`;

export default function CodeEditorPanel() {
const [code, setCode] = useState(starterCode);
const [output, setOutput] = useState('');

const extensions = useMemo(() => [javascript({ jsx: false })], []);

const runCode = () => {
const logs = [];
const sandboxConsole = {
log: (...args) => logs.push(args.join(' '))
};

    try {
      const executor = new Function('console', code);
      executor(sandboxConsole);
      setOutput(logs.join('\n') || 'Código executado sem saída.');
    } catch (error) {
      setOutput(`Erro: ${error.message}`);
    }

};

const clearCode = () => {
setCode(starterCode);
setOutput('');
};

return (

<section className="editor-panel">
<div className="section-heading">
<h2>Laboratório JavaScript</h2>
<p>Edite, execute e valide ideias rapidamente no navegador.</p>
</div>

      <CodeMirror
        value={code}
        height="320px"
        theme={oneDark}
        extensions={extensions}
        onChange={(value) => setCode(value)}
      />

      <div className="editor-actions">
        <button type="button" className="primary-button" onClick={runCode}>
          Rodar código
        </button>
        <button type="button" className="ghost-button" onClick={clearCode}>
          Restaurar exemplo
        </button>
      </div>

      <div className="output-panel">
        <h3>Saída</h3>
        <pre>{output || 'Nenhuma execução ainda.'}</pre>
      </div>
    </section>

);
}
\n`\n\n## client/src/components/CourseCard.jsx\n\n`javascript\nimport { Link } from 'react-router-dom';
import { getBadgeLabel, getCourseProgress } from '../utils/courseProgress';

export default function CourseCard({ course, progress }) {
const summary = getCourseProgress(course, progress);

return (

<article className="course-card" style={{ '--accent': course.accent }}>
<div className="course-card-top">
<span className="course-level">{course.level}</span>
<span className="course-badge">{getBadgeLabel(summary.percentage)}</span>
</div>
<h3>{course.title}</h3>
<p>{course.summary}</p>
<div className="progress-block">
<div className="progress-meta">
<span>Progresso</span>
<strong>{summary.percentage}%</strong>
</div>
<div className="progress-bar">
<span style={{ width: `${summary.percentage}%` }} />
</div>
</div>
<div className="card-footer">
<span>{course.estimatedHours}h estimadas</span>
<Link to={`/cursos/${course.slug}`} className="text-link">
Ver curso
</Link>
</div>
</article>
);
}
\n`\n\n## client/src/components/HeroSection.jsx\n\n`javascript\nimport { Link } from 'react-router-dom';

export default function HeroSection() {
return (

<section className="hero">
<div className="hero-copy">
<span className="eyebrow">Plataforma educacional moderna</span>
<h1>Aprenda lógica e desenvolvimento web com uma trilha clara, prática e motivadora.</h1>
<p>
O Init.dev combina cursos estruturados, editor integrado, anotações pessoais,
quizzes, projetos finais e certificação para transformar estudo em evolução real.
</p>
<div className="hero-actions">
<Link to="/cadastro" className="primary-button as-link">
Começar agora
</Link>
<Link to="/entrar" className="ghost-button as-link">
Já tenho conta
</Link>
</div>
</div>

      <div className="hero-card">
        <div className="metric-card">
          <strong>6</strong>
          <span>Trilhas centrais</span>
        </div>
        <div className="metric-card">
          <strong>12+</strong>
          <span>Módulos guiados</span>
        </div>
        <div className="metric-card">
          <strong>100%</strong>
          <span>JavaScript</span>
        </div>
      </div>
    </section>

);
}
\n`\n\n## client/src/components/Navbar.jsx\n\n`javascript\nimport { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
const { theme, toggleTheme } = useTheme();
const { isAuthenticated, logout, user } = useAuth();
const navigate = useNavigate();

const handleLogout = () => {
logout();
navigate('/');
};

return (

<header className="navbar">
<Link to="/" className="brand">
<span className="brand-mark">Init</span>
<span className="brand-dot">.dev</span>
</Link>

      <nav className="nav-links">
        <NavLink to="/">Início</NavLink>
        {isAuthenticated && <NavLink to="/dashboard">Dashboard</NavLink>}
        {isAuthenticated && <NavLink to="/cursos">Cursos</NavLink>}
        {isAuthenticated && <NavLink to="/anotacoes">Anotações</NavLink>}
        {isAuthenticated && <NavLink to="/editor">Editor</NavLink>}
        {isAuthenticated && <NavLink to="/certificados">Certificados</NavLink>}
      </nav>

      <div className="nav-actions">
        <button type="button" className="ghost-button" onClick={toggleTheme}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        {isAuthenticated ? (
          <>
            <NavLink to="/perfil" className="nav-user">
              {user?.name?.split(' ')[0] || 'Perfil'}
            </NavLink>
            <button type="button" className="primary-button small" onClick={handleLogout}>
              Sair
            </button>
          </>
        ) : (
          <>
            <NavLink to="/entrar" className="ghost-button as-link">
              Entrar
            </NavLink>
            <NavLink to="/cadastro" className="primary-button small as-link">
              Criar conta
            </NavLink>
          </>
        )}
      </div>
    </header>

);
}
\n`\n\n## client/src/components/ProtectedRoute.jsx\n\n`javascript\nimport { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
const { isAuthenticated, loading } = useAuth();
const location = useLocation();

if (loading) {
return <div className="page-state">Carregando sua experiência...</div>;
}

if (!isAuthenticated) {
return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
}

return children;
}
\n`\n\n## client/src/components/QuizCard.jsx\n\n`javascript\nimport { useMemo, useState } from 'react';

export default function QuizCard({ quiz, onSubmit, previousResult }) {
const [answers, setAnswers] = useState(() => new Array(quiz.length).fill(null));
const [submitted, setSubmitted] = useState(false);

const score = useMemo(() => {
return answers.reduce((total, selected, index) => {
return total + (selected === quiz[index].answer ? 1 : 0);
}, 0);
}, [answers, quiz]);

const passed = score === quiz.length;

const handleAnswer = (questionIndex, optionIndex) => {
setAnswers((current) => {
const next = [...current];
next[questionIndex] = optionIndex;
return next;
});
};

const handleSubmit = (event) => {
event.preventDefault();
setSubmitted(true);
onSubmit({
score,
total: quiz.length,
passed
});
};

return (

<form className="quiz-card" onSubmit={handleSubmit}>
<div className="section-heading">
<h3>Quiz do módulo</h3>
<p>É preciso acertar todas as questões para liberar o certificado.</p>
</div>

      {quiz.map((question, index) => (
        <div key={question.question} className="quiz-question">
          <h4>{index + 1}. {question.question}</h4>
          <div className="quiz-options">
            {question.options.map((option, optionIndex) => (
              <label key={option} className="quiz-option">
                <input
                  type="radio"
                  name={`question-${index}`}
                  checked={answers[index] === optionIndex}
                  onChange={() => handleAnswer(index, optionIndex)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button type="submit" className="primary-button">
        Enviar respostas
      </button>

      {(submitted || previousResult) && (
        <div className={`quiz-feedback ${(previousResult || { passed }).passed ? 'ok' : 'error'}`}>
          {(previousResult || { passed }).passed
            ? 'Parabéns! Você passou neste quiz.'
            : 'Ainda não foi desta vez. Revise as aulas e tente novamente.'}
        </div>
      )}
    </form>

);
}
\n`\n\n## client/src/components/Sidebar.jsx\n\n`javascript\nimport { NavLink } from 'react-router-dom';

const items = [
{ to: '/dashboard', label: 'Visão geral' },
{ to: '/cursos', label: 'Cursos' },
{ to: '/anotacoes', label: 'Anotações' },
{ to: '/editor', label: 'Editor' },
{ to: '/certificados', label: 'Certificados' },
{ to: '/perfil', label: 'Perfil' }
];

export default function Sidebar() {
return (

<aside className="sidebar">
<p className="sidebar-title">Seu espaço</p>
{items.map((item) => (
<NavLink key={item.to} to={item.to} className="sidebar-link">
{item.label}
</NavLink>
))}
</aside>
);
}
\n`\n\n## client/src/context/AuthContext.jsx\n\n`javascript\nimport { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
const [token, setToken] = useState(() => localStorage.getItem('initdev-token'));
const [user, setUser] = useState(() => {
const stored = localStorage.getItem('initdev-user');
return stored ? JSON.parse(stored) : null;
});
const [loading, setLoading] = useState(Boolean(token));

const persistSession = (nextToken, nextUser) => {
localStorage.setItem('initdev-token', nextToken);
localStorage.setItem('initdev-user', JSON.stringify(nextUser));
setToken(nextToken);
setUser(nextUser);
};

const clearSession = () => {
localStorage.removeItem('initdev-token');
localStorage.removeItem('initdev-user');
setToken(null);
setUser(null);
};

const login = async (payload) => {
const { data } = await api.post('/auth/login', payload);
persistSession(data.token, data.user);
return data;
};

const register = async (payload) => {
const { data } = await api.post('/auth/register', payload);
persistSession(data.token, data.user);
return data;
};

const refreshProfile = useCallback(async () => {
if (!token) {
setLoading(false);
return;
}

    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('initdev-user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (error) {
      clearSession();
    } finally {
      setLoading(false);
    }

}, [token]);

const logout = () => {
clearSession();
};

useEffect(() => {
refreshProfile();
}, [refreshProfile]);

const value = useMemo(
() => ({
token,
user,
loading,
isAuthenticated: Boolean(token && user),
login,
register,
logout,
refreshProfile
}),
[token, user, loading, refreshProfile]
);

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
return useContext(AuthContext);
}
\n`\n\n## client/src/context/ThemeContext.jsx\n\n`javascript\nimport { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
const [theme, setTheme] = useState(() => localStorage.getItem('initdev-theme') || 'dark');

useEffect(() => {
document.documentElement.dataset.theme = theme;
localStorage.setItem('initdev-theme', theme);
}, [theme]);

const value = useMemo(
() => ({
theme,
toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
}),
[theme]
);

return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
return useContext(ThemeContext);
}
\n`\n\n## client/src/data/courses.js\n\n`javascript\nconst accentPalette = {
logic: '#6366f1',
htmlcss: '#14b8a6',
javascript: '#f59e0b',
react: '#38bdf8',
node: '#22c55e',
git: '#ef4444'
};

export const coursesCatalog = [
{
slug: 'logica-de-programacao',
key: 'logic',
title: 'Lógica de Programação',
summary: 'Construa pensamento computacional, algoritmos e resolução de problemas.',
accent: accentPalette.logic,
level: 'Iniciante',
estimatedHours: 12,
banner:
'Aprenda a transformar problemas do mundo real em passos claros, testáveis e reutilizáveis.',
finalProject: {
title: 'Projeto Final: Simulador de Rotina de Estudos',
description:
'Crie um algoritmo que receba metas, tempo disponível e prioridades para montar uma rotina semanal de estudos.'
},
modules: [
{
id: 'logic-1',
title: 'Pensamento computacional e algoritmos',
description:
'Entenda como decompor problemas, identificar padrões e escrever algoritmos descritivos.',
lessons: [
{
id: 'logic-1-1',
title: 'O que é lógica de programação',
videoUrl: 'https://www.youtube.com/embed/zOjov-2OZ0E',
content: `Lógica de programação é a habilidade de organizar raciocínio em etapas claras para que uma máquina consiga executar uma tarefa. Em vez de pensar apenas no código, você aprende a estruturar a solução. Isso inclui identificar entradas, processamento e saídas, além de prever erros e casos especiais.

Um bom algoritmo é legível, finito, ordenado e testável. Ao estudar lógica, você constrói a base para qualquer linguagem futura: JavaScript, Python, Java ou qualquer outra. O foco é aprender a pensar como desenvolvedor, modelando regras com precisão.`          },
          {
            id: 'logic-1-2',
            title: 'Fluxogramas e pseudocódigo',
            videoUrl: 'https://www.youtube.com/embed/XZwBNDGuWGU',
            content:`Fluxogramas ajudam a visualizar decisões, repetições e fluxo de dados. Já o pseudocódigo descreve a solução em linguagem humana estruturada. Esses dois recursos aceleram o entendimento do problema antes de implementar código real.

Ao praticar pseudocódigo, trabalhe com verbos objetivos, condições explícitas e passos curtos. Isso reduz ambiguidade e ajuda na transição para uma linguagem de programação.`          }
        ],
        quiz: [
          {
            question: 'Qual é o principal objetivo de um algoritmo?',
            options: [
              'Deixar o código mais bonito',
              'Descrever passos finitos para resolver um problema',
              'Escolher a linguagem ideal',
              'Substituir o banco de dados'
            ],
            answer: 1
          },
          {
            question: 'Qual recurso é mais visual para representar decisões?',
            options: ['Fluxograma', 'Banco relacional', 'Deploy', 'Framework'],
            answer: 0
          }
        ]
      },
      {
        id: 'logic-2',
        title: 'Variáveis, operadores e estruturas condicionais',
        description:
          'Descubra como armazenar dados, comparar valores e tomar decisões.',
        lessons: [
          {
            id: 'logic-2-1',
            title: 'Tipos de dados e variáveis',
            videoUrl: 'https://www.youtube.com/embed/6iF8Xb7Z3wQ',
            content:`Variáveis são espaços nomeados usados para guardar informações durante a execução do programa. Você pode armazenar números, textos, estados booleanos e até coleções de dados. Saber nomear variáveis corretamente aumenta muito a legibilidade.

Na prática, você deve pensar em tipos de dados com base no que será manipulado. Idade tende a ser número, nome tende a ser texto, status de matrícula tende a ser booleano. Essa clareza influencia decisões, validações e cálculos.`          },
          {
            id: 'logic-2-2',
            title: 'Condições, comparações e cenários',
            videoUrl: 'https://www.youtube.com/embed/4pYsp5m6u7M',
            content:`Estruturas condicionais permitem alterar o fluxo do programa com base em regras. Você avalia expressões e escolhe qual caminho seguir. Esse raciocínio aparece em autenticação, validação de formulários, filtros e muito mais.

Ao escrever condições, prefira expressões simples, bem nomeadas e fáceis de testar. Em sistemas reais, uma condição ruim pode gerar comportamentos inesperados ou até vulnerabilidades.`          }
        ],
        quiz: [
          {
            question: 'Quando usamos uma estrutura condicional?',
            options: [
              'Quando queremos repetir um bloco várias vezes',
              'Quando precisamos decidir entre caminhos possíveis',
              'Quando vamos estilizar uma página',
              'Quando faremos deploy'
            ],
            answer: 1
          },
          {
            question: 'Qual opção representa um dado booleano?',
            options: ['"Nazare"', '42', 'true', '[1,2,3]'],
            answer: 2
          }
        ]
      }
    ]
  },
  {
    slug: 'html-css',
    key: 'htmlcss',
    title: 'HTML & CSS',
    summary: 'Crie interfaces semânticas, responsivas e agradáveis.',
    accent: accentPalette.htmlcss,
    level: 'Iniciante',
    estimatedHours: 14,
    banner: 'Estruture páginas com semântica e estilize layouts modernos com CSS.',
    finalProject: {
      title: 'Projeto Final: Landing Page de Portfólio',
      description:
        'Desenvolva uma landing page responsiva com seções, CTA, cards e layout mobile-first.'
    },
    modules: [
      {
        id: 'html-1',
        title: 'Estrutura e semântica',
        description: 'Aprenda a montar documentos acessíveis e organizados.',
        lessons: [
          {
            id: 'html-1-1',
            title: 'Anatomia do HTML',
            videoUrl: 'https://www.youtube.com/embed/pQN-pnXPaVg',
            content:`HTML define a estrutura do conteúdo. Elementos semânticos como header, main, section, article e footer comunicam intenção para navegadores, leitores de tela e mecanismos de busca. Uma boa estrutura ajuda acessibilidade e manutenção.

Ao pensar em HTML, foque em significado antes de aparência. Isso facilita evoluções de layout e reduz dependência de divs genéricas.`          },
          {
            id: 'html-1-2',
            title: 'Formulários e acessibilidade',
            videoUrl: 'https://www.youtube.com/embed/fNcJuPIZ2WE',
            content:`Formulários são essenciais em aplicações reais. Labels, placeholders, validações e mensagens de erro claras afetam diretamente a experiência do usuário. Acessibilidade significa garantir navegação, leitura e interação com o maior número de pessoas possível.

Use label associado, textos de ajuda e hierarquia correta de títulos. Pequenos cuidados geram interfaces mais humanas.`          }
        ],
        quiz: [
          {
            question: 'Qual tag indica o conteúdo principal da página?',
            options: ['main', 'span', 'strong', 'style'],
            answer: 0
          },
          {
            question: 'Por que usar label em formulários?',
            options: [
              'Para adicionar animação',
              'Para melhorar acessibilidade e contexto do campo',
              'Para conectar banco de dados',
              'Para minificar CSS'
            ],
            answer: 1
          }
        ]
      },
      {
        id: 'html-2',
        title: 'CSS moderno e responsividade',
        description: 'Utilize flexbox, grid, variáveis e media queries.',
        lessons: [
          {
            id: 'html-2-1',
            title: 'Flexbox e Grid',
            videoUrl: 'https://www.youtube.com/embed/JJSoEo8JSnc',
            content:`Flexbox resolve alinhamento e distribuição em um eixo. Grid permite controlar linhas e colunas com mais precisão. Juntos, esses recursos cobrem a maior parte dos layouts modernos. Em vez de hacks antigos, você passa a pensar em composição.

Use flexbox para componentes lineares, como barras e menus. Use grid para páginas, cards e dashboards.`          },
          {
            id: 'html-2-2',
            title: 'Responsividade e design system',
            videoUrl: 'https://www.youtube.com/embed/srvUrASNj0s',
            content:`Responsividade é adaptar o layout a diferentes larguras e contextos. Isso não é só reduzir elementos: envolve priorização de conteúdo, tipografia escalável e espaçamento coerente. Já um design system ajuda a repetir padrões com consistência.

Variáveis CSS, tokens de cor e escala de espaçamento aceleram a manutenção e deixam a interface mais profissional.`          }
        ],
        quiz: [
          {
            question: 'Qual recurso é mais indicado para layouts bidimensionais?',
            options: ['Grid', 'Float', 'Position fixed', 'Transform'],
            answer: 0
          },
          {
            question: 'O que significa mobile-first?',
            options: [
              'Construir primeiro para telas menores e depois expandir',
              'Criar apenas apps nativos',
              'Usar somente JavaScript',
              'Ignorar acessibilidade'
            ],
            answer: 0
          }
        ]
      }
    ]
  },
  {
    slug: 'javascript',
    key: 'javascript',
    title: 'JavaScript',
    summary: 'Domine a linguagem da web com foco em lógica, DOM e assincronicidade.',
    accent: accentPalette.javascript,
    level: 'Intermediário',
    estimatedHours: 18,
    banner: 'Saia do básico e aprenda a transformar páginas em aplicações interativas.',
    finalProject: {
      title: 'Projeto Final: Task Manager',
      description:
        'Monte um gerenciador de tarefas com filtros, persistência local, validação e estatísticas.'
    },
    modules: [
      {
        id: 'js-1',
        title: 'Fundamentos da linguagem',
        description: 'Sintaxe, escopo, funções e manipulação de dados.',
        lessons: [
          {
            id: 'js-1-1',
            title: 'Variáveis, escopo e funções',
            videoUrl: 'https://www.youtube.com/embed/W6NZfCO5SIk',
            content:`JavaScript é a linguagem que dá comportamento à web. Ao dominar variáveis, funções e escopo, você aprende como o programa organiza estado e executa tarefas. Funções permitem reutilizar lógica, isolar responsabilidades e melhorar testes.

Também é importante entender a diferença entre escopo global, de função e de bloco. Essa distinção evita bugs difíceis ligados a reatribuições e closures.`          },
          {
            id: 'js-1-2',
            title: 'Arrays, objetos e métodos úteis',
            videoUrl: 'https://www.youtube.com/embed/R8rmfD9Y5-c',
            content:`Arrays e objetos são a base de qualquer aplicação JavaScript. Você usa arrays para listas e objetos para modelar entidades com propriedades. Métodos como map, filter e reduce tornam o código mais declarativo e legível.

Pensar em transformação de dados é uma habilidade central no front-end e no back-end.`          }
        ],
        quiz: [
          {
            question: 'Qual método retorna um novo array filtrado?',
            options: ['push', 'filter', 'forEach', 'sort'],
            answer: 1
          },
          {
            question: 'Funções ajudam principalmente a:',
            options: [
              'Repetir lógica sem organização',
              'Estilizar componentes',
              'Reutilizar comportamento e separar responsabilidades',
              'Substituir rotas'
            ],
            answer: 2
          }
        ]
      },
      {
        id: 'js-2',
        title: 'DOM, eventos e assincronicidade',
        description: 'Interaja com elementos e consuma dados externos.',
        lessons: [
          {
            id: 'js-2-1',
            title: 'Manipulação do DOM',
            videoUrl: 'https://www.youtube.com/embed/0ik6X4DJKCc',
            content:`O DOM representa a estrutura da página em objetos manipuláveis. Com JavaScript, você pode alterar texto, atributos, classes, estilos e reagir a eventos como clique, digitação e scroll.

O segredo é manter a lógica previsível. Eventos demais espalhados sem organização tornam a manutenção difícil.`          },
          {
            id: 'js-2-2',
            title: 'Promises, async/await e APIs',
            videoUrl: 'https://www.youtube.com/embed/PoRJizFvM7s',
            content:`Aplicações modernas dependem de comunicação assíncrona. Promises representam operações futuras e async/await facilita a leitura. Com isso você busca dados, envia formulários e integra serviços externos sem travar a interface.

Também é essencial lidar com erros, estados de carregamento e mensagens de feedback.`          }
        ],
        quiz: [
          {
            question: 'Qual sintaxe deixa código assíncrono mais legível?',
            options: ['switch', 'async/await', 'typeof', 'classList'],
            answer: 1
          },
          {
            question: 'O DOM representa:',
            options: [
              'A estrutura da página como objetos manipuláveis',
              'O banco de dados do navegador',
              'Um tipo de API de autenticação',
              'Um sistema de deploy'
            ],
            answer: 0
          }
        ]
      }
    ]
  },
  {
    slug: 'react',
    key: 'react',
    title: 'React',
    summary: 'Componentize interfaces e gerencie estado de forma escalável.',
    accent: accentPalette.react,
    level: 'Intermediário',
    estimatedHours: 16,
    banner: 'Aprenda a construir interfaces reativas, modulares e prontas para produto.',
    finalProject: {
      title: 'Projeto Final: Dashboard de Estudos',
      description:
        'Crie um dashboard com autenticação simulada, cards, rotas e gráficos simples.'
    },
    modules: [
      {
        id: 'react-1',
        title: 'Componentes, props e estado',
        description: 'Entenda a base do pensamento em componentes.',
        lessons: [
          {
            id: 'react-1-1',
            title: 'JSX e composição',
            videoUrl: 'https://www.youtube.com/embed/SqcY0GlETPk',
            content:`React permite compor interfaces a partir de componentes reutilizáveis. Cada componente recebe dados via props e pode manter estado interno. Isso ajuda a dividir aplicações grandes em partes pequenas, previsíveis e fáceis de testar.

Com JSX, você escreve uma sintaxe declarativa próxima do HTML, mas com o poder do JavaScript.`          },
          {
            id: 'react-1-2',
            title: 'useState e renderização',
            videoUrl: 'https://www.youtube.com/embed/O6P86uwfdR0',
            content:`Estado é o que muda com o tempo. Ao atualizar estado, o React recalcula a interface e re-renderiza o que é necessário. Pensar em fluxo de dados e origem da verdade é essencial para evitar inconsistências.

O estado deve morar no lugar mais apropriado, nem muito alto sem necessidade, nem muito baixo limitando reutilização.`          }
        ],
        quiz: [
          {
            question: 'Props servem para:',
            options: [
              'Passar dados de um componente para outro',
              'Criar banco de dados',
              'Executar queries SQL',
              'Substituir CSS'
            ],
            answer: 0
          },
          {
            question: 'Qual hook manipula estado local?',
            options: ['useMemo', 'useState', 'useNavigate', 'useRefetch'],
            answer: 1
          }
        ]
      },
      {
        id: 'react-2',
        title: 'Rotas, efeitos e arquitetura',
        description: 'Conecte telas e lide com efeitos colaterais.',
        lessons: [
          {
            id: 'react-2-1',
            title: 'React Router na prática',
            videoUrl: 'https://www.youtube.com/embed/Ul3y1LXxzdU',
            content:`Aplicações de página única precisam de navegação sem recarregar o navegador. O React Router resolve isso com rotas declarativas, parâmetros e navegação programática.

Você pode proteger telas, criar layouts compartilhados e organizar experiências complexas com clareza.`          },
          {
            id: 'react-2-2',
            title: 'useEffect e comunicação com APIs',
            videoUrl: 'https://www.youtube.com/embed/0ZJgIjIuY7U',
            content:`Efeitos colaterais incluem chamadas HTTP, timers e integrações externas. O useEffect ajuda a sincronizar essas ações com o ciclo de vida do componente. Porém, seu uso excessivo sem planejamento costuma gerar bugs de dependência.

Combine estado, serviços e componentes bem separados para manter o projeto saudável.`          }
        ],
        quiz: [
          {
            question: 'Quando normalmente usamos useEffect?',
            options: [
              'Para estilizar com CSS',
              'Para executar efeitos como chamadas de API',
              'Para criar tabelas no banco',
              'Para minificar imagens'
            ],
            answer: 1
          },
          {
            question: 'Qual biblioteca desta stack cuida das rotas?',
            options: ['Axios', 'Express', 'React Router Dom', 'Mongoose'],
            answer: 2
          }
        ]
      }
    ]
  },
  {
    slug: 'node-js',
    key: 'node',
    title: 'Node.js',
    summary: 'Crie APIs escaláveis com Express, middlewares e persistência.',
    accent: accentPalette.node,
    level: 'Intermediário',
    estimatedHours: 17,
    banner: 'Leve JavaScript para o servidor e entenda a base de aplicações web modernas.',
    finalProject: {
      title: 'Projeto Final: API de Conteúdo',
      description:
        'Implemente uma API CRUD com autenticação, validação e persistência de dados.'
    },
    modules: [
      {
        id: 'node-1',
        title: 'Fundamentos do back-end',
        description: 'Entenda requisições, respostas, rotas e middlewares.',
        lessons: [
          {
            id: 'node-1-1',
            title: 'Node.js e o ciclo request-response',
            videoUrl: 'https://www.youtube.com/embed/TlB_eWDSMt4',
            content:`Node.js permite executar JavaScript no servidor usando um modelo orientado a eventos. Em APIs, o coração do trabalho é receber requisições, processar regras e devolver respostas adequadas.

Compreender verbos HTTP, status codes e separação de responsabilidades é obrigatório para criar serviços confiáveis.`          },
          {
            id: 'node-1-2',
            title: 'Express e middlewares',
            videoUrl: 'https://www.youtube.com/embed/L72fhGm1tfE',
            content:`Express simplifica o roteamento e a composição do servidor. Middlewares interceptam a requisição para autenticar, validar, registrar logs e padronizar respostas.

Um bom pipeline de middlewares melhora segurança e manutenção.`          }
        ],
        quiz: [
          {
            question: 'Qual papel de um middleware no Express?',
            options: [
              'Interceptar a requisição para tratar algum comportamento',
              'Desenhar a interface visual',
              'Executar CSS',
              'Criar componentes React'
            ],
            answer: 0
          },
          {
            question: 'Em uma API REST, GET normalmente é usado para:',
            options: ['Ler dados', 'Apagar banco', 'Gerar CSS', 'Minificar imagens'],
            answer: 0
          }
        ]
      },
      {
        id: 'node-2',
        title: 'Autenticação e banco de dados',
        description: 'Proteja rotas e modele dados com consistência.',
        lessons: [
          {
            id: 'node-2-1',
            title: 'JWT e autenticação',
            videoUrl: 'https://www.youtube.com/embed/mbsmsi7l3r4',
            content:`JWT é uma forma compacta de representar identidade e autorização. Após login, o servidor assina um token que o cliente envia nas próximas requisições. No back-end, o token é validado antes de permitir acesso a rotas privadas.

É importante armazenar segredos com segurança e evitar expor dados sensíveis no payload.`          },
          {
            id: 'node-2-2',
            title: 'Modelagem com Mongoose',
            videoUrl: 'https://www.youtube.com/embed/DZBGEVgL2eE',
            content:`Mongoose organiza a camada de dados com schemas, validações e modelos. Você define formatos esperados, relacionamentos simples e timestamps, criando uma base mais previsível.

A modelagem correta evita inconsistências e simplifica consultas.`          }
        ],
        quiz: [
          {
            question: 'O JWT é normalmente enviado ao servidor em qual header?',
            options: ['Authorization', 'Accept-Language', 'Referer', 'User-Agent'],
            answer: 0
          },
          {
            question: 'Mongoose é usado para:',
            options: [
              'Criar interfaces em React',
              'Modelar dados MongoDB em aplicações Node',
              'Processar imagens',
              'Executar testes E2E'
            ],
            answer: 1
          }
        ]
      }
    ]
  },
  {
    slug: 'git-github',
    key: 'git',
    title: 'Git & GitHub',
    summary: 'Versione projetos, colabore em equipe e publique portfólio.',
    accent: accentPalette.git,
    level: 'Iniciante',
    estimatedHours: 8,
    banner: 'Entenda commits, branches, pull requests e fluxo de colaboração real.',
    finalProject: {
      title: 'Projeto Final: Portfólio Versionado',
      description:
        'Versione um projeto completo, crie branches temáticas e documente o repositório com README.'
    },
    modules: [
      {
        id: 'git-1',
        title: 'Versionamento local',
        description: 'Aprenda commits, staging e histórico.',
        lessons: [
          {
            id: 'git-1-1',
            title: 'Snapshot do projeto',
            videoUrl: 'https://www.youtube.com/embed/RGOj5yH7evk',
            content:`Git é um sistema de versionamento distribuído. Ele registra snapshots do projeto ao longo do tempo e permite voltar, comparar e evoluir com segurança. Em vez de salvar arquivos com nomes como final-v2-mesmo-agora, você passa a rastrear mudanças com contexto.

Commits bons contam a história do produto com clareza.`          },
          {
            id: 'git-1-2',
            title: 'Branches e organização',
            videoUrl: 'https://www.youtube.com/embed/e9lnsKot_SQ',
            content:`Branches permitem trabalhar em linhas paralelas sem quebrar a principal. Esse recurso é indispensável para times, revisões e experimentos. Você cria, testa, revisa e integra mudanças quando estiverem maduras.

Ao nomear branches e commits com consistência, a colaboração melhora muito.`          }
        ],
        quiz: [
          {
            question: 'O staging area serve para:',
            options: [
              'Selecionar mudanças que entrarão no próximo commit',
              'Hospedar o site',
              'Rodar banco de dados',
              'Gerar CSS'
            ],
            answer: 0
          },
          {
            question: 'Branches são úteis para:',
            options: [
              'Trabalhar em funcionalidades isoladas',
              'Apagar histórico',
              'Substituir README',
              'Remover autenticação'
            ],
            answer: 0
          }
        ]
      },
      {
        id: 'git-2',
        title: 'Colaboração no GitHub',
        description: 'Use remotos, pull requests e boas práticas de revisão.',
        lessons: [
          {
            id: 'git-2-1',
            title: 'Push, pull e sincronização',
            videoUrl: 'https://www.youtube.com/embed/HkdAHXoRtos',
            content:`Ao conectar um repositório local ao GitHub, você ganha um ponto de compartilhamento, backup e colaboração. Push envia commits, pull atualiza sua cópia local e fetch baixa referências sem mesclar automaticamente.

Esses comandos fazem parte do dia a dia de qualquer time.`          },
          {
            id: 'git-2-2',
            title: 'Pull requests e revisão',
            videoUrl: 'https://www.youtube.com/embed/8lGpZkjnkt4',
            content:`Pull requests organizam mudanças antes da integração final. Eles permitem discutir código, validar impacto, documentar contexto e reforçar qualidade. Saber abrir um bom PR é uma habilidade profissional importante.

Descreva objetivo, abordagem, testes e pontos de atenção com clareza.`
}
],
quiz: [
{
question: 'Qual recurso do GitHub é usado para revisar mudanças antes do merge?',
options: ['Pull request', 'Forklift', 'Pipeline DOM', 'Snippet SQL'],
answer: 0
},
{
question: 'O comando pull normalmente:',
options: [
'Baixa e integra mudanças do remoto',
'Apaga branches',
'Cria CSS',
'Gera certificado'
],
answer: 0
}
]
}
]
}
];

export function getCourseBySlug(slug) {
return coursesCatalog.find((course) => course.slug === slug);
}

export function getLessonCount(course) {
return course.modules.reduce((total, module) => total + module.lessons.length, 0);
}

export function getQuizCount(course) {
return course.modules.length;
}
\n`\n\n## client/src/hooks/useForm.js\n\n`javascript\nimport { useState } from 'react';

export default function useForm(initialState) {
const [values, setValues] = useState(initialState);

const handleChange = (event) => {
const { name, value, type, checked } = event.target;
setValues((current) => ({
...current,
[name]: type === 'checkbox' ? checked : value
}));
};

const setFieldValue = (name, value) => {
setValues((current) => ({
...current,
[name]: value
}));
};

const reset = () => setValues(initialState);

return { values, setValues, handleChange, setFieldValue, reset };
}
\n`\n\n## client/src/main.jsx\n\n`javascript\nimport React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
<React.StrictMode>
<BrowserRouter>
<ThemeProvider>
<AuthProvider>
<App />
</AuthProvider>
</ThemeProvider>
</BrowserRouter>
</React.StrictMode>
);
\n`\n\n## client/src/pages/CertificatesPage.jsx\n\n`javascript\nimport { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import CertificatePreview from '../components/CertificatePreview';
import api from '../services/api';
import { coursesCatalog } from '../data/courses';
import { useAuth } from '../context/AuthContext';
import { getCourseProgress } from '../utils/courseProgress';

export default function CertificatesPage() {
const [dashboard, setDashboard] = useState({ progress: {}, certificates: [] });
const [selectedCourse, setSelectedCourse] = useState(null);
const { user } = useAuth();

useEffect(() => {
api.get('/users/dashboard').then(({ data }) => setDashboard(data));
}, []);

const eligibleCourses = useMemo(() => {
return coursesCatalog.filter((course) =>
getCourseProgress(course, dashboard.progress[course.slug]).certificateEligible
);
}, [dashboard.progress]);

const createCertificate = async (courseSlug) => {
const { data } = await api.post(`/courses/${courseSlug}/certificate`);
setDashboard((current) => ({
...current,
certificates: [...current.certificates.filter((item) => item.courseSlug !== courseSlug), data.certificate]
}));
setSelectedCourse(data.certificate);
};

const downloadCertificate = () => {
if (!selectedCourse) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 12;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.font = '48px Arial';
    ctx.fillText('Certificado de Conclusão', canvas.width / 2, 170);

    ctx.font = '28px Arial';
    ctx.fillText('Init.dev certifica que', canvas.width / 2, 280);

    ctx.font = 'bold 56px Arial';
    ctx.fillText(user?.name || '', canvas.width / 2, 390);

    ctx.font = '28px Arial';
    ctx.fillText('concluiu com êxito o curso', canvas.width / 2, 500);

    ctx.font = 'bold 46px Arial';
    ctx.fillText(selectedCourse.courseName, canvas.width / 2, 610);

    ctx.font = '28px Arial';
    ctx.fillText(`Emitido em ${new Date(selectedCourse.issuedAt).toLocaleDateString('pt-BR')}`, canvas.width / 2, 730);

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedCourse.courseSlug}-certificado.png`;
    link.click();

};

return (

<div className="dashboard-layout">
<Sidebar />
<div className="dashboard-content">
<section className="section-heading">
<h1>Certificados</h1>
<p>Libere certificados ao concluir aulas, quizzes e projeto final.</p>
</section>

        <div className="course-grid">
          {coursesCatalog.map((course) => {
            const summary = getCourseProgress(course, dashboard.progress[course.slug]);
            const saved = dashboard.certificates.find((item) => item.courseSlug === course.slug);

            return (
              <article key={course.slug} className="surface-card">
                <h3>{course.title}</h3>
                <p>{summary.certificateEligible ? 'Elegível para certificação.' : 'Ainda faltam requisitos.'}</p>
                <div className="editor-actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!summary.certificateEligible}
                    onClick={() => createCertificate(course.slug)}
                  >
                    {saved ? 'Regenerar certificado' : 'Gerar certificado'}
                  </button>
                  {saved && (
                    <button type="button" className="ghost-button" onClick={() => setSelectedCourse(saved)}>
                      Visualizar
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {selectedCourse && (
          <section className="surface-card">
            <CertificatePreview
              name={user?.name || ''}
              courseName={selectedCourse.courseName}
              issuedAt={new Date(selectedCourse.issuedAt).toLocaleDateString('pt-BR')}
            />
            <button type="button" className="primary-button" onClick={downloadCertificate}>
              Baixar certificado em PNG
            </button>
          </section>
        )}

        {!selectedCourse && eligibleCourses.length > 0 && (
          <div className="alert success">
            Você já pode gerar certificado em {eligibleCourses.length} curso(s).
          </div>
        )}
      </div>
    </div>

);
}
\n`\n\n## client/src/pages/CourseDetailPage.jsx\n\n`javascript\nimport { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import QuizCard from '../components/QuizCard';
import api from '../services/api';
import { getCourseBySlug } from '../data/courses';
import { getCourseProgress } from '../utils/courseProgress';

export default function CourseDetailPage() {
const { slug } = useParams();
const course = useMemo(() => getCourseBySlug(slug), [slug]);
const [progressMap, setProgressMap] = useState({});
const [activeModuleId, setActiveModuleId] = useState(course?.modules?.[0]?.id || null);

useEffect(() => {
api.get('/users/dashboard').then(({ data }) => setProgressMap(data.progress || {}));
}, [slug]);

if (!course) {
return <div className="page-state">Curso não encontrado.</div>;
}

const progress = progressMap[course.slug] || {};
const summary = getCourseProgress(course, progress);
const activeModule = course.modules.find((module) => module.id === activeModuleId) || course.modules[0];

const markLesson = async (lessonId) => {
const { data } = await api.post(`/courses/${course.slug}/progress/lesson`, { lessonId });
setProgressMap((current) => ({ ...current, [course.slug]: data.progress }));
};

const submitQuiz = async (moduleId, result) => {
const { data } = await api.post(`/courses/${course.slug}/progress/quiz`, { moduleId, result });
setProgressMap((current) => ({ ...current, [course.slug]: data.progress }));
};

const completeProject = async () => {
const { data } = await api.post(`/courses/${course.slug}/progress/project`);
setProgressMap((current) => ({ ...current, [course.slug]: data.progress }));
};

return (

<div className="dashboard-layout">
<Sidebar />
<div className="dashboard-content">
<section className="course-hero" style={{ '--accent': course.accent }}>
<span className="eyebrow">{course.level}</span>
<h1>{course.title}</h1>
<p>{course.banner}</p>
<div className="progress-bar large">
<span style={{ width: `${summary.percentage}%` }} />
</div>
<div className="progress-meta">
<span>{summary.completedLessons}/{summary.totalLessons} aulas</span>
<span>{summary.passedQuizzes}/{summary.totalQuizzes} quizzes aprovados</span>
<span>{summary.finalProjectDone ? 'Projeto final concluído' : 'Projeto final pendente'}</span>
</div>
</section>

        <section className="module-tabs">
          {course.modules.map((module) => (
            <button
              key={module.id}
              type="button"
              className={module.id === activeModule.id ? 'tab active' : 'tab'}
              onClick={() => setActiveModuleId(module.id)}
            >
              {module.title}
            </button>
          ))}
        </section>

        <section className="surface-card">
          <div className="section-heading">
            <h2>{activeModule.title}</h2>
            <p>{activeModule.description}</p>
          </div>

          {activeModule.lessons.map((lesson) => (
            <article key={lesson.id} className="lesson-card">
              <div className="lesson-header">
                <h3>{lesson.title}</h3>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => markLesson(lesson.id)}
                >
                  {progress.completedLessons?.includes(lesson.id) ? 'Aula concluída' : 'Marcar como concluída'}
                </button>
              </div>

              <div className="video-wrapper">
                <iframe
                  src={lesson.videoUrl}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <p className="lesson-content">{lesson.content}</p>
            </article>
          ))}

          <QuizCard
            quiz={activeModule.quiz}
            previousResult={progress.quizResults?.[activeModule.id]}
            onSubmit={(result) => submitQuiz(activeModule.id, result)}
          />
        </section>

        <section className="surface-card final-project">
          <div className="section-heading">
            <h2>{course.finalProject.title}</h2>
            <p>{course.finalProject.description}</p>
          </div>
          <button type="button" className="primary-button" onClick={completeProject}>
            {progress.finalProjectCompleted ? 'Projeto marcado como concluído' : 'Marcar projeto como concluído'}
          </button>
          {summary.certificateEligible && (
            <div className="alert success">
              Requisitos completos. Seu certificado pode ser gerado na área de certificados.
            </div>
          )}
        </section>
      </div>
    </div>

);
}
\n`\n\n## client/src/pages/CoursesPage.jsx\n\n`javascript\nimport { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import CourseCard from '../components/CourseCard';
import { coursesCatalog } from '../data/courses';
import api from '../services/api';

export default function CoursesPage() {
const [progress, setProgress] = useState({});

useEffect(() => {
api.get('/users/dashboard').then(({ data }) => setProgress(data.progress || {}));
}, []);

return (

<div className="dashboard-layout">
<Sidebar />
<div className="dashboard-content">
<section className="section-heading">
<h1>Biblioteca de cursos</h1>
<p>Explore conteúdos, complete quizzes e destrave sua certificação.</p>
</section>
<div className="course-grid">
{coursesCatalog.map((course) => (
<CourseCard key={course.slug} course={course} progress={progress[course.slug]} />
))}
</div>
</div>
</div>
);
}
\n`\n\n## client/src/pages/DashboardPage.jsx\n\n`javascript\nimport { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import CourseCard from '../components/CourseCard';
import api from '../services/api';
import { coursesCatalog } from '../data/courses';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
const [dashboard, setDashboard] = useState({ progress: {}, notesCount: 0, certificates: [] });
const [loading, setLoading] = useState(true);
const { user } = useAuth();

useEffect(() => {
const loadDashboard = async () => {
try {
const { data } = await api.get('/users/dashboard');
setDashboard(data);
} finally {
setLoading(false);
}
};

    loadDashboard();

}, []);

if (loading) {
return <div className="page-state">Preparando seu dashboard...</div>;
}

return (

<div className="dashboard-layout">
<Sidebar />
<div className="dashboard-content">
<section className="welcome-banner">
<div>
<span className="eyebrow">Bem-vinda(o) de volta</span>
<h1>{user?.name}</h1>
<p>
Continue sua jornada. Você tem {dashboard.notesCount} anotações salvas e{' '}
{dashboard.certificates.length} certificado(s) emitido(s).
</p>
</div>
</section>

        <section className="stats-grid">
          <article className="surface-card">
            <strong>{coursesCatalog.length}</strong>
            <span>Cursos disponíveis</span>
          </article>
          <article className="surface-card">
            <strong>{dashboard.notesCount}</strong>
            <span>Anotações pessoais</span>
          </article>
          <article className="surface-card">
            <strong>{dashboard.certificates.length}</strong>
            <span>Certificados</span>
          </article>
        </section>

        <section>
          <div className="section-heading">
            <h2>Seus cursos</h2>
            <p>Acompanhe a evolução módulo por módulo.</p>
          </div>
          <div className="course-grid">
            {coursesCatalog.map((course) => (
              <CourseCard key={course.slug} course={course} progress={dashboard.progress[course.slug]} />
            ))}
          </div>
        </section>
      </div>
    </div>

);
}
\n`\n\n## client/src/pages/EditorPage.jsx\n\n`javascript\nimport Sidebar from '../components/Sidebar';
import CodeEditorPanel from '../components/CodeEditorPanel';

export default function EditorPage() {
return (

<div className="dashboard-layout">
<Sidebar />
<div className="dashboard-content">
<CodeEditorPanel />
</div>
</div>
);
}
\n`\n\n## client/src/pages/HomePage.jsx\n\n`javascript\nimport HeroSection from '../components/HeroSection';
import { coursesCatalog } from '../data/courses';

export default function HomePage() {
return (

<div className="page">
<HeroSection />

      <section className="grid two-col">
        <article className="surface-card">
          <h2>Uma trilha que reduz fricção</h2>
          <p>
            Estude em uma interface limpa, com progresso visual, quizzes objetivos, editor
            integrado e espaço de anotações conectado ao seu login.
          </p>
        </article>
        <article className="surface-card">
          <h2>Do zero ao portfólio</h2>
          <p>
            Cada curso termina com um projeto prático desenhado para consolidar conceitos e
            gerar uma entrega útil para o portfólio.
          </p>
        </article>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <h2>Cursos disponíveis</h2>
          <p>{coursesCatalog.length} trilhas com foco em fundamentos e desenvolvimento web.</p>
        </div>
        <div className="course-grid">
          {coursesCatalog.map((course) => (
            <article key={course.slug} className="mini-course-card" style={{ borderColor: course.accent }}>
              <h3>{course.title}</h3>
              <p>{course.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>

);
}
\n`\n\n## client/src/pages/LoginPage.jsx\n\n`javascript\nimport { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useForm from '../hooks/useForm';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
const { values, handleChange } = useForm({ email: '', password: '' });
const { login } = useAuth();
const [error, setError] = useState('');
const navigate = useNavigate();
const location = useLocation();

const handleSubmit = async (event) => {
event.preventDefault();
setError('');
try {
await login(values);
navigate(location.state?.from || '/dashboard', { replace: true });
} catch (requestError) {
setError(requestError.response?.data?.message || 'Falha ao entrar.');
}
};

return (

<div className="auth-page">
<form className="auth-card" onSubmit={handleSubmit}>
<h1>Entrar</h1>
<p>Acesse sua trilha de estudos e continue evoluindo.</p>

        <label>
          <span>E-mail</span>
          <input type="email" name="email" value={values.email} onChange={handleChange} required />
        </label>

        <label>
          <span>Senha</span>
          <input
            type="password"
            name="password"
            value={values.password}
            onChange={handleChange}
            required
          />
        </label>

        {error && <div className="alert error">{error}</div>}

        <button type="submit" className="primary-button">Entrar</button>
        <p className="muted">
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </form>
    </div>

);
}
\n`\n\n## client/src/pages/NotFoundPage.jsx\n\n`javascript\nimport { Link } from 'react-router-dom';

export default function NotFoundPage() {
return (

<div className="page-state">
<h1>Página não encontrada</h1>
<Link to="/" className="primary-button as-link">
Voltar ao início
</Link>
</div>
);
}
\n`\n\n## client/src/pages/NotesPage.jsx\n\n`javascript\nimport { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import useForm from '../hooks/useForm';
import api from '../services/api';

export default function NotesPage() {
const [notes, setNotes] = useState([]);
const { values, handleChange, reset, setValues } = useForm({
title: '',
content: '',
tags: ''
});
const [editingId, setEditingId] = useState(null);

const loadNotes = async () => {
const { data } = await api.get('/notes');
setNotes(data.notes);
};

useEffect(() => {
loadNotes();
}, []);

const handleSubmit = async (event) => {
event.preventDefault();

    const payload = {
      ...values,
      tags: values.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    };

    if (editingId) {
      await api.put(`/notes/${editingId}`, payload);
    } else {
      await api.post('/notes', payload);
    }

    setEditingId(null);
    reset();
    loadNotes();

};

const handleEdit = (note) => {
setEditingId(note.\_id);
setValues({
title: note.title,
content: note.content,
tags: note.tags.join(', ')
});
};

const handleDelete = async (noteId) => {
await api.delete(`/notes/${noteId}`);
loadNotes();
};

return (

<div className="dashboard-layout">
<Sidebar />
<div className="dashboard-content">
<section className="section-heading">
<h1>Bloco de anotações</h1>
<p>Registre conceitos importantes, dúvidas, ideias de projeto e resumos de aulas.</p>
</section>

        <div className="grid notes-layout">
          <form className="surface-card" onSubmit={handleSubmit}>
            <h2>{editingId ? 'Editar anotação' : 'Nova anotação'}</h2>

            <label>
              <span>Título</span>
              <input type="text" name="title" value={values.title} onChange={handleChange} required />
            </label>

            <label>
              <span>Conteúdo</span>
              <textarea name="content" rows="8" value={values.content} onChange={handleChange} required />
            </label>

            <label>
              <span>Tags (separadas por vírgula)</span>
              <input type="text" name="tags" value={values.tags} onChange={handleChange} />
            </label>

            <div className="editor-actions">
              <button type="submit" className="primary-button">
                {editingId ? 'Salvar alterações' : 'Criar anotação'}
              </button>
              {editingId && (
                <button type="button" className="ghost-button" onClick={() => { setEditingId(null); reset(); }}>
                  Cancelar edição
                </button>
              )}
            </div>
          </form>

          <section className="notes-list">
            {notes.map((note) => (
              <article key={note._id} className="surface-card note-card">
                <div className="lesson-header">
                  <h3>{note.title}</h3>
                  <div className="inline-actions">
                    <button type="button" className="ghost-button" onClick={() => handleEdit(note)}>
                      Editar
                    </button>
                    <button type="button" className="ghost-button" onClick={() => handleDelete(note._id)}>
                      Excluir
                    </button>
                  </div>
                </div>
                <p>{note.content}</p>
                <div className="tags-row">
                  {note.tags.map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>

);
}
\n`\n\n## client/src/pages/ProfilePage.jsx\n\n`javascript\nimport { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export default function ProfilePage() {
const { user } = useAuth();

return (

<div className="dashboard-layout">
<Sidebar />
<div className="dashboard-content">
<section className="surface-card">
<div className="section-heading">
<h1>Perfil</h1>
<p>Seu contexto acadêmico ajuda a personalizar sua jornada.</p>
</div>

          <div className="profile-grid">
            <article>
              <span className="muted">Nome</span>
              <strong>{user?.name}</strong>
            </article>
            <article>
              <span className="muted">E-mail</span>
              <strong>{user?.email}</strong>
            </article>
            <article>
              <span className="muted">Objetivo</span>
              <strong>{user?.careerGoal || 'Ainda não definido'}</strong>
            </article>
            <article>
              <span className="muted">Membro desde</span>
              <strong>{new Date(user?.createdAt).toLocaleDateString('pt-BR')}</strong>
            </article>
          </div>
        </section>
      </div>
    </div>

);
}
\n`\n\n## client/src/pages/RegisterPage.jsx\n\n`javascript\nimport { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useForm from '../hooks/useForm';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
const { values, handleChange } = useForm({
name: '',
email: '',
password: '',
careerGoal: ''
});
const { register } = useAuth();
const [error, setError] = useState('');
const navigate = useNavigate();

const handleSubmit = async (event) => {
event.preventDefault();
setError('');
try {
await register(values);
navigate('/dashboard');
} catch (requestError) {
setError(requestError.response?.data?.message || 'Falha ao criar conta.');
}
};

return (

<div className="auth-page">
<form className="auth-card" onSubmit={handleSubmit}>
<h1>Criar conta</h1>
<p>Monte seu espaço de estudo e acompanhe seu progresso.</p>

        <label>
          <span>Nome</span>
          <input type="text" name="name" value={values.name} onChange={handleChange} required />
        </label>

        <label>
          <span>E-mail</span>
          <input type="email" name="email" value={values.email} onChange={handleChange} required />
        </label>

        <label>
          <span>Objetivo de carreira</span>
          <input
            type="text"
            name="careerGoal"
            value={values.careerGoal}
            onChange={handleChange}
            placeholder="Ex.: Front-end júnior"
          />
        </label>

        <label>
          <span>Senha</span>
          <input
            type="password"
            name="password"
            minLength="6"
            value={values.password}
            onChange={handleChange}
            required
          />
        </label>

        {error && <div className="alert error">{error}</div>}

        <button type="submit" className="primary-button">Criar conta</button>
        <p className="muted">
          Já possui conta? <Link to="/entrar">Entrar</Link>
        </p>
      </form>
    </div>

);
}
\n`\n\n## client/src/services/api.js\n\n`javascript\nimport axios from 'axios';

const api = axios.create({
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

api.interceptors.request.use((config) => {
const token = localStorage.getItem('initdev-token');
if (token) {
config.headers.Authorization = `Bearer ${token}`;
}
return config;
});

export default api;
\n`\n\n## client/src/styles/global.css\n\n`css\n:root {
--bg: #0b1120;
--bg-soft: #111827;
--bg-muted: #172033;
--text: #f8fafc;
--text-muted: #94a3b8;
--border: rgba(148, 163, 184, 0.18);
--surface: rgba(15, 23, 42, 0.78);
--primary: #6366f1;
--success: #22c55e;
--danger: #ef4444;
--shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
}

:root[data-theme='light'] {
--bg: #f8fafc;
--bg-soft: #ffffff;
--bg-muted: #e2e8f0;
--text: #0f172a;
--text-muted: #475569;
--border: rgba(15, 23, 42, 0.1);
--surface: rgba(255, 255, 255, 0.92);
--shadow: 0 16px 32px rgba(148, 163, 184, 0.18);
}

- {
  box-sizing: border-box;
  }

body {
margin: 0;
font-family: Inter, Arial, sans-serif;
background: linear-gradient(180deg, var(--bg), var(--bg-soft));
color: var(--text);
min-height: 100vh;
}

a {
color: inherit;
text-decoration: none;
}

button,
input,
textarea {
font: inherit;
}

input,
textarea {
width: 100%
padding: 0.9rem 1rem;
border-radius: 14px;
border: 1px solid var(--border);
background: var(--bg-soft);
color: var(--text);
}

textarea {
resize: vertical;
}

label {
display: grid;
gap: 0.5rem;
margin-bottom: 1rem;
}

.navbar {
position: sticky;
top: 0;
z-index: 20;
display: flex;
align-items: center;
justify-content: space-between;
padding: 1rem 5vw;
backdrop-filter: blur(18px);
background: rgba(15, 23, 42, 0.55);
border-bottom: 1px solid var(--border);
}

.brand {
display: flex;
align-items: center;
font-size: 1.25rem;
font-weight: 800;
}

.brand-mark {
background: var(--text);
color: var(--bg);
padding: 0.2rem 0.55rem;
border-radius: 999px;
margin-right: 0.35rem;
}

.brand-dot {
color: var(--primary);
}

.nav-links,
.nav-actions,
.editor-actions,
.inline-actions,
.tags-row,
.progress-meta,
.hero-actions {
display: flex;
gap: 0.75rem;
align-items: center;
flex-wrap: wrap;
}

.nav-links a,
.sidebar-link {
color: var(--text-muted);
transition: 0.2s ease;
}

.nav-links a.active,
.nav-links a:hover,
.sidebar-link.active,
.sidebar-link:hover {
color: var(--text);
}

.main-content {
width: min(1200px, 92vw);
margin: 0 auto;
padding: 2rem 0 4rem;
}

.page,
.dashboard-content {
display: grid;
gap: 1.5rem;
}

.hero,
.dashboard-layout,
.grid.two-col,
.notes-layout,
.profile-grid,
.stats-grid,
.course-grid {
display: grid;
gap: 1rem;
}

.hero {
grid-template-columns: 1.4fr 1fr;
align-items: stretch;
min-height: 420px;
}

.hero-copy,
.hero-card,
.surface-card,
.auth-card,
.lesson-card,
.quiz-card,
.course-card,
.welcome-banner,
.editor-panel,
.certificate-preview,
.note-card {
background: var(--surface);
border: 1px solid var(--border);
box-shadow: var(--shadow);
border-radius: 28px;
}

.hero-copy,
.hero-card,
.surface-card,
.auth-card,
.lesson-card,
.quiz-card,
.welcome-banner,
.editor-panel,
.note-card {
padding: 1.5rem;
}

.hero-copy h1,
.auth-card h1,
.section-heading h1,
.course-hero h1 {
font-size: clamp(2rem, 4vw, 3.4rem);
margin: 0;
}

.hero-copy p,
.lesson-content,
.surface-card p,
.auth-card p,
.section-heading p,
.course-card p {
color: var(--text-muted);
line-height: 1.7;
}

.hero-card {
display: grid;
gap: 1rem;
padding: 1rem;
}

.metric-card {
padding: 1.2rem;
border-radius: 22px;
background: linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(15, 23, 42, 0.1));
border: 1px solid var(--border);
}

.metric-card strong,
.stats-grid strong {
display: block;
font-size: 2rem;
margin-bottom: 0.3rem;
}

.primary-button,
.ghost-button,
.tab,
.as-link {
display: inline-flex;
align-items: center;
justify-content: center;
padding: 0.85rem 1.2rem;
border-radius: 999px;
border: 1px solid transparent;
transition: transform 0.2s ease, opacity 0.2s ease;
cursor: pointer;
}

.primary-button,
.primary-button.as-link {
background: var(--primary);
color: white;
}

.ghost-button,
.ghost-button.as-link {
background: transparent;
color: var(--text);
border-color: var(--border);
}

.primary-button:hover,
.ghost-button:hover,
.tab:hover {
transform: translateY(-1px);
}

.small {
padding: 0.6rem 1rem;
}

.eyebrow,
.course-level,
.course-badge,
.tag,
.muted {
color: var(--text-muted);
font-size: 0.92rem;
}

.alert {
padding: 0.9rem 1rem;
border-radius: 18px;
border: 1px solid var(--border);
}

.alert.success,
.quiz-feedback.ok {
background: rgba(34, 197, 94, 0.12);
}

.alert.error,
.quiz-feedback.error {
background: rgba(239, 68, 68, 0.12);
}

.auth-page,
.page-state {
display: grid;
place-items: center;
min-height: 70vh;
text-align: center;
}

.auth-card {
width: min(480px, 92vw);
}

.dashboard-layout {
grid-template-columns: 250px 1fr;
align-items: start;
}

.sidebar {
position: sticky;
top: 92px;
display: grid;
gap: 0.75rem;
padding: 1rem;
background: var(--surface);
border: 1px solid var(--border);
border-radius: 24px;
}

.sidebar-title {
margin: 0 0 0.5rem;
font-weight: 700;
}

.surface-card,
.course-card {
overflow: hidden;
}

.course-card {
display: grid;
gap: 1rem;
padding: 1.25rem;
border-left: 4px solid var(--accent, var(--primary));
}

.course-card-top,
.lesson-header,
.card-footer {
display: flex;
justify-content: space-between;
align-items: center;
gap: 1rem;
}

.progress-bar {
width: 100%
height: 12px;
border-radius: 999px;
background: rgba(148, 163, 184, 0.18);
overflow: hidden;
}

.progress-bar.large {
height: 16px;
margin: 1rem 0;
}

.progress-bar span {
display: block;
height: 100%;
border-radius: inherit;
background: linear-gradient(90deg, var(--accent, var(--primary)), var(--primary));
transition: width 0.35s ease;
}

.text-link {
color: var(--primary);
font-weight: 700;
}

.welcome-banner {
background: linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(15, 23, 42, 0.02));
}

.stats-grid {
grid-template-columns: repeat(3, minmax(0, 1fr));
}

.course-grid {
grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid.two-col,
.notes-layout,
.profile-grid {
grid-template-columns: repeat(2, minmax(0, 1fr));
}

.module-tabs {
display: flex;
gap: 0.75rem;
overflow-x: auto;
padding-bottom: 0.35rem;
}

.tab {
background: var(--bg-soft);
color: var(--text);
border: 1px solid var(--border);
}

.tab.active {
background: var(--primary);
color: white;
}

.course-hero {
padding: 1.75rem;
border-radius: 30px;
background: linear-gradient(140deg, color-mix(in srgb, var(--accent) 22%, transparent), transparent);
border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
}

.video-wrapper {
position: relative;
padding-top: 56.25%;
border-radius: 18px;
overflow: hidden;
margin: 1rem 0;
}

.video-wrapper iframe {
position: absolute;
inset: 0;
width: 100%
height: 100%;
border: 0;
}

.quiz-question {
padding: 1rem 0;
border-top: 1px solid var(--border);
}

.quiz-option {
display: flex;
align-items: center;
gap: 0.6rem;
}

.output-panel {
padding: 1rem;
margin-top: 1rem;
border-radius: 22px;
background: var(--bg-soft);
border: 1px solid var(--border);
}

.output-panel pre {
margin: 0;
white-space: pre-wrap;
}

.certificate-preview {
padding: 1rem;
text-align: center;
}

.certificate-border {
border: 8px double var(--text);
border-radius: 26px;
padding: 2rem;
}

.mini-course-card {
padding: 1rem;
border-radius: 18px;
border: 1px solid var(--border);
border-left: 4px solid currentColor;
}

.tags-row {
margin-top: 1rem;
}

.tag {
padding: 0.35rem 0.7rem;
border-radius: 999px;
background: rgba(148, 163, 184, 0.1);
}

@media (max-width: 900px) {
.hero,
.dashboard-layout,
.grid.two-col,
.notes-layout,
.profile-grid,
.stats-grid,
.course-grid {
grid-template-columns: 1fr;
}

.navbar {
flex-wrap: wrap;
gap: 0.75rem;
}

.sidebar {
position: static;
}
}
\n`\n\n## client/src/utils/courseProgress.js\n\n`javascript\nimport { getLessonCount } from '../data/courses';

export function getCourseProgress(course, progress = {}) {
const totalLessons = getLessonCount(course);
const completedLessons = progress.completedLessons?.length || 0;
const passedQuizzes = Object.values(progress.quizResults || {}).filter((result) => result.passed).length;
const totalQuizzes = course.modules.length;
const finalProjectDone = progress.finalProjectCompleted ? 1 : 0;

const stepsDone = completedLessons + passedQuizzes + finalProjectDone;
const totalSteps = totalLessons + totalQuizzes + 1;
const percentage = Math.round((stepsDone / totalSteps) \* 100) || 0;

const certificateEligible =
completedLessons === totalLessons &&
passedQuizzes === totalQuizzes &&
Boolean(progress.finalProjectCompleted);

return {
totalLessons,
completedLessons,
totalQuizzes,
passedQuizzes,
finalProjectDone: Boolean(progress.finalProjectCompleted),
percentage,
certificateEligible
};
}

export function getBadgeLabel(percentage) {
if (percentage >= 100) return 'Mestre';
if (percentage >= 70) return 'Em destaque';
if (percentage >= 40) return 'Consistente';
return 'Começando';
}
\n`\n\n## client/vite.config.js\n\n`javascript\nimport { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
plugins: [react()],
server: {
port: 5173
}
});
\n`\n\n## server/config/db.js\n\n`javascript\nconst mongoose = require('mongoose');

async function connectDatabase() {
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
throw new Error('MONGO_URI is not configured.');
}

await mongoose.connect(mongoUri);
console.log('MongoDB connected');
}

module.exports = connectDatabase;
\n`\n\n## server/controllers/authController.js\n\n`javascript\nconst bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function createToken(id) {
return jwt.sign({ id }, process.env.JWT_SECRET, {
expiresIn: process.env.JWT_EXPIRES_IN || '7d'
});
}

function sanitizeUser(user) {
return {
id: user.\_id,
name: user.name,
email: user.email,
careerGoal: user.careerGoal,
createdAt: user.createdAt
};
}

exports.register = async (req, res) => {
const { name, email, password, careerGoal } = req.body;

if (!name || !email || !password) {
return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
}

const existingUser = await User.findOne({ email });
if (existingUser) {
return res.status(409).json({ message: 'Já existe uma conta com este e-mail.' });
}

const hashedPassword = await bcrypt.hash(password, 10);
const user = await User.create({
name,
email,
password: hashedPassword,
careerGoal: careerGoal || ''
});

const token = createToken(user.\_id);
return res.status(201).json({
token,
user: sanitizeUser(user)
});
};

exports.login = async (req, res) => {
const { email, password } = req.body;

const user = await User.findOne({ email });
if (!user) {
return res.status(401).json({ message: 'Credenciais inválidas.' });
}

const isValid = await bcrypt.compare(password, user.password);
if (!isValid) {
return res.status(401).json({ message: 'Credenciais inválidas.' });
}

const token = createToken(user.\_id);
return res.json({
token,
user: sanitizeUser(user)
});
};

exports.me = async (req, res) => {
return res.json({
user: sanitizeUser(req.user)
});
};
\n`\n\n## server/controllers/courseController.js\n\n`javascript\nconst User = require('../models/User');
const { getCourseBySlug } = require('../data/courses');

function getProgressEntry(user, courseSlug) {
let entry = user.progress.find((item) => item.courseSlug === courseSlug);
if (!entry) {
entry = {
courseSlug,
completedLessons: [],
quizResults: new Map(),
finalProjectCompleted: false
};
user.progress.push(entry);
entry = user.progress[user.progress.length - 1];
}
return entry;
}

function serializeProgress(entry) {
return {
courseSlug: entry.courseSlug,
completedLessons: entry.completedLessons,
quizResults: Object.fromEntries(entry.quizResults || []),
finalProjectCompleted: entry.finalProjectCompleted
};
}

exports.completeLesson = async (req, res) => {
const course = getCourseBySlug(req.params.slug);
if (!course) {
return res.status(404).json({ message: 'Curso não encontrado.' });
}

const { lessonId } = req.body;
const user = await User.findById(req.user.\_id);
const entry = getProgressEntry(user, course.slug);

if (!entry.completedLessons.includes(lessonId)) {
entry.completedLessons.push(lessonId);
}

await user.save();
return res.json({ progress: serializeProgress(entry) });
};

exports.submitQuiz = async (req, res) => {
const course = getCourseBySlug(req.params.slug);
if (!course) {
return res.status(404).json({ message: 'Curso não encontrado.' });
}

const { moduleId, result } = req.body;
const user = await User.findById(req.user.\_id);
const entry = getProgressEntry(user, course.slug);
entry.quizResults.set(moduleId, result);

await user.save();
return res.json({ progress: serializeProgress(entry) });
};

exports.completeProject = async (req, res) => {
const course = getCourseBySlug(req.params.slug);
if (!course) {
return res.status(404).json({ message: 'Curso não encontrado.' });
}

const user = await User.findById(req.user.\_id);
const entry = getProgressEntry(user, course.slug);
entry.finalProjectCompleted = true;

await user.save();
return res.json({ progress: serializeProgress(entry) });
};

exports.generateCertificate = async (req, res) => {
const course = getCourseBySlug(req.params.slug);
if (!course) {
return res.status(404).json({ message: 'Curso não encontrado.' });
}

const user = await User.findById(req.user.\_id);
const entry = getProgressEntry(user, course.slug);

const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0);
const passedQuizzes = Array.from(entry.quizResults.values()).filter((item) => item.passed).length;
const eligible =
entry.completedLessons.length === totalLessons &&
passedQuizzes === course.modules.length &&
entry.finalProjectCompleted;

if (!eligible) {
return res.status(400).json({ message: 'Curso ainda não está elegível para certificação.' });
}

const certificate = {
courseSlug: course.slug,
courseName: course.title,
issuedAt: new Date()
};

user.certificates = [
...user.certificates.filter((item) => item.courseSlug !== course.slug),
certificate
];
await user.save();

return res.status(201).json({ certificate });
};
\n`\n\n## server/controllers/noteController.js\n\n`javascript\nconst Note = require('../models/Note');

exports.listNotes = async (req, res) => {
const notes = await Note.find({ user: req.user.\_id }).sort({ updatedAt: -1 });
return res.json({ notes });
};

exports.createNote = async (req, res) => {
const note = await Note.create({
user: req.user.\_id,
title: req.body.title,
content: req.body.content,
tags: req.body.tags || []
});

return res.status(201).json({ note });
};

exports.updateNote = async (req, res) => {
const note = await Note.findOneAndUpdate(
{ \_id: req.params.id, user: req.user.\_id },
{
title: req.body.title,
content: req.body.content,
tags: req.body.tags || []
},
{ new: true }
);

if (!note) {
return res.status(404).json({ message: 'Anotação não encontrada.' });
}

return res.json({ note });
};

exports.deleteNote = async (req, res) => {
const note = await Note.findOneAndDelete({ \_id: req.params.id, user: req.user.\_id });
if (!note) {
return res.status(404).json({ message: 'Anotação não encontrada.' });
}

return res.json({ message: 'Anotação removida.' });
};
\n`\n\n## server/controllers/userController.js\n\n`javascript\nconst Note = require('../models/Note');

function mapProgress(progressArray) {
return progressArray.reduce((acc, item) => {
acc[item.courseSlug] = {
courseSlug: item.courseSlug,
completedLessons: item.completedLessons,
quizResults: Object.fromEntries(item.quizResults || []),
finalProjectCompleted: item.finalProjectCompleted
};
return acc;
}, {});
}

exports.getDashboard = async (req, res) => {
const notesCount = await Note.countDocuments({ user: req.user.\_id });
return res.json({
progress: mapProgress(req.user.progress || []),
notesCount,
certificates: req.user.certificates || []
});
};
\n`\n\n## server/data/courses.js\n\n`javascript\nconst accentPalette = {
logic: '#6366f1',
htmlcss: '#14b8a6',
javascript: '#f59e0b',
react: '#38bdf8',
node: '#22c55e',
git: '#ef4444'
};

const coursesCatalog = [
{
slug: 'logica-de-programacao',
key: 'logic',
title: 'Lógica de Programação',
summary: 'Construa pensamento computacional, algoritmos e resolução de problemas.',
accent: accentPalette.logic,
level: 'Iniciante',
estimatedHours: 12,
banner:
'Aprenda a transformar problemas do mundo real em passos claros, testáveis e reutilizáveis.',
finalProject: {
title: 'Projeto Final: Simulador de Rotina de Estudos',
description:
'Crie um algoritmo que receba metas, tempo disponível e prioridades para montar uma rotina semanal de estudos.'
},
modules: [
{
id: 'logic-1',
title: 'Pensamento computacional e algoritmos',
description:
'Entenda como decompor problemas, identificar padrões e escrever algoritmos descritivos.',
lessons: [
{
id: 'logic-1-1',
title: 'O que é lógica de programação',
videoUrl: 'https://www.youtube.com/embed/zOjov-2OZ0E',
content: `Lógica de programação é a habilidade de organizar raciocínio em etapas claras para que uma máquina consiga executar uma tarefa. Em vez de pensar apenas no código, você aprende a estruturar a solução. Isso inclui identificar entradas, processamento e saídas, além de prever erros e casos especiais.

Um bom algoritmo é legível, finito, ordenado e testável. Ao estudar lógica, você constrói a base para qualquer linguagem futura: JavaScript, Python, Java ou qualquer outra. O foco é aprender a pensar como desenvolvedor, modelando regras com precisão.`          },
          {
            id: 'logic-1-2',
            title: 'Fluxogramas e pseudocódigo',
            videoUrl: 'https://www.youtube.com/embed/XZwBNDGuWGU',
            content:`Fluxogramas ajudam a visualizar decisões, repetições e fluxo de dados. Já o pseudocódigo descreve a solução em linguagem humana estruturada. Esses dois recursos aceleram o entendimento do problema antes de implementar código real.

Ao praticar pseudocódigo, trabalhe com verbos objetivos, condições explícitas e passos curtos. Isso reduz ambiguidade e ajuda na transição para uma linguagem de programação.`          }
        ],
        quiz: [
          {
            question: 'Qual é o principal objetivo de um algoritmo?',
            options: [
              'Deixar o código mais bonito',
              'Descrever passos finitos para resolver um problema',
              'Escolher a linguagem ideal',
              'Substituir o banco de dados'
            ],
            answer: 1
          },
          {
            question: 'Qual recurso é mais visual para representar decisões?',
            options: ['Fluxograma', 'Banco relacional', 'Deploy', 'Framework'],
            answer: 0
          }
        ]
      },
      {
        id: 'logic-2',
        title: 'Variáveis, operadores e estruturas condicionais',
        description:
          'Descubra como armazenar dados, comparar valores e tomar decisões.',
        lessons: [
          {
            id: 'logic-2-1',
            title: 'Tipos de dados e variáveis',
            videoUrl: 'https://www.youtube.com/embed/6iF8Xb7Z3wQ',
            content:`Variáveis são espaços nomeados usados para guardar informações durante a execução do programa. Você pode armazenar números, textos, estados booleanos e até coleções de dados. Saber nomear variáveis corretamente aumenta muito a legibilidade.

Na prática, você deve pensar em tipos de dados com base no que será manipulado. Idade tende a ser número, nome tende a ser texto, status de matrícula tende a ser booleano. Essa clareza influencia decisões, validações e cálculos.`          },
          {
            id: 'logic-2-2',
            title: 'Condições, comparações e cenários',
            videoUrl: 'https://www.youtube.com/embed/4pYsp5m6u7M',
            content:`Estruturas condicionais permitem alterar o fluxo do programa com base em regras. Você avalia expressões e escolhe qual caminho seguir. Esse raciocínio aparece em autenticação, validação de formulários, filtros e muito mais.

Ao escrever condições, prefira expressões simples, bem nomeadas e fáceis de testar. Em sistemas reais, uma condição ruim pode gerar comportamentos inesperados ou até vulnerabilidades.`          }
        ],
        quiz: [
          {
            question: 'Quando usamos uma estrutura condicional?',
            options: [
              'Quando queremos repetir um bloco várias vezes',
              'Quando precisamos decidir entre caminhos possíveis',
              'Quando vamos estilizar uma página',
              'Quando faremos deploy'
            ],
            answer: 1
          },
          {
            question: 'Qual opção representa um dado booleano?',
            options: ['"Nazare"', '42', 'true', '[1,2,3]'],
            answer: 2
          }
        ]
      }
    ]
  },
  {
    slug: 'html-css',
    key: 'htmlcss',
    title: 'HTML & CSS',
    summary: 'Crie interfaces semânticas, responsivas e agradáveis.',
    accent: accentPalette.htmlcss,
    level: 'Iniciante',
    estimatedHours: 14,
    banner: 'Estruture páginas com semântica e estilize layouts modernos com CSS.',
    finalProject: {
      title: 'Projeto Final: Landing Page de Portfólio',
      description:
        'Desenvolva uma landing page responsiva com seções, CTA, cards e layout mobile-first.'
    },
    modules: [
      {
        id: 'html-1',
        title: 'Estrutura e semântica',
        description: 'Aprenda a montar documentos acessíveis e organizados.',
        lessons: [
          {
            id: 'html-1-1',
            title: 'Anatomia do HTML',
            videoUrl: 'https://www.youtube.com/embed/pQN-pnXPaVg',
            content:`HTML define a estrutura do conteúdo. Elementos semânticos como header, main, section, article e footer comunicam intenção para navegadores, leitores de tela e mecanismos de busca. Uma boa estrutura ajuda acessibilidade e manutenção.

Ao pensar em HTML, foque em significado antes de aparência. Isso facilita evoluções de layout e reduz dependência de divs genéricas.`          },
          {
            id: 'html-1-2',
            title: 'Formulários e acessibilidade',
            videoUrl: 'https://www.youtube.com/embed/fNcJuPIZ2WE',
            content:`Formulários são essenciais em aplicações reais. Labels, placeholders, validações e mensagens de erro claras afetam diretamente a experiência do usuário. Acessibilidade significa garantir navegação, leitura e interação com o maior número de pessoas possível.

Use label associado, textos de ajuda e hierarquia correta de títulos. Pequenos cuidados geram interfaces mais humanas.`          }
        ],
        quiz: [
          {
            question: 'Qual tag indica o conteúdo principal da página?',
            options: ['main', 'span', 'strong', 'style'],
            answer: 0
          },
          {
            question: 'Por que usar label em formulários?',
            options: [
              'Para adicionar animação',
              'Para melhorar acessibilidade e contexto do campo',
              'Para conectar banco de dados',
              'Para minificar CSS'
            ],
            answer: 1
          }
        ]
      },
      {
        id: 'html-2',
        title: 'CSS moderno e responsividade',
        description: 'Utilize flexbox, grid, variáveis e media queries.',
        lessons: [
          {
            id: 'html-2-1',
            title: 'Flexbox e Grid',
            videoUrl: 'https://www.youtube.com/embed/JJSoEo8JSnc',
            content:`Flexbox resolve alinhamento e distribuição em um eixo. Grid permite controlar linhas e colunas com mais precisão. Juntos, esses recursos cobrem a maior parte dos layouts modernos. Em vez de hacks antigos, você passa a pensar em composição.

Use flexbox para componentes lineares, como barras e menus. Use grid para páginas, cards e dashboards.`          },
          {
            id: 'html-2-2',
            title: 'Responsividade e design system',
            videoUrl: 'https://www.youtube.com/embed/srvUrASNj0s',
            content:`Responsividade é adaptar o layout a diferentes larguras e contextos. Isso não é só reduzir elementos: envolve priorização de conteúdo, tipografia escalável e espaçamento coerente. Já um design system ajuda a repetir padrões com consistência.

Variáveis CSS, tokens de cor e escala de espaçamento aceleram a manutenção e deixam a interface mais profissional.`          }
        ],
        quiz: [
          {
            question: 'Qual recurso é mais indicado para layouts bidimensionais?',
            options: ['Grid', 'Float', 'Position fixed', 'Transform'],
            answer: 0
          },
          {
            question: 'O que significa mobile-first?',
            options: [
              'Construir primeiro para telas menores e depois expandir',
              'Criar apenas apps nativos',
              'Usar somente JavaScript',
              'Ignorar acessibilidade'
            ],
            answer: 0
          }
        ]
      }
    ]
  },
  {
    slug: 'javascript',
    key: 'javascript',
    title: 'JavaScript',
    summary: 'Domine a linguagem da web com foco em lógica, DOM e assincronicidade.',
    accent: accentPalette.javascript,
    level: 'Intermediário',
    estimatedHours: 18,
    banner: 'Saia do básico e aprenda a transformar páginas em aplicações interativas.',
    finalProject: {
      title: 'Projeto Final: Task Manager',
      description:
        'Monte um gerenciador de tarefas com filtros, persistência local, validação e estatísticas.'
    },
    modules: [
      {
        id: 'js-1',
        title: 'Fundamentos da linguagem',
        description: 'Sintaxe, escopo, funções e manipulação de dados.',
        lessons: [
          {
            id: 'js-1-1',
            title: 'Variáveis, escopo e funções',
            videoUrl: 'https://www.youtube.com/embed/W6NZfCO5SIk',
            content:`JavaScript é a linguagem que dá comportamento à web. Ao dominar variáveis, funções e escopo, você aprende como o programa organiza estado e executa tarefas. Funções permitem reutilizar lógica, isolar responsabilidades e melhorar testes.

Também é importante entender a diferença entre escopo global, de função e de bloco. Essa distinção evita bugs difíceis ligados a reatribuições e closures.`          },
          {
            id: 'js-1-2',
            title: 'Arrays, objetos e métodos úteis',
            videoUrl: 'https://www.youtube.com/embed/R8rmfD9Y5-c',
            content:`Arrays e objetos são a base de qualquer aplicação JavaScript. Você usa arrays para listas e objetos para modelar entidades com propriedades. Métodos como map, filter e reduce tornam o código mais declarativo e legível.

Pensar em transformação de dados é uma habilidade central no front-end e no back-end.`          }
        ],
        quiz: [
          {
            question: 'Qual método retorna um novo array filtrado?',
            options: ['push', 'filter', 'forEach', 'sort'],
            answer: 1
          },
          {
            question: 'Funções ajudam principalmente a:',
            options: [
              'Repetir lógica sem organização',
              'Estilizar componentes',
              'Reutilizar comportamento e separar responsabilidades',
              'Substituir rotas'
            ],
            answer: 2
          }
        ]
      },
      {
        id: 'js-2',
        title: 'DOM, eventos e assincronicidade',
        description: 'Interaja com elementos e consuma dados externos.',
        lessons: [
          {
            id: 'js-2-1',
            title: 'Manipulação do DOM',
            videoUrl: 'https://www.youtube.com/embed/0ik6X4DJKCc',
            content:`O DOM representa a estrutura da página em objetos manipuláveis. Com JavaScript, você pode alterar texto, atributos, classes, estilos e reagir a eventos como clique, digitação e scroll.

O segredo é manter a lógica previsível. Eventos demais espalhados sem organização tornam a manutenção difícil.`          },
          {
            id: 'js-2-2',
            title: 'Promises, async/await e APIs',
            videoUrl: 'https://www.youtube.com/embed/PoRJizFvM7s',
            content:`Aplicações modernas dependem de comunicação assíncrona. Promises representam operações futuras e async/await facilita a leitura. Com isso você busca dados, envia formulários e integra serviços externos sem travar a interface.

Também é essencial lidar com erros, estados de carregamento e mensagens de feedback.`          }
        ],
        quiz: [
          {
            question: 'Qual sintaxe deixa código assíncrono mais legível?',
            options: ['switch', 'async/await', 'typeof', 'classList'],
            answer: 1
          },
          {
            question: 'O DOM representa:',
            options: [
              'A estrutura da página como objetos manipuláveis',
              'O banco de dados do navegador',
              'Um tipo de API de autenticação',
              'Um sistema de deploy'
            ],
            answer: 0
          }
        ]
      }
    ]
  },
  {
    slug: 'react',
    key: 'react',
    title: 'React',
    summary: 'Componentize interfaces e gerencie estado de forma escalável.',
    accent: accentPalette.react,
    level: 'Intermediário',
    estimatedHours: 16,
    banner: 'Aprenda a construir interfaces reativas, modulares e prontas para produto.',
    finalProject: {
      title: 'Projeto Final: Dashboard de Estudos',
      description:
        'Crie um dashboard com autenticação simulada, cards, rotas e gráficos simples.'
    },
    modules: [
      {
        id: 'react-1',
        title: 'Componentes, props e estado',
        description: 'Entenda a base do pensamento em componentes.',
        lessons: [
          {
            id: 'react-1-1',
            title: 'JSX e composição',
            videoUrl: 'https://www.youtube.com/embed/SqcY0GlETPk',
            content:`React permite compor interfaces a partir de componentes reutilizáveis. Cada componente recebe dados via props e pode manter estado interno. Isso ajuda a dividir aplicações grandes em partes pequenas, previsíveis e fáceis de testar.

Com JSX, você escreve uma sintaxe declarativa próxima do HTML, mas com o poder do JavaScript.`          },
          {
            id: 'react-1-2',
            title: 'useState e renderização',
            videoUrl: 'https://www.youtube.com/embed/O6P86uwfdR0',
            content:`Estado é o que muda com o tempo. Ao atualizar estado, o React recalcula a interface e re-renderiza o que é necessário. Pensar em fluxo de dados e origem da verdade é essencial para evitar inconsistências.

O estado deve morar no lugar mais apropriado, nem muito alto sem necessidade, nem muito baixo limitando reutilização.`          }
        ],
        quiz: [
          {
            question: 'Props servem para:',
            options: [
              'Passar dados de um componente para outro',
              'Criar banco de dados',
              'Executar queries SQL',
              'Substituir CSS'
            ],
            answer: 0
          },
          {
            question: 'Qual hook manipula estado local?',
            options: ['useMemo', 'useState', 'useNavigate', 'useRefetch'],
            answer: 1
          }
        ]
      },
      {
        id: 'react-2',
        title: 'Rotas, efeitos e arquitetura',
        description: 'Conecte telas e lide com efeitos colaterais.',
        lessons: [
          {
            id: 'react-2-1',
            title: 'React Router na prática',
            videoUrl: 'https://www.youtube.com/embed/Ul3y1LXxzdU',
            content:`Aplicações de página única precisam de navegação sem recarregar o navegador. O React Router resolve isso com rotas declarativas, parâmetros e navegação programática.

Você pode proteger telas, criar layouts compartilhados e organizar experiências complexas com clareza.`          },
          {
            id: 'react-2-2',
            title: 'useEffect e comunicação com APIs',
            videoUrl: 'https://www.youtube.com/embed/0ZJgIjIuY7U',
            content:`Efeitos colaterais incluem chamadas HTTP, timers e integrações externas. O useEffect ajuda a sincronizar essas ações com o ciclo de vida do componente. Porém, seu uso excessivo sem planejamento costuma gerar bugs de dependência.

Combine estado, serviços e componentes bem separados para manter o projeto saudável.`          }
        ],
        quiz: [
          {
            question: 'Quando normalmente usamos useEffect?',
            options: [
              'Para estilizar com CSS',
              'Para executar efeitos como chamadas de API',
              'Para criar tabelas no banco',
              'Para minificar imagens'
            ],
            answer: 1
          },
          {
            question: 'Qual biblioteca desta stack cuida das rotas?',
            options: ['Axios', 'Express', 'React Router Dom', 'Mongoose'],
            answer: 2
          }
        ]
      }
    ]
  },
  {
    slug: 'node-js',
    key: 'node',
    title: 'Node.js',
    summary: 'Crie APIs escaláveis com Express, middlewares e persistência.',
    accent: accentPalette.node,
    level: 'Intermediário',
    estimatedHours: 17,
    banner: 'Leve JavaScript para o servidor e entenda a base de aplicações web modernas.',
    finalProject: {
      title: 'Projeto Final: API de Conteúdo',
      description:
        'Implemente uma API CRUD com autenticação, validação e persistência de dados.'
    },
    modules: [
      {
        id: 'node-1',
        title: 'Fundamentos do back-end',
        description: 'Entenda requisições, respostas, rotas e middlewares.',
        lessons: [
          {
            id: 'node-1-1',
            title: 'Node.js e o ciclo request-response',
            videoUrl: 'https://www.youtube.com/embed/TlB_eWDSMt4',
            content:`Node.js permite executar JavaScript no servidor usando um modelo orientado a eventos. Em APIs, o coração do trabalho é receber requisições, processar regras e devolver respostas adequadas.

Compreender verbos HTTP, status codes e separação de responsabilidades é obrigatório para criar serviços confiáveis.`          },
          {
            id: 'node-1-2',
            title: 'Express e middlewares',
            videoUrl: 'https://www.youtube.com/embed/L72fhGm1tfE',
            content:`Express simplifica o roteamento e a composição do servidor. Middlewares interceptam a requisição para autenticar, validar, registrar logs e padronizar respostas.

Um bom pipeline de middlewares melhora segurança e manutenção.`          }
        ],
        quiz: [
          {
            question: 'Qual papel de um middleware no Express?',
            options: [
              'Interceptar a requisição para tratar algum comportamento',
              'Desenhar a interface visual',
              'Executar CSS',
              'Criar componentes React'
            ],
            answer: 0
          },
          {
            question: 'Em uma API REST, GET normalmente é usado para:',
            options: ['Ler dados', 'Apagar banco', 'Gerar CSS', 'Minificar imagens'],
            answer: 0
          }
        ]
      },
      {
        id: 'node-2',
        title: 'Autenticação e banco de dados',
        description: 'Proteja rotas e modele dados com consistência.',
        lessons: [
          {
            id: 'node-2-1',
            title: 'JWT e autenticação',
            videoUrl: 'https://www.youtube.com/embed/mbsmsi7l3r4',
            content:`JWT é uma forma compacta de representar identidade e autorização. Após login, o servidor assina um token que o cliente envia nas próximas requisições. No back-end, o token é validado antes de permitir acesso a rotas privadas.

É importante armazenar segredos com segurança e evitar expor dados sensíveis no payload.`          },
          {
            id: 'node-2-2',
            title: 'Modelagem com Mongoose',
            videoUrl: 'https://www.youtube.com/embed/DZBGEVgL2eE',
            content:`Mongoose organiza a camada de dados com schemas, validações e modelos. Você define formatos esperados, relacionamentos simples e timestamps, criando uma base mais previsível.

A modelagem correta evita inconsistências e simplifica consultas.`          }
        ],
        quiz: [
          {
            question: 'O JWT é normalmente enviado ao servidor em qual header?',
            options: ['Authorization', 'Accept-Language', 'Referer', 'User-Agent'],
            answer: 0
          },
          {
            question: 'Mongoose é usado para:',
            options: [
              'Criar interfaces em React',
              'Modelar dados MongoDB em aplicações Node',
              'Processar imagens',
              'Executar testes E2E'
            ],
            answer: 1
          }
        ]
      }
    ]
  },
  {
    slug: 'git-github',
    key: 'git',
    title: 'Git & GitHub',
    summary: 'Versione projetos, colabore em equipe e publique portfólio.',
    accent: accentPalette.git,
    level: 'Iniciante',
    estimatedHours: 8,
    banner: 'Entenda commits, branches, pull requests e fluxo de colaboração real.',
    finalProject: {
      title: 'Projeto Final: Portfólio Versionado',
      description:
        'Versione um projeto completo, crie branches temáticas e documente o repositório com README.'
    },
    modules: [
      {
        id: 'git-1',
        title: 'Versionamento local',
        description: 'Aprenda commits, staging e histórico.',
        lessons: [
          {
            id: 'git-1-1',
            title: 'Snapshot do projeto',
            videoUrl: 'https://www.youtube.com/embed/RGOj5yH7evk',
            content:`Git é um sistema de versionamento distribuído. Ele registra snapshots do projeto ao longo do tempo e permite voltar, comparar e evoluir com segurança. Em vez de salvar arquivos com nomes como final-v2-mesmo-agora, você passa a rastrear mudanças com contexto.

Commits bons contam a história do produto com clareza.`          },
          {
            id: 'git-1-2',
            title: 'Branches e organização',
            videoUrl: 'https://www.youtube.com/embed/e9lnsKot_SQ',
            content:`Branches permitem trabalhar em linhas paralelas sem quebrar a principal. Esse recurso é indispensável para times, revisões e experimentos. Você cria, testa, revisa e integra mudanças quando estiverem maduras.

Ao nomear branches e commits com consistência, a colaboração melhora muito.`          }
        ],
        quiz: [
          {
            question: 'O staging area serve para:',
            options: [
              'Selecionar mudanças que entrarão no próximo commit',
              'Hospedar o site',
              'Rodar banco de dados',
              'Gerar CSS'
            ],
            answer: 0
          },
          {
            question: 'Branches são úteis para:',
            options: [
              'Trabalhar em funcionalidades isoladas',
              'Apagar histórico',
              'Substituir README',
              'Remover autenticação'
            ],
            answer: 0
          }
        ]
      },
      {
        id: 'git-2',
        title: 'Colaboração no GitHub',
        description: 'Use remotos, pull requests e boas práticas de revisão.',
        lessons: [
          {
            id: 'git-2-1',
            title: 'Push, pull e sincronização',
            videoUrl: 'https://www.youtube.com/embed/HkdAHXoRtos',
            content:`Ao conectar um repositório local ao GitHub, você ganha um ponto de compartilhamento, backup e colaboração. Push envia commits, pull atualiza sua cópia local e fetch baixa referências sem mesclar automaticamente.

Esses comandos fazem parte do dia a dia de qualquer time.`          },
          {
            id: 'git-2-2',
            title: 'Pull requests e revisão',
            videoUrl: 'https://www.youtube.com/embed/8lGpZkjnkt4',
            content:`Pull requests organizam mudanças antes da integração final. Eles permitem discutir código, validar impacto, documentar contexto e reforçar qualidade. Saber abrir um bom PR é uma habilidade profissional importante.

Descreva objetivo, abordagem, testes e pontos de atenção com clareza.`
}
],
quiz: [
{
question: 'Qual recurso do GitHub é usado para revisar mudanças antes do merge?',
options: ['Pull request', 'Forklift', 'Pipeline DOM', 'Snippet SQL'],
answer: 0
},
{
question: 'O comando pull normalmente:',
options: [
'Baixa e integra mudanças do remoto',
'Apaga branches',
'Cria CSS',
'Gera certificado'
],
answer: 0
}
]
}
]
}
];

function getCourseBySlug(slug) {
return coursesCatalog.find((course) => course.slug === slug);
}

function getLessonCount(course) {
return course.modules.reduce((total, module) => total + module.lessons.length, 0);
}

function getQuizCount(course) {
return course.modules.length;
}

module.exports = {
coursesCatalog,
getCourseBySlug,
getLessonCount,
getQuizCount
};
\n`\n\n## server/data/seed.js\n\n`javascript\nrequire('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDatabase = require('../config/db');
const User = require('../models/User');
const Note = require('../models/Note');

async function seed() {
await connectDatabase();

await User.deleteMany({});
await Note.deleteMany({});

const password = await bcrypt.hash('123456', 10);
const user = await User.create({
name: 'Demo Init',
email: 'demo@init.dev',
password,
careerGoal: 'Full stack developer'
});

await Note.create({
user: user.\_id,
title: 'Primeira anotação',
content: 'Lembre-se: const evita reatribuição e melhora legibilidade.',
tags: ['javascript', 'fundamentos']
});

console.log('Base de demonstração criada com sucesso.');
await mongoose.disconnect();
}

seed().catch((error) => {
console.error(error);
mongoose.disconnect();
});
\n`\n\n## server/index.js\n\n`javascript\nrequire('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDatabase = require('./config/db');
const authMiddleware = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');

const app = express();

app.use(
cors({
origin: process.env.CLIENT_URL?.split(',') || '\*',
credentials: true
})
);
app.use(express.json());

app.get('/api/health', (req, res) => {
res.json({
status: 'ok',
app: 'Init.dev API'
});
});

app.use('/api/auth', authRoutes);
app.use('/api/notes', authMiddleware, noteRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/courses', authMiddleware, courseRoutes);

app.use(errorMiddleware);

const port = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
connectDatabase()
.then(() => {
app.listen(port, () => {
console.log(`Init.dev API running on port ${port}`);
});
})
.catch((error) => {
console.error('Database connection failed:', error.message);
});
}

module.exports = async (req, res) => {
if (typeof global.\_initDevReady === 'undefined') {
await connectDatabase();
global.\_initDevReady = true;
}
return app(req, res);
};
\n`\n\n## server/middleware/authMiddleware.js\n\n`javascript\nconst jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function authMiddleware(req, res, next) {
try {
const header = req.headers.authorization;
if (!header || !header.startsWith('Bearer ')) {
return res.status(401).json({ message: 'Acesso não autorizado.' });
}

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    req.user = user;
    next();

} catch (error) {
return res.status(401).json({ message: 'Token inválido ou expirado.' });
}
};
\n`\n\n## server/middleware/errorMiddleware.js\n\n`javascript\nmodule.exports = function errorMiddleware(error, req, res, next) {
console.error(error);
return res.status(error.statusCode || 500).json({
message: error.message || 'Erro interno do servidor.'
});
};
\n`\n\n## server/models/Note.js\n\n`javascript\nconst mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
{
user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
title: { type: String, required: true, trim: true },
content: { type: String, required: true, trim: true },
tags: { type: [String], default: [] }
},
{
timestamps: true
}
);

module.exports = mongoose.model('Note', noteSchema);
\n`\n\n## server/models/User.js\n\n`javascript\nconst mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
{
courseSlug: { type: String, required: true },
completedLessons: { type: [String], default: [] },
quizResults: {
type: Map,
of: {
score: Number,
total: Number,
passed: Boolean
},
default: {}
},
finalProjectCompleted: { type: Boolean, default: false }
},
{ \_id: false }
);

const certificateSchema = new mongoose.Schema(
{
courseSlug: { type: String, required: true },
courseName: { type: String, required: true },
issuedAt: { type: Date, default: Date.now }
},
{ \_id: false }
);

const userSchema = new mongoose.Schema(
{
name: { type: String, required: true, trim: true },
email: { type: String, required: true, unique: true, lowercase: true, trim: true },
password: { type: String, required: true },
careerGoal: { type: String, default: '' },
progress: { type: [progressSchema], default: [] },
certificates: { type: [certificateSchema], default: [] }
},
{
timestamps: true
}
);

module.exports = mongoose.model('User', userSchema);
\n`\n\n## server/package.json\n\n`json\n{
"name": "init-dev-server",
"version": "1.0.0",
"main": "index.js",
"type": "commonjs",
"scripts": {
"dev": "node --watch index.js",
"start": "node index.js",
"seed": "node data/seed.js"
},
"dependencies": {
"bcryptjs": "^3.0.2",
"cors": "^2.8.5",
"dotenv": "^16.4.7",
"express": "^4.21.2",
"jsonwebtoken": "^9.0.2",
"mongoose": "^8.12.1"
}
}
\n`\n\n## server/routes/authRoutes.js\n\n`javascript\nconst express = require('express');
const { register, login, me } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, me);

module.exports = router;
\n`\n\n## server/routes/courseRoutes.js\n\n`javascript\nconst express = require('express');
const {
completeLesson,
submitQuiz,
completeProject,
generateCertificate
} = require('../controllers/courseController');

const router = express.Router();

router.post('/:slug/progress/lesson', completeLesson);
router.post('/:slug/progress/quiz', submitQuiz);
router.post('/:slug/progress/project', completeProject);
router.post('/:slug/certificate', generateCertificate);

module.exports = router;
\n`\n\n## server/routes/noteRoutes.js\n\n`javascript\nconst express = require('express');
const {
listNotes,
createNote,
updateNote,
deleteNote
} = require('../controllers/noteController');

const router = express.Router();

router.get('/', listNotes);
router.post('/', createNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;
\n`\n\n## server/routes/userRoutes.js\n\n`javascript\nconst express = require('express');
const { getDashboard } = require('../controllers/userController');

const router = express.Router();

router.get('/dashboard', getDashboard);

module.exports = router;
\n`\n\n## vercel.json\n\n`json\n{
"version": 2,
"builds": [
{
"src": "server/index.js",
"use": "@vercel/node"
},
{
"src": "client/package.json",
"use": "@vercel/static-build",
"config": {
"distDir": "dist"
}
}
],
"routes": [
{
"src": "/api/(.*)",
"dest": "server/index.js"
},
{
"handle": "filesystem"
},
{
"src": "/(.*)",
"dest": "/client/$1"
}
]
}
\n```\n\n
