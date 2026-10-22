const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const curriculum=fs.readFileSync(path.join(base,'curriculum-v8.js'),'utf8');
const speaking=fs.readFileSync(path.join(base,'guided-speaking.js'),'utf8');
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
 const field={value:'Hei, jeg heter Anna og jeg bor i Oslo.',dataset:{fromVoice:'true'},focus(){}};
 const feedback={isConnected:true,innerHTML:''};
 const nodes={freeAnswer:field,freeFb:feedback};
 const scores=[],attempts=[];
 let rerenders=0,checkpoints=0,finishes=0,accepted=false;
 const lesson={id:'generated-1',level:'A1',_adaptive:{moduleId:'a1-foundation'}};
 const session={lesson,locked:false};
 const state={};
 const w={
  freeEx:()=>'<legacy>',checkFree:()=> 'legacy',neLessonSession:session,neLearnerState:state,
  aiEvaluate:async()=>({ok:true,data:{accepted,score:accepted?95:22,explanation_ru:accepted?'':'Попробуй снова.'}}),
  trackLessonScore:(v)=>scores.push(v),
  NEAdaptive:{recordAttempt:(_state,item)=>attempts.push(item)},
  saveState:()=>{},renderLesson:()=>{rerenders++},
  persistLessonCheckpoint:()=>{checkpoints++},
  lessonNext:()=>{finishes++},
  speakText:()=>{}
 };
 const sandbox={window:w,document:{getElementById:id=>nodes[id]||null},esc:s=>String(s).replace(/</g,'&lt;')};
 vm.runInNewContext(speaking,sandbox,{filename:'guided-speaking.js'});
 const start=w.freeEx(lesson,'speaking');
 assert.match(start,/Реплика 1 из 8/);
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
 accepted=true;
 await w.checkFree('speaking');
 assert.equal(session.locked,true);
 assert.match(feedback.innerHTML,/Следующая реплика/);
 assert.match(feedback.innerHTML,/Hvor kommer du fra/);
 w.neGuidedNext();
 assert.equal(session.guidedSpeech.index,1);
 assert.equal(session.guidedSpeech.turns.length,1);
 assert.equal(rerenders,1);
 assert.equal(checkpoints,1);
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
 assert.equal(scores.length,9,'each evaluated attempt should contribute evidence');
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
 console.log('Guided speaking: 32 modules, 8 A1 turns, rejected retry, progress, voice evidence, typed fallback OK');
})().catch(error=>{console.error(error);process.exitCode=1});
