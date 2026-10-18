// Northern Compass play engine: sentence tiles, deliberate story decisions and safe opt-in sound.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const ctx={window:{},Array,Object,String,Math,Number,Set,Intl,Date};
vm.runInNewContext(read('nordic-quest-play.js'),ctx);
const q=ctx.window.NQQuestPlay;
assert(q);
assert.deepEqual(Array.from(q.modes()),['dialogue','assemble','listen','decision']);
for(let i=0;i<4;i++)assert.equal(q.mode(i),['dialogue','assemble','listen','decision'][i]);
for(const level of ['A1','A2','B1','B2']){
 const decisions=q.branches(level);
 assert.equal(decisions.length,2,level+' presents two different narrative decisions');
 assert.notEqual(decisions[0].story,decisions[1].story,level+' decisions must change story, not merely reward text');
 for(const choice of decisions){
  assert(choice.no.trim().length>=10);
  assert(choice.ru.trim().length>=10);
  assert(choice.title&&choice.story&&choice.id);
 }
}
for(const line of ['Jeg lærer norsk hver dag.','Jeg vil gjerne diskutere saken.','Hvis jeg hadde tid, ville jeg øvd mer.']){
 const chips=q.shuffledTiles(line),tokens=q.phraseTokens(line);
 assert.equal(chips.length,tokens.length);
 assert.notEqual(chips.map(x=>x.value).join(' '),line,'Words must not appear in solved order');
 const selection=tokens.map((_,i)=>chips.findIndex(x=>x.id===i));
 assert(selection.every(x=>x>=0));
 assert.equal(q.validAssembly(line,selection),true,'Correct assembled phrase');
 assert.equal(q.assembled(line,selection),line);
 const wrong=[...selection].reverse();
 assert.equal(q.validAssembly(line,wrong),false,'Wrong word order rejected');
 assert.equal(q.validAssembly(line,selection.slice(0,-1)),false,'Incomplete sentence rejected');
 assert.equal(q.validAssembly(line,[...selection.slice(0,-1),999]),false,'Invalid tile never accepted');
 assert.equal(q.validAssembly(line,[selection[0],selection[0],...selection.slice(2)]),false,'Duplicate tiles not accepted');
}
assert.equal(q.cue(false,'correct'),false,'Sound disabled by default; no browser API needed');
assert(q.feedback('assemble',false).includes('порядок слов'));
console.log('PASS Northern Compass game engine: four mechanics, Norwegian word order, two distinct story outcomes and muted-by-default sound');
