const db = require('../db/connection');

const Post = {
  create({ userId, type, body, bookId, pageNumber, readingEntryId }) {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO posts (user_id, type, body, book_id, page_number, reading_entry_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, type, body, bookId || null, pageNumber || null, readingEntryId || null);
    return Post.findById(lastInsertRowid);
  },

  findById(id) {
    return db.prepare(`
      SELECT
        p.*,
        u.name AS author_name, u.initials AS author_initials, u.avatar_color,
        b.title AS book_title, b.author AS book_author,
        (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.reaction = 'resonate') AS resonate_count,
        (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS comment_count
      FROM posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN books b ON b.id = p.book_id
      WHERE p.id = ?
    `).get(id);
  },

  /** Main feed query. Optionally filter by type (e.g. 'quote' for Quote Wall). */
  findFeed({ type, limit = 20, offset = 0 } = {}) {
    const where = type ? `WHERE p.type = ?` : '';
    const params = type ? [type, limit, offset] : [limit, offset];

    return db.prepare(`
      SELECT
        p.*,
        u.name AS author_name, u.initials AS author_initials, u.avatar_color,
        b.title AS book_title, b.author AS book_author,
        (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.reaction = 'resonate') AS resonate_count,
        (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS comment_count
      FROM posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN books b ON b.id = p.book_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params);
  },

  countByType(type) {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM posts WHERE type = ?`).get(type);
    return row.n;
  },

  delete(id, userId) {
    const result = db.prepare(`DELETE FROM posts WHERE id = ? AND user_id = ?`).run(id, userId);
    return result.changes > 0;
  },

  // --- Reactions ---
  addReaction(postId, userId, reaction = 'resonate') {
    db.prepare(`
      INSERT OR IGNORE INTO post_reactions (post_id, user_id, reaction) VALUES (?, ?, ?)
    `).run(postId, userId, reaction);
  },

  removeReaction(postId, userId, reaction = 'resonate') {
    db.prepare(`
      DELETE FROM post_reactions WHERE post_id = ? AND user_id = ? AND reaction = ?
    `).run(postId, userId, reaction);
  },

  hasReacted(postId, userId, reaction = 'resonate') {
    const row = db.prepare(`
      SELECT 1 FROM post_reactions WHERE post_id = ? AND user_id = ? AND reaction = ?
    `).get(postId, userId, reaction);
    return !!row;
  },

  // --- Comments (Discuss) ---
  addComment(postId, userId, body) {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO post_comments (post_id, user_id, body) VALUES (?, ?, ?)
    `).run(postId, userId, body);

    return db.prepare(`
      SELECT c.*, u.name AS author_name, u.initials AS author_initials
      FROM post_comments c JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
    `).get(lastInsertRowid);
  },

  findComments(postId) {
    return db.prepare(`
      SELECT c.*, u.name AS author_name, u.initials AS author_initials
      FROM post_comments c JOIN users u ON u.id = c.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(postId);
  },

  // --- Saved notes ---
  saveForUser(userId, postId) {
    db.prepare(`INSERT OR IGNORE INTO saved_notes (user_id, post_id) VALUES (?, ?)`).run(userId, postId);
  },

  unsaveForUser(userId, postId) {
    db.prepare(`DELETE FROM saved_notes WHERE user_id = ? AND post_id = ?`).run(userId, postId);
  },

  findSavedByUser(userId) {
    return db.prepare(`
      SELECT
        p.*, u.name AS author_name, u.initials AS author_initials,
        b.title AS book_title
      FROM saved_notes sn
      JOIN posts p ON p.id = sn.post_id
      JOIN users u ON u.id = p.user_id
      LEFT JOIN books b ON b.id = p.book_id
      WHERE sn.user_id = ?
      ORDER BY sn.created_at DESC
    `).all(userId);
  },
};

module.exports = Post;
