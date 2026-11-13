import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import api from './services/api';
import { aplicarAparencia } from './utils/aparencia';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import ReportsPage from './pages/ReportsPage';
import AttendancePage from './pages/AttendancePage';
import { AccessLogPage } from './pages/ManagementExtrasPage';
import IaAdminPage from './pages/IaAdminPage';
import VerifyCertificatePage from './pages/VerifyCertificatePage';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import NotesPage from './pages/NotesPage';
import EditorPage from './pages/EditorPage';
import CodeyPage from './pages/CodeyPage';
import DocumentosPage from './pages/DocumentosPage';
import MuralPage from './pages/MuralPage';
import MyAreaPage from './pages/MyAreaPage';
import ManageCoursePage from './pages/ManageCoursePage';
import ManageUsersPage from './pages/ManageUsersPage';
import NotFoundPage from './pages/NotFoundPage';
import PresencaAlunoPage from './pages/PresencaAlunoPage';
import PresencaTurmasPage from './pages/PresencaTurmasPage';
import ProfessorPontoPage from './pages/ProfessorPontoPage';
import GestaoPontoPage from './pages/GestaoPontoPage';
import AparenciaPage from './pages/AparenciaPage';
import AtendimentoNumerosPage from './pages/AtendimentoNumerosPage';
import CronogramasPage from './pages/CronogramasPage';
import JustificativasPage from './pages/JustificativasPage';
import RelatoriosGestaoPage from './pages/RelatoriosGestaoPage';
import AtendimentoAlunoPage from './pages/AtendimentoAlunoPage';
import AtendimentoGestaoPage from './pages/AtendimentoGestaoPage';

const TEACHING_ROLES = ['admin', 'teacher'];

// /gestao leva cada perfil à primeira tela que ele pode usar.
function GestaoIndex() {
  const { isAdmin, isAtendente } = useAuth();
  if (isAtendente) return <Navigate to="/gestao/atendimento" replace />;
  return <Navigate to={isAdmin ? '/gestao/acompanhamento' : '/gestao/presenca'} replace />;
}

// Gestão vê só os números do atendimento; admin e atendente seguem para a tela completa.
function AtendimentoRota() {
  const { isGestao } = useAuth();
  return isGestao ? <AtendimentoNumerosPage /> : <AtendimentoGestaoPage />;
}

export default function App() {
  useEffect(() => {
    api.get('/site-settings/aparencia').then(({ data }) => aplicarAparencia(data.valor)).catch(() => {});
  }, []);
  return (
    <Routes>
      {/* Entrada do Atlas: a página inicial é o login (sem a barra de navegação). */}
      <Route path="/" element={<LoginPage />} />
      {/* Troca de senha (inclusive a do primeiro acesso): sem a barra de navegação, até concluir. */}
      <Route path="/trocar-senha" element={<ChangePasswordPage />} />
      <Route path="/entrar" element={<Navigate to="/" replace />} />
      <Route path="/cadastro" element={<Navigate to="/" replace />} />
      <Route path="/primeiro-acesso" element={<Navigate to="/" replace />} />

      <Route element={<AppShell />}>
        <Route path="/verificar" element={<VerifyCertificatePage />} />
        <Route path="/verificar/:code" element={<VerifyCertificatePage />} />

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
          path="/cursos/:slug/modulo/:blockId"
          element={
            <ProtectedRoute>
              <CourseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/presenca"
          element={
            <ProtectedRoute roles={['student']}>
              <PresencaAlunoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/anotacoes"
          element={
            <ProtectedRoute roles={['student']}>
              <NotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute roles={['student']}>
              <EditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jogo"
          element={
            <ProtectedRoute roles={['student']}>
              <CodeyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documentos"
          element={
            <ProtectedRoute>
              <DocumentosPage />
            </ProtectedRoute>
          }
        />
        {/* Links antigos da aba Certificados levam para Documentos. */}
        <Route path="/certificados" element={<Navigate to="/documentos" replace />} />
        <Route
          path="/mural"
          element={
            <ProtectedRoute>
              <MuralPage />
            </ProtectedRoute>
          }
        />
        <Route path="/perfil" element={<Navigate to="/minha-area" replace />} />
        <Route
          path="/minha-area"
          element={
            <ProtectedRoute>
              <MyAreaPage />
            </ProtectedRoute>
          }
        />

        {/* Gestão (equivalente à administração de cursos do Moodle) */}
        <Route path="/gestao/cursos" element={<Navigate to="/cursos" replace />} />
        <Route
          path="/gestao/cursos/:slug"
          element={
            <ProtectedRoute roles={['admin', 'teacher', 'editor']}>
              <ManageCoursePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao"
          element={
            <ProtectedRoute roles={TEACHING_ROLES}>
              <GestaoIndex />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao/presenca"
          element={
            <ProtectedRoute roles={[...TEACHING_ROLES, 'gestao']}>
              <PresencaTurmasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao/presenca/chamada"
          element={
            <ProtectedRoute roles={TEACHING_ROLES}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ponto"
          element={
            <ProtectedRoute roles={TEACHING_ROLES}>
              <ProfessorPontoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao/ponto"
          element={
            <ProtectedRoute roles={['admin', 'gestao']}>
              <GestaoPontoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cronogramas"
          element={
            <ProtectedRoute roles={['student']}>
              <CronogramasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao/acompanhamento"
          element={
            <ProtectedRoute roles={['admin', 'gestao']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/atendimento"
          element={
            <ProtectedRoute roles={['student']}>
              <AtendimentoAlunoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao/atendimento"
          element={
            <ProtectedRoute roles={['admin', 'atendente', 'gestao']}>
              <AtendimentoRota />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao/relatorios"
          element={
            <ProtectedRoute roles={['admin', 'gestao']}>
              <RelatoriosGestaoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao/justificativas"
          element={
            <ProtectedRoute roles={['admin']}>
              <JustificativasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao/acessos"
          element={
            <ProtectedRoute roles={['admin']}>
              <AccessLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao/ia"
          element={
            <ProtectedRoute roles={['admin']}>
              <IaAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestao/usuarios"
          element={
            <ProtectedRoute roles={['admin']}>
              <ManageUsersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/aparencia"
          element={
            <ProtectedRoute roles={['admin', 'editor']}>
              <AparenciaPage />
            </ProtectedRoute>
          }
        />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
