const db = require('../db/connection');

function computeStatus({ currentPage, totalPages, startedAt, plannedDays = 14 }) {
  if (currentPage >= totalPages) return 'finished';

  // Expected pace: linear over plannedDays from startedAt to now.
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const daysElapsed = Math.max(0, (now - start) / (1000 * 60 * 60 * 24));
  const expectedPage = Math.min(totalPages, (totalPages / plannedDays) * daysElapsed);

  // Behind if more than ~15% under the expected pace.
  return currentPage < expectedPage * 0.85 ? 'behind' : 'on_track';
}

const ReadingEntry = {
  findById(id) {
    return db.prepare(`
      SELECT re.*, b.title, b.author, b.total_pages, b.spine_color, u.name AS reader_name
      FROM reading_entries re
      JOIN books b ON b.id = re.book_id
      JOIN users u ON u.id = re.user_id
      WHERE re.id = ?
    `).get(id);
  },

  findByUser(userId) {
    return db.prepare(`
      SELECT re.*, b.title, b.author, b.total_pages, b.spine_color
      FROM reading_entries re
      JOIN books b ON b.id = re.book_id
      WHERE re.user_id = ?
      ORDER BY re.updated_at DESC
    `).all(userId);
  },

  /** Member Progress feed: all entries with reader + book info, newest first. */
  findAllWithDetails({ limit = 50, offset = 0 } = {}) {
    return db.prepare(`
      SELECT
        re.id, re.current_page, re.status, re.started_at, re.finished_at, re.updated_at,
        b.id AS book_id, b.title, b.author, b.total_pages,
        u.id AS user_id, u.name AS reader_name, u.initials, u.avatar_color
      FROM reading_entries re
      JOIN books b ON b.id = re.book_id
      JOIN users u ON u.id = re.user_id
      ORDER BY re.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  },

  create({ userId, bookId, marathonId }) {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO reading_entries (user_id, book_id, marathon_id, current_page, status)
      VALUES (?, ?, ?, 0, 'on_track')
    `).run(userId, bookId, marathonId || null);
    return ReadingEntry.findById(lastInsertRowid);
  },

  /**
   * Updates current_page, recomputes status, and stamps finished_at when complete.
   */
  updateProgress(entryId, currentPage) {
    const entry = db.prepare(`SELECT * FROM reading_entries WHERE id = ?`).get(entryId);
    if (!entry) return null;

    const book = db.prepare(`SELECT total_pages FROM books WHERE id = ?`).get(entry.book_id);
    const clampedPage = Math.max(0, Math.min(currentPage, book.total_pages));

    const status = computeStatus({
      currentPage: clampedPage,
      totalPages: book.total_pages,
      startedAt: entry.started_at,
    });

    const finishedAt = status === 'finished' ? new Date().toISOString() : entry.finished_at;

    db.prepare(`
      UPDATE reading_entries
      SET current_page = ?, status = ?, finished_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(clampedPage, status, finishedAt, entryId);

    return ReadingEntry.findById(entryId);
  },

  belongsToUser(entryId, userId) {
    const row = db.prepare(`SELECT user_id FROM reading_entries WHERE id = ?`).get(entryId);
    return !!row && row.user_id === userId;
  },
};

module.exports = ReadingEntry;
