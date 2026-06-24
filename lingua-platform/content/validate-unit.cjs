#!/usr/bin/env node
/* Lingua content validator — checks units against the Methods Spec schema.
   Usage: node validate-unit.cjs <file.json>   (file = a unit object or an array of units)
   Exit 0 if all pass, 1 if any fail. Reusable QA for mass-produced content. */
'use strict';
const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('Usage: node validate-unit.cjs <file.json>'); process.exit(2); }

let data;
try { data = JSON.parse(fs.readFileSync(path, 'utf8')); }
catch (e) { console.error('Cannot parse JSON:', e.message); process.exit(2); }
const units = Array.isArray(data) ? data : [data];

function validate(u) {
  const errs = [];
  const E = m => errs.push(m);
  // top-level
  ['id','level','module','title','theme','canDo','chunks','grammar','reading','listening','speaking','writing','review','quiz']
    .forEach(k => { if (u[k] === undefined) E('missing top-level: ' + k); });
  if (!['A1','A2','B1','B2','C1','C2'].includes(u.level)) E('bad level: ' + u.level);

  // chunks
  const ids = new Set();
  if (Array.isArray(u.chunks)) {
    if (u.chunks.length < 5 || u.chunks.length > 8) E(`chunks should be 5-8 (got ${u.chunks.length})`);
    u.chunks.forEach((c, i) => {
      ['id','text','use','example','freqTier'].forEach(k => { if (c[k] === undefined || c[k] === '') E(`chunk[${i}] missing ${k}`); });
      if (ids.has(c.id)) E('duplicate chunk id: ' + c.id);
      ids.add(c.id);
      if (c.freqTier < 1 || c.freqTier > 5) E(`chunk ${c.id} freqTier out of range`);
    });
  } else E('chunks must be an array');
  const refOk = id => ids.has(id);
  const checkRefs = (arr, where) => (arr || []).forEach(id => { if (!refOk(id)) E(`${where} references unknown chunk id: ${id}`); });

  // grammar
  if (u.grammar) ['focus','pattern','examples','enhance'].forEach(k => { if (u.grammar[k] === undefined) E('grammar missing ' + k); });

  // reading
  if (u.reading) {
    if (!u.reading.passage) E('reading.passage missing');
    (u.reading.questions || []).forEach((q, i) => { if (!q.q || !Array.isArray(q.choices) || q.a == null || q.a < 0 || q.a >= q.choices.length) E(`reading.q[${i}] invalid`); });
    if ((u.reading.questions || []).length < 2) E('reading needs >=2 questions');
  }
  // listening
  if (u.listening) {
    if (!Array.isArray(u.listening.script) || !u.listening.script.length) E('listening.script missing');
    const g = u.listening.gist; if (!g || g.a == null || !Array.isArray(g.choices) || g.a >= g.choices.length) E('listening.gist invalid');
    if (!u.listening.dictogloss || !u.listening.dictogloss.sentence) E('listening.dictogloss.sentence missing (bottom-up task)');
    if (!u.listening.gap || !u.listening.gap.a) E('listening.gap missing');
  }
  // speaking
  if (u.speaking) {
    if (!Array.isArray(u.speaking.shadow) || !u.speaking.shadow.length) E('speaking.shadow missing'); else checkRefs(u.speaking.shadow, 'speaking.shadow');
    if (!u.speaking.minimalPair && !u.speaking.intonation) E('speaking needs a pronunciation focus (minimalPair or intonation)');
    if (!u.speaking.fluency432 || !u.speaking.fluency432.prompt) E('speaking.fluency432 missing');
    if (!u.speaking.retell || !u.speaking.retell.prompt) E('speaking.retell missing'); else checkRefs(u.speaking.retell.useChunks, 'speaking.retell.useChunks');
    if (!u.speaking.task || !u.speaking.task.prompt) E('speaking.task missing'); else checkRefs(u.speaking.task.useChunks, 'speaking.task.useChunks');
  }
  // writing
  if (u.writing) {
    if (!u.writing.model) E('writing.model missing');
    if (!Array.isArray(u.writing.sentenceCombining) || !u.writing.sentenceCombining.length) E('writing.sentenceCombining missing');
    else u.writing.sentenceCombining.forEach((s,i)=>{ if(!Array.isArray(s.parts)||s.parts.length<2||!s.answer) E(`sentenceCombining[${i}] invalid`); });
    if (!u.writing.task || !u.writing.task.prompt) E('writing.task missing'); else checkRefs(u.writing.task.mustInclude, 'writing.task.mustInclude');
  }
  // review
  if (u.review) checkRefs(u.review.srItems, 'review.srItems'); else E('review missing');
  // quiz
  if (Array.isArray(u.quiz)) {
    if (u.quiz.length < 2) E('quiz needs >=2 items');
    u.quiz.forEach((q,i)=>{ if(q.type==='situation'){ if(!Array.isArray(q.options)||q.a==null||q.a>=q.options.length) E(`quiz[${i}] situation invalid`);} else if(q.type==='cloze'){ if(!q.a) E(`quiz[${i}] cloze missing answer`);} else E(`quiz[${i}] unknown type`); });
  } else E('quiz must be an array');

  return errs;
}

let failed = 0;
units.forEach(u => {
  const errs = validate(u);
  if (errs.length) { failed++; console.log(`✗ ${u.id || '(no id)'} — ${errs.length} issue(s):`); errs.forEach(e => console.log('   - ' + e)); }
  else console.log(`✓ ${u.id} — "${u.title}" (${u.level}): ${u.chunks.length} chunks, all sections present, refs valid`);
});
console.log(`\n${units.length - failed}/${units.length} units passed.`);
process.exit(failed ? 1 : 0);
