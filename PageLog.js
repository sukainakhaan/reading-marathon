const db = require('../db/connection');

const PageLog = {
  /** Logs pages read on a given day (defaults to today) for a reading entry. */
  create({ userId, readingEntryId, pagesRead, loggedOn }) {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO page_logs (user_id, reading_entry_id, pages_read, logged_on)
      VALUES (?, ?, ?, COALESCE(?, date('now')))
    `).run(userId, readingEntryId, pagesRead, loggedOn || null);

    return db.prepare(`SELECT * FROM page_logs WHERE id = ?`).get(lastInsertRowid);
  },

  /**
   * "Pages This Week" leaderboard — sums pages_read per user over the
   * last 7 days (including today), ranked descending.
   */
  weeklyLeaderboard(limit = 10) {
    return db.prepare(`
      SELECT
        u.id AS user_id,
        u.name,
        u.initials,
        u.avatar_color,
        COALESCE(SUM(pl.pages_read), 0) AS total_pages
      FROM users u
      LEFT JOIN page_logs pl
        ON pl.user_id = u.id
        AND pl.logged_on >= date('now', '-6 days')
      GROUP BY u.id
      ORDER BY total_pages DESC
      LIMIT ?
    `).all(limit);
  },

  totalPagesThisWeek() {
    const row = db.prepare(`
      SELECT COALESCE(SUM(pages_read), 0) AS total
      FROM page_logs
      WHERE logged_on >= date('now', '-6 days')
    `).get();
    return row.total;
  },
};

module.exports = PageLog;
