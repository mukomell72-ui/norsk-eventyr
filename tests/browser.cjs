const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');let calls=0;
const server=http.createServer(async(req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname;
 if(name.startsWith('/api/')){let data='';for await(const c of req)data+=c;const body=JSON.parse(data||'{}');let out={score:90,score_valid:true,accepted:true,explanation_ru:'Хорошо',reply_no:'Hei! Hvordan har du det?',translation_ru:'Привет',text:'Jeg bor i Norge.'};if(name.endsWith('session')&&body.action)out={status:'approved',access_granted:true,owner:true,user_id:'11111111-1111-4111-8111-111111111111',email:'owner@example.com'};if(name.endsWith('session')&&!body.action)out={token:'qa'};if(name.endsWith('evaluate')){calls++;if(body.action==='lexical_gap')out={candidates:[]};else if(body.answer==='Jeg feil.')out={score:35,accepted:false,explanation_ru:'Порядок слов нужно исправить.',corrected:'Jeg jobber i dag.',micro_rule_ru:'В главном предложении сказуемое стоит на втором месте.',retry_prompt_no:'Hva skal du gjøre i morgen?',next_action_ru:'Проверь перенос.',error_tag:'word_order',strengths_ru:[],breakdown:{meaning:70,grammar:30,vocabulary:60,coherence:60}};await new Promise(r=>setTimeout(r,120))}if(name.endsWith('generate')){out={title:'QA adaptive lesson',grammarTitle:'Presens',grammarRuleRu:'Глагол в настоящем времени.',grammarExamples:['Jeg jobber.','Du bor her.','Vi lærer norsk.'],grammarQ:'Velg riktig setning.',grammarOpts:['Jeg jobber i dag.','Jeg jobbe i dag.','Jeg jobbet i morgen.','Jeg å jobber.'],grammarCorrect:0,phrase:'Jeg jobber i dag.',ru:'Я работаю сегодня.',vocab:[['jobb','работа'],['i dag','сегодня'],['lære','учить'],['norsk','норвежский'],['bo','жить'],['her','здесь']],listeningAudio:'Ola jobber i butikken i dag, men han slutter tidlig fordi han skal til legen.',listeningQ:'Hvorfor slutter Ola tidlig?',listeningOpts:['Han skal til legen.','Han skal på ferie.','Butikken stenger.','Han er ferdig for uken.'],listeningCorrect:0,read:'Jeg heter Ola. Jeg jobber i dag.',q:'Hva gjør Ola i dag?',opts:['Han jobber.','Han sover.','Han reiser.','Han lager mat.'],correct:0,writing:'Skriv to setninger om dagen din.',speaking:'Fortell kort om dagen din.'};await new Promise(r=>setTimeout(r,120))}if(name.endsWith('drill')){out={items:[{audio_no:'Hei',translation_ru:'Привет'}]};await new Promise(r=>setTimeout(r,120))}res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(out))}
 try{const file=path.join(root,name==='/'?'index.html':name);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end('not found')}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({...(process.env.NE_CHROMIUM_PATH?{executablePath:process.env.NE_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});let errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.NEAccess?.ready());
 for(const route of ['home','course','chat','story','hub','dictionary','daily','review','tests','exam','progress','plan','dictation','grammarlab','pronunciation','listeninglab','cloud','settings','storyjournal','storyside','teacher']){await page.evaluate(route=>navigate(route),route);await page.waitForTimeout(160);assert(await page.locator('#app main').innerText(),route);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),route+' overflow')}
 console.log('PASS 21 routes including adaptive teacher');
  await page.evaluate(()=>{state.level='A1';navigate('teacher')});assert((await page.locator('#app main').innerText()).includes('Нора ведёт занятие'));
  await page.evaluate(()=>teacherStartMission());await page.waitForTimeout(500);const adaptiveDebug=await page.evaluate(()=>({moduleId:lessonSession?.lesson?._adaptive?.moduleId,title:lessonSession?.lesson?.title,text:document.querySelector('#app main')?.innerText||''}));assert(adaptiveDebug.moduleId==='a1-foundation',JSON.stringify(adaptiveDebug));assert(adaptiveDebug.text.toLowerCase().includes('знакомство без шаблона')||adaptiveDebug.text.toLowerCase().includes('qa adaptive lesson'),JSON.stringify(adaptiveDebug));console.log('PASS adaptive teacher opens a mastery lesson with curated foundation');
  await page.locator('#dialogAnswer').fill('Jeg heter Ola.');await page.evaluate(()=>checkDialogue());await page.waitForTimeout(260);assert.equal(await page.evaluate(()=>lessonSession.step),0);assert.equal(await page.evaluate(()=>state.learningV8.attempts.at(-1)?.skill),'writing','typed dialogue must never prove oral proficiency');assert.equal(await page.locator('.lesson-next-v8').innerText(),'Дальше →');await page.locator('.lesson-next-v8').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>lessonSession.step),1);console.log('PASS dialogue feedback waits for explicit Next');
  await page.evaluate(()=>{lessonSession.step=1;lessonSession.vocabIndex=0;lessonSession.vocabItems=null;renderLesson()});const vocabDebug=await page.evaluate(()=>({text:document.querySelector('#app main')?.innerText||'',step:lessonSession?.step,adaptive:!!lessonSession?.lesson?._adaptive,vocabFn:String(vocabEx).slice(0,260)}));assert(vocabDebug.text.toLowerCase().includes('словарь · активное вспоминание'),JSON.stringify(vocabDebug));assert.equal(await page.locator('.choice-list').count(),0);
  const vocabTargets=await page.evaluate(()=>lessonSession.lesson.vocab.slice(0,3).map(x=>x[0])),vocabBefore=await page.evaluate(()=>state.learningV8?.attempts?.filter(x=>x.source==='vocab_recall').length||0);
  for(const target of vocabTargets){const beforeIndex=await page.evaluate(()=>lessonSession.vocabIndex||0);await page.locator('#adaptiveVocabAnswer').fill(target);await page.evaluate(()=>checkAdaptiveVocab());await page.waitForTimeout(260);assert.equal(await page.evaluate(()=>lessonSession.vocabIndex||0),beforeIndex);assert.equal(await page.locator('.lesson-next-v8').innerText(),'Дальше →');await page.locator('.lesson-next-v8').click();await page.waitForTimeout(100)}
  const vocabAfter=await page.evaluate(()=>({count:state.learningV8?.attempts?.filter(x=>x.source==='vocab_recall').length||0,step:lessonSession.step}));
  assert.equal(vocabAfter.count,vocabBefore+3);assert.equal(vocabAfter.step,2);console.log('PASS adaptive vocabulary uses three-item active recall');
  const beforeChoice=await page.evaluate(()=>state.learningV8.attempts.length);
  await page.evaluate(()=>{const lesson=lessonSession.lesson,c=Number(lesson.grammarCorrect),bad=(c+1)%4;lessonChoice(document.querySelectorAll('.choice')[bad],bad,c,'Правило','grammar')});
  assert.equal(await page.evaluate(()=>state.learningV8.attempts.length),beforeChoice+1,'first wrong attempt should create one learning event');
  assert.equal(await page.evaluate(()=>state.activeLesson?.choiceMiss),true,'first wrong answer must be persisted');
  await page.evaluate(()=>{const id=lessonSession.lesson.id;navigate('home');startLesson(id)});
  assert.equal(await page.evaluate(()=>lessonSession.choiceMiss),true,'returning to a lesson may not clear the wrong first attempt');
  await page.evaluate(()=>{const c=Number(lessonSession.lesson.grammarCorrect);lessonChoice(document.querySelectorAll('.choice')[c],c,c,'Правило','grammar')});
  assert.equal(await page.evaluate(()=>state.learningV8.attempts.length),beforeChoice+1,'correct retry must not create a second, perfect learning event');
  assert((await page.locator('#fb').innerText()).includes('первая попытка 35/100'));
  await page.locator('#fb .lesson-next-v8').click();
  assert.equal(await page.evaluate(()=>lessonSession.choiceMiss),false,'new lesson step should start new first-attempt evidence');
  console.log('PASS wrong choice stays scored after resume and cannot earn a second perfect grade');
  const transferBefore=await page.evaluate(()=>state.learningV8?.attempts?.filter(x=>x.source==='lesson_free_transfer').length||0);
  await page.evaluate(()=>{lessonSession.step=5;lessonSession.remediation=null;lessonSession.locked=false;renderLesson()});await page.locator('#freeAnswer').fill('Jeg feil.');await page.evaluate(()=>checkFree('writing'));await page.waitForTimeout(220);
  const remediation=await page.evaluate(()=>({prompt:lessonSession?.remediation?.prompt||'',text:document.querySelector('#app main')?.innerText||''}));assert.equal(remediation.prompt,'Hva skal du gjøre i morgen?');assert(remediation.text.includes('Применить в новой ситуации'));
  await page.evaluate(()=>openFreeTransfer());assert((await page.locator('#app main').innerText()).includes('Hva skal du gjøre i morgen?'));await page.locator('#freeAnswer').fill('Jeg skal jobbe i morgen.');await page.evaluate(()=>checkFree('writing'));await page.waitForTimeout(260);
  const transferFeedback=await page.evaluate(()=>({step:lessonSession.step,text:document.querySelector('#app main')?.innerText||''}));assert.equal(transferFeedback.step,5);assert(transferFeedback.text.includes('Исправление перенесено в новую ситуацию'));assert.equal(await page.locator('.lesson-next-v8').innerText(),'Дальше →');
  await page.locator('.lesson-next-v8').click();await page.waitForTimeout(100);
  const transferAfter=await page.evaluate(()=>({count:state.learningV8?.attempts?.filter(x=>x.source==='lesson_free_transfer').length||0,last:state.learningV8?.attempts?.filter(x=>x.source==='lesson_free_transfer').at(-1),step:lessonSession.step,remediation:lessonSession.remediation||null}));
  assert.equal(transferAfter.count,transferBefore+1);assert.equal(transferAfter.last?.transfer,true);assert.equal(transferAfter.last?.skill,'writing');assert.equal(transferAfter.step,6);assert.equal(transferAfter.remediation,null);console.log('PASS adaptive writing error requires successful transfer to a new context');
  await page.locator('#freeAnswer').fill('Jeg vil jobbe flere timer.');await page.evaluate(()=>checkFree('speaking'));await page.waitForTimeout(240);
  const typedSpeech=await page.evaluate(()=>state.learningV8?.attempts?.at(-1));
  assert.equal(typedSpeech?.skill,'writing','typing a speech answer should be recorded as writing, not speaking');
  assert.equal(typedSpeech?.source,'lesson_free_text','typed speech cannot obtain voice evidence');
  console.log('PASS typed lesson answers do not create false speaking proficiency');
  const beforeConversationEvidence=await page.evaluate(()=>state.learningV8?.attempts?.filter(x=>x.source==='conversation').length||0);
  await page.evaluate(()=>{state.chatPrefs={...(state.chatPrefs||{}),level:'A1',mode:'free',topic:'jobb',autoSpeak:false};navigate('chat');document.getElementById('chatInput').value='Jeg jobber i dag.';v7SendChat()});await page.waitForTimeout(650);
  const conversationEvidence=await page.evaluate(()=>state.learningV8?.attempts?.filter(x=>x.source==='conversation')||[]);
  assert.equal(conversationEvidence.length,beforeConversationEvidence+1);assert.equal(conversationEvidence.at(-1).skill,'writing');assert.equal(conversationEvidence.at(-1).level,'A1');console.log('PASS Nora conversation writes valid adaptive evidence');
  await page.evaluate(()=>{state.level='A1';saveState();navigate('test','B2')});await page.waitForTimeout(500);
  const diagnosticState=await page.evaluate(()=>({courseLevel:state.level,testLevel:testSession?.level,hasSix:Object.keys(testSession?.skillEvidence||{}).sort().join(',')}));
  assert.equal(diagnosticState.courseLevel,'A1');assert.equal(diagnosticState.testLevel,'B2');assert.equal(diagnosticState.hasSix,'grammar,listening,reading,speaking,vocabulary,writing');console.log('PASS active B2 diagnostic does not switch A1 course and collects six skills');
  const placementResult=await page.evaluate(()=>{state.level='A1';state.learningV8={};state.placement=null;saveState();startPlacement();[0,0,0,1,0,1,2,1,1,1,1,1,0,1,1,1,1,0,1,2].forEach(a=>answerPlacement(a));return{level:state.level,placement:state.placement,b2:state.learningV8?.levelSkills?.B2,text:document.querySelector('#app main')?.innerText||''}});
  assert.equal(placementResult.level,'B2');assert.equal(placementResult.placement?.scope,'receptive_screening');assert.equal(placementResult.b2?.writing,35);assert.equal(placementResult.b2?.speaking,35);assert(placementResult.b2?.reading<=70);assert(placementResult.text.includes('не означает, что уровень B2 подтверждён'));console.log('PASS perfect placement recommends B2 material without certifying productive B2');
  await page.evaluate(()=>navigate('course','A1'));const courseText=(await page.locator('#app main').innerText());assert(courseText.includes('8 модулей A1'));assert(courseText.includes('Старт и выживание'));assert(courseText.includes('A1: реальные ситуации'));console.log('PASS active course shows the A1 mastery curriculum');
  await page.evaluate(()=>teacherStartModule('a1-home'));await page.waitForTimeout(120);assert((await page.locator('#app main').innerText()).includes('Сначала закрепи предыдущий модуль'));console.log('PASS future curriculum module is gated by prior mastery');
  const crossLevelGate=await page.evaluate(()=>{state.level='A1';state.learningV8=state.learningV8||{};state.learningV8.startLevel='A1';saveState();navigate('course','B2');return{active:state.level,text:document.querySelector('#app main')?.innerText||''}});
  assert.equal(crossLevelGate.active,'A1');assert(crossLevelGate.text.includes('Курс B2'));await page.evaluate(()=>teacherStartModule('b2-argument'));await page.waitForTimeout(120);assert((await page.locator('#app main').innerText()).includes('Сначала подтверди A1'));console.log('PASS browsing B2 does not change A1 and direct B2 start is gated');
  const cloudStart=await page.evaluate(()=>{
    const conservative=neResolveStartLevel({level:'B2',learningV8:{startLevel:'B2'}},{level:'A1',learningV8:{startLevel:'A1'}},null);
    const merged=neMergeState(
      {level:'A1',placement:{recommendedStart:'A1',date:'2026-01-01T00:00:00Z'},learningV8:{startLevel:'A1'}},
      {level:'B2',placement:{recommendedStart:'B2',date:'2026-02-01T00:00:00Z'},learningV8:{startLevel:'B2'}}
    );
    return{conservative,mergedStart:merged.learningV8.startLevel,placement:merged.placement?.recommendedStart};
  });
  assert.equal(cloudStart.conservative,'A1');assert.equal(cloudStart.mergedStart,'B2');assert.equal(cloudStart.placement,'B2');console.log('PASS cloud sync preserves safe mastery starting level');
  const chatLevelIsolation=await page.evaluate(()=>{state.level='A1';state.chatPrefs={...(state.chatPrefs||{}),level:'A1'};saveState();navigate('chat');v7ChatPref('level','B2');return{course:state.level,chat:state.chatPrefs.level}});
  assert.equal(chatLevelIsolation.course,'A1');assert.equal(chatLevelIsolation.chat,'B2');console.log('PASS B2 conversation practice does not switch the A1 course');
  const storyLevelIsolation=await page.evaluate(()=>{state.level='A1';state.story=state.story||{};state.story.selectedLevel='A1';saveState();renderStoryV7('s4');return{course:state.level,story:state.story.selectedLevel,text:document.querySelector('#app main')?.innerText||''}});
  assert.equal(storyLevelIsolation.course,'A1');assert.equal(storyLevelIsolation.story,'B2');assert(storyLevelIsolation.text.includes('Sesong 4'));console.log('PASS B2 Fjordvik season does not switch the A1 course');
  const storyChatIsolation=await page.evaluate(()=>{v7OpenPlace('cafe');return{course:state.level,chat:state.chatPrefs.level}});
  assert.equal(storyChatIsolation.course,'A1');assert.equal(storyChatIsolation.chat,'B2');console.log('PASS Fjordvik B2 roleplay keeps course A1');
  await page.waitForTimeout(300);await page.evaluate(()=>{state.level='A1';if(state.chatPrefs)state.chatPrefs.level='A1';saveState();navigate('tests')});
 await page.evaluate(()=>{testSession={level:'A1',questions:[{type:'mc',text:'test',opts:['a','b','c','d'],correct:0},{type:'mc',text:'next',opts:['a','b','c','d'],correct:0}],i:0,correct:0,freeScores:[],skillEvidence:{}};renderTest();answerTest(0);answerTest(0)});await page.waitForTimeout(1050);assert(await page.evaluate(()=>testSession.i===1&&testSession.correct===1));
 let before=calls;await page.evaluate(()=>{testSession={level:'A1',questions:[{type:'free',mode:'writing',text:'Write'},{type:'free',mode:'writing',text:'Next'}],i:0,correct:0,freeScores:[]};renderTest();document.getElementById('testFree').value='Jeg bor her.';answerTestFree();answerTestFree()});await page.waitForTimeout(1250);assert.equal(calls,before+1);assert(await page.evaluate(()=>testSession.i===1&&testSession.freeScores.length===1));
 await page.evaluate(()=>{document.getElementById('testFree').value='Jeg bor her.';answerTestFree();navigate('course')});await page.waitForTimeout(900);assert(await page.evaluate(()=>testSession.freeScores.length===1&&!!document.querySelector('.course-map-v7')));console.log('PASS duplicate answers and stale evaluation');
 await page.evaluate(()=>{navigate('test','A1');navigate('settings')});await page.waitForTimeout(500);assert((await page.locator('#app main').innerText()).includes('Профиль'));
 await page.evaluate(()=>{state.elite.drills={};navigate('dictation');navigate('course')});await page.waitForTimeout(500);assert(await page.locator('.course-map-v7').count());console.log('PASS generation preserves navigation');
 await page.evaluate(()=>{state.xp=123;saveState()});for(const value of [[],{level:'A1',completed:null},{level:'Z9'},{level:'A1',testHistory:{}},{level:'A1',xp:-5},{level:'A1',srs:{bad:null}},{level:'A1',skills:{grammar:'bad'}},{level:'A1',chatThreads:{bad:{}}}]){await page.evaluate(value=>importProgressFile({text:async()=>JSON.stringify({state:value})}),value);assert(await page.evaluate(()=>state.xp===123&&JSON.parse(localStorage.getItem('ne2_state')).xp===123))}console.log('PASS eight invalid backups preserve progress');
 await page.evaluate(()=>{const orig=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='ne2_state')throw new DOMException('Full','QuotaExceededError');return orig.call(this,k,v)};try{saveState();navigate('course')}finally{Storage.prototype.setItem=orig}});assert(await page.locator('.course-map-v7').count());console.log('PASS storage quota preserves navigation');
 before=calls;await page.evaluate(()=>{startExamPart('writing','A1-A2');document.getElementById('examFreeV3').value='Jeg bor her.';submitExamProductive();submitExamProductive()});await page.waitForTimeout(1350);assert.equal(calls,before+1);assert((await page.locator('#app main').innerText()).includes('Задание 2/'));
 before=calls;await page.evaluate(()=>{const day=neLocalDate();state.dailyPacks[day]={date:day,level:'A1',practice:[{prompt_ru:'Расскажи',goal_ru:'Ответь',new_words:[],review_words:[]},{prompt_ru:'Далее',goal_ru:'Ответь',new_words:[],review_words:[]}]};startDailyPractice(day);document.getElementById('dailyAnswer').value='Jeg bor her.';checkDailyTask();checkDailyTask()});await page.waitForTimeout(950);assert.equal(calls,before+1);assert((await page.locator('#app main').innerText()).includes('2/2'));
 before=calls;await page.evaluate(()=>{navigate('storyside');document.getElementById('sideAnswer').value='Det er bra.';checkStorySide();checkStorySide()});await page.waitForTimeout(1100);assert.equal(calls,before+1);console.log('PASS exam, homework and side mission send once');
 const previous=await page.evaluate(()=>state.xp);const restored=await page.evaluate(()=>({...state,xp:321}));await page.evaluate(value=>importProgressFile({text:async()=>JSON.stringify({state:value})}),restored);await page.waitForTimeout(700);assert(await page.evaluate(x=>state.xp===321&&JSON.parse(localStorage.getItem('ne2_state_before_import')).xp===x,previous));console.log('PASS restore preserves prior backup');
 let cloudRequests=0,pushOk=true,pullOk=true;const remote=await page.evaluate(()=>({...state,wordFavorites:{remote:true},chatThreads:{'place:remote':[{role:'user',text:'Hei'}]},chatMemories:{'place:remote':[{role:'user',text:'Memory'}]}}));
 await page.route('**/api/cloud',async r=>{cloudRequests++;const body=r.request().postDataJSON();await new Promise(x=>setTimeout(x,100));await r.fulfill({json:body.name.endsWith('_pull')?{ok:pullOk,state:remote,revision:2}:{ok:pushOk,revision:3,error:pushOk?undefined:'DENIED'}})});
 await page.evaluate(()=>{localStorage.setItem('ne_cloud_link',JSON.stringify({sync_id:'qa-existing',secret:'qa-secret'}));state.wordFavorites={local:true};navigate('cloud')});const result=await page.evaluate(async()=>{const a=cloudSync();const b=cloudSync();navigate('course');return Promise.all([a,b])});assert.deepEqual(result,[true,false]);assert.equal(cloudRequests,2);assert(await page.evaluate(()=>state.wordFavorites.remote&&state.wordFavorites.local&&state.chatThreads['place:remote'].length&&state.chatMemories['place:remote'].length));assert(await page.locator('.course-map-v7').count());pushOk=false;assert.equal(await page.evaluate(()=>cloudSync(false)),false);pullOk=false;await page.evaluate(()=>{navigate('cloud');const e=document.createElement('textarea');e.id='cloudCode';e.value='bad.bad';document.body.appendChild(e)});await page.evaluate(()=>connectCloud());assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('ne_cloud_link')).sync_id==='qa-existing'));await page.evaluate(()=>localStorage.removeItem('ne_cloud_link'));console.log('PASS cloud preservation, serialized requests and rejected connection');
 for(const level of ['A1','A2','B1','B2']){await page.evaluate(level=>navigate('course',level),level);assert.equal(await page.locator('.near-lesson-v7').count(),await page.evaluate(()=>lessons(state.level).length))}
 for(const width of [360,390,768]){await page.setViewportSize({width,height:844});for(const screen of ['welcome','home','course','chat','story','learnedwords','lesson','listeninglab','grammarlab','exam','progress','settings']){await page.evaluate(screen=>navigate(screen,screen==='lesson'?'a1-1':undefined),screen);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),screen+' '+width)}}console.log('PASS every core lesson and 12 screens at three widths');
 await page.evaluate(()=>document.getElementById('cloudCode')?.remove());
 const staged=await page.evaluate(()=>{
    const data=NECurated.variant('b2-listening',0);
    const lesson={...data,id:'adaptive-qa-b2-staged',level:'B2',_adaptive:{moduleId:'b2-listening',kind:'learn',skill:'listening'}};
    state.generatedLessons[lesson.id]=lesson;
    lessonSession={lesson,step:3,listeningIndex:0,choiceMiss:false,locked:false,xpScores:[]};
    persistLessonCheckpoint();renderLesson();
    return{part:lessonSession.listeningIndex,hasFollowup:!!lesson.speakingFollowUp,correct:lesson.listeningSets[0].correct};
 });
 assert.equal(staged.part,0);
 assert.equal(staged.hasFollowup,true);
 assert((await page.locator('#app main').textContent()).includes('часть 1/2'),'first listening recording must be visible');
 await page.evaluate(()=>{
   const c=lessonSession.lesson.listeningSets[0].correct;
   lessonChoice(document.querySelectorAll('.choice')[c],c,c,'Первый этап','listening');
 });
 assert((await page.locator('#fb').innerText()).includes('Следующая запись'));
 await page.locator('#fb .lesson-next-v8').click();
 assert.equal(await page.evaluate(()=>lessonSession.listeningIndex),1,'second listening part should start');
 assert.equal(await page.evaluate(()=>state.activeLesson?.listeningIndex),1,'multi-part checkpoint must persist');
 assert((await page.locator('#app main').textContent()).includes('часть 2/2'));
 await page.evaluate(()=>{
   lessonSession.step=6;lessonSession.speakingFollowup=true;persistLessonCheckpoint();renderLesson();
 });
 assert((await page.locator('#app main').innerText()).includes('Hva slags tilleggsdata'));
 const followupAssessment=await page.evaluate(async()=>{
   const prev=aiEvaluate,submissions=[];
   aiEvaluate=async payload=>{submissions.push(payload);return{ok:true,data:{accepted:true,score:87,breakdown:{grammar:85,vocabulary:90},strengths_ru:['Ответ по теме'],improvements_ru:[],explanation_ru:'Понятный ответ',corrected:''}}};
   const text=document.getElementById('freeAnswer');
   text.value='Vi trenger bedre data og et lengre forsøk før vi tar en beslutning.';
   text.dataset.fromVoice='false';
   try{
     await checkFree('speaking');
     await checkFree('speaking'); // second click must not double-count
     return{n:submissions.length,question:submissions[0]?.question,mode:submissions[0]?.mode,locked:lessonSession.locked,skill:state.learningV8.attempts.at(-1)?.skill};
   }finally{aiEvaluate=prev}
 });
 assert.equal(followupAssessment.n,1,'accepted follow-up must not be scored twice');
 assert.equal(followupAssessment.question,await page.evaluate(()=>lessonSession.lesson.speakingFollowUp),'follow-up must be assessed against the question displayed');
 assert.equal(followupAssessment.mode,'writing','typed reply must get writing rubric, not speaking rubric');
 assert.equal(followupAssessment.skill,'writing','typed follow-up must not prove oral communication');
 assert.equal(followupAssessment.locked,true,'accepted answer must stay locked until Next');
 console.log('PASS B2 follow-up evaluates its true question, rejects duplicate grading and does not overclaim voice');
 console.log('PASS realistic B2 two-stage audio and saved oral follow-up in browser');
 await page.evaluate(()=>{if(state.activeLesson?.id==='adaptive-qa-b2-staged')delete state.activeLesson;saveState();});
 const screenshotsDir=path.join(__dirname,'artifacts');fs.mkdirSync(screenshotsDir,{recursive:true});
 await page.setViewportSize({width:390,height:844});
 for(const [view,arg] of [['home',undefined],['teacher',undefined],['chat',undefined],['lesson','a1-1']]){
  await page.evaluate(([screen,target])=>navigate(screen,target),[view,arg]);
  await page.waitForTimeout(140);
  await page.screenshot({path:path.join(screenshotsDir,'norsk-eventyr-8.1-'+view+'-390.png'),fullPage:true});
 }
 console.log('PASS UI screenshots captured for manual mobile visual inspection');
 await page.evaluate(()=>{window.confirm=()=>true;resetProgress()});await page.waitForTimeout(700);assert(await page.evaluate(()=>state.xp===0&&!!state.elite&&!!state.skills&&!!state.story&&!localStorage.getItem('ne_cloud_link')&&!!localStorage.getItem('ne2_state_before_reset')));assert.deepEqual(errors,[]);console.log('PASS reset reinitializes modules; zero browser errors');await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
