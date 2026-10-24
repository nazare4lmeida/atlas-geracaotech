import Sidebar from '../components/Sidebar';
import TermosSection from '../components/documentos/TermosSection';
import CertificatesPage from './CertificatesPage';
import { useAuth } from '../context/AuthContext';

// Documentos: termo de matrícula, aditivos e certificados em um só lugar.
// Substitui a antiga aba Certificados.
export default function DocumentosPage() {
  const { isAdmin, isTeacher } = useAuth();
  const mostrarTermos = !isAdmin && !isTeacher;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <section className="section-heading">
          <h1>Documentos</h1>
          <p>Seu termo de matrícula, aditivos e certificados.</p>
        </section>

        {mostrarTermos && <TermosSection />}
        <CertificatesPage embedded />
      </div>
    </div>
  );
}
