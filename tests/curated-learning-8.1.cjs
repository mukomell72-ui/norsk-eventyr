const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sandbox={window:{},JSON,Object,Array,Date,Math};
vm.createContext(sandbox);
vm.runInContext(read('curriculum-v8.js'),sandbox);
vm.runInContext(read('practice-foundations.js'),sandbox);
const C=sandbox.window.NECurriculum, B=sandbox.window.NECurated;
const expected=[...C.modules('A1'),...C.modules('A2')].map(x=>x.id).sort();
assert.deepEqual(Array.from(B.ids).sort(),expected,'curated bank must cover all 16 A1/A2 modules without extra modules');
function optionsGood(options){
 return Array.isArray(options)&&options.length===4&&new Set(options.map(x=>x.trim().toLowerCase())).size===4
 &&options.every(x=>typeof x==='string'&&x.trim().length>4);
}
for(const id of expected){
 const x=B.get(id); assert(x, 'Missing practical foundation '+id);
 assert(x.vocab.length>=6,'Six useful target phrases required '+id);
 assert(new Set(x.vocab.map(p=>p[0])).size>=6,'Vocab repetition '+id);
 assert(x.vocab.every(p=>Array.isArray(p)&&p.length===2&&p.every(y=>typeof y==='string'&&y.trim().length>=2)),'Bad vocabulary '+id);
 assert(x.phrase&&x.ru&&x.writing&&x.speaking&&x.read&&x.listeningAudio&&x.grammarRuleRu,'Missing complete exercise '+id);
 assert(optionsGood(x.opts)&&optionsGood(x.listeningOpts)&&optionsGood(x.grammarOpts),'Missing or duplicate distractors '+id);
 assert([x.correct,x.listeningCorrect,x.grammarCorrect].every(n=>n===0),'Wrong assessment key '+id);
 assert(x.listeningQ.trim().endsWith('?')&&x.q.trim().endsWith('?'),'Use explicit comprehension questions '+id);
 assert(x.writing!==x.speaking,'Productive exercises need distinct prompts '+id);
 const copy=B.get(id);copy.vocab[0][0]='BROKEN';
 assert.notEqual(B.get(id).vocab[0][0],'BROKEN','Lessons must be isolated across sessions '+id);
}
const access=read('access.js'),sw=read('sw.js'),teacher=read('adaptive-teacher.js'),app=read('app.js'),v3=read('v3.js');
assert(access.includes("'practice-foundations.js'")&&sw.includes('/practice-foundations.js?v='),'practice foundations must load and pre-cache after approval');
assert(teacher.includes('isFirstAttempt&&foundation')&&teacher.includes('if(foundation&&mission.kind'), 'First learning and fallback must use curated content');
assert(app.includes('skill:spoken?"speaking":"writing"'),'A typed dialogue cannot be counted as speech');
assert(app.includes('skill=spoken?"speaking":"writing"'),'A typed free-form answer cannot be counted as speech');
assert(v3.includes('f.dataset.fromVoice="true"'),'Microphone transcription should mark its provenance');
assert(app.includes('oninput="this.dataset.fromVoice=\'false\'"'),'Typing must cancel voice provenance');
console.log('PASS curated 16 A1/A2 lessons: complete multilingual tasks, unique distractors, immutable copies, loading and honest voice evidence');
