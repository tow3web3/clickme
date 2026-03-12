import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// SQLite setup
const db = new Database(join(__dirname, 'clicks.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    count INTEGER NOT NULL DEFAULT 0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'anon',
    clicks INTEGER NOT NULL DEFAULT 0,
    last_click TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Seed global counter
const row = db.prepare('SELECT count FROM clicks WHERE id = 1').get();
if (!row) {
  db.prepare('INSERT INTO clicks (id, count) VALUES (1, 0)').run();
}

// GET /api/clicks — global count
app.get('/api/clicks', (req, res) => {
  const { count } = db.prepare('SELECT count FROM clicks WHERE id = 1').get();
  res.json({ count });
});

// POST /api/clicks — increment global + user count
app.post('/api/clicks', (req, res) => {
  const { uid, name } = req.body || {};
  if (!uid) return res.status(400).json({ error: 'uid required' });

  const displayName = (name || 'anon').slice(0, 30);

  // Upsert user
  db.prepare(`
    INSERT INTO users (uid, name, clicks, last_click)
    VALUES (?, ?, 1, datetime('now'))
    ON CONFLICT(uid) DO UPDATE SET
      clicks = clicks + 1,
      name = ?,
      last_click = datetime('now')
  `).run(uid, displayName, displayName);

  // Increment global
  db.prepare('UPDATE clicks SET count = count + 1 WHERE id = 1').run();

  const { count } = db.prepare('SELECT count FROM clicks WHERE id = 1').get();
  const user = db.prepare('SELECT clicks FROM users WHERE uid = ?').get(uid);

  res.json({ count, userClicks: user.clicks });
});

// GET /api/user/:uid — get user's click count
app.get('/api/user/:uid', (req, res) => {
  const user = db.prepare('SELECT clicks FROM users WHERE uid = ?').get(req.params.uid);
  res.json({ userClicks: user ? user.clicks : 0 });
});

// GET /api/leaderboard — top 50 clickers
app.get('/api/leaderboard', (req, res) => {
  const rows = db.prepare(
    'SELECT name, clicks, last_click FROM users ORDER BY clicks DESC LIMIT 50'
  ).all();
  res.json({ leaderboard: rows });
});

// Serve static build in production
app.use(express.static(join(__dirname, 'dist')));
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
