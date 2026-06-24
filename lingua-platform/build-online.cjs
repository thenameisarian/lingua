#!/usr/bin/env node
/* Build lingua-online.html: inject units + vocab into lingua-online.src.html */
'use strict';
const fs=require('fs'),path=require('path');
const OUT='/sessions/blissful-charming-ride/mnt/outputs';
const SRC=path.join(OUT,'lingua-online.src.html');
const CONTENT=path.join(OUT,'lingua-platform','content');
const APP=path.join(OUT,'lingua-online.html');
const order=['a1','a2','b1','b2','c1','c2'];
function lvl(f){const m=f.match(/units\.([a-c][12])/);return m?order.indexOf(m[1]):99;}
function readAll(re,sorter){let out=[];fs.readdirSync(CONTENT).filter(f=>re.test(f)).sort(sorter).forEach(f=>{let a=JSON.parse(fs.readFileSync(path.join(CONTENT,f),'utf8'));if(!Array.isArray(a))a=[a];out=out.concat(a);});return out;}
const units=readAll(/^units\..+\.json$/,(a,b)=>(lvl(a)-lvl(b))||a.localeCompare(b));
const vocab=readAll(/^vocab\..+\.json$/,(a,b)=>a.localeCompare(b));
let out=fs.readFileSync(SRC,'utf8');
if(!out.includes('const UNITS=[];')||!out.includes('const VOCAB=[];')){console.error('FATAL: markers not found');process.exit(1);}
out=out.replace('const UNITS=[];','const UNITS='+JSON.stringify(units)+';');
out=out.replace('const VOCAB=[];','const VOCAB='+JSON.stringify(vocab)+';');
fs.writeFileSync(APP,out);
console.log('Built lingua-online.html:',units.length,'units +',vocab.length,'vocab.');
