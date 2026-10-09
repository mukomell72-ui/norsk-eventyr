const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const trainer={window:{},Date,Math,Object,Array,Number,String,JSON,Set,Intl};
vm.createContext(trainer);
vm.runInContext(read('curriculum-v8.js'),trainer);
vm.runInContext(read('adaptive-teacher.js'),trainer);
const A=trainer.window.NEAdaptive,C=trainer.window.NECurriculum;
const s={level:'A1',skills:{},learningV8:{startLevel:'A1'}};
const p=A.ensure(s);
for(const key of ['listening','reading','writing','speaking','grammar','vocabulary'])p.levelSkills.A1[key]=92;
for(const module of C.modules('A1')){
 p.modules[module.id]={skills:{listening:92,reading:92,writing:92,speaking:92,grammar:92,vocabulary:92},mastery:92,attempts:30,transferPasses:2};
}
for(const skill of ['listening','reading','writing','speaking']){
 p.reviews['a1-foundation:'+skill]={stage:2,lastScore:94,due:'2999-01-01',delayedPasses:1,lastDelayedScore:94};
}
assert.equal(A.levelGate(s,'A1').pass,true,'A1 must be fully evidenced before promoting');
assert.equal(A.nextMission(s).level,'A2','confirmed A1 should offer A2, not restart A1');
assert.equal(A.nextMission(s).module.level,'A2');
const novice={level:'A1',skills:{},learningV8:{startLevel:'A1'}};
A.ensure(novice);
assert.equal(A.nextMission(novice).level,'A1','inexperienced learners cannot skip a level');
const revisiting={level:'A1',skills:{},learningV8:{startLevel:'B2'}};
A.ensure(revisiting);
revisiting.learningV8.reviews['b2-argument:listening']={due:'2000-01-01',level:'B2',stage:0,lastScore:30};
assert.equal(A.nextMission(revisiting).level,'A1','reviewing lower course must not unexpectedly jump to placement B2');
assert.equal(A.nextMission(revisiting).module.level,'A1','old higher-level review should not preempt current A1 course');
assert.equal(A.moduleMission(novice,'b2-argument').blocked,true,'B2 must remain locked');

const local=new Map();
const storage={getItem:k=>local.has(k)?local.get(k):null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)};
const lessons=[{id:'a1-1',level:'A1',phrase:'Hei!',grammar:'Jeg heter',vocab:[['hei','привет']],read:'Hei',q:'?',opts:['a','b','c','d'],correct:0,writing:'Skriv',speaking:'Snakk'}];
let appCode=read('app.js').replace(/\nrenderHome\(\);(?=\s*\/\/ Service worker registration)/,'\n');
assert.equal(appCode.includes('renderHome();'),true); // internal navigation still exists
function boot(){
 const ctx={localStorage:storage,COURSE:lessons,Date,JSON,Math,Intl,console,alert:()=>{},window:{},navigator:{}};
 vm.createContext(ctx);
 vm.runInContext(appCode,ctx);
 vm.runInContext('renderLesson=function(){};touchStudy=function(){};',ctx);
 return ctx;
}
let app=boot();
assert.equal(vm.runInContext('validProgressState({...state,activeLesson:null})',app),true,'a cleared cloud lesson checkpoint is a valid backup');
vm.runInContext("startLesson('a1-1');lessonNext();lessonNext()",app);
assert.equal(JSON.parse(local.get('ne2_state')).activeLesson.step,2,'step must be checkpointed');
app=boot();
vm.runInContext("startLesson('a1-1')",app);
assert.equal(vm.runInContext('lessonSession.step',app),2,'reopening a lesson should resume from step 3');
assert.equal(vm.runInContext('lessonSession.dialogueIndex',app),0);
app=boot();
vm.runInContext("startLesson('a1-1');",app);
assert.equal(vm.runInContext('lessonSession.step',app),2);

const v3=read('v3.js'),api=read('api/chat.js'),u=read('ui-v7.js'),generator=read('api/generate.js'),elite=read('elite.js');
assert(v3.includes('state.noraMemory')&&v3.includes('learnerContext:noraLearningContext()'),'Nora must receive per-learner context');
assert(v3.includes('state.noraMemory.introduced=true'),'a finished dialogue must record a prior meeting');
assert(!v3.includes('if(d.suggested_level&&d.suggested_level!==p.level)state.chatPrefs.level'),'AI conversation cannot silently promote level');
assert(api.includes('knownToNora')&&api.includes('Вы уже знакомы.')&&api.includes('Это действительно первый разговор'),'Nora greeting must distinguish new/returning learners');
assert(generator.includes('scenarioVariation')&&generator.includes('заучивание шаблона'),'mission reruns must request a different situation');
assert(u.includes('pending?"lesson":"teacher"')&&u.includes('home-focus-v81'),'home should prioritize a saved mission');
assert(elite.includes('m.noraMemory=')&&elite.includes('m.activeLesson='),'cloud merge must retain personal learning memory');
console.log('PASS Norsk Eventyr personal learning 8.1: lesson checkpoints, memory, gate transitions, variation and guided return');
