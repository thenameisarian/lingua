# Lingua — Methods Spec (lesson design standard)

This is the standard every Lingua lesson must follow. It turns the evidence-based methods into concrete rules so all content is consistent, defensible, and produced the same way. Author and review every unit against this document.

**Core identity:** Lingua teaches with *real methods and shortcuts* — language learned as **chunks (whole phrases, not single words)** and fluency built by **shadowing** — on top of spaced repetition and comprehensible input. Practical English, for everyone, English-only.

---

## 1. Principles (the non-negotiables)

Every unit, at minimum, must:

1. **Teach vocabulary as chunks** — useful phrases, collocations, and sentence frames, never isolated words. *(Lexical Approach — Lewis; Nation)*
2. **Sequence by frequency** — earlier units use higher-frequency chunks/words first. *(Nation: ~2,000 word families ≈ 80%+ coverage)*
3. **Train speaking by shadowing** — hear a model, copy its rhythm aloud, get a match score. *(Murphey; Hamada)*
4. **Use comprehensible input at i+1** — reading/listening just above current level, with target chunks **flooded and visually enhanced** (bolded) in the text. *(Krashen; Long — focus on form)*
5. **Force retrieval, not recognition** — learners produce/recall answers; situational use ("what do you say when…?"). *(Testing effect — Roediger & Karpicke)*
6. **Push output** — at least one speaking task and one writing task where the learner produces language using the unit's chunks. *(Output Hypothesis — Swain)*
7. **Schedule for retention** — every chunk enters spaced repetition; reviews interleave across units. *(Spacing — Ebbinghaus; FSRS; interleaving & desirable difficulty — Bjork)*
8. **Give immediate, focused feedback** — correct the target items, not everything. *(Ferris)*
9. **Gate on mastery** — advance when demonstrated, with small wins to sustain the daily habit. *(Bloom; mastery learning)*

---

## 2. Methods by section (what goes in a unit)

### Vocabulary → "Chunks"
- 5–8 chunks per unit, each with: the phrase, a short **use note** (when/why to say it), an **example in context**, audio, and a **frequency tier** (1 = most common).
- Multiple encounters: every chunk must reappear in the unit's reading, listening, and the learner's own output.
- Dual coding: audio always; image optional later.

### Grammar → "Focus on form"
- One grammar focus per unit, presented as a **pattern/frame** with examples, **not** a rules lecture.
- **Input flooding + enhancement:** the reading passage contains several instances of the structure, visually highlighted.
- Practised through a task, not abstract drills.

### Reading (input)
- A short level-appropriate passage built **from the unit's chunks** (flooded, bolded).
- Mix of **extensive** (read for meaning/volume) and light **intensive** (2–3 comprehension + 1 vocab-in-context question).
- Read-while-listening available (audio of the passage).

### Listening (input)
- A natural dialogue using the chunks; **script hidden first**.
- **Bottom-up** task: a **dictogloss** (hear a sentence, reconstruct it) or gap/dictation.
- **Top-down** task: a gist/comprehension question. Reveal script at the end. Vary accents over the course.

### Speaking (output) — the signature section
- **Shadowing:** each key chunk, mic-scored.
- **Pronunciation:** one **minimal-pair** set or an **intonation** focus per unit (rotate). *(HVPT)*
- **Fluency — 4/3/2:** a short "say it again, faster/smoother" repetition task on a familiar topic. *(Nation/Maurice)*
- **Retelling:** retell the reading/listening in your own words, using target chunks.
- **Task:** a real speaking task (role-play/invitation/opinion) requiring ≥2 chunks. *(AI feedback grades this later.)*

### Writing (output)
- **Model text** to imitate (genre-based: message, email, review, story…).
- **Sentence combining:** 2–3 items joining short sentences into one — a proven syntax-builder.
- **Guided → free task** with `mustInclude` chunks and a length target; **focused corrective feedback** (rule-based now, AI later).

### Review & sequencing (cross-cutting)
- All chunks feed **spaced repetition (FSRS)**.
- Daily review **interleaves** chunks from many units; recall is made effortful (desirable difficulty); learners **generate** answers.

### Motivation
- Mastery gating, immediate feedback, streak/daily-goal, difficulty kept "just hard enough."

---

## 3. The unit template (every unit is data shaped like this)

```
Unit {
  id, level, module, title, theme, canDo,          // "can-do" outcome
  chunks: [ { id, text, use, example, freqTier(1-5), audio } ],
  grammar: { focus, pattern, examples[], enhance },  // 'enhance' = what to bold in the passage
  reading: { passage, questions[], vocabInContext },
  listening:{ script[], gist:{q,choices,a}, dictogloss:{ sentence }, gap:{q,a,accept} },
  speaking: { shadow:[chunkIds], minimalPair:{a,b,note}, fluency432:{ prompt },
              retell:{ prompt, useChunks[], minWords }, task:{ prompt, useChunks[], need } },
  writing:  { model, sentenceCombining:[ {parts[], answer} ], task:{ prompt, genre, mustInclude[], minWords } },
  review:   { srItems:[chunkIds] },
  quiz:     [ situational-recall + cloze items ]
}
```

**Production rules to keep it feasible (and varied):**

- **Always present:** chunks (+use+example+audio), grammar focus, reading (flooded), listening (+gist+gap), shadowing, situational recall, one speaking task, one writing task, SR items.
- **Rotate across units (interleaving):** dictogloss vs dictation; minimal-pair vs intonation; 4/3/2 fluency; sentence-combining set. Not every method in every unit — rotating keeps units fresh and authoring sustainable, which is itself good pedagogy.
- **Frequency discipline:** A1–A2 use tier-1–2 chunks; B1–B2 tier-2–4; C1–C2 tier-4–5 + idiom/register.
- **English-only.** Use notes are simple English; meaning comes from context, examples, and audio.

---

## 4. Engine upgrades this implies

- **Scheduler → FSRS** (replace SM-2): more accurate review timing, fewer reviews for the same retention.
- **Renderer:** chunk cards, shadowing scorer (mic), dictogloss input, minimal-pair A/B audio compare, 4/3/2 timer, sentence-combining builder, situational-recall MC. (Most already exist from the prototype; the new ones are dictogloss, minimal pairs, 4/3/2, sentence combining.)
- **AI feedback** plugs into `speaking.task`/`retell` and `writing.task` with focused, rubric-based correction.

---

## 5. Definition of done (per unit)

A unit is "done" when it: teaches 5–8 frequency-appropriate chunks with audio; floods + highlights the grammar focus in a comprehensible passage; has a hidden-script listening with one bottom-up and one top-down task; includes shadowing + one pronunciation focus + one fluency/retell + one speaking task; includes a model + sentence-combining + a writing task; registers all chunks for spaced review; and passes automated validation (all sections present, chunk ids unique, no missing answers).
