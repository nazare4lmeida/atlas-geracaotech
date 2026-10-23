const certificateRepo = require('../db/certificateRepo');
const httpError = require('../utils/httpError');

// Verificação pública de autenticidade (sem login). Retorna só o necessário para conferir o certificado.
const CODE_PATTERN = /^[A-Z0-9-]{6,40}$/;

exports.verifyCertificate = async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) throw httpError(404, 'Certificado não encontrado.');

  const cert = await certificateRepo.findCertificateByAuthCode(code);
  if (!cert) throw httpError(404, 'Certificado não encontrado.');

  return res.json({
    certificate: {
      authCode: cert.auth_code,
      studentName: cert.student_name,
      courseName: cert.course_name,
      workload: cert.estimated_hours || 0,
      issuedAt: cert.issued_at,
      valid: true
    }
  });
};
