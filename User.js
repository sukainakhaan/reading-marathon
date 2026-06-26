const db = require('../db/connection');

const PUBLIC_FIELDS = `id, name, initials, email, avatar_color, role, streak_days, last_active_date, created_at`;

const User = {
  findByEmail(email) {
    return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
  },

  findById(id) {
    return db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(id);
  },

  findAll() {
    return db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users ORDER BY name ASC`).all();
  },

  create({ name, initials, email, passwordHash, avatarColor }) {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO users (name, initials, email, password_hash, avatar_color, last_active_date)
      VALUES (?, ?, ?, ?, ?, date('now'))
    `).run(name, initials, email, passwordHash, avatarColor || '#1B3A2D');
    return User.findById(lastInsertRowid);
  },

  /**
   * Updates the user's streak. Call this whenever a user logs activity
   * (a page log, a post, etc). If they were already active today, no-op.
   * If they were active yesterday, increments the streak. Otherwise resets to 1.
   */
  touchStreak(userId) {
    const user = db.prepare(`SELECT last_active_date, streak_days FROM users WHERE id = ?`).get(userId);
    if (!user) return;

    const today = db.prepare(`SELECT date('now') AS d`).get().d;
    if (user.last_active_date === today) return; // already counted today

    const yesterday = db.prepare(`SELECT date('now', '-1 day') AS d`).get().d;
    const newStreak = user.last_active_date === yesterday ? user.streak_days + 1 : 1;

    db.prepare(`UPDATE users SET streak_days = ?, last_active_date = ? WHERE id = ?`)
      .run(newStreak, today, userId);
  },
};

module.exports = User;
