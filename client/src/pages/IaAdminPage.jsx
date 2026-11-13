import Sidebar from '../components/Sidebar';
import IaAdminSwitch from '../components/ia/IaAdminSwitch';

// Administração da IA: liga ou desliga o assistente. Só o admin acessa esta tela.
export default function IaAdminPage() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <section className="section-heading">
          <h1>Inteligência artificial</h1>
          <p>Liga ou desliga o assistente das aulas. Desligado, o site funciona normalmente, sem o assistente.</p>
        </section>
        <IaAdminSwitch />
      </div>
    </div>
  );
}
