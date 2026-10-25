const settings = require('../services/siteSettings');

exports.obterAparencia = async (req, res) => res.json({ valor: await settings.buscarAparencia() });

exports.salvarAparencia = async (req, res) => res.json({ valor: await settings.salvarAparencia(req.body || {}, req.user.id) });
