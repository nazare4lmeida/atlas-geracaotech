require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDatabase = require('./config/db');
const authMiddleware = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const verifyRoutes = require('./routes/verifyRoutes');
const rateLimit = require('./middleware/rateLimit');
const meRoutes = require('./routes/meRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const accountRoutes = require('./routes/accountRoutes');
const integracaoRoutes = require('./routes/integracaoRoutes');
const presencaRoutes = require('./routes/presencaRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const atendimentoRoutes = require('./routes/atendimentoRoutes');
const docenteRoutes = require('./routes/docenteRoutes');
const securityHeaders = require('./middleware/securityHeaders');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['http://localhost:5173', 'http://localhost:4173'],
    credentials: true
  })
);
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Atlas - Geração Tech API'
  });
});

// Rotas públicas (sem login): catálogo exibido na página inicial.
app.use('/api/catalog', catalogRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/notes', authMiddleware, noteRoutes);
app.use('/api/me', authMiddleware, meRoutes);
app.use('/api/attendance', authMiddleware, attendanceRoutes);
app.use('/api/presenca', authMiddleware, presencaRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/atendimento', authMiddleware, atendimentoRoutes);
app.use('/api/docente', authMiddleware, docenteRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/integracoes', integracaoRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/courses', authMiddleware, courseRoutes);
// Imagens: o envio exige login de professor/admin; a leitura usa link assinado (ver routes/mediaRoutes.js).
app.use('/api/media', mediaRoutes);
app.use('/api/certificate-templates', authMiddleware, certificateRoutes);
// Verificação pública de certificado (QR code e página /verificar): sem login, com limite por IP.
app.use('/api/verify', rateLimit({ max: 60 }), verifyRoutes);

app.use(errorMiddleware);

const port = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  connectDatabase()
    .then(() => {
      app.listen(port, () => {
        console.log(`Atlas - Geração Tech API running on port ${port}`);
      });
    })
    .catch((error) => {
      console.error('Database connection failed:', error.message);
    });
}

module.exports = async (req, res) => {
  if (typeof global._atlasReady === 'undefined') {
    await connectDatabase();
    global._atlasReady = true;
  }
  return app(req, res);
};
