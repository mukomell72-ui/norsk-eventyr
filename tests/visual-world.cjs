// Animated living-world integration: safe presentation and natural speaking.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const source=read('visual-world.js'),style=read('visual-world.css'),guided=read('guided-speaking.js');
const s={learningV8:{}};
let own={textContent:''},reaction={hidden:true,textContent:''},picture={src:''},voiceStatus={textContent:''},rescue={hidden:true,textContent:''};
const elements={neWorldOwnWords:own,neWorldReaction:reaction,neWorldSelfImage:picture,neWorldVoiceStatus:voiceStatus,neWorldPracticeFeedback:rescue};
let saved=0,spoke='',calls=0,checkpoint=0,chatCalls=0;
const lesson={id:'l1',level:'A2',vocab:[['billett','билет'],['hjelp','помощь'],['billett','билет']],_adaptive:{moduleId:'a2-work'}};
const scene={scene:'В офисе <неожиданность>',actor:'Mari · руководитель',opening:'Hei! Når kan du komme?',steps:[
 {task:'Скажи, когда <можешь> прийти.',reply:'Det passer fint.'},
 {task:'Уточни время встречи.',reply:'Vi sees i morgen.'}]};
const progress={index:0,turns:[]};
const fakeDocument={
 getElementById:id=>elements[id]||null,
 querySelector:()=>({classList:{remove(){},add(){}},offsetWidth:100}),
 querySelectorAll:()=>[]
};
const window={
 neLearnerState:s,neLessonSession:{lesson,guidedSpeech:progress},NEGuidedSpeaking:{definition:()=>scene},
 saveState:()=>{saved++;return true},persistLessonCheckpoint:()=>{checkpoint++},
 speakText:text=>{spoke=text;calls++;return {text,rate:.86,addEventListener(){}}}
};
vm.runInNewContext(source,{window,document:fakeDocument},{filename:'visual-world.js'});
const V=window.NEVisualWorld;
assert(V,'Living-world module failed to load');
const markup=V.render({lesson,scene,progress,step:scene.steps[0],moduleId:'a2-work'});
assert(markup.includes('ne-world-office')&&markup.includes('Нора'), 'Interactive work scenario missing');
assert(markup.includes('assets/characters/mari.webp'),'Attractive adult character portrait not selected');
assert(V.theme({id:'a1-mobility'}, {scene:'På bussholdeplassen'})==='street','Bus scenes need outdoor Norwegian setting');
assert(markup.includes('aria-label="Практика жизненной ситуации"'),'Scene lacks accessibility label');
assert(markup.includes('&lt;неожиданность&gt;')&&!markup.includes('<неожиданность>'),'User-facing scene must escape content');
assert(markup.includes('&lt;можешь&gt;'),'Spoken lesson goal must escape content');
assert(markup.includes('NEVisualWorld.speakPartner()')&&markup.includes('NEVisualWorld.speakTask()'),'Speaking cues missing');
assert(markup.includes('NEVisualWorld.inspectWord(this)'),'Norwegian word taps must open Nora help');
assert(V.tapWords('Hei, bor du i Norge?').includes('data-ne-word="bor"'));
assert(!V.tapWords('<script>malicious</script>').includes('<script>'),'Never render untrusted HTML');
assert(markup.includes('NEVisualWorld.sendFree()')&&markup.includes('Свободный разговор'),'Optional free practice must be in scene');
assert(markup.includes('NEVisualWorld.askHelp()')&&markup.includes('neWorldHelpInput'),'Nora contextual help must be visible inside assessed scene');
assert(markup.includes("NEVisualWorld.dictateHelp('ru')")&&markup.includes("NEVisualWorld.dictateHelp('nb')"),'Both speech recognition languages must be offered');
assert(markup.includes('Исходная реплика')&&markup.includes('не оцениваются'),'Help must explain continuity and ungraded status');
assert(markup.includes('NEVisualWorld.dictateFree()'),'Speech recognition must be offered for free roleplay');
assert(markup.includes('NEVisualWorld.speakLastFree()')&&markup.includes('neWorldFreeReplay'),'Learner needs replay of improvised NPC replies');
assert(markup.includes('neWorldFreeReplay"')&&markup.includes(' disabled'),'Replay stays disabled before the first NPC answer');
assert(markup.includes('data-ne-reaction="curious"'),'NPC should visually acknowledge a scene-opening question');
assert(V.chooseAvatar('ingrid')===true&&s.learningV8.visualWorld.avatar==='ingrid'&&saved===1,'Avatar preference not retained');
assert.equal(picture.src,'/assets/characters/ingrid.webp');
assert.equal(V.chooseAvatar('../evil.svg'),false,'Untrusted avatar path allowed');
V.updateOwn('Jeg kommer klokka ni.');
assert.equal(own.textContent,'Jeg kommer klokka ni.','Learner response not visible');
V.accepted('Jeg kommer klokka ni.','Vi sees!');
assert.equal(reaction.hidden,false);
assert(reaction.textContent.includes('Vi sees!'),'Partner response not displayed');
V.speakPartner();assert.equal(spoke,scene.opening,'Partner playback incorrect');
progress.turns=[{answer:'Jeg kommer klokka ni.',reply:'Det passer fint.',spoken:true}];progress.index=1;
V.speakPartner();assert.equal(spoke,'Det passer fint.','Next scene should speak actual previous reply');
const hidden=V.render({lesson:{...lesson,_adaptive:{moduleId:'a1-foundation'}},
 scene:{...scene,actor:'Erik · сотрудник'},progress:{index:0,turns:[]},step:scene.steps[0],moduleId:'a1-foundation'});
assert(!hidden.includes('Erik · сотрудник'),'A1 character name must not be leaked before disclosure');
assert(hidden.includes('Сотрудник'),'A1 undisclosed character role missing');
const current=V.render({lesson,scene,progress,step:scene.steps[1],moduleId:'a2-work'});
assert(current.includes('data-ne-word="passer"')&&current.includes('data-ne-word="fint"'),'Historical dialogue should remain tappable');
assert(style.includes('prefers-reduced-motion:reduce'),'Motion accessibility preference unsupported');
for(const location of ['street','cafe','office','clinic','town']){
 assert(style.includes("url('/assets/scenes/"+location+".svg')"),'Missing decorative scenery '+location);
 const svg=read('assets/scenes/'+location+'.svg');
 assert(svg.startsWith('<svg')&&svg.includes('viewBox')&&!svg.includes('<script'),'Unsafe or missing scene SVG '+location);
 assert(read('sw.js').includes('/assets/scenes/'+location+'.svg'),'Offline background missing '+location);
}
const beforePractice=JSON.stringify(progress),beforeCredit=saved;
assert.equal(V.practice('repeat'),true);
assert(rescue.textContent.includes('Kan du gjenta det')&&rescue.textContent.includes('Det passer fint.'));
assert.equal(V.practice('slow'),true);
assert(rescue.textContent.includes('Kan du snakke litt saktere'));
assert.equal(V.practice('think'),true);
assert(rescue.textContent.includes('Kan jeg få litt tid'));
assert.equal(V.practice('not-allowed'),false);
assert.equal(JSON.stringify(progress),beforePractice,'Recovery phrases must not create progress');
assert.equal(saved,beforeCredit,'Recovery phrases may not award XP or fake evidence');
assert(guided.includes('ne-world-history'),'Conversation history should be collapsible to avoid duplicate visual bubbles');
assert(style.includes('.ne-world-character')&&style.includes('ne-world-talk'),'No actual character animation');
assert(style.includes('ne-world-attend')&&style.includes('prefers-reduced-motion:reduce'),'Character response animation must honor reduced motion');
const talking={active:false,reaction:'',setAttribute(k,v){if(k==='data-ne-reaction')this.reaction=v},removeAttribute(){},classList:{add(name){if(name==='ne-world-talking')talking.active=true},remove(name){if(name==='ne-world-talking')talking.active=false}},offsetWidth:100};
const originalSelector=fakeDocument.querySelector,originalAll=fakeDocument.querySelectorAll;
fakeDocument.querySelector=selector=>selector.includes('data-ne-role="partner"')?talking:originalSelector(selector);
fakeDocument.querySelectorAll=()=>[talking];
const speechEvents={};
const utterance={addEventListener(name,callback){speechEvents[name]=callback}};
assert.equal(V.bindSpeech(utterance,'partner'),true,'Voice must attach speech events');
assert.equal(talking.active,false,'Queued speech must not animate before its start event');
speechEvents.start();
assert.equal(talking.active,true,'Speaking character moves during audio');
speechEvents.pause();assert.equal(talking.active,false,'Speech pause must stop movement');
speechEvents.resume();assert.equal(talking.active,true,'Speech resumes movement');
speechEvents.end();assert.equal(talking.active,false,'Character stops after speech ends');
assert(style.includes('ne-world-talking .ne-world-portrait-wrap')&&style.includes('infinite'),'Speech animation should follow utterance');
assert.equal(V.visemeAt('mamma',0),'closed');
V.accepted('Takk for hjelpen.','Vi sees på fredag.');assert.equal(talking.reaction,'neutral');
V.accepted('Kan du hjelpe meg?','Selvfølgelig, det kan jeg.');assert.equal(talking.reaction,'warm');
V.accepted('Når går bussen?','Hvilken buss mener du?');assert.equal(talking.reaction,'curious');
assert.equal(V.visemeAt('åpne',0),'round');
assert.equal(V.visemeAt('hei',1),'wide');
assert.equal(V.visemeAt('fint',0),'teeth');
assert.equal(V.visemeAt('skjorte',0),'mid','Bokmål skj is a sound cluster');
assert.equal(V.visemeAt('kjøpe',0),'mid','Bokmål kj is a sound cluster');
assert.equal(V.visemeAt('eiendommen',0),'wide');
assert.equal(V.visemeAt('øy',0),'round');
assert.equal(V.visemeAt('hei!',99),'closed','Sentence-final punctuation should close lips');
assert(markup.includes('ne-world-mouth')&&markup.includes('data-ne-face="mari"'),'Partner mouth must align with face');
assert(markup.includes('NEVisualWorld.toggleLipSync()'),'Learner must be able to turn off lip motion');
assert(V.guide({activity:'Les teksten.'}).includes('ne-world-guide-face'),'Nora must have a mouth overlay in the tutor card');
assert(V.guide({activity:'Les teksten.'}).includes('NEVisualWorld.toggleGuideStage(this)'),'Nora expanded tutor view must be available during lessons');
assert(style.includes('.ne-world-guide-expanded'),'Nora expanded view must have responsive styles');
assert(style.includes('@keyframes ne-tutor-presence')&&style.includes('prefers-reduced-motion:reduce'),'Visible tutor motion must respect accessibility');
const events2={};
const utterance2={text:'Kan du komme?',rate:.86,addEventListener(type,fn){events2[type]=fn}};
assert.equal(V.bindSpeech(utterance2,'partner'),true);
assert.equal(talking.active,false,'Next utterance must remain still until audio begins');
events2.start();events2.boundary({charIndex:1});events2.error();
assert.equal(talking.active,false,'Viseme movement must stop on speech error');
const voice3Events={};
const voice3={text:'Jeg snakker nå.',rate:.9,addEventListener(k,v){voice3Events[k]=v}};
assert.equal(V.bindSpeech(voice3,'partner'),true);
voice3Events.start();
assert.equal(talking.active,true,'Voice must animate after start');
const priorSaves=saved;
assert.equal(V.toggleLipSync(),true,'Should be able to disable lip animation');
assert.equal(s.learningV8.visualWorld.lipSync,false);
assert.equal(saved,priorSaves+1,'Lip-sync setting must be saved');
assert.equal(talking.active,false,'Turning off animation must stop current visual activity');
voice3Events.end();
assert.equal(talking.active,false,'Late events after disabling lips must not restart movement');
assert.equal(V.bindSpeech(voice3,'partner'),false,'Disabled animation must stay disabled');
assert.equal(V.toggleLipSync(),true);
assert.equal(V.lipPreference(),true);
window.matchMedia=()=>({matches:true});
assert.equal(V.bindSpeech(voice3,'partner'),false,'Reduced motion must suppress animation');
delete window.matchMedia;
fakeDocument.querySelector=originalSelector;fakeDocument.querySelectorAll=originalAll;
for(const p of ['ingrid.webp','mari.webp','erik.webp']){
 assert(read('sw.js').includes('/assets/characters/'+p),'Photo portraits must be precached for offline lessons');
}
const male=V.render({lesson,scene:{...scene,actor:'Lars · sjåfør'},progress:{index:0,turns:[]},step:scene.steps[0],moduleId:'a1-mobility'});
const female=V.render({lesson,scene:{...scene,actor:'Kari · butikkansatt'},progress:{index:0,turns:[]},step:scene.steps[0],moduleId:'a1-shopping'});
assert(male.includes('assets/characters/erik.webp'),'Lars must have male character illustration');
assert(female.includes('assets/characters/ingrid.webp'),'Kari must have female character illustration');
for(const f of ['ingrid.svg','mari.svg','erik.svg']){
 const img=read('assets/characters/'+f);
 assert(img.includes('<svg')&&img.includes('viewBox='),'Illustration asset incomplete: '+f);
 assert(!img.includes('<script'),'SVG contains executable script: '+f);
}
assert(read('app.js').includes('speechSynthesis.speak(u);return u}'),'Speech must expose utterance events');
assert(guided.includes('window.NEVisualWorld?.render?.')&&guided.includes('window.NEVisualWorld?.updateOwn?.')&&guided.includes('window.NEVisualWorld?.accepted?.'),'Native dialogue not connected');
const access=read('access.js'),sw=read('sw.js'),html=read('index.html');
assert(read('nora-experience.js').includes('NEVisualWorld?.guide?.(b)'),'Nora visual guide must appear throughout the lesson');
assert(access.includes("'visual-world.js','guided-speaking.js'"),'Visual world should load before guided speech');
assert(sw.includes('/visual-world.js?v=8.3.0-world21')&&sw.includes('/visual-world.css?v=8.3.0-world11'),'Offline assets missing');
assert(html.includes('/visual-world.css?v=8.3.0-world11'),'Fresh styles not loaded');
assert(source.includes('typeof window.saveState')&&source.includes('aria-pressed'),'Avatar state not personal');
console.log('PASS animated conversations: adult illustrations, escaped scene, learner answers, voice response, continuity, saved avatar, reduced motion and PWA');

(async()=>{
 const input={value:'Unnskyld, kan du hjelpe meg?',isConnected:true,dataset:{}};
 const button={disabled:false,isConnected:true},replayButton={disabled:true,isConnected:true};
 const freeStatus={textContent:''};
 const record=[];
 const log={};
 const previousGet=fakeDocument.getElementById;
 fakeDocument.getElementById=id=>({neWorldFreeInput:input,neWorldFreeSend:button,neWorldFreeStatus:freeStatus,neWorldFreeLog:log,neWorldFreeReplay:replayButton}[id]||previousGet(id));
 fakeDocument.createElement=tag=>({tag,append(){}});
 log.append=el=>record.push(el);
 window.neApiPost=async(path,payload)=>{
  chatCalls++;
  assert.equal(path,'/api/chat');
  assert.equal(payload.mode,'scene_practice');
  assert.equal(payload.inputSource,'typed_text');
  assert.deepEqual(Array.from(payload.practiceWords),['billett','hjelp'],'Only distinct active-lesson vocabulary should be recycled');
  assert(payload.scenario.includes('Свободная необязательная практика'));
  assert.equal(payload.message,'Unnskyld, kan du hjelpe meg?');
  return {ok:true,data:{reply_no:'Ja, selvfølgelig! Hva trenger du hjelp med?'}};
 };
 const beforeScores=saved,beforeStep=progress.index,beforeTurns=progress.turns.length;
 assert.equal(await V.sendFree(),true);
 assert.equal(progress.freeChat.filter(x=>x.role==='user').length,1);
 assert.equal(progress.freeChat.at(-1).text,'Ja, selvfølgelig! Hva trenger du hjelp med?');
 assert.equal(input.value,'');
 assert.equal(checkpoint,1);
 assert.equal(saved,beforeScores,'Free dialogue cannot mutate grades');
 assert.equal(progress.index,beforeStep);
 assert.equal(progress.turns.length,beforeTurns);
 assert.equal(record.length,2,'Both learner and NPC turns should display');
 assert.equal(replayButton.disabled,false,'Free NPC answer unlocks replay');
 const beforeReplayScores=saved;
 assert.equal(V.speakLastFree(),true,'NPC replay should use stored authentic answer');
 assert.equal(spoke,'Ja, selvfølgelig! Hva trenger du hjelp med?');
 assert.equal(saved,beforeReplayScores,'Replay must not create new learning evidence');
 // Turning off visual mouth motion must never silence the actor or misreport replay failure.
 assert.equal(V.toggleLipSync(),true);
 assert.equal(V.speakLastFree(),true,'Audio replay must work with lip animation disabled');
 assert.equal(spoke,'Ja, selvfølgelig! Hva trenger du hjelp med?');
 assert.equal(V.toggleLipSync(),true);
 window.matchMedia=()=>({matches:true});
 assert.equal(V.speakLastFree(),true,'Reduced-motion preference must not disable voice replay');
 delete window.matchMedia;
 assert.equal(chatCalls,1);
 assert.equal(button.disabled,false);
 // Concurrency: parallel submissions must only send one request.
 let release;
 window.neApiPost=async()=>new Promise(resolve=>{release=resolve});
 input.value='Hva gjør du?';
 const request=V.sendFree();
 assert.equal(button.disabled,true);
 assert.equal(await V.sendFree(),false,'Only one concurrent message is allowed');
 release({ok:true,data:{reply_no:'Jeg jobber her.'}});
 assert.equal(await request,true);
 assert.deepEqual(Array.from(progress.freeChat,x=>x.role),['user','assistant','user','assistant'],'Free conversation must preserve complete turn pairs');
 assert.equal(progress.freeChat[0].text,'Unnskyld, kan du hjelpe meg?','First message must not silently disappear');
 // Responses for other lessons/screens must not write into the new checkpoint.
 input.value='Kan du anbefale noe?';
 let resolveOld;
 window.neApiPost=async()=>new Promise(resolve=>{resolveOld=resolve});
 const previousSession=window.neLessonSession;
 const freeLengthBeforeStale=previousSession.guidedSpeech.freeChat.length;
 const stale=V.sendFree();window.neLessonSession={lesson:{id:'new'},guidedSpeech:{index:0}};
 resolveOld({ok:true,data:{reply_no:'Hallo der!'}});
 assert.equal(await stale,false);
 assert.equal(previousSession.guidedSpeech.freeChat.length,freeLengthBeforeStale,'Stale network reply must not modify dialogue');
 window.neLessonSession=previousSession;
 // Offline failure must preserve text and original assessment.
 input.value='Hva betyr det?';
 window.neApiPost=async()=>({ok:false,error:'NETWORK'});
 const checkpointBefore=checkpoint;
 assert.equal(await V.sendFree(),false);
 assert.equal(input.value,'Hva betyr det?');
 assert.equal(checkpoint,checkpointBefore);
 // Typed input altered while an AI response is pending must not be lost.
 input.value='Hva koster billetten?';
 let finishTyping;
 window.neApiPost=async()=>new Promise(resolve=>{finishTyping=resolve});
 const beforeEdited=checkpoint,changedRequest=V.sendFree();
 input.value='Kan jeg betale med kort?';
 finishTyping({ok:true,data:{reply_no:'Ja, det kan du.'}});
 assert.equal(await changedRequest,false);
 assert.equal(input.value,'Kan jeg betale med kort?');
 assert.equal(checkpoint,beforeEdited);
 // Local microphone populates a draft, never counts as a scored answer.
 let recognition;
 window.SpeechRecognition=class{
  start(){recognition=this;}
  stop(){this.onend?.();}
 };
 const startMic=V.dictateFree();
 assert.equal(startMic,true);
 assert.equal(recognition.lang,'nb-NO');
 input.value='';
 recognition.onresult({results:[[{transcript:'Unnskyld, hvor er holdeplassen?'}]]});
 assert.equal(input.value,'Unnskyld, hvor er holdeplassen?');
 assert.equal(input.dataset.neFromSpeech,'true','Recognized speech must be disclosed as a transcript');
 const beforeStaleMicError=freeStatus.textContent;
 window.neLessonSession={lesson:{id:'different'},guidedSpeech:{index:0}};
 recognition.onerror();
 assert.equal(freeStatus.textContent,beforeStaleMicError,'Old microphone error must not change the next lesson');
 window.neLessonSession=previousSession;
 recognition.onend();
 delete window.SpeechRecognition;
 window.neApiPost=async(_path,payload)=>{
  assert.equal(payload.inputSource,'voice_transcript','Dictation must not be disguised as typed text');
  return {ok:true,data:{reply_no:'Ja, den ligger rett ved biblioteket.'}};
 };
 assert.equal(await V.sendFree(),true);
 assert.equal(input.dataset.neFromSpeech,'false','Transcript marker must reset after sending');
 assert.equal(progress.freeChat.at(-1).text,'Ja, den ligger rett ved biblioteket.');
 // A2 allows 10 turns, and that count survives truncated history.
 progress.freeTurnsUsed=10;
 progress.freeChat=Array.from({length:12},(_,i)=>({role:i%2===0?'user':'assistant',text:'ok'}));
 assert.equal(await V.sendFree(),false);
 assert(freeStatus.textContent.includes('10'),'A2 turn limit must be visible even when the draft is empty');
 progress.freeChat=[];progress.freeTurnsUsed=0;
 // Contextual Nora help: an ungraded bilingual teacher response mid-turn.
 const helpInput={value:'Jeg ... не помню, как сказать «живу» ... i Norge?',isConnected:true,dataset:{}};
 const helpSend={disabled:false,isConnected:true};
 const helpFeedback={textContent:''};
 const helpLog=[],helpRoot={append:el=>helpLog.push(el)};
 const originalHelpGet=fakeDocument.getElementById;
 const mainDraft={value:'Jeg ... i Norge',isConnected:true};
 fakeDocument.getElementById=id=>({
  neWorldHelpInput:helpInput,neWorldHelpSend:helpSend,neWorldHelpStatus:helpFeedback,
  neWorldHelpLog:helpRoot,freeAnswer:mainDraft
 }[id]||originalHelpGet(id));
 window.neApiPost=async(path,payload)=>{
  assert.equal(path,'/api/chat');
  assert.equal(payload.mode,'explain','Help must never go through scored dialogue evaluation');
  assert.equal(payload.scenario,'guided_help');
  assert.equal(payload.inputSource,'typed_text');
  assert(payload.context.includes('Det passer fint.'),'Help must use current partner turn, not the opening line');
  assert(payload.context.includes('Jeg ... i Norge'),'Existing draft should be context only');
  assert.equal(payload.message,'Jeg ... не помню, как сказать «живу» ... i Norge?');
  return {ok:true,data:{explanation_ru:'Жить — å bo. Сейчас: jeg bor. Попробуй сам.'}};
 };
 const helpSaved=saved,helpIndex=progress.index,helpTurns=progress.turns.length,helpCheckpoint=checkpoint;
 assert.equal(await V.askHelp(),true,'Mixed Russian-Bokmål question should get contextual help');
 assert.equal(helpSend.disabled,false);
 assert.equal(progress.helpChat.length,2,'Help history should be persisted separately');
 assert.equal(progress.aidedTurns[String(helpIndex)],true,'Nora hint must mark the current turn as aided');
 assert.equal(progress.helpChat[1].text,'Жить — å bo. Сейчас: jeg bor. Попробуй сам.');
 assert.equal(helpLog.length,2,'Nora and learner help messages must appear');
 assert.equal(checkpoint,helpCheckpoint+1,'Help context must survive lesson checkpoint');
 assert.equal(saved,helpSaved,'Help must not create grades or XP');
 assert.equal(progress.index,helpIndex,'Help must not skip assessed dialogue turn');
 assert.equal(progress.turns.length,helpTurns,'Help must not fabricate a verified answer');
 assert.equal(mainDraft.value,'Jeg ... i Norge','Help must not erase the answer draft');
 assert.equal(helpInput.value,'','Sent help question should clear only its own input');
 assert(V.render({lesson,scene,progress,step:scene.steps[helpIndex],moduleId:'a2-work'}).includes('Жить — å bo'),
  'Saved help should survive a scene re-render');
 progress.helpChat.push({role:'assistant',text:'<img src=x onerror=alert(1)>'});
 const safelyRendered=V.render({lesson,scene,progress,step:scene.steps[helpIndex],moduleId:'a2-work'});
 assert(!safelyRendered.includes('<img src=x onerror'),'AI help text must be escaped');
 assert(safelyRendered.includes('&lt;img src=x'),'Sanitized text should remain readable');
 progress.helpChat=progress.helpChat.slice(0,2);
 // Duplicate clicks and stale async answers must not modify the new active scene.
 let completeHelp;
 helpInput.value='Hva betyr dette?';
 window.neApiPost=async()=>new Promise(done=>{completeHelp=done});
 const pendingHelp=V.askHelp();
 assert.equal(helpSend.disabled,true);
 assert.equal(await V.askHelp(),false,'A single help question may only be sent once');
 completeHelp({ok:true,data:{explanation_ru:'Det betyr noe.'}});
 assert.equal(await pendingHelp,true);
 helpInput.value='Hva betyr et ord?';
 let oldHelp;
 window.neApiPost=async()=>new Promise(done=>{oldHelp=done});
 const oldProgress=window.neLessonSession;
 const historyBefore=progress.helpChat.length,staleHelp=V.askHelp();
 window.neLessonSession={lesson:{id:'other'},guidedSpeech:{index:0}};
 oldHelp({ok:true,data:{explanation_ru:'Should be ignored'}});
 assert.equal(await staleHelp,false);
 assert.equal(progress.helpChat.length,historyBefore,'Stale help must not mutate old scene');
 window.neLessonSession=oldProgress;
 helpInput.value='Как сказать «живу»?';
 let changedHelp;
 window.neApiPost=async()=>new Promise(done=>{changedHelp=done});
 const beforeHelpEdit=progress.helpChat.length,editingHelp=V.askHelp();
 helpInput.value='Как будет «жил»?';
 changedHelp({ok:true,data:{explanation_ru:'å bo'}});
 assert.equal(await editingHelp,false,'Edited help question should never be silently replaced');
 assert.equal(helpInput.value,'Как будет «жил»?');
 assert.equal(progress.helpChat.length,beforeHelpEdit);
 window.neApiPost=async()=>({ok:false,error:'NETWORK'});
 assert.equal(await V.askHelp(),false);
 assert.equal(helpInput.value,'Как будет «жил»?','Offline failure must preserve help draft');
 assert.equal(progress.helpChat.length,beforeHelpEdit);
 // Speech recognition is explicitly single-language; users can still type mixed sentences.
 let helpMic;
 window.SpeechRecognition=class{
  start(){helpMic=this}
  abort(){this.onend?.()}
 };
 helpInput.value='';
 assert.equal(V.dictateHelp('ru'),true);
 assert.equal(helpMic.lang,'ru-RU');
 helpMic.onresult({results:[[{transcript:'Как сказать живу?'}]]});
 assert.equal(helpInput.value,'Как сказать живу?');
 assert.equal(helpInput.dataset.neFromSpeech,'true');
 assert.equal(V.dictateHelp('nb'),true);
 assert.equal(helpMic.lang,'nb-NO');
 helpMic.onresult({results:[[{transcript:'Hvordan sier jeg det?'}]]});
 assert.equal(helpInput.value,'Как сказать живу? Hvordan sier jeg det?');
 assert.equal(V.dictateHelp('en'),false,'Unsupported recognition locale rejected');
 delete window.SpeechRecognition;
 assert.equal(mainDraft.value,'Jeg ... i Norge','Microphone for Nora must not overwrite assessed answer');
 // A mixed-language request typed directly as an assessed dialogue answer
 // must open Nora help instead of reaching the grading path.
 const originalHelpCount=progress.helpChat.length,originalTurn=progress.index;
 mainDraft.value='Jeg ... забыл, как будет живу ... i Norge';
 window.neApiPost=async(path,payload)=>{
  assert.equal(path,'/api/chat');
  assert.equal(payload.mode,'explain','Mixed-language question must bypass scoring');
  assert.equal(payload.message,mainDraft.value);
  return {ok:true,data:{explanation_ru:'Å bo — жить; jeg bor — я живу.'}};
 };
 assert.equal(V.helpFromGuidedAnswer('Jeg ... забыл, как будет живу ... i Norge',mainDraft),true);
 await new Promise(resolve=>setImmediate(resolve)); // allow the async AI-help handler to settle
 assert.equal(progress.helpChat.length,originalHelpCount+2,'Spontaneous request should be saved in tutor history');
 assert.equal(mainDraft.value,'Jeg ... забыл, как будет живу ... i Norge','Original answer draft must not disappear');
 assert.equal(progress.index,originalTurn,'Request for help cannot advance the exercise');
 assert.equal(V.helpFromGuidedAnswer('Jeg bor i Norge',mainDraft),false,'A real Bokmål answer must reach grading');
 assert(guided.includes('helpFromGuidedAnswer?.(a,input)'),'Assessed dialogue must route contextual help first');
 fakeDocument.getElementById=originalHelpGet;
 console.log('PASS Nora bilingual contextual help: Russian/Norwegian, persisted questions, no grade, retained draft, stale guard, mic modes');
 console.log('PASS free conversation: actual AI dialogue, replay-safe history, no XP, checkpoint, concurrency, stale navigation and offline handling');
})().catch(err=>{console.error(err);process.exitCode=1});

(async()=>{
 const {chromium}=require('playwright');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const testProgress={index:0,turns:[]};
  const visual=V.render({lesson,scene,progress:testProgress,step:scene.steps[0],moduleId:'a2-work'});
  const embedded=visual.replace(/src="(\/assets\/[^"]+)"/g,(_,src)=>{
   const full=path.join(root,src.slice(1)),buffer=fs.readFileSync(full);
   const mime=src.endsWith('.svg')?'image/svg+xml':'image/webp';
   return 'src="data:'+mime+';base64,'+buffer.toString('base64')+'"';
  });
  await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<style>body{margin:0;padding:10px;background:#e7edf2;font-family:system-ui,Arial,sans-serif}main{max-width:720px;margin:auto}</style>'+
   '<style>'+style+'</style></head><body><main>'+embedded+'</main></body></html>');
  const found=await page.locator('.ne-world-character').count();
  assert.equal(found,3,'All three characters must render in Chromium');
  const missing=await page.locator('.ne-world-character img').evaluateAll(nodes=>nodes.filter(x=>!x.complete||x.naturalWidth===0).length);
  assert.equal(missing,0,'Characters images must render as real images on Android-size viewport');
  const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(horizontal,false,'Visual stage overflows mobile viewport');
  fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
  await page.screenshot({path:path.join(__dirname,'artifacts','nora-living-world-mobile.png'),fullPage:true});
  const landmarks=await page.locator('.ne-world-partner .ne-world-portrait-wrap').evaluate(el=>({
   face:el.getAttribute('data-ne-face'),
   x:getComputedStyle(el).getPropertyValue('--ne-mouth-x').trim(),
   y:getComputedStyle(el).getPropertyValue('--ne-mouth-y').trim()
  }));
  assert.equal(landmarks.face,'mari');
  assert.equal(landmarks.x,'28%','Individual mouth landmark must override general defaults');
  assert.equal(landmarks.y,'43%','Mouth landmark must align to lower face');
  await page.locator('.ne-world-partner').evaluate(el=>{
   el.classList.add('ne-world-talking');
   el.setAttribute('data-ne-viseme','wide');
  });
  await page.waitForTimeout(130);
  const visible=await page.locator('.ne-world-partner .ne-world-mouth').evaluate(el=>{
   const shape=el.closest('.ne-world-portrait-wrap').getBoundingClientRect();
   const mouth=el.getBoundingClientRect();
   return getComputedStyle(el).opacity!=='0'&&mouth.width>5&&mouth.width<shape.width/2&&
     mouth.left>=shape.left&&mouth.right<=shape.right&&mouth.top>=shape.top&&mouth.bottom<=shape.bottom;
  });
  assert.equal(visible,true,'Mouth should stay aligned inside speaking face');
  await page.screenshot({path:path.join(__dirname,'artifacts','nora-lipsync-speaking-mobile.png'),fullPage:true});
  await page.locator('.ne-world-partner').evaluate(el=>{el.classList.remove('ne-world-talking');el.removeAttribute('data-ne-viseme')});
  await page.waitForTimeout(130);
  const still=await page.locator('.ne-world-partner .ne-world-mouth').evaluate(el=>getComputedStyle(el).opacity);
  assert.equal(still,'0','Mouth must hide when character is silent');
  await page.close();
  console.log('PASS illustrated mobile Chromium: 3 portraits loaded, colorful scene, no horizontal overflow, screenshot stored');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
