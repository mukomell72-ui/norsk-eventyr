const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const curriculum=fs.readFileSync(path.join(base,'curriculum-v8.js'),'utf8');
const speaking=fs.readFileSync(path.join(base,'guided-speaking.js'),'utf8');
const ui=fs.readFileSync(path.join(base,'ui-v7.js'),'utf8');
const app=fs.readFileSync(path.join(base,'app.js'),'utf8');
assert.match(app,/accepted===true&&\(d\.score\?\?70\)>=50/,'Native dialogue accepts verified 50/100');
assert.match(ui,/helpMarkupV7\(content\.includes\('class="card guided-speaking"'\)\)/,
 'Guided lesson suppresses the duplicate help trigger');
const helperStart=ui.indexOf('  function helpMarkupV7(');
const helperEnd=ui.indexOf('  function v7OpenHelp()',helperStart);
assert(helperStart>=0&&helperEnd>helperStart,'Nora help renderer exists');
const helperCtx={};
vm.runInNewContext(ui.slice(helperStart,helperEnd)+'this.renderHelp=helpMarkupV7;',helperCtx);
const guidedHelp=helperCtx.renderHelp(true),regularHelp=helperCtx.renderHelp(false);
assert(!guidedHelp.includes('id="helpToggleV7"'),'No duplicate generic button during guided speaking');
assert(guidedHelp.includes('id="helpPanelV7"'),'Help panel still available to Nora');
assert(regularHelp.includes('id="helpToggleV7"'),'Other lessons retain generic help button');
const context={window:{freeEx:()=>'<legacy>',checkFree:()=> 'legacy'}};
vm.runInNewContext(curriculum,context,{filename:'curriculum-v8.js'});
vm.runInNewContext(speaking,context,{filename:'guided-speaking.js'});
const plan=context.window.NEGuidedSpeaking;
const moduleIds=context.window.NECurriculum.levels.flatMap(level=>context.window.NECurriculum.modules(level).map(m=>m.id));
assert.equal(moduleIds.length,32,'curriculum must have 32 modules');
assert.equal(plan.sceneIds.length,32,'all 32 modules should have an authored scene');
for(const id of moduleIds){
 assert.ok(plan.sceneIds.includes(id),'missing interactive lesson '+id);
 const d=plan.definition({id});
 assert.ok(d.opening&&d.actor&&d.scene,'scene intro missing '+id);
 assert.ok(d.steps.length>=3,'too few dialogue turns in '+id);
 for(const step of d.steps){
  assert.ok(step.task.length>12&&step.goal.length>15&&step.reply.length>5,'incomplete turn '+id);
 }
}
assert.match(speaking,/fromVoice/,'voice evidence must be tracked');
assert.match(speaking,/window\.aiEvaluate/,'every stage must be evaluated');
assert.match(speaking,/accepted===true/,'must check explicit acceptance');
assert.match(speaking,/isConnected/,'must reject stale responses');
assert.match(speaking,/mode==='speaking'/,'legacy writing flow must be preserved');

(async()=>{
 const field={value:'Hei, jeg heter Anna og jeg bor i Oslo.',dataset:{fromVoice:'true',guidedTurn:'0'},focus(){}};
 const feedback={isConnected:true,innerHTML:''};
 const nodes={freeAnswer:field,freeFb:feedback};
 const scores=[],attempts=[];
 let rerenders=0,checkpoints=0,finishes=0,discarded=0,accepted=false;
 const lesson={id:'generated-1',level:'A1',_adaptive:{moduleId:'a1-foundation'}};
 const session={lesson,locked:false};
 const state={};
 const w={
  freeEx:()=>'<legacy>',checkFree:()=> 'legacy',neLessonSession:session,neLearnerState:state,
  aiEvaluate:async()=>({ok:true,data:{accepted,score:accepted?95:22,explanation_ru:accepted?'':'Попробуй снова.'}}),
  trackLessonScore:(v)=>scores.push(v),
  NEAdaptive:{recordAttempt:(_state,item)=>attempts.push(item)},
  saveState:()=>{},neDiscardAcceptedGuidedDraft:()=>{discarded++},renderLesson:()=>{rerenders++},
  persistLessonCheckpoint:()=>{checkpoints++},
  lessonNext:()=>{finishes++},
  speakText:()=>{}
 };
 const sandbox={window:w,document:{getElementById:id=>nodes[id]||null},esc:s=>String(s).replace(/</g,'&lt;')};
 vm.runInNewContext(speaking,sandbox,{filename:'guided-speaking.js'});
 const start=w.freeEx(lesson,'speaking');
 assert.match(start,/Реплика 1 из 8/);
 assert.match(start,/name="guided-answer-generated-1-0"/, 'Each guided turn gets a distinct browser form name');
 assert.match(start,/сервисного центра/);
 assert.doesNotMatch(start,/Jeg heter Erik\./,'name must not be revealed before learner asks it');
 assert.doesNotMatch(start,/Erik · сотрудник/,'speaker label must not reveal Erik before he introduces himself');
 const keyHome={id:'adaptive-old-key',level:'A1',_adaptive:{moduleId:'a1-home'},speakingSupport:{ru:'Спроси, где находится ключ.',hint:'leter etter'}};
 const keyMarkup=w.freeEx(keyHome,'speaking');
 assert.match(keyMarkup,/details class="grammar-fold a1-task-support"/,'optional translated help must be preserved');
 assert.match(keyMarkup,/Spør hvor nøkkelen er. Si hvor du leter etter den./,'natural A1 Norwegian task must be shown');
 assert.match(keyMarkup,/speech-actions-v831/,'mobile voice action layout must survive');
 assert.equal(w.freeEx(lesson,'writing'),'<legacy>','writing must stay unchanged');
 await w.checkFree('speaking');
 assert.equal(session.guidedSpeech.index,0,'incorrect answer advanced dialogue');
 assert.equal(session.locked,false,'incorrect response must unlock retry');
 assert.equal(attempts[0].skill,'speaking');
 assert.match(feedback.innerHTML,/22\/100/,'Rejected answer must show a numeric grade');
 assert.doesNotMatch(feedback.innerHTML,/neGuidedExplain\(\)/,'Feedback does not duplicate the existing contextual help action');
 assert.equal(scores.length,1,'First turn establishes one course score');
 accepted=true;
 await w.checkFree('speaking');
 assert.equal(session.locked,true);
 assert.match(feedback.innerHTML,/95\/100/,'Corrected text shows its current evaluation');
 assert.match(feedback.innerHTML,/22\/100/,'Original result stays visible');
 assert.equal(scores.length,1,'Correction does not change progress or XP');
 assert.equal(attempts.length,1,'Adaptive module records only first attempt');
 assert.equal(session.guidedSpeech.firstScores['0'],22,'First verified score remains immutable');
 assert.match(feedback.innerHTML,/Следующая реплика/);
 assert.match(feedback.innerHTML,/Hvor kommer du fra/);
 assert.match(feedback.innerHTML,/Исправить ещё/,'Explicit retry action is shown after acceptance');
 assert.match(feedback.innerHTML,/Проверен текст:/,'The displayed grade identifies the exact checked response');
 // User edits a formerly accepted answer. The previous feedback and next button
 // must disappear, while the teacher accepts a third/fourth correction.
 field.value='Hei! Jeg heter Anna. Jeg bor i Bergen.';
 w.neGuidedAnswerEdited(field);
 assert.equal(session.locked,false,'Editing accepted text unlocks the same turn');
 assert.equal(session.guidedSpeech.pending,undefined,'Editing invalidates previous accepted response');
 assert.doesNotMatch(feedback.innerHTML,/Следующая реплика/,'No stale next action after editing');
 assert.doesNotMatch(feedback.innerHTML,/95\\/100/,'Old review disappears after editing');
 await w.checkFree('speaking');
 assert.equal(session.locked,true,'Third submission can be accepted');
 assert.match(feedback.innerHTML,/Jeg bor i Bergen\\./,'New feedback quotes the third submission');
 assert.equal(scores.length,1,'Third accepted answer cannot add XP');
 w.neGuidedRevise();
 assert.equal(session.locked,false,'Explicit correction action unlocks the field');
 field.value='Hei! Jeg heter Anna, og jeg bor i Tromsø.';
 await w.checkFree('speaking');
 assert.match(feedback.innerHTML,/Jeg bor i Tromsø\\./i);
 assert.equal(scores.length,1,'Fourth submission cannot add XP');
 // Even programmatic changes without a DOM input event cannot accidentally
 // advance the dialogue using an accepted but outdated response.
 field.value='Hei! Jeg heter Anna, og jeg bor i Oslo.';
 w.neGuidedNext();
 assert.equal(session.guidedSpeech.index,0,'Cannot advance using text changed after scoring');
 assert.equal(session.locked,false);
 await w.checkFree('speaking');
 assert.equal(session.locked,true,'Fifth correction still works');
 w.neGuidedNext();
 assert.equal(session.guidedSpeech.index,1);
 assert.equal(session.guidedSpeech.turns.length,1);
 assert.equal(rerenders,1);
 assert.equal(checkpoints,2,'Initial grade and step transition both preserve checkpoint');
 assert.equal(discarded,1,'Accepted answer must be removed before advancing the turn');
 field.value='Jeg kommer fra Ukraina og bor i Oslo.';
 await w.checkFree('speaking');w.neGuidedNext();
 field.value='Jeg snakker ukrainsk.';
 await w.checkFree('speaking');w.neGuidedNext();
 field.value='Hva heter du?';
 await w.checkFree('speaking');
 assert.match(feedback.innerHTML,/Jeg heter Erik\./);
 w.neGuidedNext();
 assert.equal(session.guidedSpeech.index,4);
 field.value='Hyggelig å møte deg, Erik!';
 await w.checkFree('speaking');
 assert.match(feedback.innerHTML,/Hyggelig å møte deg også!/);
 w.neGuidedNext();
 assert.equal(session.guidedSpeech.index,5,'courtesy follows his name');
 field.value='Hvor kommer du fra?';
 await w.checkFree('speaking');w.neGuidedNext();
 field.value='Hvilke språk snakker du?';
 await w.checkFree('speaking');w.neGuidedNext();
 field.value='Takk for praten. Ha det bra!';
 field.dataset.fromVoice='false';
 await w.checkFree('speaking');
 assert.equal(attempts.at(-1).skill,'writing','typed answer must not count as speaking evidence');
 w.neGuidedNext();
 assert.equal(finishes,1,'finish only after all valid turns');
 assert.equal(discarded,8,'Every accepted dialogue turn discards its editable draft');
 assert.equal(scores.length,8,'Only the first attempt of each of eight turns contributes to progress');
 // Dynamic replies are used only AFTER the learner passes the scored step.
 // They must survive rerender, while a chat outage falls back to authored text.
 session.lesson=keyHome;session.guidedSpeech=null;session.locked=false;field.value='Hvor er nøkkelen?';
 let chatCalls=0;
 w.neApiPost=async(path,payload)=>{chatCalls++;assert.equal(path,'/api/chat');assert.equal(payload.mode,'roleplay');return {ok:true,data:{accepted:true,feedback_status:'correct',reply_no:'Nøkkelen ligger under stolen. Ser du den?'}}};
 await w.checkFree('speaking');
 assert.equal(chatCalls,1);
 assert.match(feedback.innerHTML,/Nøkkelen ligger under stolen/);
 w.neGuidedNext();
 assert.equal(session.guidedSpeech.turns[0].reply,'Nøkkelen ligger under stolen. Ser du den?');
 assert.match(w.freeEx(keyHome,'speaking'),/Nøkkelen ligger under stolen/,'Generated replies must be preserved on screen re-render');
 field.value='Jeg ser den ved døren.';
 w.neApiPost=async()=>({ok:false,error:'NETWORK'});
 await w.checkFree('speaking');
 assert.match(feedback.innerHTML,/Nei, bordet står ved vinduet/,'Offline fallback must preserve lesson');
 w.neGuidedNext();
 assert.equal(session.guidedSpeech.index,2);
 delete w.neApiPost;
 session.lesson=lesson;session.guidedSpeech=null;session.locked=false;
 // An old seven-turn checkpoint cannot skip the new courtesy stage.
 const stale={lessonId:lesson.id,index:5,turns:Array.from({length:5},(_,i)=>({answer:'old '+i,spoken:true}))};
 session.guidedSpeech=stale;session.locked=false;
 const updatedMarkup=w.freeEx(lesson,'speaking');
 assert.equal(stale.index,4);
 assert.equal(stale.turns.length,4);
 assert.match(updatedMarkup,/Диалог обновлён/);
 assert.match(updatedMarkup,/Скажи Эрику, что тебе приятно познакомиться/);
 assert.equal(stale.flowVersion,2);
 assert.equal(w.checkFree('writing'),'legacy','writing checker should be preserved');
 // Server allows accepted=true at score 50. The client must not reject it at 55.
 session.lesson=keyHome;session.guidedSpeech=null;session.locked=false;
 field.value='Jeg kan komme i morgen klokka tre.';
 w.aiEvaluate=async()=>({ok:true,data:{accepted:true,score:50,issues:[{category:'task'}],explanation_ru:'Oppgaven er gjennomført.',score_reason_ru:'En av detaljene bør forbedres.'}});
 await w.checkFree('speaking');
 assert.equal(session.locked,true,'A server-accepted 50/100 must be accepted by the teacher');
 assert.match(feedback.innerHTML,/50\/100/);
 assert.match(feedback.innerHTML,/Ответ принят с замечаниями/);
 // A response edited while the server is working must not be accepted or graded.
 session.guidedSpeech=null;session.locked=false;
 field.value='Jeg kan møte deg klokka tre.';
 let resolveCheck;
 w.aiEvaluate=()=>new Promise(resolve=>{resolveCheck=resolve});
 const before=scores.length;
 const pending=w.checkFree('speaking');
 field.value='Jeg kan møte deg klokka fem.';
 resolveCheck({ok:true,data:{accepted:true,score:100,issues:[]}});
 await pending;
 assert.equal(session.locked,false);
 assert.equal(scores.length,before,'Stale response must not affect progress');
 assert.match(feedback.innerHTML,/изменён во время проверки/);
 console.log('Guided speaking: 32 modules, 8 A1 turns, rejected retry, progress, voice evidence, typed fallback OK');
})().catch(error=>{console.error(error);process.exitCode=1});
