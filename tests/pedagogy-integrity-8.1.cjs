// Focused pedagogical integrity checks. These are NOT a validation study with learners.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sandbox={window:{},Date,Math,Object,Array,Number,String,JSON,Set,Intl};
vm.createContext(sandbox);
vm.runInContext(read('curriculum-v8.js'),sandbox);
vm.runInContext(read('practice-foundations.js'),sandbox);
vm.runInContext(read('adaptive-teacher.js'),sandbox);
const C=sandbox.window.NECurriculum,B=sandbox.window.NECurated,A=sandbox.window.NEAdaptive;
assert(C&&B&&A);
const all=[...C.modules('A1'),...C.modules('A2')];
assert.equal(all.length,16);
for(const mod of all){
 const base=B.get(mod.id);assert(base,'Missing foundation '+mod.id);
 for(const iteration of [0,1,2,6]){
  const variant=B.variant(mod.id,iteration);
  for(const [field,key] of [['opts','correct'],['grammarOpts','grammarCorrect'],['listeningOpts','listeningCorrect']]){
   assert.equal(variant[field][variant[key]],base[field][base[key]],mod.id+' lost answer key');
  }
 }
}
const v3=read('v3.js'),app=read('app.js'),evalJs=read('api/evaluate.js');
assert(v3.includes('skill=mode==="speaking"&&field?.dataset.fromVoice!=="true"?"writing":mode'),'v3 test must not count keyboard input as speech');
assert(v3.includes('s.part==="speaking"&&field.dataset.fromVoice!=="true"'),'v3 oral exam must require recorded voice');
assert(app.includes('skill=q.mode==="speaking"&&field.dataset.fromVoice!=="true"?"writing"'),'legacy test must not count keyboard input as speech');
assert(v3.includes('id="examFreeV3" class="input" oninput='),'typing must reset voice provenance');
assert(app.includes('id="testFree" class="input" oninput='),'typing must reset voice provenance in legacy test');
assert(evalJs.includes('parsed.accepted=parsed.accepted===true'),'AI string false must not count as accepted');
const s={level:'A1',skills:{},learningV8:{startLevel:'A1'}};
A.ensure(s);
for(let i=0;i<35;i++)A.recordAttempt(s,{level:'A1',moduleId:'a1-foundation',skill:'writing',score:100,source:'typed_speaking_test'});
assert.equal(A.levelGate(s,'A1').pass,false,'High writing grades alone must not certify CEFR');
assert(A.ensure(s).levelSkills.A1.speaking<70,'Writing attempts must not inflate oral skill');
console.log('PASS pedagogy integrity: A1/A2 answer key safety, voice-only oral evidence and zero false A1 certification');


// Pronunciation similarity is only exercise feedback, never CEFR speaking evidence.
const voiceLayer=read('v3.js'),uiLayer=read('ui-v8.js');
assert(!voiceLayer.includes('updateSkill("speaking",sc);'),'ASR or pronunciation imitation may not boost speaking proficiency');
assert(voiceLayer.includes('Совпадение распознанного текста с образцом'),'ASR-only fallback must be labeled accurately');
assert(!uiLayer.includes('Слушай настоящий норвежский'),'Synthetic audio must not be advertised as natural speaker recordings');
