// Human-centered Nora Experience: local state, natural mission narrative,
// optional chat continuity, and strict isolation from scoring and user accounts.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'nora-experience.js'),'utf8');
function load(initial={}){
 const user={level:'A1',learningV8:{},chatThreads:{},chatHistory:[],...initial};
 const log={save:0,route:[],starter:0,paused:0};
 const doc={getElementById:()=>null,querySelectorAll:()=>[]};
 const window={neLearnerState:user,saveState:()=>{log.save++;return true},
  navigate:r=>log.route.push(r),v7StartChat:()=>log.starter++,
  persistLessonCheckpoint:()=>log.paused++};
 const lessonSession={lesson:{id:'unit-lesson',level:'A1',title:'Договориться о встрече',
  dialogueScene:'Коллега хочет встретиться во вторник.'},step:0};
 vm.runInNewContext(src,{window,document:doc,lessonSession,Date,Number,String,Math,Object,JSON,Array,Set,Map},
  {filename:'nora-experience.js'});
 return{window,user,log,doc,session:lessonSession,E:window.NEExperience};
}
const a=load(),b=load(),E=a.E;
assert.equal(E.focus().id,'everyday','No forced personal data or preferences');
assert.equal(E.choose('work'),true,'A learner can select an optional life topic');
assert.equal(E.focus().id,'work');
assert.equal(a.user.learningV8.noraExperience.focus,'work','Saved in the learner-scoped progress');
assert.equal(a.log.save,1,'Only one save per preference change');
assert.equal(b.E.focus().id,'everyday','Learner B has independent preferences');
assert.equal(E.choose('hacked'),false,'Only known scenario IDs are accepted');
assert.equal(a.log.save,1,'Invalid choice never changes progress');
assert(E.homeChoice(a.user).includes('Работа'),'Current topic appears in home UI');
assert(E.homeChoice(a.user).includes('aria-pressed="true"'),'Focus buttons expose their state');
const l=a.session.lesson;
const header=E.lessonHeader(l,a.session,7);
assert(header.includes('Договориться о встрече')||header.includes('Зачем это нужно?'),
 'Narrative UI shows the actual learning goal');
assert(header.includes('Встречаемся'),'First act is not a test-score dashboard');
assert(header.includes('Пауза'),'The learner can leave without losing work');
a.session.step=4;
const scene=E.lessonHeader(l,a.session,7);
assert(scene.includes('Слушаем и замечаем'),'Listening and reading share a narrative beat');
assert(scene.includes('Коллега хочет встретиться'),'Subsequent acts retain story context');
a.session.step=6;
assert.equal(E.brief(l,a.session,7).stage.name,'Действуем сами');
assert.equal(E.brief(l,{step:5},6).stage.name,'Действуем сами');
assert(E.response(false,'writing').includes('поправить'),'Correction is actionable and non-shaming');
assert(!E.response(false,'writing').includes('100/100'),'An error does not require a displayed perfect score');
assert(E.endNote(l,false).includes('ещё требует практики'),
 'No unverified CEFR or speaking-mastery claims');
const hostile=E.lessonHeader({...l,title:'<img src=x onerror=alert(1)>'},a.session,7);
assert(!hostile.includes('<img'),'Generated titles must be escaped before rendering');
const firstOtherConversation=[{role:'user',text:'Previous independent thread'}];
a.user.chatHistory=firstOtherConversation;
a.user.chatThreadId='general';
a.log.starter=0;
assert.equal(E.openFollowup(),true,'Conversation may continue from the same story');
assert.equal(a.user.chatThreadId,'lesson:unit-lesson','Story follow-up is a distinct user thread');
assert.equal(a.user.chatThreads.general,firstOtherConversation,'Original conversation is preserved');
assert.equal(a.user.chatPrefs.mode,'roleplay','Continuation is unscripted life dialogue');
assert.equal(a.user.chatPrefs.level,'A1','Skill level stays anchored to the lesson');
assert(a.user.chatPrefs.sceneContext.includes('Коллега хочет встретиться'),'Nora gets the actual story context');
assert.equal(a.log.route.at(-1),'chat');
assert.equal(a.log.starter,0,'Entering a story conversation does not auto-reset or force an AI reply');
assert.equal(b.user.chatThreadId,undefined,'Learner B never receives A thread');
a.user.chatHistory=[{role:'assistant',text:'Hei'}];a.user.chatThreads[a.user.chatThreadId]=a.user.chatHistory;
assert.equal(E.openFollowup(),true,'Existing story chat can be resumed');
assert.equal(a.log.starter,0,'A resumed chat never resets its history');
E.pause();
assert.equal(a.log.paused,1,'Pause persists existing lesson checkpoint');
assert.equal(a.log.route.at(-1),'home');
const legacy=load({learningV8:{modules:{retained:{level:'A1'}}}});
legacy.E.choose('travel');
assert(legacy.user.learningV8.modules.retained,'Existing stage data survives preference update');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'ui-v7.js'),'utf8');
const access=fs.readFileSync(path.join(root,'access.js'),'utf8');
const teacher=fs.readFileSync(path.join(root,'adaptive-teacher.js'),'utf8');
const generator=fs.readFileSync(path.join(root,'api/generate.js'),'utf8');
assert(app.includes('NEExperience?.lessonHeader?.('),'Actual app lesson must use mission UI');
const legacyRenderSrc=fs.readFileSync(path.join(root,'v3.js'),'utf8');
assert(legacyRenderSrc.includes('NEExperience?.lessonHeader?.('),'Legacy lesson must also show four-act mission');
assert(app.includes('NEExperience?.endNote?.('),'End of lesson must have real-world conclusion');
assert(app.includes('NEExperience.openFollowup()'),'Optional follow-up must connect to a real conversation');
assert(ui.includes('NEExperience?.homeChoice?.(state)'),'Real home must show interest choice');
assert(ui.includes('<details class="ne-home-extras">'),'Rewards and secondary cards are optional, not deleted');
assert(ui.includes('v7QuickHelp'),'Fast help must be reachable on current screen');
assert(ui.includes('renderChatV7,renderStoryV7'),'Active Nora chat renderer must be exported for integrated lesson follow-up');
const elite=fs.readFileSync(path.join(root,'elite.js'),'utf8');
assert(elite.includes('const saved=baseSaveState()')&&elite.includes('return saved;'),
 'Achievements layer must preserve the base boolean saveState result');
assert(elite.includes('if(saved===true)scheduleCloud()'),
 'Cloud save must run only after successful local state persistence');
assert(access.indexOf("'nora-experience.js'")>0&&
 access.indexOf("'nora-experience.js'")<access.indexOf("'app.js'"),
 'Experience script must load before app.js');
assert(teacher.includes("storyFocus:window.NEExperience?.focus?.(state)?.id"),
 'New teacher lessons must respect the active learner focus');
assert(generator.includes('УЧЕБНАЯ ИСТОРИЯ'),'Generator must link dialogue, listening, reading, writing');
assert(generator.includes('обязательной can-do целью'),'Interest must not override actual curriculum');

a.user.dailyDictionary={jobb:{lemma:'en jobb',wrong:4,nextDue:Date.now()-1000,correct:0,exposures:1}};
a.user.wordPracticeQueue={jobb:Date.now()};
const wordLesson={...l,vocab:[['en bok','книга'],['en jobb','работа'],['å lese','читать'],['<img src=x>','вредный текст']]};
const firstWord=E.wordEncounter(wordLesson,{step:0});
assert(firstWord.includes('en jobb')&&firstWord.includes('Перевод'),'Weak word must show with optional gloss');
assert(E.wordEncounter(wordLesson,{step:1}).includes('en jobb'),'Difficult word repeats');
assert(E.wordEncounter(wordLesson,{step:2}).includes('en bok'),'Next task brings a different word');
assert(E.wordEncounter(wordLesson,{step:6}).includes('en jobb'),'Weak word returns later');
assert(!firstWord.includes('<img'),'HTML escaped');
assert.equal(a.user.dailyDictionary.jobb.correct,0,'Sightings never grant mastery');

const guide=E.functionWordGuide(l,{step:0});
assert(guide.includes('Нора объясняет')&&guide.includes('Попробуй сам'),'Essential words must appear in real lesson header');
assert(guide.includes('Местоимение')||guide.includes('Предлог')||guide.includes('союз'),'Word type explained, not all tokens mislabeled conjunctions');
assert(guide.includes('lang="nb"')&&guide.includes('ne-function-word-rule')&&guide.includes('Примеры и практика:'),'Bokmål and contextual rule are shown immediately; examples and practice are on request');
const functionLessonIds=['a1-1','a1-2','a1-3','a1-4','a1-5','a1-6','a1-7','a1-8'];
const shown=functionLessonIds.flatMap(id=>[0,2,4,6].map(step=>E.functionWordGuide({...l,id},{step}))).join('\n');
for(const important of ['meg','om','for','til'])
 assert(shown.includes('>'+important+'</b>'),'A1 lessons cycle through function word '+important);
assert(E.functionWordGuide(l,{step:1})==='','Mini-practice appears on alternate stages, not every screen');
const feedback={textContent:''};
a.doc.querySelector=()=>feedback;
assert.equal(E.checkFunctionWord('meg',0),false,'Wrong form should get an explanation');
assert(feedback.textContent.includes('hjelpe'),'Correction must explain grammatical function');
assert.equal(E.checkFunctionWord('meg',1),true,'Correct choice gets feedback without a grade');
assert(feedback.textContent.includes('Верно'),'Feedback is immediate');
assert.equal(E.checkFunctionWord('meg',99),false,'Invalid choice cannot be accepted');

const oldChoice=E.focus().id,oldThreads=a.user.chatThreads,oldThreadId=a.user.chatThreadId;
const originalSave=a.window.saveState;
a.window.saveState=()=>false;
assert.equal(E.choose('travel'),false);
assert.equal(E.focus().id,oldChoice,'Failed preference save rolled back');
assert.equal(E.openFollowup(),false);
assert.strictEqual(a.user.chatThreads,oldThreads,'Failed chat save rolled back');
assert.equal(a.user.chatThreadId,oldThreadId);
a.window.saveState=originalSave;
const oldLearner=a.window.neLearnerState;
a.window.neLearnerState={level:'A1',learningV8:{},chatThreads:{}};
assert.equal(E.openFollowup(),false,'No previous learner context in new account');
a.window.neLearnerState=oldLearner;
console.log('PASS Nora vocabulary and state rollback');
console.log('PASS Nora Experience: continuous mission, account isolation, preserved checkpoints, guided roleplay and honest CEFR gate');
