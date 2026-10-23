// Formações do Geração Tech, com a identidade visual de cada uma (cores da imagem "Nossas Formações" da Digital College).
//
// Estas formações ainda não têm conteúdo nesta plataforma. Elas entram ocultas (visible: false) e sem módulos:
// o conteúdo deve ser trazido do Moodle por backup (ver TESTING.md / README, seção "Backup e restauração")
// e o curso publicado pelo docente. Carga horária e nível são definidos depois, na tela de configurações.
//
// Este arquivo está no formato do banco (mesmo formato de courseRepo.insertCourseTree).

const placeholder = (title) => ({
  summary: `${title}: conteúdo em migração do Moodle para a nova plataforma.`,
  banner: '',
  level: 'A definir',
  estimatedHours: 0
});

const formacoes = [
  {
    slug: 'marketing-digital-ia',
    key: 'marketing-digital-ia',
    title: 'Marketing Digital + IA',
    accent: '#FF5700',
    ...placeholder('Marketing Digital + IA')
  },
  {
    slug: 'data-analytics-ia',
    key: 'data-analytics-ia',
    title: 'Data Analytics + IA',
    accent: '#F00245',
    ...placeholder('Data Analytics + IA')
  },
  {
    slug: 'desenvolvedor-full-stack-ia',
    key: 'desenvolvedor-full-stack-ia',
    title: 'Desenvolvedor Full Stack + IA',
    accent: '#00C600',
    ...placeholder('Desenvolvedor Full Stack + IA')
  },
  {
    slug: 'claude-expert',
    key: 'claude-expert',
    title: 'Claude Expert',
    accent: '#FC7712',
    ...placeholder('Claude Expert')
  },
  {
    slug: 'desenvolvimento-ia-generativa',
    key: 'desenvolvimento-ia-generativa',
    title: 'Desenvolvimento de IA Generativa',
    accent: '#028F5A',
    ...placeholder('Desenvolvimento de IA Generativa')
  },
  {
    slug: 'ux-ui-design-ia',
    key: 'ux-ui-design-ia',
    title: 'UX/UI Design + IA',
    accent: '#0067C4',
    ...placeholder('UX/UI Design + IA')
  },
  {
    slug: 'gestor-projetos-ageis',
    key: 'gestor-projetos-ageis',
    title: 'Gestor em Projetos Ágeis',
    accent: '#E7893F',
    ...placeholder('Gestor em Projetos Ágeis')
  },
  {
    slug: 'python-dados-ia',
    key: 'python-dados-ia',
    title: 'Python para Dados + IA',
    accent: '#FF9C00',
    ...placeholder('Python para Dados + IA')
  },
  {
    slug: 'full-cycle',
    key: 'full-cycle',
    title: 'Full Cycle',
    accent: '#FF5600',
    ...placeholder('Full Cycle')
  },
  {
    // Não está na imagem da Digital College: cor escolhida para esta formação (ajustar se necessário).
    slug: 'ia-soft-skills',
    key: 'ia-soft-skills',
    title: 'IA + Soft Skills',
    accent: '#8B5CF6',
    ...placeholder('IA + Soft Skills')
  }
];

// Converte para o formato do banco, com os campos padrão de um curso oculto.
const formacoesCatalog = formacoes.map((course) => ({
  slug: course.slug,
  key: course.key,
  title: course.title,
  summary: course.summary,
  banner: course.banner,
  level: course.level,
  estimatedHours: course.estimatedHours,
  accent: course.accent,
  visible: false,
  selfEnrolment: false,
  finalProject: { title: '', description: '' },
  modules: []
}));

module.exports = { formacoesCatalog };
