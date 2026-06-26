const db = require('../db/connection');

const Event = {
  findUpcoming(limit = 10) {
    return db.prepare(`
      SELECT e.*, u.name AS created_by_name
      FROM events e
      LEFT JOIN users u ON u.id = e.created_by
      WHERE e.event_date >= date('now')
      ORDER BY e.event_date ASC
      LIMIT ?
    `).all(limit);
  },

  findAll() {
    return db.prepare(`
      SELECT e.*, u.name AS created_by_name
      FROM events e
      LEFT JOIN users u ON u.id = e.created_by
      ORDER BY e.event_date ASC
    `).all();
  },

  findById(id) {
    return db.prepare(`SELECT * FROM events WHERE id = ?`).get(id);
  },

  create({ title, description, eventDate, createdBy }) {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO events (title, description, event_date, created_by) VALUES (?, ?, ?, ?)
    `).run(title, description || null, eventDate, createdBy || null);
    return db.prepare(`SELECT * FROM events WHERE id = ?`).get(lastInsertRowid);
  },

  delete(id) {
    const result = db.prepare(`DELETE FROM events WHERE id = ?`).run(id);
    return result.changes > 0;
  },
};

module.exports = Event;
