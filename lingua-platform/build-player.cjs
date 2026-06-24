#!/usr/bin/env node
/* Build lingua-app.html: inject units (units.*.json) and vocabulary (vocab.*.json)
   into the engine (lingua-player.html). Usage: node build-player.cjs */
'use strict';
const fs = require('fs'), path = require('path');
const OUT_DIR = '/sessions/blissful-charming-ride/mnt/outputs';
const ENGINE = path.join(OUT_DIR, 'lingua-player.html');
const CONTENT = path.join(OUT_DIR, 'lingua-platform', 'content');
const APP = path.join(OUT_DIR, 'lingua-app.html');

const order = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
function lvl(f) { const m = f.match(/units\.([a-c][12])/); return m ? order.indexOf(m[1]) : 99; }
function readAll(re, sorter) {
  let out = [];
  fs.readdirSync(CONTENT).filter(f => re.test(f)).sort(sorter).forEach(f => {
    let a = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'));
    if (!Array.isArray(a)) a = [a];
    out = out.concat(a); console.log('  +', f, '->', a.length);
  });
  return out;
}
const units = readAll(/^units\..+\.json$/, (a, b) => (lvl(a) - lvl(b)) || a.localeCompare(b));
const vocab = readAll(/^vocab\..+\.json$/, (a, b) => a.localeCompare(b));

let out = fs.readFileSync(ENGINE, 'utf8');
if (!out.includes('const UNITS=[];') || !out.includes('const VOCAB=[];')) { console.error('FATAL: engine markers not found.'); process.exit(1); }
out = out.replace('const UNITS=[];', 'const UNITS=' + JSON.stringify(units) + ';');
out = out.replace('const VOCAB=[];', 'const VOCAB=' + JSON.stringify(vocab) + ';');
fs.writeFileSync(APP, out);
console.log('Built lingua-app.html:', units.length, 'units +', vocab.length, 'vocabulary items.');
