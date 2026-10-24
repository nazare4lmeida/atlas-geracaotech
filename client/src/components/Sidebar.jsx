import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebarCollapsed } from '../utils/sidebarState';
import Icon from './Icon';

const items = [
  { to: '/dashboard', label: 'Visão geral', icon: 'home' },
  { to: '/cursos', label: 'Cursos', icon: 'book' },
  { to: '/mural', label: 'Mural', icon: 'bell' },
  { to: '/anotacoes', label: 'Anotações', icon: 'note' },
  { to: '/editor', label: 'Editor', icon: 'code' },
  { to: '/documentos', label: 'Documentos', icon: 'award' },
  { to: '/perfil', label: 'Perfil', icon: 'user' }
];

// Cada item tem um ícone próprio, para que nenhum se repita no mesmo menu.
const teachingItems = [
  { to: '/gestao/presenca', label: 'Presença', icon: 'users' },
  { to: '/ponto', label: 'Meu ponto', icon: 'clock' }
];
const atendenteItems = [
  { to: '/gestao/atendimento', label: 'Atendimento', icon: 'chat' },
  { to: '/mural', label: 'Mural', icon: 'bell' },
  { to: '/minha-area', label: 'Meu perfil', icon: 'user' }
];
const studentItems = [
  { to: '/presenca', label: 'Minha presença', icon: 'check' },
  { to: '/cronogramas', label: 'Cronogramas', icon: 'calendar' },
  { to: '/atendimento', label: 'Atendimento', icon: 'chat' }
];
const adminItems = [
  { to: '/gestao/relatorios', label: 'Relatórios', icon: 'grid' },
  { to: '/gestao/atendimento', label: 'Atendimento', icon: 'chat' },
  { to: '/gestao/acompanhamento', label: 'Acompanhamento', icon: 'chart' },
  { to: '/gestao/justificativas', label: 'Justificativas', icon: 'bulb' },
  { to: '/gestao/ponto', label: 'Ponto dos professores', icon: 'clock' },
  { to: '/gestao/acessos', label: 'Acessos', icon: 'key' },
  { to: '/gestao/usuarios', label: 'Usuários', icon: 'shield' }
];

export default function Sidebar() {
  const { isAdmin, isTeacher, isAtendente } = useAuth();
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  // Anotações e editor de código são exclusivos do aluno.
  const studentOnly = new Set(['/anotacoes', '/editor']);
  // Atendente: menu enxuto, só o atendimento e o perfil.
  const visibleItems = isAtendente
    ? atendenteItems
    : [
        // Certificados: professor não vê (só a administração gerencia).
        ...items.filter((item) => !(isTeacher && studentOnly.has(item.to)) && !(isTeacher && !isAdmin && item.to === '/documentos')),
        // Administração não tem "Meu ponto": quem bate ponto é o professor.
        ...(isTeacher ? teachingItems.filter((item) => !(isAdmin && item.to === '/ponto')) : studentItems),
        ...(isAdmin ? adminItems : [])
      ];

  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <div className="sidebar-head">
        <p className="sidebar-title">Seu espaço</p>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
        </button>
      </div>
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="sidebar-link"
          title={item.label}
        >
          <Icon name={item.icon} className="sidebar-icon" />
          <span className="sidebar-label">{item.label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
