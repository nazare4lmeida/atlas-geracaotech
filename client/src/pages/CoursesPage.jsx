import { useCallback, useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import CourseCard from '../components/CourseCard';
import CoursesManager from '../components/manage/CoursesManager';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Cursos. Aluno: a biblioteca de cursos publicados. Professor: só os cursos que leciona (o servidor já filtra).
// Administração: gestão dos cursos (ver CoursesManager), sem repetir a lista.
export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState({});
  const { isAdmin, isTeacher } = useAuth();

  const carregar = useCallback(() => {
    Promise.all([api.get('/courses'), api.get('/users/dashboard')]).then(([coursesRes, dashboardRes]) => {
      setCourses(coursesRes.data.courses || []);
      setProgress(dashboardRes.data.progress || {});
    });
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const professor = isTeacher && !isAdmin;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <section className="section-heading">
          <h1>{professor ? 'Meus cursos' : 'Cursos'}</h1>
          <p>
            {professor
              ? 'Os cursos que você leciona. Edite o conteúdo e veja cada um como o aluno vê.'
              : isAdmin
                ? 'Crie, importe e gerencie os cursos do Geração Tech.'
                : 'Explore conteúdos, complete quizzes e destrave sua certificação.'}
          </p>
        </section>

        {isAdmin ? (
          <CoursesManager courses={courses} progress={progress} onChanged={carregar} />
        ) : (
          <>
            <section className="courses-section">
              {professor && courses.length === 0 && (
                <p className="muted">Você ainda não leciona nenhum curso. A administração vincula professores às turmas.</p>
              )}
              <div className="course-grid">
                {courses.map((course) => (
                  <CourseCard key={course.slug} course={course} progress={progress[course.slug]} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
