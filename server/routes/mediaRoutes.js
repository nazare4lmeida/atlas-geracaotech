const express = require('express');
const { Readable } = require('stream');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const { MAX_BYTES, uploadMedia, fetchMedia, verifyMediaLink, mediaUrl } = require('../services/mediaStorage');

const router = express.Router();

// Envio: só professor e admin. O corpo é a própria imagem (sem multipart).
router.post(
  '/',
  authMiddleware,
  requireRole('admin', 'teacher'),
  express.raw({ type: 'image/*', limit: MAX_BYTES }),
  asyncHandler(async (req, res) => {
    const result = await uploadMedia(req.body, req.headers['content-type']);
    if (result.error) return res.status(400).json({ message: result.error });
    return res.status(201).json({ path: result.path, url: mediaUrl(result.path) });
  })
);

// Leitura: sem token de login (a tag <img> não envia), protegida pelo link assinado.
router.get(
  '/file',
  asyncHandler(async (req, res) => {
    const { p, e, s } = req.query;
    if (!verifyMediaLink(String(p || ''), e, s)) return res.status(403).json({ message: 'Link expirado ou inválido.' });
    const upstream = await fetchMedia(String(p));
    if (!upstream) return res.status(404).json({ message: 'Imagem não encontrada.' });
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    Readable.fromWeb(upstream.body).pipe(res);
    return undefined;
  })
);

module.exports = router;
