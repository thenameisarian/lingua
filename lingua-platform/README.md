# Lingua Platform — Phase 1 foundation

The real-platform foundation for the Lingua full English course (see the *Master Blueprint*). This turns the single-file prototype into a proper client–server app: a database, accounts, a **content engine** that serves units from the database, and **server-enforced** scoring and progress (so results can't be faked — the same principle as the Daana apps).

It is deliberately **zero-dependency**: it uses Node's built-in HTTP server, built-in SQLite, and built-in crypto. Nothing to `npm install`.

## Run it

Requires **Node.js 22 or newer** (for built-in SQLite).

```bash
cd lingua-platform
npm start            # = node --experimental-sqlite server.js
# then open http://localhost:3000
```

To wipe all data and start fresh: `npm run reset` (deletes `data.db`).

## What works in this phase

- **Accounts** — register / log in / log out, password hashing (scrypt), cookie sessions.
- **Placement test** — scored on the server; sets the learner's level and path.
- **Content engine** — units live in the database (seeded from `content/curriculum.json`); the API serves them **with all answer keys stripped out**.
- **Server-enforced everything** — grading, XP, gems, streaks, unit/skill completion, and spaced-repetition (SM-2) scheduling all happen on the server. The client only submits responses.
- **Four-skill unit player** — Reading, Listening, Speaking (shadowing + retelling, browser speech), Writing (sentence-builder, gap-fill, writing task). Output unlocks only after input.
- **Daily review** — due words pulled from the server's spaced-repetition schedule.

The Speaking and Writing tasks already show **"AI feedback — coming soon"** hooks; wiring a real LLM in is the next phase.

## Project layout

```
lingua-platform/
  server.js              # HTTP server, DB schema, content engine, API, scoring (zero deps)
  package.json
  content/
    curriculum.json      # seed units (A1 sample) — full content imports here / via the CMS later
    placement.json       # placement test bank (answers stay server-side)
  public/
    index.html           # the client (talks only to the API)
  data.db                # created on first run (SQLite)
```

## API (summary)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/register`, `/api/login`, `/api/logout` | accounts |
| GET | `/api/me`, `/api/state` | session + program state |
| GET | `/api/placement` · POST `/api/placement/submit` | placement → level |
| POST | `/api/pace` | change pace |
| GET | `/api/unit?id=` | a unit, **answers removed** |
| POST | `/api/grade` | submit a response, **server scores it** |
| POST | `/api/skill/complete` | mark a skill done; server awards XP/streak |
| GET | `/api/review` · GET `/api/review/word?id=` · POST `/api/review/grade` | spaced repetition |

## Data model (SQLite tables)

`users`, `sessions`, `enrollments`, `stats`, `units`, `skills`, `srs`, `attempts`, `placement` — matching the entities in the blueprint.

## How this maps to deployment (Daana-style)

The architecture is intentionally portable. To deploy on Cloudflare (like Daana):

- `server.js` route handlers → **Cloudflare Pages Functions**.
- built-in SQLite → **Cloudflare D1** (same SQL).
- `public/` → static assets on **Pages**.
- media (later) → **R2** object storage.

Because all logic is plain SQL + standard Web concepts, the port is mechanical rather than a rewrite.

## Next phases (from the blueprint)

1. **Import full content** A1–C2 (this build seeds an A1 sample) and add the **CMS** authoring UI.
2. **AI feedback** for speaking & writing (replace the rule-based checks at the existing hooks).
3. **Audio & media** (TTS pipeline, then professional recordings).
4. **Level exams + certificates** and the **teacher/admin dashboard**.
