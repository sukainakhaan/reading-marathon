const db = require('../db/connection');

const Book = {
  findAll() {
    return db.prepare(`SELECT * FROM books ORDER BY title ASC`).all();
  },

  findById(id) {
    return db.prepare(`SELECT * FROM books WHERE id = ?`).get(id);
  },

  findByTitle(title) {
    return db.prepare(`SELECT * FROM books WHERE title = ? COLLATE NOCASE`).get(title);
  },

  create({ title, author, totalPages, spineColor }) {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO books (title, author, total_pages, spine_color) VALUES (?, ?, ?, ?)
    `).run(title, author || null, totalPages, spineColor || '#2D6A4F');
    return Book.findById(lastInsertRowid);
  },

  /**
   * Returns the "Community Shelf" — every active (not finished) reading_entry
   * joined with book + reader info, for the shelf visualization.
   */
  shelf() {
    return db.prepare(`
      SELECT
        re.id AS entry_id,
        b.id AS book_id,
        b.title,
        b.author,
        b.total_pages,
        b.spine_color,
        u.id AS user_id,
        u.name AS reader_name,
        re.current_page,
        re.status
      FROM reading_entries re
      JOIN books b ON b.id = re.book_id
      JOIN users u ON u.id = re.user_id
      WHERE re.status != 'finished'
      ORDER BY re.updated_at DESC
    `).all();
  },
};

module.exports = Book;
