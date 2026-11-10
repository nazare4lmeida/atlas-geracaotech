const express = require('express');
const {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  completeLesson,
  getReadingPosition,
  saveReadingPosition,
  completeUnit,
  rateUnit,
  completeProject,
  getCertificate,
  updateBlock,
  listAtrasados,
  listHistorico
} = require('../controllers/courseController');
const { getQuizAttempt, answerQuiz, resetQuiz } = require('../controllers/quizController');
const { updateCourseSettings, getEligibility, generateCertificates, requestCertificate } = require('../controllers/certificateIssueController');
const {
  addModule,
  updateModule,
  deleteModule,
  moveModule,
  addLesson,
  updateLesson,
  deleteLesson,
  moveLesson,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  updateFinalProject,
  updateProgressBar
} = require('../controllers/moduleController');
const {
  listParticipants,
  enrolParticipant,
  updateParticipant,
  unenrolParticipant
} = require('../controllers/participantController');
const {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMembers,
  removeGroupMember
} = require('../controllers/groupController');
const { exportCourse, importCourse, restoreCourse } = require('../controllers/backupController');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// ---------- Cursos ----------
router.get('/', asyncHandler(listCourses));
router.post('/', requireRole('admin', 'editor'), asyncHandler(createCourse));
router.post('/import', requireRole('admin'), asyncHandler(importCourse));
router.get('/:slug', asyncHandler(getCourse));
router.put('/:slug', asyncHandler(updateCourse));
router.delete('/:slug', asyncHandler(deleteCourse));

// ---------- Backup (exportar e restaurar conteúdo) ----------
router.get('/:slug/backup', asyncHandler(exportCourse));
router.post('/:slug/restore', asyncHandler(restoreCourse));

// ---------- Progresso e certificado do aluno ----------
router.post('/:slug/progress/lesson', asyncHandler(completeLesson));
router.get('/:slug/reading-position', asyncHandler(getReadingPosition));
router.put('/:slug/reading-position', asyncHandler(saveReadingPosition));
// Unidade: a aluna conclui a unidade inteira de uma vez e depois avalia.
router.post('/:slug/progress/unit', asyncHandler(completeUnit));
router.post('/:slug/progress/unit/avaliacao', asyncHandler(rateUnit));
// Quiz: o servidor corrige cada resposta (o aluno não envia nota nem gabarito).
router.get('/:slug/progress/quiz/:moduleId', asyncHandler(getQuizAttempt));
router.post('/:slug/progress/quiz/answer', asyncHandler(answerQuiz));
router.post('/:slug/progress/quiz/reset', asyncHandler(resetQuiz));
router.post('/:slug/progress/project', asyncHandler(completeProject));
// Aluna: vê o certificado emitido e solicita a emissão (a gestão é quem gera).
router.get('/:slug/certificate', asyncHandler(getCertificate));
router.post('/:slug/certificate-request', asyncHandler(requestCertificate));
// Certificados (modelos, liberação, aptidão e geração): só administração.
router.put('/:slug/certificate-template', requireRole('admin'), asyncHandler(updateCourseSettings));
router.get('/:slug/certificates/eligibility', requireRole('admin'), asyncHandler(getEligibility));
router.post('/:slug/certificates/generate', requireRole('admin'), asyncHandler(generateCertificates));

// ---------- Seções (módulos) ----------
router.post('/:slug/modules', asyncHandler(addModule));
router.put('/:slug/modules/:moduleId', asyncHandler(updateModule));
router.delete('/:slug/modules/:moduleId', asyncHandler(deleteModule));
router.post('/:slug/modules/:moduleId/move', asyncHandler(moveModule));

// ---------- Recursos (aulas) ----------
router.post('/:slug/modules/:moduleId/lessons', asyncHandler(addLesson));
router.put('/:slug/modules/:moduleId/lessons/:lessonId', asyncHandler(updateLesson));
router.delete('/:slug/modules/:moduleId/lessons/:lessonId', asyncHandler(deleteLesson));
router.post('/:slug/modules/:moduleId/lessons/:lessonId/move', asyncHandler(moveLesson));

// ---------- Questões do teste ----------
router.post('/:slug/modules/:moduleId/questions', asyncHandler(addQuestion));
router.put('/:slug/modules/:moduleId/questions/:questionId', asyncHandler(updateQuestion));
router.delete('/:slug/modules/:moduleId/questions/:questionId', asyncHandler(deleteQuestion));

// ---------- Projeto final ----------
router.put('/:slug/final-project', asyncHandler(updateFinalProject));
router.put('/:slug/progress-bar', requireRole('admin', 'teacher', 'editor'), asyncHandler(updateProgressBar));
// Blocos: cor, modo de liberação e datas. Só administração e editores.
router.put('/:slug/blocks/:blockId', requireRole('admin', 'editor'), asyncHandler(updateBlock));
// Acompanhamento da gestão: atrasados e histórico (o controlador confere se a pessoa gerencia o curso).
router.get('/:slug/atrasados', requireRole('admin', 'teacher', 'editor'), asyncHandler(listAtrasados));
router.get('/:slug/historico', requireRole('admin', 'teacher', 'editor'), asyncHandler(listHistorico));

// ---------- Participantes ----------
router.get('/:slug/participants', asyncHandler(listParticipants));
router.post('/:slug/participants', asyncHandler(enrolParticipant));
router.patch('/:slug/participants/:userId', asyncHandler(updateParticipant));
router.delete('/:slug/participants/:userId', asyncHandler(unenrolParticipant));

// ---------- Grupos ----------
router.get('/:slug/groups', asyncHandler(listGroups));
router.post('/:slug/groups', asyncHandler(createGroup));
router.put('/:slug/groups/:groupId', asyncHandler(updateGroup));
router.delete('/:slug/groups/:groupId', asyncHandler(deleteGroup));
router.post('/:slug/groups/:groupId/members', asyncHandler(addGroupMembers));
router.delete('/:slug/groups/:groupId/members/:userId', asyncHandler(removeGroupMember));

module.exports = router;