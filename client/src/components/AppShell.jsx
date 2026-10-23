import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import PresencaPopup from './presenca/PresencaPopup';
import BoasVindasPopup from './boasVindas/BoasVindasPopup';
import { useAuth } from '../context/AuthContext';

export default function AppShell() {
  const { user, refreshProfile } = useAuth();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const isStudent = user?.role === 'student';
  // Primeiro acesso do aluno: boas-vindas antes do pop-up de presença.
  const welcomePending = isStudent && !user?.welcomeSeen && !welcomeDismissed;

  const fecharBoasVindas = () => {
    setWelcomeDismissed(true);
    refreshProfile?.();
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      {welcomePending && <BoasVindasPopup userName={user?.name} onClose={fecharBoasVindas} />}
      {isStudent && !welcomePending && <PresencaPopup />}
    </div>
  );
}
