/**
 * Seeds the database with demo data that mirrors the original
 * Reading Marathon mockup — so the frontend has real data to render
 * the moment the backend is wired up.
 *
 * Run with: npm run seed
 */
require('./migrate'); // ensures schema exists first
const bcrypt = require('bcryptjs');
const db = require('./connection');

const DEFAULT_PASSWORD = 'marathon123'; // demo only — change in production

function run() {
  // Make the seed safely re-runnable: wipe existing rows first so
  // `npm run seed` always resets to a known-good demo state instead of
  // throwing UNIQUE-constraint errors on the second run.
  db.exec(`
    DELETE FROM saved_notes;
    DELETE FROM post_comments;
    DELETE FROM post_reactions;
    DELETE FROM posts;
    DELETE FROM page_logs;
    DELETE FROM reading_entries;
    DELETE FROM goals;
    DELETE FROM events;
    DELETE FROM marathons;
    DELETE FROM books;
    DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);

  const insertUser = db.prepare(`
    INSERT INTO users (name, initials, email, password_hash, avatar_color, role, streak_days, last_active_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, date('now'))
  `);

  const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

  const users = [
    // name, initials, email, color, role, streak
    ['Aisha Hamid', 'AH', 'aisha@speakingfraternity.org', '#1B3A2D', 'admin', 6],
    ['Zaid Khan', 'ZK', 'zaid@speakingfraternity.org', '#C9A84C', 'member', 9],
    ['Noor Bukhari', 'NB', 'noor@speakingfraternity.org', '#1B3A2D', 'member', 2],
    ['Sara Malik', 'SM', 'sara@speakingfraternity.org', '#1B3A2D', 'member', 4],
    ['Omar Farooq', 'OF', 'omar@speakingfraternity.org', '#1B3A2D', 'member', 1],
    ['Umar Raza', 'UR', 'umar@speakingfraternity.org', '#1B3A2D', 'member', 3],
    ['Ali Hassan', 'AHs', 'ali@speakingfraternity.org', '#1B3A2D', 'member', 0],
    ['Fatima Qureshi', 'FQ', 'fatima@speakingfraternity.org', '#1B3A2D', 'member', 5],
  ];

  const userIds = {};
  for (const [name, initials, email, color, role, streak] of users) {
    const { lastInsertRowid } = insertUser.run(name, initials, email, passwordHash, color, role, streak);
    userIds[name] = lastInsertRowid;
  }

  const insertBook = db.prepare(`
    INSERT INTO books (title, author, total_pages, spine_color) VALUES (?, ?, ?, ?)
  `);

  const books = [
    ["Man's Search for Meaning", 'Viktor Frankl', 154, '#2D6A4F'],
    ['Sapiens', 'Yuval Noah Harari', 443, '#5C4033'],
    ['Thinking, Fast and Slow', 'Daniel Kahneman', 499, '#1B4D7A'],
    ['Atomic Habits', 'James Clear', 320, '#6B3A2A'],
    ['The Alchemist', 'Paulo Coelho', 208, '#4A7C59'],
    ['Educated', 'Tara Westover', 334, '#7B3F00'],
    ['48 Laws of Power', 'Robert Greene', 452, '#1A1A2E'],
    ['Outliers', 'Malcolm Gladwell', 309, '#3D5A80'],
    ['Deep Work', 'Cal Newport', 296, '#264653'],
    ['1984', 'George Orwell', 328, '#2C3E50'],
    ['Rich Dad Poor Dad', 'Robert Kiyosaki', 336, '#8B5E3C'],
    ['The Power of Now', 'Eckhart Tolle', 229, '#556B2F'],
    ['Ikigai', 'Héctor García', 194, '#8B2252'],
    ['Zero to One', 'Peter Thiel', 224, '#2F4F4F'],
  ];

  const bookIds = {};
  for (const [title, author, pages, color] of books) {
    const { lastInsertRowid } = insertBook.run(title, author, pages, color);
    bookIds[title] = lastInsertRowid;
  }

  const insertMarathon = db.prepare(`
    INSERT INTO marathons (title, year, start_date, end_date, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);
  const { lastInsertRowid: marathonId } = insertMarathon.run(
    'Summer Reading Marathon', 2026, '2026-06-01', '2026-08-31'
  );

  const insertEntry = db.prepare(`
    INSERT INTO reading_entries (user_id, book_id, marathon_id, current_page, status, started_at, finished_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?), ?)
  `);

  const entries = [
    // user, book, current_page, status, started offset (days ago)
    ['Aisha Hamid', 'Thinking, Fast and Slow', 312, 'on_track', '-9 days'],
    ['Zaid Khan', 'Sapiens', 443, 'finished', '-12 days'],
    ['Noor Bukhari', "Man's Search for Meaning", 44, 'behind', '-11 days'],
    ['Sara Malik', 'Atomic Habits', 120, 'on_track', '-6 days'],
    ['Omar Farooq', 'Outliers', 95, 'behind', '-10 days'],
    ['Umar Raza', 'The Alchemist', 208, 'finished', '-8 days'],
    ['Ali Hassan', '48 Laws of Power', 60, 'on_track', '-4 days'],
    ['Fatima Qureshi', 'Outliers', 150, 'on_track', '-7 days'],
    ['Zaid Khan', 'Educated', 30, 'on_track', '-2 days'],
  ];

  const entryIds = {};
  for (const [user, book, page, status, offset] of entries) {
    const finishedAt = status === 'finished' ? new Date().toISOString() : null;
    const { lastInsertRowid } = insertEntry.run(
      userIds[user], bookIds[book], marathonId, page, status, offset, finishedAt
    );
    entryIds[`${user}:${book}`] = lastInsertRowid;
  }

  const insertPageLog = db.prepare(`
    INSERT INTO page_logs (user_id, reading_entry_id, pages_read, logged_on)
    VALUES (?, ?, ?, date('now', ?))
  `);

  // Spread some page logs across the last 7 days for leaderboard totals
  const pageLogSeed = [
    ['Zaid Khan', 'Sapiens', [120, 95, 110, 99, 80, 70, 50]],
    ['Aisha Hamid', 'Thinking, Fast and Slow', [60, 55, 70, 65, 60, 50, 51]],
    ['Sara Malik', 'Atomic Habits', [40, 35, 50, 45, 42, 38, 37]],
    ['Omar Farooq', 'Outliers', [30, 28, 25, 32, 27, 24, 24]],
  ];

  for (const [user, book, dailyPages] of pageLogSeed) {
    const entryId = entryIds[`${user}:${book}`];
    dailyPages.forEach((pages, i) => {
      insertPageLog.run(userIds[user], entryId, pages, `-${i} days`);
    });
  }

  const insertPost = db.prepare(`
    INSERT INTO posts (user_id, type, body, book_id, page_number, reading_entry_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const posts = [
    [
      'Aisha Hamid', 'progress_update',
      'The chapter on loss aversion is something every debater should read. We overvalue what we already believe far more than we think. Applied this in my last argument structure.',
      'Thinking, Fast and Slow', 312, 'Thinking, Fast and Slow', '-3 hours'
    ],
    [
      'Zaid Khan', 'progress_update',
      'The agricultural revolution chapter reframes everything about "progress." We didn\u2019t domesticate wheat \u2014 wheat domesticated us. Starting Educated next.',
      'Sapiens', 443, 'Sapiens', '-1 day'
    ],
    [
      'Noor Bukhari', 'progress_update',
      'Life has been hectic. But even 10 pages a day is something. The preface alone changed how I think about purpose.',
      "Man's Search for Meaning", 44, "Man's Search for Meaning", '-5 hours'
    ],
    [
      'Noor Bukhari', 'quote',
      'Between stimulus and response there is a space. In that space is our power to choose our response. In our response lies our growth and our freedom.',
      "Man's Search for Meaning", 62, null, '-2 hours'
    ],
    [
      'Aisha Hamid', 'quote',
      'We believe that we know what we want, but we rarely do. We think we want things that we don\u2019t. We\u2019re fundamentally mistaken about ourselves.',
      'Thinking, Fast and Slow', 140, null, '-1 day'
    ],
  ];

  const postIds = {};
  for (const [user, type, body, book, page, entryBook, offset] of posts) {
    const entryId = entryBook ? entryIds[`${user}:${entryBook}`] : null;
    const { lastInsertRowid } = insertPost.run(
      userIds[user], type, body, bookIds[book] || null, page, entryId, offset
    );
    postIds[`${user}:${type}:${book}`] = lastInsertRowid;
  }

  const insertReaction = db.prepare(`
    INSERT OR IGNORE INTO post_reactions (post_id, user_id, reaction) VALUES (?, ?, 'resonate')
  `);

  // A handful of resonates on the quote posts
  const quotePostId1 = postIds['Noor Bukhari:quote:Man\'s Search for Meaning'];
  const quotePostId2 = postIds['Aisha Hamid:quote:Thinking, Fast and Slow'];
  const allUserIds = Object.values(userIds);

  allUserIds.slice(0, 8).forEach(uid => insertReaction.run(quotePostId1, uid));
  allUserIds.slice(0, 12 > allUserIds.length ? allUserIds.length : 12).forEach(uid => insertReaction.run(quotePostId2, uid));

  const insertGoal = db.prepare(`
    INSERT INTO goals (user_id, text, is_done, due_date) VALUES (?, ?, ?, ?)
  `);

  const defaultGoals = [
    ['Read 30 minutes today', 1],
    ["Share a quote this week", 1],
    ['Post a reading note', 0],
    ['Reach page 100 by Sunday', 0],
    ['Attend Friday reading circle', 0],
  ];

  // Give every user the same starter goal set (demo data)
  for (const uid of Object.values(userIds)) {
    for (const [text, done] of defaultGoals) {
      insertGoal.run(uid, text, done, null);
    }
  }

  const insertEvent = db.prepare(`
    INSERT INTO events (title, description, event_date, created_by) VALUES (?, ?, ?, ?)
  `);

  const adminId = userIds['Aisha Hamid'];
  insertEvent.run('Weekly Reading Circle', "Share your week's best passage. 30 min, online.", '2026-06-27', adminId);
  insertEvent.run('Book \u2192 Speech Challenge', 'Turn your reading insight into a 3-min impromptu speech.', '2026-07-04', adminId);
  insertEvent.run('Midpoint Checkpoint', 'Progress review + group discussion + accountability pairs.', '2026-07-15', adminId);

  console.log('✓ Seed data inserted');
  console.log(`  Demo login password for all seeded users: "${DEFAULT_PASSWORD}"`);
  console.log('  e.g. aisha@speakingfraternity.org / ' + DEFAULT_PASSWORD);
}

run();
