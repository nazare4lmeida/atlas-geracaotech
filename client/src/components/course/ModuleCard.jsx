import ProgressCard from './ProgressCard';
import { getBadgeLabel } from '../../utils/courseProgress';
import { moduleStatusLabel } from '../../utils/courseBlocks';

// Card de módulo: o mesmo ProgressCard da biblioteca. Bloqueado não abre.
export default function ModuleCard({ item, accent, onOpen }) {
  const { module, number, state } = item;
  const locked = !state.unlocked;
  const lessons = module.lessons?.length || 0;
  return (
    <ProgressCard
      accent={accent}
      level={`Módulo ${number}`}
      badge={moduleStatusLabel(state, getBadgeLabel)}
      title={module.title}
      description={module.description || `${lessons} aulas${module.quiz?.length ? ' e um teste' : ''}`}
      percentage={state.percentage}
      footer={`${lessons} aulas`}
      action={
        <button type="button" className="text-link module-card-action" onClick={onOpen} disabled={locked}>
          {locked ? 'Bloqueado' : 'Abrir módulo'}
        </button>
      }
    />
  );
}
