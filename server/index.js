import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 3001;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_NODES = 1000;
const MAX_EDGES = 2000;
const CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

const db = new DatabaseSync(path.join(__dirname, 'share-codes.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS share_codes (
    code TEXT PRIMARY KEY,
    document TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

function deleteExpired() {
  db.prepare('DELETE FROM share_codes WHERE expires_at <= ?').run(Date.now());
}

function generateCode() {
  let code = '';
  for (let i = 0; i < 4; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function findRow(code) {
  return db.prepare('SELECT code, document, expires_at FROM share_codes WHERE code = ?').get(code);
}

function generateFreeCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateCode();
    if (!findRow(candidate)) return candidate;
  }
  throw new Error('Unable to generate a free code');
}

setInterval(deleteExpired, 60 * 60 * 1000);
deleteExpired();

const app = express();
app.use(express.json({ limit: '5mb' }));

const CODE_RE = /^[a-z0-9]{4}$/;

app.post('/api/configs', (req, res) => {
  const { code: requestedCode, document } = req.body ?? {};
  if (!document) {
    res.status(400).json({ error: 'document is required' });
    return;
  }
  if (requestedCode && !CODE_RE.test(requestedCode)) {
    res.status(400).json({ error: 'code must be 4 lowercase alphanumeric characters' });
    return;
  }
  if ((document.nodes?.length ?? 0) > MAX_NODES || (document.edges?.length ?? 0) > MAX_EDGES) {
    res.status(400).json({ error: `document exceeds limits (${MAX_NODES} nodes / ${MAX_EDGES} edges max)` });
    return;
  }

  deleteExpired();
  const documentJson = JSON.stringify(document);
  const expiresAt = Date.now() + TTL_MS;

  let code = requestedCode;
  if (code) {
    db.prepare(
      'INSERT INTO share_codes (code, document, expires_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(code) DO UPDATE SET document = excluded.document, expires_at = excluded.expires_at',
    ).run(code, documentJson, expiresAt);
  } else {
    code = generateFreeCode();
    db.prepare('INSERT INTO share_codes (code, document, expires_at) VALUES (?, ?, ?)').run(
      code,
      documentJson,
      expiresAt,
    );
  }

  res.json({ code, expiresAt: new Date(expiresAt).toISOString() });
});

app.get('/api/configs/:code', (req, res) => {
  deleteExpired();
  const row = findRow(req.params.code.toLowerCase());
  if (!row) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  // Loading a map counts as activity — push its expiry back out so maps
  // people keep coming back to never silently disappear.
  const expiresAt = Date.now() + TTL_MS;
  db.prepare('UPDATE share_codes SET expires_at = ? WHERE code = ?').run(expiresAt, row.code);
  res.json({ document: JSON.parse(row.document), expiresAt: new Date(expiresAt).toISOString() });
});

app.listen(PORT, () => {
  console.log(`Share-code API listening on http://localhost:${PORT}`);
});
