# Lingua — Build Status

Snapshot of the English-learning system as built autonomously. Updated this session.

## What's done and working

**The course content — the dominant gap — is now built across all six CEFR levels.**

- **36 units, 181 unique chunks**, validated, covering **A1, A2, B1, B2, C1, C2** (6 units each).
- Every unit is **methods-rich** and follows the Methods Spec: chunk/sentence vocabulary (not single words), grammar focus with input flooding, reading, listening + **dictogloss** + gap, **shadowing**, **minimal-pair** pronunciation, the **4/3/2 fluency** drill, retell, speaking task, writing model + **sentence-combining** + task, situational-recall quiz.
- **FSRS spaced repetition** (the current best algorithm) schedules every chunk for review.
- **Level tests + printable certificates**: finish all units in a level to unlock its test; pass 80% to earn a CEFR certificate (Arian Academy / Lingua branded).

### The product to use
**`lingua-app.html`** — open by double-click (best in Chrome for the mic/audio). No server, no sign-up; progress saves in the browser. This is the complete, usable course.

### How it's built (reproducible pipeline)
```
lingua-player.html              # the engine (UI + methods + FSRS + tests/certs)
lingua-platform/content/
  units.a1.json … units.c2.json # validated content batches (the course)
  validate-unit.cjs             # QA: checks every unit against the Methods Spec
lingua-platform/build-player.cjs# injects content into the engine -> lingua-app.html
```
To rebuild after editing content: `node lingua-platform/build-player.cjs`
To QA a batch: `node lingua-platform/content/validate-unit.cjs units.b1.json`

### Supporting documents
- `Lingua_Full_Course_Blueprint.docx` — the master plan.
- `Lingua_Methods_Spec.md` — the lesson-design standard.
- `lingua-design-and-teaching-guide.md` — research basis + classroom activities.
- `lingua-platform/` — the real server platform foundation (accounts, DB, server-enforced progress, app-wall gateway, guest mode).

## Verified this session
- All 6 batches pass validation (36/36 units); no duplicate chunk or unit IDs.
- FSRS behaves correctly (intervals grow on success, reset on lapse).
- Built app is structurally complete and JavaScript syntax-clean.

## Remaining — needs your decision (genuine blockers)

These are the only items left, and each needs something only you can provide:

1. **AI feedback for speaking & writing.** The hooks are in place, but real grading needs an **LLM API key** and a cost decision (e.g., Claude API). Tell me to wire it in and which provider/budget, and I'll build it into the platform's `writing.task` and speaking endpoints.
2. **Deployment.** To put the platform online (so learners use a URL with no setup), I need access to a **hosting account** — Cloudflare matches the Daana stack. Once you connect it, I can deploy.
3. **Content depth (optional).** Six units per level is a solid MVP per level; a maximal course would expand toward ~40–60 units/level. I can keep generating batches anytime — the pipeline makes this routine.

Everything that could be completed without your credentials or a cost decision is done. Say the word on the AI provider and hosting, and I'll finish those two.
