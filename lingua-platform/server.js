/* ============================================================
   LINGUA PLATFORM — Phase 1 foundation
   Zero-dependency Node backend:
     - node:http        HTTP server + static files
     - node:sqlite      database (built-in, Node 22+)
     - node:crypto      password hashing (scrypt) + tokens
   Implements: accounts, a content engine (units served from the
   DB with answer keys stripped), and SERVER-ENFORCED scoring,
   progress, and SM-2 spaced repetition.
   Run:  node --experimental-sqlite server.js
   ============================================================ */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const DAY = 86400000;
const ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SKILLS = ['reading', 'listening', 'speaking', 'writing'];
const PACE = { casual: { goalXP: 30, daysPerUnit: 20 }, regular: { goalXP: 60, daysPerUnit: 15 }, intensive: { goalXP: 120, daysPerUnit: 10 } };

/* ---------- DB ---------- */
const db = new DatabaseSync(path.join(ROOT, 'data.db'));
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, pass TEXT, salt TEXT, role TEXT DEFAULT 'learner', created_at INTEGER);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER, created_at INTEGER);
CREATE TABLE IF NOT EXISTS enrollments(user_id INTEGER PRIMARY KEY, entry TEXT, goal TEXT, pace TEXT, started_at INTEGER);
CREATE TABLE IF NOT EXISTS stats(user_id INTEGER PRIMARY KEY, xp INTEGER DEFAULT 0, xp_today INTEGER DEFAULT 0, streak INTEGER DEFAULT 0, best_streak INTEGER DEFAULT 0, hearts INTEGER DEFAULT 5, gems INTEGER DEFAULT 0, last_active TEXT);
CREATE TABLE IF NOT EXISTS units(id TEXT PRIMARY KEY, level TEXT, module TEXT, title TEXT, theme TEXT, icon TEXT, ord INTEGER, content TEXT);
CREATE TABLE IF NOT EXISTS skills(user_id INTEGER, unit_id TEXT, skill TEXT, done INTEGER DEFAULT 0, score INTEGER DEFAULT 0, PRIMARY KEY(user_id, unit_id, skill));
CREATE TABLE IF NOT EXISTS srs(user_id INTEGER, word_id TEXT, ef REAL DEFAULT 2.5, ivl INTEGER DEFAULT 0, due INTEGER DEFAULT 0, reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0, seen INTEGER DEFAULT 0, PRIMARY KEY(user_id, word_id));
CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, ref TEXT, correct INTEGER, ts INTEGER);
CREATE TABLE IF NOT EXISTS placement(user_id INTEGER PRIMARY KEY, level TEXT, score INTEGER);
`);

/* ---------- seed content from JSON (content engine source of truth) ---------- */
function seed() {
  const n = db.prepare('SELECT COUNT(*) c FROM units').get().c;
  if (n > 0) return;
  const file = path.join(ROOT, 'content', 'curriculum.json');
  const units = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ins = db.prepare('INSERT INTO units(id,level,module,title,theme,icon,ord,content) VALUES(?,?,?,?,?,?,?,?)');
  for (const u of units) ins.run(u.id, u.level, u.module || '', u.title, u.theme, u.icon || '📘', u.ord || 0, JSON.stringify(u));
  console.log('Seeded', units.length, 'units into the DB.');
}
seed();
const PLACEMENT = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'placement.json'), 'utf8'));

/* ---------- helpers ---------- */
const now = () => Date.now();
const todayStr = () => new Date().toISOString().slice(0, 10);
const norm = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 32).toString('hex'); }
function newToken() { return crypto.randomBytes(24).toString('hex'); }

function getUnit(id) { const r = db.prepare('SELECT content FROM units WHERE id=?').get(id); return r ? JSON.parse(r.content) : null; }
function programUnits(entry, goal) {
  const ei = ORDER.indexOf(entry), gi = ORDER.indexOf(goal);
  const rows = db.prepare('SELECT id,level,title,theme,icon,ord FROM units ORDER BY ord').all();
  return rows.filter(u => { const i = ORDER.indexOf(u.level); return i >= ei && i <= gi; });
}
function buildGoal(entry) { const ei = ORDER.indexOf(entry); return ORDER[Math.min(ei + 2, ORDER.length - 1)]; }

// strip every answer key before sending a unit to the client
function sanitizeUnit(u) {
  const c = JSON.parse(JSON.stringify(u));
  if (c.reading) c.reading.q = (c.reading.q || []).map(q => ({ q: q.q, choices: q.choices }));
  if (c.listening) { c.listening.q = (c.listening.q || []).map(q => ({ q: q.q, choices: q.choices })); if (c.listening.gap) c.listening.gap = { q: c.listening.gap.q }; }
  if (c.writing) { if (c.writing.gap) c.writing.gap = { q: c.writing.gap.q }; if (c.writing.task) c.writing.task = { prompt: c.writing.task.prompt, include: c.writing.task.include, minWords: c.writing.task.minWords }; }
  return c;
}

/* ---------- SM-2 (server-side) ---------- */
function srsGet(uid, wid) { return db.prepare('SELECT * FROM srs WHERE user_id=? AND word_id=?').get(uid, wid); }
function srsUpsert(uid, wid, c) {
  db.prepare(`INSERT INTO srs(user_id,word_id,ef,ivl,due,reps,lapses,seen) VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id,word_id) DO UPDATE SET ef=excluded.ef,ivl=excluded.ivl,due=excluded.due,reps=excluded.reps,lapses=excluded.lapses,seen=excluded.seen`)
    .run(uid, wid, c.ef, c.ivl, c.due, c.reps, c.lapses, c.seen);
}
function schedule(uid, wid, grade) {
  let c = srsGet(uid, wid) || { ef: 2.5, ivl: 0, due: 0, reps: 0, lapses: 0, seen: 0 };
  c.seen = 1; const q = [2, 3, 4, 5][grade];
  if (q < 3) { c.reps = 0; c.ivl = 1; c.lapses++; }
  else { if (c.reps === 0) c.ivl = 1; else if (c.reps === 1) c.ivl = grade === 3 ? 4 : 2; else c.ivl = Math.round(c.ivl * c.ef);
    if (grade === 3) c.ivl = Math.max(c.ivl, c.reps <= 1 ? 3 : Math.round(c.ivl * 1.3));
    if (grade === 1) c.ivl = Math.max(1, Math.round(c.ivl * 0.6)); c.reps++; }
  c.ef = Math.max(1.3, c.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  c.due = now() + c.ivl * DAY; srsUpsert(uid, wid, c); return c;
}

/* ---------- stats / streak (server-enforced) ---------- */
function getStats(uid) { return db.prepare('SELECT * FROM stats WHERE user_id=?').get(uid); }
function touchStreak(uid) {
  const s = getStats(uid); const t = todayStr(); if (!s || s.last_active === t) return;
  const y = new Date(now() - DAY).toISOString().slice(0, 10);
  let streak = s.last_active === y ? s.streak + 1 : 1;
  const best = Math.max(s.best_streak, streak);
  db.prepare('UPDATE stats SET streak=?,best_streak=?,xp_today=0,last_active=? WHERE user_id=?').run(streak, best, t, uid);
}
function addXP(uid, n) { db.prepare('UPDATE stats SET xp=xp+?,xp_today=xp_today+? WHERE user_id=?').run(n, n, uid); }
function addGems(uid, n) { db.prepare('UPDATE stats SET gems=gems+? WHERE user_id=?').run(n, uid); }

/* ---------- program state ---------- */
function unitSkills(uid, unitId) {
  const rows = db.prepare('SELECT skill,done FROM skills WHERE user_id=? AND unit_id=?').all(uid, unitId);
  const m = {}; rows.forEach(r => { if (r.done) m[r.skill] = 1; }); return m;
}
function unitFullyDone(uid, unitId) { const m = unitSkills(uid, unitId); return SKILLS.every(k => m[k]); }
function computeState(uid) {
  const en = db.prepare('SELECT * FROM enrollments WHERE user_id=?').get(uid);
  if (!en) return { enrolled: false };
  const pu = programUnits(en.entry, en.goal);
  let doneSkills = 0; const totalSkills = pu.length * SKILLS.length;
  const units = pu.map(u => { const ms = unitSkills(uid, u.id); const ds = SKILLS.filter(k => ms[k]).length; doneSkills += ds;
    return { id: u.id, level: u.level, title: u.title, theme: u.theme, icon: u.icon, skillsDone: ds, done: ds === SKILLS.length }; });
  const next = units.find(u => !u.done) || null;
  const pct = totalSkills ? Math.round(doneSkills / totalSkills * 100) : 0;
  const remainUnits = (totalSkills - doneSkills) / SKILLS.length;
  const days = Math.max(1, Math.ceil(remainUnits * PACE[en.pace].daysPerUnit));
  const due = db.prepare('SELECT COUNT(*) c FROM srs WHERE user_id=? AND seen=1 AND due<=?').get(uid, now()).c;
  return { enrolled: true, entry: en.entry, goal: en.goal, pace: en.pace, stats: getStats(uid),
    units, nextUnitId: next ? next.id : null, programPct: pct, unitsDone: units.filter(u => u.done).length,
    totalUnits: units.length, projectedFinishDays: days, due };
}

/* ---------- HTTP plumbing ---------- */
function send(res, code, obj, headers = {}) { const body = JSON.stringify(obj); res.writeHead(code, { 'Content-Type': 'application/json', ...headers }); res.end(body); }
function parseCookies(req) { const h = req.headers.cookie || ''; const o = {}; h.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }); return o; }
function readBody(req) { return new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => { try { r(d ? JSON.parse(d) : {}); } catch (e) { r({}); } }); }); }
function userFromReq(req) { const sid = parseCookies(req).sid; if (!sid) return null; const s = db.prepare('SELECT user_id FROM sessions WHERE token=?').get(sid); if (!s) return null; return db.prepare('SELECT id,email,role FROM users WHERE id=?').get(s.user_id); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
function serveStatic(req, res) {
  let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, 'public', path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!fp.startsWith(path.join(ROOT, 'public'))) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, (err, data) => { if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); res.end(data); });
}

/* ---------- API ---------- */
const api = {
  'POST /api/register': async (req, res, u, body) => {
    const email = (body.email || '').trim().toLowerCase(); const pw = body.password || '';
    if (!email || pw.length < 4) return send(res, 400, { error: 'Email and a 4+ char password required.' });
    if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) return send(res, 409, { error: 'That email is already registered.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const info = db.prepare('INSERT INTO users(email,pass,salt,created_at) VALUES(?,?,?,?)').run(email, hashPw(pw, salt), salt, now());
    const uid = info.lastInsertRowid;
    db.prepare('INSERT INTO stats(user_id,last_active) VALUES(?,?)').run(uid, '');
    const token = newToken(); db.prepare('INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)').run(token, uid, now());
    send(res, 200, { ok: true, email }, { 'Set-Cookie': `sid=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax` });
  },
  'POST /api/guest': async (req, res) => {
    const email = 'guest-' + newToken().slice(0, 12) + '@guest.local';
    const salt = crypto.randomBytes(16).toString('hex');
    const info = db.prepare('INSERT INTO users(email,pass,salt,role,created_at) VALUES(?,?,?,?,?)').run(email, hashPw(newToken(), salt), salt, 'guest', now());
    const uid = info.lastInsertRowid;
    db.prepare('INSERT INTO stats(user_id,last_active) VALUES(?,?)').run(uid, '');
    const token = newToken(); db.prepare('INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)').run(token, uid, now());
    send(res, 200, { ok: true, guest: true }, { 'Set-Cookie': `sid=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax` });
  },
  'POST /api/login': async (req, res, u, body) => {
    const email = (body.email || '').trim().toLowerCase(); const pw = body.password || '';
    const row = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!row || hashPw(pw, row.salt) !== row.pass) return send(res, 401, { error: 'Wrong email or password.' });
    const token = newToken(); db.prepare('INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)').run(token, row.id, now());
    send(res, 200, { ok: true, email }, { 'Set-Cookie': `sid=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax` });
  },
  'POST /api/logout': async (req, res, u) => { const sid = parseCookies(req).sid; if (sid) db.prepare('DELETE FROM sessions WHERE token=?').run(sid); send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' }); },
  'GET /api/me': async (req, res, u) => { if (!u) return send(res, 401, { error: 'Not logged in' }); send(res, 200, { user: u, state: computeState(u.id) }); },

  'GET /api/placement': async (req, res, u) => { if (!u) return send(res, 401, {}); send(res, 200, { questions: PLACEMENT.map(p => ({ q: p.q, choices: p.choices })) }); },
  'POST /api/placement/submit': async (req, res, u, body) => {
    if (!u) return send(res, 401, {});
    const answers = body.answers || [];
    const score = {}; ORDER.forEach(l => score[l] = { c: 0, t: 0 });
    PLACEMENT.forEach((item, i) => { score[item.level].t++; if (answers[i] === item.a) score[item.level].c++; });
    let entry = 'C1'; for (const l of ORDER) { const s = score[l]; const r = s.t ? s.c / s.t : 0; if (r < 0.5) { entry = l; break; } }
    if (ORDER.indexOf(entry) > 4) entry = 'C1';
    const total = ORDER.reduce((a, l) => a + score[l].c, 0);
    const goal = buildGoal(entry); const pace = 'regular';
    db.prepare('INSERT OR REPLACE INTO placement(user_id,level,score) VALUES(?,?,?)').run(u.id, entry, total);
    db.prepare('INSERT OR REPLACE INTO enrollments(user_id,entry,goal,pace,started_at) VALUES(?,?,?,?,?)').run(u.id, entry, goal, pace, now());
    if (!getStats(u.id)) db.prepare('INSERT INTO stats(user_id,last_active) VALUES(?,?)').run(u.id, '');
    send(res, 200, { entry, goal, total, of: PLACEMENT.length });
  },
  'POST /api/pace': async (req, res, u, body) => { if (!u) return send(res, 401, {}); if (PACE[body.pace]) db.prepare('UPDATE enrollments SET pace=? WHERE user_id=?').run(body.pace, u.id); send(res, 200, { ok: true, state: computeState(u.id) }); },
  'GET /api/state': async (req, res, u) => { if (!u) return send(res, 401, {}); send(res, 200, computeState(u.id)); },

  'GET /api/unit': async (req, res, u, body, query) => {
    if (!u) return send(res, 401, {});
    const raw = getUnit(query.id); if (!raw) return send(res, 404, { error: 'No such unit' });
    send(res, 200, { unit: sanitizeUnit(raw), skillsDone: unitSkills(u.id, raw.id) });
  },

  // SERVER-ENFORCED grading. Client never sees answers; it submits responses and the server scores.
  'POST /api/grade': async (req, res, u, body) => {
    if (!u) return send(res, 401, {});
    const unit = getUnit(body.unitId); if (!unit) return send(res, 404, { error: 'No unit' });
    const part = body.part, idx = body.index, resp = body.response;
    let correct = false, answer = null;
    if (part === 'reading.q') { answer = unit.reading.q[idx].a; correct = resp === answer; }
    else if (part === 'listening.q') { answer = unit.listening.q[idx].a; correct = resp === answer; }
    else if (part === 'listening.gap') { const g = unit.listening.gap; answer = g.a; correct = (g.accept || [g.a]).some(a => norm(a) === norm(resp)); }
    else if (part === 'writing.gap') { const g = unit.writing.gap; answer = g.a; correct = (g.accept || [g.a]).some(a => norm(a) === norm(resp)); }
    else if (part === 'writing.scramble') { answer = unit.writing.scramble; correct = norm(resp) === norm(answer); }
    else if (part === 'writing.task') { const t = unit.writing.task; const words = norm(resp).split(' ').filter(Boolean);
      const inc = t.include || []; const hasInc = inc.length === 0 || inc.some(w => norm(resp).includes(norm(w)));
      correct = words.length >= (t.minWords || 1) && hasInc; answer = { minWords: t.minWords, n: words.length, hasInc }; }
    else if (part === 'vocab') { const v = unit.vocab[idx]; answer = v.meaning; correct = norm(resp) === norm(v.meaning); schedule(u.id, v.id, correct ? 2 : 0); }
    else if (part === 'introduce') { const v = unit.vocab[idx]; let c = srsGet(u.id, v.id); if (!c || !c.seen) srsUpsert(u.id, v.id, { ef: 2.5, ivl: 1, due: now() + DAY, reps: 1, lapses: 0, seen: 1 }); return send(res, 200, { ok: true }); }
    else return send(res, 400, { error: 'Unknown part' });
    db.prepare('INSERT INTO attempts(user_id,ref,correct,ts) VALUES(?,?,?,?)').run(u.id, body.unitId + ':' + part + ':' + (idx ?? ''), correct ? 1 : 0, now());
    send(res, 200, { correct, answer });
  },

  'POST /api/skill/complete': async (req, res, u, body) => {
    if (!u) return send(res, 401, {});
    const { unitId, skill } = body; if (!SKILLS.includes(skill)) return send(res, 400, { error: 'bad skill' });
    const ms = unitSkills(u.id, unitId);
    if ((skill === 'speaking' || skill === 'writing') && !(ms.reading && ms.listening)) return send(res, 403, { error: 'Finish Reading & Listening first.' });
    touchStreak(u.id);
    const correct = Math.max(0, body.correct | 0), total = Math.max(0, body.total | 0);
    db.prepare(`INSERT INTO skills(user_id,unit_id,skill,done,score) VALUES(?,?,?,1,?)
      ON CONFLICT(user_id,unit_id,skill) DO UPDATE SET done=1,score=MAX(score,excluded.score)`).run(u.id, unitId, skill, correct);
    addXP(u.id, correct * 4 + 10); addGems(u.id, 2);
    let unitDone = false;
    if (unitFullyDone(u.id, unitId)) { unitDone = true; addXP(u.id, 20); addGems(u.id, 6); }
    send(res, 200, { ok: true, unitDone, state: computeState(u.id) });
  },

  'GET /api/review': async (req, res, u) => {
    if (!u) return send(res, 401, {});
    const rows = db.prepare('SELECT word_id FROM srs WHERE user_id=? AND seen=1 AND due<=?').all(u.id, now());
    const words = rows.map(r => { for (const uu of db.prepare('SELECT content FROM units').all()) { const c = JSON.parse(uu.content); const v = c.vocab.find(x => x.id === r.word_id); if (v) return { wordId: v.id, word: v.word, ipa: v.ipa }; } return null; }).filter(Boolean);
    send(res, 200, { words });
  },
  'GET /api/review/word': async (req, res, u, body, query) => {
    if (!u) return send(res, 401, {});
    for (const uu of db.prepare('SELECT content FROM units').all()) { const c = JSON.parse(uu.content); const v = c.vocab.find(x => x.id === query.id); if (v) return send(res, 200, { meaning: v.meaning, ex: v.ex, word: v.word }); }
    send(res, 404, {});
  },
  'POST /api/review/grade': async (req, res, u, body) => {
    if (!u) return send(res, 401, {}); touchStreak(u.id);
    schedule(u.id, body.wordId, Math.max(0, Math.min(3, body.grade | 0)));
    addXP(u.id, body.grade >= 2 ? 6 : 3);
    send(res, 200, { ok: true });
  },
};

/* ---------- router ---------- */
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, 'http://x');
  const route = req.method + ' ' + urlObj.pathname;
  if (urlObj.pathname.startsWith('/api/')) {
    const u = userFromReq(req);
    const body = (req.method === 'POST') ? await readBody(req) : {};
    const query = Object.fromEntries(urlObj.searchParams);
    const handler = api[route];
    if (!handler) return send(res, 404, { error: 'No such endpoint' });
    try { await handler(req, res, u, body, query); }
    catch (e) { console.error(e); send(res, 500, { error: 'Server error' }); }
    return;
  }
  serveStatic(req, res);
});
server.listen(PORT, () => console.log(`Lingua platform running → http://localhost:${PORT}`));
