const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(v,m)=>{if(!v)throw new Error(m)};

const sandbox={window:{},console,Date,Math,Object,Array,Number,String,JSON,Set,Intl};
vm.createContext(sandbox);
vm.runInContext(read('curriculum-v8.js'),sandbox);
vm.runInContext(read('adaptive-teacher.js'),sandbox);
const A=sandbox.window.NEAdaptive;
assert(A,'adaptive engine missing');

const state={level:'A1',skills:{},learningV8:{}};
A.ensure(state);
assert(state.learningV8.version==='8.1-method-1','8.1 learning model version missing');
assert(state.learningV8.patternStats&&typeof state.learningV8.patternStats==='object','pattern stats missing');

A.recordAttempt(state,{level:'A1',skill:'writing',score:45,moduleId:'a1-foundation',source:'qa',errorTag:'word_order'});
A.recordAttempt(state,{level:'A1',skill:'writing',score:45,moduleId:'a1-foundation',source:'qa',errorTag:'word_order'});
const wordOrder=state.learningV8.patternStats['A1:word_order'];
assert(wordOrder&&wordOrder.misses===2,'repeated error evidence not counted');
assert(wordOrder.severity>=35,'repeated error did not become actionable');
const remediation=A.nextMission(state);
assert(remediation.kind==='remediation','repeated error did not outrank ordinary new material');
assert(remediation.errorTag==='word_order','remediation lost target error');
assert(remediation.skill==='writing','remediation lost the productive skill where the error occurred');

const before=wordOrder.severity;
A.recordAttempt(state,{level:'A1',skill:'writing',score:92,moduleId:'a1-foundation',source:'lesson_free_transfer',targetErrorTag:'word_order',transfer:true});
assert(wordOrder.transferPasses===1,'successful transfer did not confirm the target error');
assert(wordOrder.severity<before,'successful transfer did not reduce error severity');
assert(A.nextMission(state).kind!=='remediation','resolved error remained an immediate remediation mission');

A.recordAttempt(state,{level:'B1',skill:'speaking',score:40,moduleId:'b1-work',source:'qa',errorTag:'word_order'});
A.recordAttempt(state,{level:'B1',skill:'speaking',score:40,moduleId:'b1-work',source:'qa',errorTag:'word_order'});
assert(state.learningV8.patternStats['B1:word_order'],'same error at B1 was not stored separately');
assert(state.learningV8.patternStats['A1:word_order']===wordOrder,'B1 error overwrote A1 error memory');
A.recordAttempt(state,{level:'B1',skill:'writing',score:35,moduleId:'b1-work',source:'qa',errorTag:'coherence'});
A.recordAttempt(state,{level:'B1',skill:'writing',score:35,moduleId:'b1-work',source:'qa',errorTag:'coherence'});
assert(!A.errors(state,'A1').includes('coherence'),'B1 error leaked into A1 generator context');
assert(A.errors(state,'B1').includes('coherence'),'B1 generator context omitted its own recurring error');

const legacy={level:'A1',skills:{},learningV8:{errorPatterns:{article:4}}};
A.ensure(legacy);
assert(legacy.learningV8.patternStats['A1:article']?.severity>=35,'legacy error counts were not migrated into actionable pattern memory');

const app=read('app.js'),generate=read('api/generate.js');
assert(app.includes('targetErrorTag:rem?.errorTag||l?._adaptive?.errorTag||""'),'productive retry does not verify the original target error');
assert(app.includes('targetErrorTag:l?._adaptive?.errorTag||""'),'dialogue does not carry the target error into evidence');
assert(generate.includes('targetErrorTag')&&generate.includes('Целевая повторяющаяся ошибка'),'generator does not receive the target error');
assert(generate.includes('минимум две естественные возможности'),'targeted lesson does not require repeated independent use');
console.log('Norsk Eventyr adaptive intelligence 8.1 checks: PASS');
