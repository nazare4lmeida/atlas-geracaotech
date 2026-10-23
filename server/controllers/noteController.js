const { query } = require('../db/pool');
const httpError = require('../utils/httpError');

// As anotações mantêm o campo "_id" na resposta, como o front-end já espera.
function serializeNote(row) {
  return {
    _id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
}

function requireNoteFields(body) {
  const title = String(body.title || '').trim();
  const content = String(body.content || '').trim();
  if (!title || !content) {
    throw httpError(400, 'Título e conteúdo são obrigatórios.');
  }
  return { title, content };
}

exports.listNotes = async (req, res) => {
  const { rows } = await query(
    'select * from notes where user_id = $1 order by updated_at desc',
    [req.user.id]
  );
  return res.json({ notes: rows.map(serializeNote) });
};

exports.createNote = async (req, res) => {
  const { title, content } = requireNoteFields(req.body);
  const { rows } = await query(
    `insert into notes (user_id, title, content, tags)
     values ($1, $2, $3, $4)
     returning *`,
    [req.user.id, title, content, normalizeTags(req.body.tags)]
  );

  return res.status(201).json({ note: serializeNote(rows[0]) });
};

exports.updateNote = async (req, res) => {
  const { title, content } = requireNoteFields(req.body);
  const { rows } = await query(
    `update notes
        set title = $3, content = $4, tags = $5, updated_at = now()
      where id = $1 and user_id = $2
      returning *`,
    [req.params.id, req.user.id, title, content, normalizeTags(req.body.tags)]
  );

  if (!rows[0]) {
    throw httpError(404, 'Anotação não encontrada.');
  }

  return res.json({ note: serializeNote(rows[0]) });
};

exports.deleteNote = async (req, res) => {
  const { rowCount } = await query('delete from notes where id = $1 and user_id = $2', [
    req.params.id,
    req.user.id
  ]);

  if (rowCount === 0) {
    throw httpError(404, 'Anotação não encontrada.');
  }

  return res.json({ message: 'Anotação removida.' });
};
