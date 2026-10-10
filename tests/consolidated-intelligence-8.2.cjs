// Combined 8.1 intelligence + 8.2 placement: non-destructive regression suite.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const get=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const ctx={window:{},Date,Math,Object,Array,Number,String,JSON,Set,Intl};
vm.createContext(ctx);
vm.runInContext(get('curriculum-v8.js'),ctx);
vm.runInContext(get('adaptive-teacher.js'),ctx);
const A=ctx.window.NEAdaptive;
assert(A,'adaptive lesson engine must exist');
const s={level:'A1',skills:{},learningV8:{startLevel:'A1'}};
A.ensure(s);
for(let i=0;i<2;i++)A.recordAttempt(s,{level:'A1',moduleId:'a1-foundation',skill:'writing',score:45,source:'lesson_free',errorTag:'word_order'});
assert.equal(s.learningV8.patternStats['A1:word_order'].misses,2);
assert.equal(s.learningV8.patternStats['A1:word_order'].skill,'writing');
assert.equal(A.nextMission(s).kind,'error_remediation','repeated errors should trigger correction instead of generic lesson');
assert.equal(A.nextMission(s).errorTag,'word_order');
const severity=s.learningV8.patternStats['A1:word_order'].severity;
A.recordAttempt(s,{level:'A1',moduleId:'a1-foundation',skill:'writing',score:93,source:'lesson_free_transfer',targetErrorTag:'word_order',transfer:true});
assert(s.learningV8.patternStats['A1:word_order'].severity<severity);
assert.equal(s.learningV8.patternStats['A1:word_order'].transferPasses,1);
assert.notEqual(A.nextMission(s).kind,'error_remediation','successful transfer must release urgent correction');
A.recordAttempt(s,{level:'B1',moduleId:'b1-work',skill:'speaking',score:35,source:'conversation',errorTag:'coherence'});
A.recordAttempt(s,{level:'B1',moduleId:'b1-work',skill:'speaking',score:35,source:'conversation',errorTag:'coherence'});
assert(A.errors(s,'B1').includes('coherence'));
assert(!A.errors(s,'A1').includes('coherence'),'cross-level errors must not leak into A1');
assert(s.learningV8.patternStats['B1:coherence']);
const before=Object.keys(s.learningV8.patternStats).length;
A.recordAttempt(s,{level:'B2',skill:'speaking',score:8,moduleId:'b2-placement2',source:'placement2_voice',diagnostic:true,errorTag:'article'});
assert.equal(Object.keys(s.learningV8.patternStats).length,before,'placement scores alone must not create remedial mastery events');
assert.equal(s.learningV8.modules['b2-placement2'],undefined,'screening does not close modules');
const novice={level:'A1',learningV8:{attempts:[
 {level:'A1',skill:'writing',score:40,errorTag:'verb_form'},
 {level:'A1',skill:'writing',score:40,errorTag:'verb_form'},
 {level:'B2',skill:'speaking',score:38,errorTag:'coherence'}
]},skills:{}};
A.ensure(novice);
assert.equal(novice.learningV8.patternStats['A1:verb_form'].misses,2,'reconstruct complete A1 error evidence');
assert.equal(novice.learningV8.patternStats['B2:coherence'].misses,1,'B2 errors remain B2-scoped');
A.ensure(novice);
assert.equal(novice.learningV8.patternStats['A1:verb_form'].misses,2,'reopening app must not duplicate previous errors');
const gap={level:'B2',skills:{},placement:{recommendedStart:'B2',productive:{remediation:{speaking:{level:'A2',done:false}}}},learningV8:{startLevel:'B2'}};
A.ensure(gap);
for(let i=0;i<2;i++)A.recordAttempt(gap,{level:'B2',skill:'writing',score:40,moduleId:'b2-argument',errorTag:'word_order'});
assert.equal(A.nextMission(gap).kind,'remediation','placement weakness retains priority over recurring error');
assert.equal(A.nextMission(gap).level,'A2');
const gen=get('api/generate.js'),app=get('app.js');
assert(gen.includes('Целевая повторяющаяся ошибка')&&gen.includes('targetErrorTag'),'AI should receive target error data');
assert(app.includes('targetErrorTag:rem?.errorTag||l?._adaptive?.errorTag||""'),'free-response transfer must report corrected error');
assert(app.includes('targetErrorTag:l?._adaptive?.errorTag||""'),'dialogue must preserve the target error');
console.log('PASS 8.2 consolidated intelligence: scoped errors, transferable corrections, B2/A2 mixed skills, zero diagnostic mastery');
