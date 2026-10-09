const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),load=file=>fs.readFileSync(path.join(root,file),'utf8');
const win={};const sandbox={window:win,Date,Math,Object,Array,Number,String,JSON,Set,Intl};
vm.createContext(sandbox);
for(const p of ['curriculum-v8.js','practice-foundations.js','advanced-b1.js','advanced-b2.js'])vm.runInContext(load(p),sandbox);
const C=win.NECurriculum,B=win.NECurated;
const words=v=>String(v||'').trim().split(/\s+/).filter(Boolean).length;
const all=['A1','A2','B1','B2'].flatMap(level=>C.modules(level));
assert.equal(all.length,32,'The complete A1-B2 curriculum has 32 modules');
assert.equal(B.ids.length,32,'Each curriculum module must have a known authored foundation');
const unique=new Set(B.ids);assert.equal(unique.size,32,'Each module must have a unique ID');
const normalize=a=>a.map(s=>s.trim().toLowerCase());
for(const m of all){
 const item=B.get(m.id);
 assert(item&&typeof item==='object','Missing lesson '+m.id);
 for(const field of ['title','phrase','ru','grammarQ','grammarRuleRu','listeningAudio','listeningQ','read','q','writing','speaking'])assert(String(item[field]||'').trim(),m.id+' missing '+field);
 assert(Array.isArray(item.vocab)&&item.vocab.length>=6,m.id+' vocabulary incomplete');
 assert.equal(new Set(item.vocab.map(x=>x[0].toLowerCase())).size,item.vocab.length,m.id+' duplicate vocab');
 for(const [choices,answer] of [['opts','correct'],['grammarOpts','grammarCorrect'],['listeningOpts','listeningCorrect']]){
  assert.equal(item[choices]?.length,4,m.id+' '+choices+' must have four options');
  assert.equal(new Set(normalize(item[choices])).size,4,m.id+' duplicate options in '+choices);
  assert(Number.isInteger(item[answer])&&item[answer]>=0&&item[answer]<4,m.id+' invalid answer');
 }
 for(const round of [0,1,2,6,12]){
  const v=B.variant(m.id,round);assert(v&&v.title===item.title,m.id+' mismatch');
  for(const [choices,answer] of [['opts','correct'],['grammarOpts','grammarCorrect'],['listeningOpts','listeningCorrect']]){
   assert.equal(v[choices][v[answer]],item[choices][item[answer]],m.id+' rotated wrong answer '+choices);
  }
  if(['B1','B2'].includes(m.level)){
   assert.equal(v.listeningSets?.length,2,m.id+' must have a second listening situation');
   for(let i=0;i<2;i++){
    assert.equal(v.listeningSets[i].opts[v.listeningSets[i].correct],item.listeningSets[i].opts[item.listeningSets[i].correct],m.id+' listening question '+i+' changed key');
   }
  }
 }
 if(['B1','B2'].includes(m.level)){
  assert(words(item.listeningAudio)>=75,m.id+' main listening text too short');
  assert(words(item.read)>=90,m.id+' main reading text too short');
  assert(words(item.listeningSets[1].audio)>=26,m.id+' second voice too brief');
  assert(words(item.speakingFollowUp)>=8,m.id+' lacks substantive live follow-up');
  assert(words(item.writing)>=10,m.id+' writing task lacks independent production');
  assert(item.listeningSets[0].audio!==item.listeningSets[1].audio,m.id+' must contain two distinct recordings');
  assert(!/Norskprøven|CEFR B2 passed/i.test(item.title),'Do not present authored exercises as official');
 }
}
const app=load('app.js'),access=load('access.js'),sw=load('sw.js');
assert(access.includes("'advanced-b1.js','advanced-b2.js'")&&sw.includes('/advanced-b2.js?v='),'B1-B2 must be loaded and pre-cached');
assert(app.includes('continueListeningStep')&&app.includes('listeningIndex:session.listeningIndex||0'),'Multi-part comprehension must be resumable');
assert(app.includes('s.speakingFollowup=true;persistLessonCheckpoint()'),'Oral challenge must have second turn persisted');
console.log('PASS 32 authored lessons, B1-B2 richer comprehension, answer-key invariants, voice turn and checkpoint wiring');
