const { resumoGestao } = require('../services/dashboardGestao');

exports.gestao = async (req, res) => {
  res.json(await resumoGestao());
};
