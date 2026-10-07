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
const C=sandbox.window.NECurriculum,A=sandbox.window.NEAdaptive;

assert(C&&A,'adaptive globals missing');
assert(C.levels.join(',')==='A1,A2,B1,B2','CEFR level order missing');
for(const level of C.levels){
 const modules=C.modules(level);
 assert(modules.length===8,level+' must have 8 curriculum modules');
 assert(modules.every(m=>Array.isArray(m.canDo)&&m.canDo.length>=2),level+' can-do coverage missing');
 assert(modules.at(-1).id.includes('transfer')||modules.at(-1).id.includes('capstone'),level+' transfer checkpoint missing');
}

const state={level:'A1',skills:{},learningV8:{}};
A.ensure(state);
assert(state.learningV8.levelSkills.A1&&state.learningV8.levelSkills.B2,'level-specific skill profiles missing');
const a2Before=state.learningV8.levelSkills.A2.reading;
A.recordAttempt(state,{level:'A1',skill:'reading',score:100,moduleId:'a1-foundation',source:'qa'});
assert(state.learningV8.levelSkills.A1.reading>a2Before,'A1 reading evidence did not update');
assert(state.learningV8.levelSkills.A2.reading===a2Before,'A1 evidence leaked into A2');
assert(A.dueReviews(state).length===0,'successful fresh evidence should not be due immediately');
assert(A.levelGate(state,'A1').pass===false,'single answer must never certify A1');

const p=state.learningV8;
for(const s of ['listening','reading','writing','speaking','grammar','vocabulary'])p.levelSkills.A1[s]=90;

// Imported/stale progress must not certify a module from a stored vanity percentage alone.
for(const m of C.modules('A1'))p.modules[m.id]={skills:{listening:90,reading:90,writing:90,speaking:90},mastery:99,attempts:8,transferPasses:8};
for(let i=0;i<4;i++)p.reviews['a1-foundation:'+['listening','reading','writing','speaking'][i]]={stage:2,lastScore:90,due:'2999-01-01',delayedPasses:1,lastDelayedScore:90};
assert(A.levelGate(state,'A1').pass===false,'stored mastery without grammar/vocabulary evidence must not certify A1');

// All six components must be evidenced in each mastered module.
for(const m of C.modules('A1'))p.modules[m.id]={skills:{listening:90,reading:90,writing:90,speaking:90,grammar:90,vocabulary:90},mastery:90,attempts:12,transferPasses:8};
assert(A.levelGate(state,'A1').pass===true,'mastery gate should pass only after broad six-component evidence');

const gated={level:'A1',skills:{},learningV8:{startLevel:'A1'}};
A.ensure(gated);
const blockedB2=A.moduleMission(gated,'b2-argument');
assert(blockedB2?.blocked===true&&blockedB2?.blockedByLevel===true&&blockedB2?.unlockedLevel==='A1','A1 learner must not jump directly to B2');
const placedB2={level:'B2',skills:{},placement:{recommendedStart:'B2'},learningV8:{startLevel:'B2'}};
A.ensure(placedB2);
assert(A.moduleMission(placedB2,'b2-argument')?.blocked!==true,'B2 placement start must be allowed to begin B2');

// Delayed evidence must come from genuinely due review missions and cover all four communicative skills.
p.reviews={};
for(let i=0;i<4;i++)p.reviews['a1-'+i+':reading']={stage:2,lastScore:90,due:'2999-01-01',delayedPasses:1,lastDelayedScore:90};
assert(A.levelGate(state,'A1').pass===false,'four delayed checks of one skill must not certify A1');
for(const skill of ['listening','reading','writing','speaking'])p.reviews['a1-foundation:'+skill]={stage:2,lastScore:90,due:'2999-01-01',delayedPasses:1,lastDelayedScore:90};
assert(A.levelGate(state,'A1').pass===true,'delayed evidence across all four core skills should satisfy the retention gate');

p.reviews={};
for(const skill of ['listening','reading','writing','speaking'])p.reviews['a1-foundation:'+skill]={stage:5,lastScore:100,due:'2999-01-01'};
assert(A.levelGate(state,'A1').pass===false,'same-day stage advancement without a due review must not satisfy retention');

const retentionState={level:'A1',skills:{},learningV8:{}};
A.ensure(retentionState);
A.recordAttempt(retentionState,{level:'A1',skill:'reading',score:100,moduleId:'a1-foundation',source:'qa'});
A.recordAttempt(retentionState,{level:'A1',skill:'reading',score:100,moduleId:'a1-foundation',source:'qa'});
const sameDayReview=retentionState.learningV8.reviews['a1-foundation:reading'];
assert(!(sameDayReview.delayedPasses>0),'ordinary repeated answers must not create delayed retention evidence');
sameDayReview.due='2000-01-01';
A.recordAttempt(retentionState,{level:'A1',skill:'reading',score:95,moduleId:'a1-foundation',source:'qa_review',reviewKey:'a1-foundation:reading'});
assert(sameDayReview.delayedPasses===1&&sameDayReview.lastDelayedScore===95,'a genuinely due review must create delayed retention evidence');

// An assessment for another level must update that level only.
const a1WritingBefore=p.levelSkills.A1.writing,a2WritingBefore=p.levelSkills.A2.writing;
A.assessment(state,'A2',88,{writing:88});
assert(p.levelSkills.A1.writing===a1WritingBefore,'A2 assessment leaked into A1');
assert(p.levelSkills.A2.writing>a2WritingBefore,'A2 assessment failed to update A2');

// Spaced reviews must keep the CEFR level where the evidence was created.
const reviewState={level:'B1',skills:{},learningV8:{}};
A.ensure(reviewState);
A.recordAttempt(reviewState,{level:'A2',skill:'listening',score:30,moduleId:'a2-supplemental',source:'qa'});
reviewState.learningV8.reviews['a2-supplemental:listening'].due='2000-01-01';
const reviewMission=A.nextMission(reviewState);
assert(reviewMission.kind==='review'&&reviewMission.level==='A2','due A2 review was incorrectly promoted to current B1 level');
A.recordAttempt(reviewState,{level:'A2',skill:'listening',score:95,moduleId:reviewMission.module.id,source:'qa_review',reviewKey:reviewMission.reviewKey});
assert(!A.dueReviews(reviewState).some(x=>x.key===reviewMission.reviewKey),'completed cross-module review remained permanently overdue');

const health=read('api/health.js');
assert(health.includes('version:"8.0.0"'),'health endpoint version must match 8.0.0');
assert(!health.includes('version:"7.3.0"'),'health endpoint must not expose stale 7.3.0 version');

const app=read('app.js'),access=read('access.js'),sw=read('sw.js'),generate=read('api/generate.js'),evaluate=read('api/evaluate.js'),uiV7=read('ui-v7.js'),elite=read('elite.js'),v8css=read('v8.css');
assert(v8css.includes('.lesson-exercise-v6 .lesson-words-v6 b{color:#f7fafb!important}')&&v8css.includes('.lesson-exercise-v6 .lesson-words-v6 small{color:#c7d6df!important}'),'8.0 lesson vocabulary contrast regression');
assert(v8css.includes('.lesson-exercise-v6 .card>.translation{background:#eaf1f4;color:#173346!important;border-left-color:#5aa9ff}'),'8.0 reading passage contrast regression');
assert(v8css.includes('.lesson-exercise-v6 .card>.notice{background:#fff7df;color:#5a4615!important;border-color:#dfc56d}'),'8.0 lesson guidance contrast regression');
assert(v8css.includes('.lesson-exercise-v6 .card .feedback.bad{background:#fff0f2;color:#6b2630!important;border-color:#e0a5ad}'),'8.0 lesson feedback contrast regression');
assert(app.includes('view==="teacher"')&&app.includes('startAdaptiveTeacher'),'teacher route missing');
assert(app.includes('"learningV8"'),'adaptive state validation missing');
assert(app.includes('previousLevel:state.level')&&!app.includes('function startTest(level){touchStudy();state.level=level'),'starting a diagnostic must not switch the active course level');
assert(app.includes('level:testSession.level,skill'),'diagnostic evidence must be written to the tested CEFR level');
assert(app.includes('reviewKey:l?._adaptive?.reviewKey||""'),'adaptive attempts must preserve the originating spaced-review key');
assert(access.includes("'curriculum-v8.js'")&&access.includes("'adaptive-teacher.js'"),'adaptive scripts not loaded');
assert(sw.includes('/curriculum-v8.js?v=8.0.0')&&sw.includes('/adaptive-teacher.js?v=8.0.0'),'adaptive assets not cached');
assert(generate.includes('teacherMode')&&generate.includes('Can-do цели'),'objective-driven generator prompt missing');
assert(generate.includes('listeningAudio')&&generate.includes('listeningQ')&&generate.includes('listeningOpts'),'adaptive lesson generator must create comprehension listening');
assert(generate.includes('смысловыми перефразами')&&generate.includes('не копиями фразы из текста'),'reading/listening distractors must test meaning rather than surface matching');
assert(generate.includes('B1: причину, связь, намерение или простой вывод')&&generate.includes('B2: позицию, аргументацию, контраст'),'B1-B2 receptive tasks must require higher-order comprehension');
assert(generate.includes('не решаются поиском одного совпадающего слова')||generate.includes('избегай вопросов, которые решаются поиском одного совпадающего слова'),'B1-B2 tasks must resist keyword matching');
assert(generate.includes('grammarQ обязан содержать понятную учебную задачу')&&generate.includes('Velg riktig setning'),'grammar generator must require contextual grammar tasks');
assert(generate.includes('validGrammarQuestion'),'generic context-free grammar questions must be rejected');
assert(app.includes('function grammarPrompt')&&app.includes('Выберите грамматически правильное предложение.'),'stored generic grammar prompts must get a clear runtime fallback');
assert(app.includes('Аудирование · понимание смысла')&&app.includes('l.listeningAudio'),'adaptive lesson UI must test listening comprehension');
assert(app.includes('Словарь · активное вспоминание')&&app.includes('source:"vocab_recall"'),'adaptive vocabulary must use productive recall evidence');
assert(app.includes('source:rem?"lesson_free_transfer":"lesson_free"'),'adaptive free response must record transfer evidence separately');
assert(app.includes('openFreeTransfer')&&app.includes('Применить в новой ситуации'),'adaptive error feedback must require a new-context retry');
assert(app.includes('Эту ошибку Нора вернёт позже'),'repeated transfer failure must defer to spaced review instead of looping forever');
assert(app.includes('slice(0,3)'),'adaptive lesson must retrieve multiple vocabulary items, not only one');
assert(evaluate.includes('retry_prompt_no')&&evaluate.includes('micro_rule_ru'),'teacher feedback schema missing');
const chat=read('api/chat.js'),v3=read('v3.js');
assert(chat.includes('score_valid=Number.isFinite(rawScore)'),'chat score validation marker missing');
assert(v3.includes('mastery,errorPatterns,teacherMode:true'),'conversation does not receive adaptive learner context');
assert(v3.includes('d.score_valid===true')&&v3.includes('source:"conversation"'),'conversation evidence is not guarded by a valid score');
assert(!v3.includes('startTest=async function(level){\n    touchStudy();state.level=level'),'active v3 diagnostics must not switch the course level on start');
assert(v3.includes('skillEvidence:{reading:[],listening:[],writing:[],speaking:[],grammar:[],vocabulary:[]}'),'active v3 diagnostics must collect six-skill evidence');
assert(v3.includes('source:"level_test"')&&v3.includes('source:"level_test_free"'),'active v3 diagnostics must feed adaptive evidence');
assert(v3.includes('scope:"receptive_screening"'),'placement must be stored as a starting-point screening');
assert(v3.includes('profile.writing=35;profile.speaking=35'),'fresh placement must not invent productive-skill mastery');
assert(v3.includes('Это не означает, что уровень '),'placement result must not present the recommended start as a confirmed CEFR level');
assert(uiV7.includes('window.NECurriculum?.modules(courseLevel)'),'active course screen must use the 32-module adaptive curriculum');
assert(uiV7.includes('teacherStartModule'),'course modules must launch through the adaptive teacher');
assert(uiV7.includes('const courseLevel=level&&LEVELS_V7.includes(level)?level:state.level'),'browsing a course level must use a local view level');
assert(!uiV7.includes('if(level&&LEVELS_V7.includes(level))state.level=level'),'course tab browsing must not change the active learning level');
assert(uiV7.includes('Дополнительная практика — не влияет сама по себе на прохождение уровня'),'legacy practice must be visually separated from mastery');
assert(elite.includes('function resolveStartLevel'),'cloud merge must resolve the mastery starting level explicitly');
assert(elite.includes('m.placement=newestPlacement'),'cloud merge must choose placement by recency');
assert(elite.includes('m.learningV8.startLevel=resolveStartLevel'),'cloud merge must not blindly overwrite startLevel');
assert(!v3.includes('if(key==="level")state.level=value'),'legacy chat settings must not switch the course level');
assert(!uiV7.includes('if(k==="level")state.level=v'),'active chat settings must not switch the course level');
assert(uiV7.includes('state.story.selectedLevel=picked.level'),'Fjordvik must store its own practice level');
assert(!uiV7.includes('if(picked?.level&&picked.level!==state.level){state.level=picked.level'),'Fjordvik season selection must not switch the course');
console.log('Norsk Eventyr adaptive teacher 8.0 foundation checks: PASS');
