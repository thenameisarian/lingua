# Lingua English Lab — Design & Teaching Guide

A fun, gamified English-learning system built on modern learning science, in the spirit of the Daana exam-prep apps (teal theme, serif headings, organized cards, streaks/XP/hearts). This guide explains the method behind the prototype and gives you ready-to-run classroom material.

---

## 1. The learning science it's built on

The whole point of the system is that it doesn't just *show* learners English — it forces their brains to do the work that actually creates memory. Four well-established findings drive every design choice.

**Spaced repetition.** Memory fades on a predictable curve. If you review a word right before you'd forget it, the memory gets stronger and the next "forget point" moves further out. The app schedules each card individually using an SM-2 style algorithm: every card carries its own *interval*, *ease factor*, and *due date*. Rate a card "Good" and it comes back in a few days; rate it "Again" and it resets to tomorrow. Over a few weeks the strong words almost disappear from your queue while the shaky ones keep returning — which is exactly what you want.

**Active recall (the testing effect).** Re-reading feels productive but barely moves memory. *Retrieving* an answer from your own head is what builds it. So the app never just shows a word and its meaning side by side — it asks you to produce the answer first (recall it, choose it, or type it), then reveals. The small struggle is the feature, not a bug.

**Interleaving.** Studying one topic in a long block feels smoother but transfers worse than mixing topics. The review queue deliberately shuffles levels and word types together rather than drilling one set at a time, so learners practise *choosing* the right knowledge, not just repeating it.

**Desirable difficulty + immediate feedback.** Tasks are kept just hard enough to require effort (typing a missing word is harder than recognising it), and every answer gets instant right/wrong feedback with the correct form shown — the conditions under which feedback helps most.

Gamification (streaks, XP, hearts, daily goals) isn't the method — it's the *adherence layer*. Spaced repetition only works if learners show up daily, so the streak and daily-goal mechanics exist to make the daily habit stick.

---

## 2. How the prototype works

| Piece | What it does | The science it serves |
|---|---|---|
| **Placement / level pick** | Learner starts at A1–A2, B1–B2, or C1 (or a quick check) | Right level of difficulty from day one |
| **Review session** | Due cards + a few new ones, shuffled; each shown as recall, multiple-choice, or fill-the-gap | Spaced repetition + active recall + interleaving |
| **Self-grading (Again/Hard/Good/Easy)** | Learner rates recall; the next interval is computed from it | SM-2 scheduling |
| **Mini-lessons** | Short "teach → practise" grammar/usage units | Explicit instruction then retrieval |
| **Hearts** | Lost on wrong answers, reset daily | Gentle stakes; encourages care |
| **XP, levels, streak, daily goal, gems** | Visible progress and daily habit hooks | Adherence / motivation |
| **Progress screen** | Words mastered, level breakdown, best streak | Self-monitoring keeps motivation realistic |

A word counts as **"mastered"** once its review interval reaches ~8 days, i.e. the learner has recalled it correctly enough times that it's spacing out on its own.

---

## 3. CEFR level map

The content spans all six CEFR bands so the same system serves your whole mixed-level group. Each level should layer **vocabulary + one grammar focus + a communication goal**.

| Level | Vocabulary focus | Grammar focus | Can-do goal |
|---|---|---|---|
| **A1** | Survival words, daily objects, numbers, basic verbs | present simple, *to be*, articles | Introduce self, ask simple questions |
| **A2** | Routines, shopping, travel, time | past simple, present continuous, *going to* | Handle everyday transactions |
| **B1** | Opinions, work, feelings, phrasal verbs | present perfect, conditionals (0/1), comparatives | Explain plans and opinions, manage most travel |
| **B2** | Abstract topics, collocations, register | passive, conditionals (2/3), reported speech, linkers | Argue a viewpoint, write structured text |
| **C1** | Nuance, idiom, academic & professional lexis | inversion, cleft sentences, advanced connectors | Use English flexibly for social/academic/professional ends |
| **C2** | Rhetoric, connotation, academic discourse | fronting/emphasis, hedging, nominalisation | Express precisely with full nuance; near-native command |

---

## 4. Ready-to-run class activities (works with the app)

These pair with the app so screen time and class time reinforce each other.

**Warm-up: "Yesterday's cards" (5 min).** Learners open the app's Review and do their due cards before class starts. Then ask three of them to use one reviewed word in a sentence about their weekend. *Spaced repetition + spoken production.*

**Vocabulary relay (10 min).** Split into pairs. One says a target word's meaning or example sentence with the word blanked; the partner supplies the word. Swap. This is active recall made social — and it mirrors the app's cloze cards.

**Grammar to speech (15 min).** After a mini-lesson (e.g. *Make vs Do*), give each learner three prompts ("a decision", "the dishes", "a mistake") to build spoken sentences in pairs. Circulate and correct on the spot — immediate feedback.

**Error hunt (10 min).** Put 5 sentences on the board, 3 with errors from the current grammar focus. Teams find and fix them. Builds the *noticing* skill that transfers to their own writing.

**Weekly "teach-back" (10 min).** One learner teaches the week's grammar point to the class in 2 minutes. Teaching forces the deepest retrieval of all.

**Streak check-in (2 min).** Quickly celebrate who kept their streak. Public, low-stakes accountability is one of the strongest adherence levers — and free.

---

## 5. Suggested daily learner routine

A realistic, research-aligned daily loop that takes ~15 minutes:

1. **Review due cards first** (5–8 min) — clears the spaced-repetition queue while memory is freshest.
2. **One mini-lesson** (5 min) — new grammar or usage, taught then practised.
3. **Hit the daily XP goal** (the app tracks this) — protects the streak and the habit.

Short and daily beats long and occasional, every time — spacing is the whole game.

---

## 6. Where this can go next (roadmap ideas)

- **Listening & speaking cards** — audio prompts and speech-recognition checks (the prototype is text-first).
- **FSRS scheduler** — a newer, more accurate spaced-repetition algorithm than SM-2 if you want to optimise retention/effort.
- **Teacher dashboard** — assign decks, see each learner's mastery and streaks (mirrors Daana's server-enforced progress).
- **Exam tracks** — IELTS / Duolingo English Test / GED skins on the same engine, reusing the Daana family.
- **AI sentence feedback** — learner writes a sentence with a target word; the system checks grammar and naturalness.
- **Content authoring** — a simple sheet/JSON so you or other teachers can add decks without touching code.

---

*Prototype file: `lingua-english-lab.html` — open it in any browser. Progress saves locally on that device. "Lingua" is a working name; rename freely.*
