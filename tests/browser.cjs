const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');let calls=0;
const server=http.createServer(async(req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname;
 if(name.startsWith('/api/')){let data='';for await(const c of req)data+=c;const body=JSON.parse(data||'{}');let out={score:90,score_valid:true,accepted:true,feedback_status:'partial',score_reason_ru:'Минус 10 баллов за неполноту ответа.',explanation_ru:'Хорошо',reply_no:'Hei! Hvordan har du det?',translation_ru:'Привет',text:'Jeg bor i Norge.'};if(name.endsWith('session')&&body.action)out={status:'approved',access_granted:true,owner:true,user_id:'11111111-1111-4111-8111-111111111111',email:'owner@example.com'};if(name.endsWith('session')&&!body.action)out={token:'qa'};if(name.endsWith('evaluate')){calls++;if(body.action==='lexical_gap')out={candidates:[]};else if(body.answer==='Jeg feil.')out={score:35,accepted:false,explanation_ru:'Порядок слов нужно исправить.',corrected:'Jeg jobber i dag.',micro_rule_ru:'В главном предложении сказуемое стоит на втором месте.',retry_prompt_no:'Hva skal du gjøre i morgen?',next_action_ru:'Проверь перенос.',error_tag:'word_order',strengths_ru:[],breakdown:{meaning:70,grammar:30,vocabulary:60,coherence:60}};await new Promise(r=>setTimeout(r,120))}if(name.endsWith('generate')){out={title:'QA adaptive lesson',grammarTitle:'Presens',grammarRuleRu:'Глагол в настоящем времени.',grammarExamples:['Jeg jobber.','Du bor her.','Vi lærer norsk.'],grammarQ:'Velg riktig setning.',grammarOpts:['Jeg jobber i dag.','Jeg jobbe i dag.','Jeg jobbet i morgen.','Jeg å jobber.'],grammarCorrect:0,phrase:'Jeg jobber i dag.',ru:'Я работаю сегодня.',vocab:[['jobb','работа'],['i dag','сегодня'],['lære','учить'],['norsk','норвежский'],['bo','жить'],['her','здесь']],listeningAudio:'Ola jobber i butikken i dag, men han slutter tidlig fordi han skal til legen.',listeningQ:'Hvorfor slutter Ola tidlig?',listeningOpts:['Han skal til legen.','Han skal på ferie.','Butikken stenger.','Han er ferdig for uken.'],listeningCorrect:0,read:'Jeg heter Ola. Jeg jobber i dag.',q:'Hva gjør Ola i dag?',opts:['Han jobber.','Han sover.','Han reiser.','Han lager mat.'],correct:0,writing:'Skriv to setninger om dagen din.',speaking:'Fortell kort om dagen din.'};await new Promise(r=>setTimeout(r,120))}if(name.endsWith('drill')){out={items:[{audio_no:'Hei',translation_ru:'Привет'}]};await new Promise(r=>setTimeout(r,120))}res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(out))}
 try{const file=path.join(root,name==='/'?'index.html':name);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end('not found')}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({...(process.env.NE_CHROMIUM_PATH?{executablePath:process.env.NE_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});let errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.NEAccess?.ready());
 for(const route of ['home','course','chat','story','hub','dictionary','daily','review','tests','exam','progress','plan','dictation','grammarlab','pronunciation','listeninglab','cloud','settings','storyjournal','storyside','teacher']){await page.evaluate(route=>navigate(route),route);await page.waitForTimeout(160);assert(await page.locator('#app main').innerText(),route);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),route+' overflow')}
 console.log('PASS 21 routes including adaptive teacher');

 // Human Nora experience, exercised through the real authenticated 8.3 UI.
 const humanPage=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 const humanErrors=[];humanPage.on('pageerror',e=>humanErrors.push(e.message));
 await humanPage.goto('http://127.0.0.1:'+server.address().port);
 await humanPage.waitForFunction(()=>window.NEAccess?.ready()&&window.NEExperience?.homeChoice);
 await humanPage.evaluate(()=>navigate('home'));
 assert.equal(await humanPage.locator('.ne-focus-card').count(),1,'Current home must show personal real-world interests');
 assert.equal(await humanPage.locator('.ne-home-extras').count(),1,'Secondary features stay available');
 assert.equal(await humanPage.locator('.ne-home-extras').getAttribute('open'),null,
   'Extra rewards must not crowd the initial lesson screen');
 await humanPage.locator('.ne-focus-picker summary').click();
 await humanPage.locator('[data-ne-focus="work"]').click();
 assert.equal(await humanPage.evaluate(()=>state.learningV8.noraExperience.focus),'work',
   'Personal scenario preference must be saved in actual login-scoped state');
 await humanPage.reload();
 await humanPage.waitForFunction(()=>window.NEAccess?.ready()&&window.NEExperience?.homeChoice);
 assert.equal(await humanPage.evaluate(()=>state.learningV8.noraExperience.focus),'work',
   'Personal preference must survive real page reload');
 await humanPage.evaluate(()=>{
  const lesson=COURSE.find(x=>x.level==='A1');
  if(!lesson)throw Error('Missing baseline lesson');
  state.generatedLessons=state.generatedLessons||{};
  const id='nora-human-qa-lesson';
  state.generatedLessons[id]={...lesson,id,title:'Договориться о встрече',
   dialogueScene:'Коллега ждёт ответа о времени встречи.',
   dialogueSpeaker:'Коллега по работе',
   dialogueTask:'Ответь, в какое время ты можешь прийти.'};
  startLesson(id);
 });
 const humanSnapshot=await humanPage.evaluate(()=>({
  hasExperience:!!window.NEExperience,hasFunction:typeof window.NEExperience?.lessonHeader,
  lesson:typeof lessonSession!=='undefined'?lessonSession?.lesson?.id:null,
  step:typeof lessonSession!=='undefined'?lessonSession?.step:null,
  active:typeof state!=='undefined'?state.activeLesson?.id:null,
  text:document.getElementById('app')?.innerText.slice(0,550),
  html:document.querySelector('#app main')?.innerHTML.slice(0,400)
 }));
 assert.equal(await humanPage.locator('.ne-mission-head').count(),1,
   'Four-act human lesson context must render in real UI: '+JSON.stringify(humanSnapshot));
 assert((await humanPage.locator('.ne-mission-head').innerText()).includes('Встречаемся'));
 await humanPage.locator('.ne-pause-button').click();
 assert.equal(await humanPage.evaluate(()=>state.activeLesson?.id),'nora-human-qa-lesson',
   'Pause must preserve the exact active lesson');
 await humanPage.evaluate(()=>startLesson('nora-human-qa-lesson'));
 assert.equal(await humanPage.locator('.ne-mission-head').count(),1,'Resume retains mission context');
 await humanPage.evaluate(()=>NEExperience.openFollowup());
 assert.equal(await humanPage.evaluate(()=>state.chatPrefs.mode),'roleplay');
 assert.equal(await humanPage.evaluate(()=>state.chatThreadId),'lesson:nora-human-qa-lesson');
 const chatSnapshot=await humanPage.evaluate(()=>({
  currentRoute:document.querySelector('.shell-v7')?.getAttribute('data-screen'),
  chatExists:!!document.querySelector('.chat-v7'),routeType:typeof window.navigate,
  renderer:typeof window.renderChatV7,
  excerpt:document.getElementById('app')?.innerText.slice(0,360)
 }));
 assert.equal(await humanPage.locator('.chat-v7').count(),1,
   'Completed life topic can become a real interactive roleplay thread: '+JSON.stringify({chatSnapshot,humanErrors}));
 assert.equal(await humanPage.locator('.chat-welcome-v7').count(),1,
   'Learner should choose when to begin the life-situation conversation');
 assert.deepEqual(humanErrors,[],'New experience must not introduce browser runtime errors');
 await humanPage.close();
 console.log('PASS Nora human experience: focus, reload, saved pause, resume and contextual conversation');


 // 8.3: real Chromium DOM test for third authored listening stage and
 // post-answer transcript. Use a separate page to leave route QA isolated.
 const listeningQA=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 await listeningQA.goto('http://127.0.0.1:'+server.address().port);
 await listeningQA.waitForFunction(()=>window.NEAccess?.ready()&&typeof state!=='undefined'&&window.NECurated?.get);
 const correctIndex=await listeningQA.evaluate(()=>{
  const base=NECurated.get('a1-home');
  if(base.listeningSets.length!==3)throw Error('Missing independently authored audio situation');
  lessonSession={lesson:{...base,id:'adaptive-a1-home-quality-test',level:'A1',_adaptive:{moduleId:'a1-home',kind:'learn'}},step:3,locked:false,listeningIndex:2};
  renderLesson();
  return base.listeningSets[2].correct;
 });
 const listeningSnapshot=await listeningQA.evaluate(()=>({
  markup:document.querySelector('#app main')?.innerText.slice(0,500),
  stage:document.querySelector('.lesson-exercise-v6')?.innerText.slice(0,300),
  step:lessonSession?.step,
  stages:lessonSession?.lesson?.listeningSets?.length,
  index:lessonSession?.listeningIndex,
  grammarOpts:lessonSession?.lesson?.grammarOpts?.length,
  hasAdaptive:!!lessonSession?.lesson?._adaptive
 }));
 assert(String(listeningSnapshot.stage||listeningSnapshot.markup||'').includes('3/3'),
  'Third listening stage should be shown in the mobile UI: '+JSON.stringify(listeningSnapshot));
 assert.equal(await listeningQA.locator('.listening-transcript-v8').count(),0,'Norwegian transcript may not be visible before an attempt');
 await listeningQA.locator('.choice').nth(correctIndex).click();
 assert.equal(await listeningQA.locator('.listening-transcript-v8').count(),1,'After answering, learner can consult transcript');
 assert.equal(await listeningQA.locator('.listening-transcript-v8 p').isVisible(),false,'Transcript must initially be collapsed');
 await listeningQA.locator('.listening-transcript-v8 summary').click();
 assert.equal(await listeningQA.locator('.listening-transcript-v8 p').isVisible(),true,'Learner should be able to reveal complete Norwegian text');
 assert((await listeningQA.locator('.listening-transcript-v8 p').innerText()).includes('søsteren min'));
 await listeningQA.close();
 console.log('PASS new listening stage 3/3 and after-answer Norwegian transcript in mobile Chromium');


 // 8.2 end-to-end calibration, isolated from the remainder of the learning QA.
 const calibrationPage=await browser.newPage({viewport:{width:360,height:780},serviceWorkers:'block'});
 const calibrationErrors=[];calibrationPage.on('pageerror',e=>calibrationErrors.push(e.message));
 await calibrationPage.goto('http://127.0.0.1:'+server.address().port);
 await calibrationPage.waitForFunction(()=>window.NEAccess?.ready());
 await calibrationPage.evaluate(()=>navigate('home'));
 assert((await calibrationPage.locator('#placementEntryCard').innerText()).includes('С чего начать норвежский?'));
 assert(!await calibrationPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),'beginner calibration banner overflows on phone');
 await calibrationPage.evaluate(()=>{NECalibration.beginner()});
 assert.equal(await calibrationPage.evaluate(()=>state.placement?.scope),'beginner_choice');
 assert.equal(await calibrationPage.evaluate(()=>state.level),'A1');
 assert.equal(await calibrationPage.evaluate(()=>state.learningV8.attempts.filter(x=>x.diagnostic===true).length),0);
 await calibrationPage.evaluate(()=>{state.placement={level:'B2',recommendedStart:'B2',scope:'receptive_screening'};state.level='B2';saveState();navigate('home')});
 assert((await calibrationPage.locator('#placementEntryCard').innerText()).includes('Уточнить индивидуальный маршрут'));
 await calibrationPage.locator('#placementEntryCard button').first().click();
 assert((await calibrationPage.locator('#app main').innerText()).includes('Письмо · B2'));
 await calibrationPage.locator('#calibrationAnswer').fill('Digitalisering kan effektivisere tjenestene, men tilbudet må også være tilgjengelig for alle.');
 await calibrationPage.locator('#calibrationSubmit').click();
 await calibrationPage.waitForFunction(()=>state.placement?.productive?.nextIndex===1);
 assert((await calibrationPage.locator('#app main').innerText()).includes('Говорение'));
 await calibrationPage.locator('#calibrationAnswer').fill('Jeg synes det er viktig.');
 await calibrationPage.locator('#calibrationSubmit').click();
 assert((await calibrationPage.locator('#calibrationFeedback').innerText()).includes('вручную'));
 assert.equal(await calibrationPage.evaluate(()=>state.placement.productive.nextIndex),1,'typed speaking cannot advance');
 await calibrationPage.evaluate(()=>document.getElementById('calibrationAnswer').dataset.fromVoice='true');
 await calibrationPage.locator('#calibrationSubmit').click();
 await calibrationPage.waitForFunction(()=>state.placement.productive.nextIndex===2);
 await calibrationPage.locator('#calibrationAnswer').fill('Vi må ta hensyn til både effektivitet og mennesker som trenger personlig hjelp.');
 await calibrationPage.evaluate(()=>document.getElementById('calibrationAnswer').dataset.fromVoice='recognition');
 await calibrationPage.locator('#calibrationSubmit').click();
 await calibrationPage.waitForFunction(()=>state.placement.productive.status==='complete');
 const calibrationResult=await calibrationPage.evaluate(()=>({
  level:state.level,writing:state.placement.productive.results.filter(x=>x.skill==='writing').length,
  speaking:state.placement.productive.results.filter(x=>x.skill==='speaking').length,
  unearned:state.learningV8.attempts.filter(x=>x.diagnostic&&x.transfer).length,
  recentSources:state.learningV8.attempts.filter(x=>x.diagnostic).slice(-3).map(x=>x.source),
  reviews:state.learningV8.reviews
 }));
 assert.equal(calibrationResult.level,'B2');
 assert.equal(calibrationResult.writing,1);
 assert.equal(calibrationResult.speaking,2);
 assert.equal(calibrationResult.unearned,0);
 assert.deepEqual(calibrationResult.recentSources,['placement2_written','placement2_voice','placement2_voice']);
 assert(!await calibrationPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),'calibration summary overflows');
 const calibrationShots=path.join(__dirname,'artifacts');fs.mkdirSync(calibrationShots,{recursive:true});
 await calibrationPage.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await calibrationPage.waitForTimeout(120);
 await calibrationPage.screenshot({path:path.join(calibrationShots,'norsk-eventyr-8.2-calibration-summary-360.png'),fullPage:true});
 assert.deepEqual(calibrationErrors,[]);
 await calibrationPage.close();
 console.log('PASS 8.2 real Chromium flow: beginner choice, B2 two-stage writing/voice, typed rejection, mobile layout');

  // Release regression: the visible A1 task must be Norwegian only until requested,
  // and expanding/collapsing its translation must not lose an unsent answer.
  await page.evaluate(()=>{
    const l={...NECurated.get('a1-home'),id:'adaptive-a1-home-saved-qa',level:'A1',
      _adaptive:{moduleId:'a1-home',kind:'learn',skill:'speaking'},
      speaking:'Spør hvor nøkkelen ligger, og forklar hvor du har lett.'};
    const previous=lessonSession;
    lessonSession={lesson:l,speakingFollowup:false,locked:false,step:6};
    const html=freeEx(l,'speaking');
    lessonSession=previous;
    const host=document.createElement('section');host.id='qa-on-demand-translation';
    host.innerHTML=html;document.body.append(host);
  });
  const taskHost=page.locator('#qa-on-demand-translation');
  const disclosure=taskHost.locator('details.a1-task-support');
  assert.equal(await disclosure.count(),1,'A1 key task must support on-demand translation');
  assert.equal(await disclosure.evaluate(el=>el.open),false,'Russian translation starts closed');
  assert.equal(await taskHost.locator('.prompt').innerText(),'Spør hvor nøkkelen er. Si hvor du leter etter den.');
  assert.equal(await taskHost.locator('.a1-task-support .notice').isVisible(),false,'No Russian task translation before request');
  assert.equal(await taskHost.locator('summary').innerText(),'Перевести задание');
  await taskHost.locator('summary').click();
  assert.equal(await disclosure.evaluate(el=>el.open),true,'Learner can request translation');
  assert.equal(await taskHost.locator('.a1-task-support .notice').isVisible(),true);
  assert((await taskHost.locator('.a1-task-support .notice').innerText()).includes('Спроси, где находится ключ'));
  await taskHost.locator('#freeAnswer').fill('Jeg leter etter nøkkelen på kjøkkenet.');
  await taskHost.locator('summary').click();
  assert.equal(await taskHost.locator('#freeAnswer').inputValue(),'Jeg leter etter nøkkelen på kjøkkenet.','Toggling translation must not erase learner answer');
  assert.equal(await disclosure.evaluate(el=>el.open),false,'Translation is closable');
  await page.evaluate(()=>document.getElementById('qa-on-demand-translation').remove());
  console.log('PASS real browser opt-in task translation: hidden by default, reversible and unsent answer preserved');

  // Live Pixel 8.3 screenshot regression: nested Russian help must use dark
  // ink on a light surface. Both speaking controls must be reachable above dock.
  const mobileSpeaking=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  await mobileSpeaking.goto('http://127.0.0.1:'+server.address().port);
  await mobileSpeaking.waitForFunction(()=>window.NEAccess?.ready()&&window.NECurated?.get);
  await mobileSpeaking.evaluate(()=>{
    const l={...NECurated.get('a1-home'),id:'adaptive-a1-contrast-qa',level:'A1',
      _adaptive:{moduleId:'a1-home',kind:'learn',skill:'speaking'}};
    lessonSession={lesson:l,step:6,locked:false,speakingFollowup:false};
    renderLesson();
    document.querySelector('.a1-task-support summary').click();
  });
  const visual=await mobileSpeaking.evaluate(()=>{
    const help=document.querySelector('.lesson-exercise-v6 .a1-task-support .notice');
    const ink=help.querySelector('b'),hint=help.querySelector('small');
    const answer=document.querySelector('#freeAnswer');
    const row=document.querySelector('.speech-actions-v831');
    const dock=document.querySelector('.dock-v7');
    const rgb=v=>String(v).match(/[0-9]+(?:[.][0-9]+)?/g).slice(0,3).map(Number);
    const luminance=v=>rgb(v).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
    const contrast=(a,b)=>{const v=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (v[1]+.05)/(v[0]+.05)};
    const bg=getComputedStyle(help).backgroundColor;
    return {bodyContrast:contrast(getComputedStyle(help).color,bg),
      headingContrast:contrast(getComputedStyle(ink).color,bg),
      hintContrast:contrast(getComputedStyle(hint).color,bg),
      textareaHeight:answer.getBoundingClientRect().height,
      grid:getComputedStyle(row).display,
      dock:!!dock,
      disclosureOpen:document.querySelector('.a1-task-support').open,
      version:APP_VERSION};
  });
  assert(visual.bodyContrast>=4.5&&visual.headingContrast>=4.5&&visual.hintContrast>=4.5,
    'Expanded Russian translation must be readable: '+JSON.stringify(visual));
  assert(visual.textareaHeight<=115,'Phone speaking answer input must be compact: '+JSON.stringify(visual));
  assert.equal(visual.grid,'grid');
  assert(visual.disclosureOpen&&visual.dock);
  for(const selector of ['#micBtn','.speech-actions-v831>.btn:last-child']){
    await mobileSpeaking.locator(selector).evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    const visibility=await mobileSpeaking.locator(selector).evaluate(el=>{
      const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      const top=document.elementFromPoint(x,y);
      return {onScreen:y>0&&y<innerHeight,clickable:top===el||el.contains(top),y,windowHeight:innerHeight};
    });
    assert(visibility.onScreen&&visibility.clickable,
      selector+' is obstructed by fixed navigation after scroll: '+JSON.stringify(visibility));
  }
  await mobileSpeaking.close();
  console.log('PASS Pixel speaking layout: contrast >= 4.5, compact answer, both actions unobstructed');

 // Screenshot-driven dialogue pedagogy: a greeting needs a named person,
 // a realistic situation, clear role-play task and aligned vocabulary.
 const dialogueQA=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 await dialogueQA.goto('http://127.0.0.1:'+server.address().port);
 await dialogueQA.waitForFunction(()=>window.NEAccess?.ready()&&typeof window.lessonIntro==='function');
 const caseQA=await dialogueQA.evaluate(()=>{
  const generated={id:'gen-new-people',level:'A1',
    title:'Nye mennesker på jobb og i byen',phrase:'Hyggelig å møte deg!',
    ru:'Приятно познакомиться!',grammar:'Hyggelig å ...',
    vocab:[['hei','привет'],['land','страна'],['adresse','адрес']],
    speaking:'Расскажи о знакомстве'};
  const contextual=situatedDialogueTurn(generated);
  lessonSession={lesson:generated,step:0,locked:false};
  renderLesson();
  const root=document.querySelector('.lesson-intro-v6');
  const words=[...root.querySelectorAll('.lesson-words-v6 b')].map(x=>x.innerText);
  return {scene:root.querySelector('.dialogue-scene-v83')?.innerText,
    task:root.querySelector('.dialogue-task-v83')?.innerText,
    lead:root.querySelector('.dialogue-lead-v83')?.innerText,
    speaker:contextual.speaker,goal:contextual.goal,words,
    answerExists:!!root.querySelector('#dialogAnswer'),
    audioButton:root.querySelector('.phrase-actions-v6 button')?.textContent};
 });
 assert(caseQA.scene.includes('Ингрид')&&caseQA.scene.includes('Первый день'),
  'Greeting must have actual interlocutor and scene: '+JSON.stringify(caseQA));
 assert(caseQA.lead.includes('Jeg heter Ingrid')&&caseQA.task.includes('Ответь Ингрид'));
 assert(caseQA.goal.includes('представься')&&caseQA.words.includes('også')&&caseQA.words.includes('å møte'));
 assert(!caseQA.words.includes('adresse'),'Unrelated default vocabulary must not replace relevant greeting expressions');
 assert(caseQA.answerExists&&caseQA.audioButton.includes('Прослушать'));
 const fallbackQA=await dialogueQA.evaluate(()=>{
  const ordinary=COURSE.find(x=>x.id==='a1-2');
  lessonSession={lesson:ordinary,step:0,locked:false};
  renderLesson();
  return {
    scene:document.querySelector('.dialogue-scene-v83')?.innerText,
    task:document.querySelector('.dialogue-task-v83')?.innerText
  };
 });
 assert(fallbackQA.scene.includes('Нора')&&fallbackQA.scene.includes('Дом и семья'));
 assert(fallbackQA.task.includes('Расскажи коротко о своём доме'));
 const curatedQA=await dialogueQA.evaluate(()=>{
  const l=window.NECurated.get('a1-home');
  lessonSession={lesson:{...l,_adaptive:{moduleId:'a1-home',kind:'learn'}},step:0,locked:false};
  renderLesson();
  return document.querySelector('.dialogue-task-v83')?.textContent;
 });
 assert(curatedQA.includes('Spør')||curatedQA.includes('ключ')||curatedQA.includes('попрос'),
  'Curated dialogue must give an actual task');
 await dialogueQA.close();
 console.log('PASS situated dialogue: named Ingrid, explicit answer task, relevant greeting words and existing-lesson fallback');



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
  // A tapped word must play immediately, and the dialog must support replay.
  await page.evaluate(()=>{
    state.level='A1';navigate('lesson','a1-1');
    window.__spokenWords=[];
    window.__speakWordOriginal=window.neSpeakWord;
    window.neSpeakWord=word=>{window.__spokenWords.push(word);return Promise.resolve({source:'device'})};
  });
  await page.locator('.prompt .word-translate-v7').first().click();
  assert.equal(await page.locator('#wordTranslationV7').count(),1);
  const spokenOnce=await page.evaluate(()=>window.__spokenWords.slice());
  assert.equal(spokenOnce.length,1,'Word tap should start audio once');
  await page.locator('#wordTranslationV7 .word-listen-v7').click();
  const spokenTwice=await page.evaluate(()=>window.__spokenWords.slice());
  assert.deepEqual(spokenTwice,[spokenOnce[0],spokenOnce[0]],'Word playback button must replay the same word');
  await page.locator('#wordTranslationV7 button[aria-label="Закрыть перевод"]').click();
  await page.evaluate(()=>{window.neSpeakWord=window.__speakWordOriginal;delete window.__speakWordOriginal});
  console.log('PASS word translation automatically plays tapped word and repeats on demand');
  // The user must be able to say "I don't know" without guessing or being
  // shown a correct answer. The next question should become easier.
  const unknownFlow=await page.evaluate(()=>{
    const oldXp=state.xp;
    state.placement={level:'B1',recommendedStart:'B1',scope:'receptive_screening',productive:{status:'complete',results:[],nextIndex:3}};
    state.completed['a1-1']=true;
    startPlacement();
    const firstLevel=document.querySelector('#placementQuestionLevel')?.dataset.level;
    const visible=!!document.querySelector('#placementUnknown');
    answerPlacement(-1);
    const nextLevel=document.querySelector('#placementQuestionLevel')?.dataset.level;
    for(let i=1;i<20;i++)answerPlacement(-1);
    const wrongOnB1=state.placement.byLevel.B1===0;
    return {visible,firstLevel,nextLevel,wrongOnB1,recorded:state.placement.unknownCount,level:state.placement.recommendedStart,progress:state.completed['a1-1'],xpUnchanged:state.xp===oldXp};
  });
  assert(unknownFlow.visible,'Diagnostic must offer an explicit I-dont-know button');
  assert.equal(unknownFlow.firstLevel,'B1','Repeat assessment must start at the previous assessed level');
  assert.equal(unknownFlow.nextLevel,'A2','Skipping B1 must choose an easier next question');
  assert(unknownFlow.wrongOnB1,'I-dont-know must count as incorrect knowledge evidence, not a guess');
  assert.equal(unknownFlow.recorded,20);
  assert.equal(unknownFlow.level,'A1','No demonstrated knowledge must not certify B1');
  assert(unknownFlow.progress&&unknownFlow.xpUnchanged,'Assessment skip must preserve XP and completed lessons');
  console.log('PASS diagnostic unknown-answer skip, B1-to-A2 adjustment, conservative result, preserved progress');
  // B1 retake must use a new question pool, keep history and preserve lessons.
  const originalRetake=await page.evaluate(()=>{
    state.level='B1';
    state.placement={level:'B1',recommendedStart:'B1',scope:'receptive_screening',date:'2026-10-01T00:00:00Z',productive:{status:'complete',results:[],nextIndex:3}};
    state.completed['a1-1']=true;
    saveState();navigate('home');
    return{completed:state.completed['a1-1'],xp:state.xp};
  });
  assert((await page.locator('#placementEntryCard').innerText()).includes('Проверить уровень заново'));
  await page.locator('#placementEntryCard button').first().click();
  assert((await page.locator('#app main').innerText()).includes('Повторная аттестация уровня'));
  await page.evaluate(()=>startPlacement());
  assert((await page.locator('#app main').innerText()).includes('Задание 1/20'));
  await page.evaluate(()=>{for(let i=0;i<20;i++)answerPlacement(0)});
  const retakeResult=await page.evaluate(()=>({
    questions:state.placement.questionIds,
    last:state.placementHistory?.at(-1),
    b1Count:Object.values(state.placement.byLevelSkill.B1).reduce((n,cell)=>n+cell[1],0),
    attempt:state.placement.attemptNumber,
    completion:state.completed['a1-1'],
    xp:state.xp
  }));
  assert.equal(retakeResult.questions.length,20);
  assert(retakeResult.questions.every(q=>!q.startsWith('base-')),'Retake must not repeat the original 20 questions');
  assert.equal(retakeResult.b1Count,9,'Retake for B1 should emphasize B1');
  assert.equal(retakeResult.attempt,2);
  assert.equal(retakeResult.last.level,'B1');
  assert.equal(retakeResult.completion,originalRetake.completed);
  assert.equal(retakeResult.xp,originalRetake.xp);
  await page.evaluate(()=>{state.placement={level:'B1',recommendedStart:'B1',scope:'receptive_screening',attemptNumber:2};navigate('calibration')});
  assert((await page.locator('#app main').innerText()).includes('изменить рабочий график'),'New B1 writing task should differ');
  console.log('PASS B1 retake: 20 new tasks, level weighting, assessment history, preserved lesson progress');
  const placementResult=await page.evaluate(()=>{state.level='A1';state.learningV8={};state.placement=null;saveState();startPlacement();for(let i=0;i<20;i++){
    const label=document.querySelector('.prompt')?.textContent.trim();
    const question=PLACEMENT_BANK.find(q=>q.q===label);
    if(!question)throw Error('Unknown first-placement prompt '+label);
    const right=question.opts[question.correct];
    const choice=[...document.querySelectorAll('.choice')].findIndex(btn=>btn.textContent===right);
    if(choice<0)throw Error('Correct option not rendered');
    answerPlacement(choice);
  }return{level:state.level,placement:state.placement,b2:state.learningV8?.levelSkills?.B2,text:document.querySelector('#app main')?.innerText||''}});
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
 before=calls;await page.evaluate(()=>{const day=neLocalDate();state.dailyPacks[day]={date:day,level:'A1',practice:[{prompt_ru:'Расскажи',goal_ru:'Ответь',new_words:[],review_words:[]},{prompt_ru:'Далее',goal_ru:'Ответь',new_words:[],review_words:[]}]};startDailyPractice(day);document.getElementById('dailyAnswer').value='Jeg bor her.';checkDailyTask();checkDailyTask()});await page.waitForTimeout(950);assert.equal(calls,before+1);assert((await page.locator('#dailyFb').innerText()).includes('Почему 90/100'),'Nora must explain daily grade before advancing');await page.locator('#dailyFb .lesson-next-v8').click();assert((await page.locator('#app main').innerText()).includes('2/2'),'Daily practice advances only after the learner reads the explanation');
 before=calls;await page.evaluate(()=>{navigate('storyside');document.getElementById('sideAnswer').value='Det er bra.';checkStorySide();checkStorySide()});await page.waitForTimeout(1100);assert.equal(calls,before+1);console.log('PASS exam, homework and side mission send once');
 // Backup restore intentionally calls location.reload(). Wait for a *real*
// main-frame navigation and a ready app, not a fixed 700 ms timeout: the
// latter raced script loading in CI and produced "state is not defined".
 const previous=await page.evaluate(()=>state.xp);
 const restored=await page.evaluate(()=>({...state,xp:321}));
 const restoredPage=page.waitForEvent('framenavigated',{
  predicate:frame=>frame===page.mainFrame(),timeout:15000
 });
 await page.evaluate(value=>{void importProgressFile({text:async()=>JSON.stringify({state:value})});},restored);
 await restoredPage;
 await page.waitForFunction(()=>typeof state!=='undefined'&&window.NEAccess?.ready()===true,null,{timeout:15000});
 assert(await page.evaluate(x=>state.xp===321&&JSON.parse(localStorage.getItem('ne2_state_before_import')).xp===x,previous));
 console.log('PASS restore triggers one reload, preserves the previous backup and resumes only after the app is ready');
 let cloudRequests=0,pushOk=true,pullOk=true;const remote=await page.evaluate(()=>({...state,wordFavorites:{remote:true},chatThreads:{'place:remote':[{role:'user',text:'Hei'}]},chatMemories:{'place:remote':[{role:'user',text:'Memory'}]}}));
 await page.route('**/api/cloud',async r=>{cloudRequests++;const body=r.request().postDataJSON();await new Promise(x=>setTimeout(x,100));await r.fulfill({json:body.name.endsWith('_pull')?{ok:pullOk,state:remote,revision:2}:{ok:pushOk,revision:3,error:pushOk?undefined:'DENIED'}})});
 await page.evaluate(()=>{localStorage.setItem('ne_cloud_link',JSON.stringify({sync_id:'qa-existing',secret:'qa-secret'}));state.wordFavorites={local:true};navigate('cloud')});const result=await page.evaluate(async()=>{const a=cloudSync();const b=cloudSync();navigate('course');return Promise.all([a,b])});assert.deepEqual(result,[true,false]);assert.equal(cloudRequests,2);assert(await page.evaluate(()=>state.wordFavorites.remote&&state.wordFavorites.local&&state.chatThreads['place:remote'].length&&state.chatMemories['place:remote'].length));const cloudCourseSnapshot=await page.evaluate(()=>({screen:document.querySelector('.shell-v7')?.getAttribute('data-screen'),body:document.querySelector('#app main')?.innerText.slice(0,350),map:!!document.querySelector('.course-map-v7'),level:state.level,modules:window.NECurriculum?.modules(state.level)?.length,placement:state.placement?.level,errors:window.neQaRouteErrors||[]}));assert(cloudCourseSnapshot.map,'Course navigation after cloud sync: '+JSON.stringify(cloudCourseSnapshot));remote.wordFavorites.unconfirmedFromCloud=true;pushOk=false;
  assert.equal(await page.evaluate(()=>cloudSync(false)),false);
  assert.equal(await page.evaluate(()=>Boolean(state.wordFavorites.unconfirmedFromCloud)),false,'Rejected cloud push must leave local progress unchanged');
  assert.equal(await page.evaluate(()=>Boolean(JSON.parse(localStorage.getItem('ne2_state')).wordFavorites.unconfirmedFromCloud)),false,'Rejected cloud push must not contaminate saved progress');
  pullOk=false;await page.evaluate(()=>{navigate('cloud');const e=document.createElement('textarea');e.id='cloudCode';e.value='bad.bad';document.body.appendChild(e)});await page.evaluate(()=>connectCloud());assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('ne_cloud_link')).sync_id==='qa-existing'));await page.evaluate(()=>localStorage.removeItem('ne_cloud_link'));console.log('PASS cloud preservation, serialized requests and rejected connection');
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
 assert((await page.locator('#app main').textContent()).includes('часть 1/3'),'first listening recording must be visible');
 await page.evaluate(()=>{
   const c=lessonSession.lesson.listeningSets[0].correct;
   lessonChoice(document.querySelectorAll('.choice')[c],c,c,'Первый этап','listening');
 });
 assert((await page.locator('#fb').innerText()).includes('Следующая запись'));
 await page.locator('#fb .lesson-next-v8').click();
 assert.equal(await page.evaluate(()=>lessonSession.listeningIndex),1,'second listening part should start');
 assert.equal(await page.evaluate(()=>state.activeLesson?.listeningIndex),1,'multi-part checkpoint must persist');
 assert((await page.locator('#app main').textContent()).includes('часть 2/3'));
 await page.evaluate(()=>{
   const c=lessonSession.lesson.listeningSets[1].correct;
   lessonChoice(document.querySelectorAll('.choice')[c],c,c,'Второй этап','listening');
 });
 await page.locator('#fb .lesson-next-v8').click();
 assert.equal(await page.evaluate(()=>lessonSession.listeningIndex),2,'Third listening situation must open');
 assert.equal(await page.evaluate(()=>state.activeLesson?.listeningIndex),2,'Third situation checkpoint must survive reload');
 assert((await page.locator('#app main').textContent()).includes('часть 3/3'),'Third independent B2 recording must appear');

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
