const courseRepo = require('../db/courseRepo');
const { query } = require('../db/pool');
const { progressEntriesForCourse } = require('../db/progressRepo');
const attendanceRepo = require('../db/attendanceRepo');
const { serializeCourse, summarizeProgress } = require('./courseView');
const { maskCpf } = require('./cpf');

// Relatório de acompanhamento: uma linha por aluno matriculado em cada curso.
// Tudo calculado em lote (uma leitura por curso e uma para entregas, certificados e presença).
async function buildEnrollmentReport() {
  const [courses, enrollments, deliveries, certificates, presence] = await Promise.all([
    courseRepo.fetchCourses(),
    query(
      `select e.course_id, e.user_id, e.enrolled_at, e.status as enrollment_status,
              u.name, u.email, u.active, u.cpf_last2, u.last_login_at, u.locked_until, u.created_at
         from enrollments e join users u on u.id = e.user_id
        where e.role = 'student'
        order by u.name`
    ),
    query(
      `select pd.user_id, cp.course_id, cp.title as project_title, pd.delivered_at, pd.grade
         from project_deliveries pd join course_projects cp on cp.id = pd.project_id`
    ),
    query('select user_id, course_id, tipo, issued_at, course_name from certificates'),
    attendanceRepo.presenceByEnrollment()
  ]);

  const courseById = new Map(courses.map((course) => [course.id, course]));
  const viewById = new Map();
  const progressByCourse = new Map();
  for (const course of courses) {
    viewById.set(course.id, serializeCourse(course, { canManage: false }));
    progressByCourse.set(course.id, await progressEntriesForCourse(course.id));
  }

  const deliveryByKey = new Map();
  for (const row of deliveries.rows) {
    const key = `${row.course_id}:${row.user_id}`;
    if (!deliveryByKey.has(key)) deliveryByKey.set(key, []);
    deliveryByKey.get(key).push(row);
  }
  const certificateByKey = new Map(certificates.rows.map((row) => [`${row.course_id}:${row.user_id}`, row]));

  const rows = [];
  for (const enrollment of enrollments.rows) {
    const course = courseById.get(enrollment.course_id);
    if (!course) continue;
    const view = viewById.get(course.id);
    const entry = progressByCourse.get(course.id)?.get(enrollment.user_id);
    const summary = summarizeProgress(view, entry);
    const key = `${course.id}:${enrollment.user_id}`;

    const quizScores = Object.values(entry?.quizResults || {}).filter((result) => result.total > 0);
    const quizAverage = quizScores.length
      ? Math.round(quizScores.reduce((sum, result) => sum + (result.score / result.total) * 100, 0) / quizScores.length)
      : null;

    const delivered = deliveryByKey.get(key) || [];
    const grades = delivered.map((item) => item.grade).filter((grade) => grade !== null && grade !== undefined);
    const completed = summary.certificateEligible;
    const cert = certificateByKey.get(key);
    const pres = presence.get(key);

    rows.push({
      userId: enrollment.user_id,
      courseId: course.id,
      name: enrollment.name,
      email: enrollment.email,
      cpfMasked: enrollment.cpf_last2 ? maskCpf(enrollment.cpf_last2) : '',
      accountActive: enrollment.active !== false,
      locked: Boolean(enrollment.locked_until && new Date(enrollment.locked_until) > new Date()),
      lastLoginAt: enrollment.last_login_at,
      enrolledAt: enrollment.enrolled_at,
      enrollmentStatus: enrollment.enrollment_status,
      courseTitle: course.title,
      courseSlug: course.slug,
      status: completed ? 'concluido' : summary.percentage > 0 ? 'em_andamento' : 'nao_iniciado',
      percentage: summary.percentage,
      completedLessons: summary.completedLessons,
      totalLessons: summary.totalLessons,
      remainingLessons: summary.totalLessons - summary.completedLessons,
      passedQuizzes: summary.passedQuizzes,
      totalQuizzes: summary.totalQuizzes,
      remainingQuizzes: summary.totalQuizzes - summary.passedQuizzes,
      quizAverage,
      finalProjectDone: summary.finalProjectDone,
      projectDeliveries: delivered.length,
      projectGrade: grades.length ? Math.max(...grades) : null,
      projectTitles: delivered.map((item) => item.project_title),
      presencePercent: pres ? pres.percentual : null,
      presenceSessions: pres ? pres.sessoes : 0,
      certificate: cert ? cert.tipo : null,
      certificateIssuedAt: cert ? cert.issued_at : null
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    courses: courses.map((course) => ({ id: course.id, slug: course.slug, title: course.title })),
    rows
  };
}

module.exports = { buildEnrollmentReport };
