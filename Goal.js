const db = require('../db/connection');

const Goal = {
  findByUser(userId) {
    return db.prepare(`SELECT * FROM goals WHERE user_id = ? ORDER BY created_at ASC`).all(userId);
  },

  create({ userId, text, dueDate }) {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO goals (user_id, text, due_date) VALUES (?, ?, ?)
    `).run(userId, text, dueDate || null);
    return db.prepare(`SELECT * FROM goals WHERE id = ?`).get(lastInsertRowid);
  },

  toggle(goalId, userId) {
    const goal = db.prepare(`SELECT * FROM goals WHERE id = ? AND user_id = ?`).get(goalId, userId);
    if (!goal) return null;

    const newValue = goal.is_done ? 0 : 1;
    db.prepare(`UPDATE goals SET is_done = ? WHERE id = ?`).run(newValue, goalId);
    return db.prepare(`SELECT * FROM goals WHERE id = ?`).get(goalId);
  },

  delete(goalId, userId) {
    const result = db.prepare(`DELETE FROM goals WHERE id = ? AND user_id = ?`).run(goalId, userId);
    return result.changes > 0;
  },
};

module.exports = Goal;
