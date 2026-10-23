import { Link } from 'react-router-dom';
import ProgressCard from './course/ProgressCard';
import { getBadgeLabel, getCourseProgress } from '../utils/courseProgress';

// Card de curso da biblioteca. O visual é o mesmo ProgressCard usado nos módulos e unidades.
export default function CourseCard({ course, progress }) {
  const summary = getCourseProgress(course, progress);

  return (
    <ProgressCard
      accent={course.theme?.primary || course.accent}
      level={course.level}
      badge={getBadgeLabel(summary.percentage)}
      title={course.title}
      description={course.summary}
      percentage={summary.percentage}
      footer={course.estimatedHours > 0 ? `${course.estimatedHours}h estimadas` : 'Carga horária a definir'}
      action={
        <Link to={`/cursos/${course.slug}`} className="text-link">
          Ver curso
        </Link>
      }
    />
  );
}
