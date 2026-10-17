// Short lessons must preserve exact words, review mistakes and allow a saved break.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','mini-path.js'),'utf8');
const window={};vm.runInNewContext(source,{window,Date,Math,Number,Object,String,Array});
const P=window.NEMiniPath;
assert(P&&P.SIZE===5);
assert.deepEqual(Array.from(P.boundaries(15)),[5,10,15]);
assert.deepEqual(Array.from(P.boundaries(7)),[5,7]);
assert.deepEqual(Array.from(P.boundaries(0)),[]);
const d={active:Array.from({length:15},(_,i)=>({word:'ord-'+i,translation:'слово '+i})),cardsSeen:5,miniRounds:{}};
const round=P.build(d,5);
assert.equal(round.questions.length,2);
assert.equal(round.phase,'quiz');
for(const q of round.questions){
 assert(q.options.includes(d.active[q.wordIndex].translation));
 assert(q.options.every(x=>d.active.some(w=>w.translation===x)),'Never invent answer choices');
 assert.equal(q.options[q.correct],d.active[q.wordIndex].translation);
 assert.equal(new Set(q.options).size,q.options.length);
}
const missed=round.questions[0],wrong=missed.options.findIndex((x,i)=>i!==missed.correct);
assert.equal(P.evaluate(round,wrong).firstMiss,true);
assert.equal(P.evaluate(round,wrong).firstMiss,false);
assert.equal(round.index,0,'A wrong answer does not skip the question');
assert.equal(P.evaluate(round,missed.correct).correct,true);
const second=round.questions[round.index];assert(second.audio,'Second mini question trains listening');
assert.equal(P.evaluate(round,second.correct).done,true);
assert.equal(round.phase,'break');
d.miniRounds['5']={done:true,errors:round.mistakes};
assert.equal(P.build(d,5),null,'Completed checkpoints do not reappear after reload');
assert.equal(P.progress(d).completed,1);
assert.equal(P.progress(JSON.parse(JSON.stringify(d))).completed,1,'Round progress survives save/load');
assert.equal(P.progress(d).seen,5);
assert.equal(P.progress({...d,cardsSeen:55}).seen,15);
assert.equal(P.build({active:[{word:'hei',translation:'привет'}],cardsSeen:1,miniRounds:{}},1).phase,'break',
 'No artificial translation distractors when only one valid word is known');
assert.equal(P.evaluate(round,99).valid,false);
const next=P.build({...d,cardsSeen:10},10);
assert(next&&next.boundary===10,'A later mini lesson can start independently');
assert.deepEqual(Array.from(P.boundaries(5)),[5]);
console.log('PASS five-word rounds: distinct real translations, listening, error retries, pause/resume and saved progress');
