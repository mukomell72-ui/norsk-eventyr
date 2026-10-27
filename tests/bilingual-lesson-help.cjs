// Nora's shared bilingual lesson help must preserve the task, ungraded evidence
// and the learner's draft across navigation and real-world API outages.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const ui=read('ui-v7.js'),app=read('app.js'),chat=read('api/chat.js');
const start=ui.indexOf('  let neHelpSpeech=null;');
const end=ui.indexOf('  Object.assign(window,{v7OpenHelp,v7AskHelp,v7QuickHelp,v7DictateHelp});',start);
assert(start>=0&&end>start,'Nora lesson helper must be available globally');
const source=ui.slice(start,end)+'\nthis.helpers={helpMarkupV7,v7AskHelp,v7DictateHelp,v7OpenHelp,v7HelpHistory};';
let saved=0,grade=0,request;
const session={lesson:{id:'a1-new',level:'A1'},step:4,locked:false,guidedSpeech:null};
const w={neLessonSession:session,neScreenRevision:5,persistLessonCheckpoint:()=>saved++};
const field={value:'Jeg ... i Norge',isConnected:true};
const input={value:'Jeg... забыл, как будет «живу»?',isConnected:true,dataset:{fromSpeech:'false'},focus(){}};
const button={disabled:false,isConnected:true};
const box={textContent:'',isConnected:true,_helpHistory:null};
const panel={hidden:false},toggle={setAttribute(){}};
const elements={helpQuestionV7:input,helpSendV7:button,helpReplyV7:box,helpPanelV7:panel,helpToggleV7:toggle};
const main={
  querySelector:()=>null,
  cloneNode:()=>({textContent:'Задание: Напиши по-норвежски, где ты живёшь.',querySelector:()=>null}),
  querySelectorAll:()=>[field,input]
};
const document={getElementById:id=>elements[id]||null,querySelector:sel=>sel==='.main-v7'?main:null};
let called=0;
const ctx={window:w,document,state:{level:'A1'},h:t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;'),neApiPost:async(_url,args)=>{
 called++;request=args;return {ok:true,data:{explanation_ru:'Жить — å bo, а «живу» — bor.'}};
}};
vm.runInNewContext(source,ctx,{filename:'ui-v7.js'});
const t=ctx.helpers;
const markup=t.helpMarkupV7(false);
assert(markup.includes('Русский')&&markup.includes('Norsk')&&markup.includes('v7DictateHelp'));
assert(markup.includes('Спросить Нору')&&markup.includes('helpQuestionV7'));
(async()=>{
 await t.v7AskHelp();
 assert.equal(called,1);
 assert.equal(request.mode,'explain');
 assert.equal(request.scenario,'lesson_help','All ordinary lesson steps should use bilingual teacher mode');
 assert(request.context.includes('Jeg ... i Norge'),'Unfinished answer remains context, not verified credit');
 assert.equal(request.message,'Jeg... забыл, как будет «живу»?');
 assert.equal(session.step,4);
 assert.equal(field.value,'Jeg ... i Norge','Writing answer cannot be erased by asking Nora');
 assert.equal(saved,1,'Tutor history must use the existing lesson checkpoint');
 assert.equal(session.helpV8.aidedSteps['4'],true,'Assisted stage cannot count as independent mastery');
 assert.equal(session.helpV8.historyByStep['4'].length,2);
 assert.equal(input.value,'');
 assert(box.textContent.includes('bor'));
 assert.equal(t.helpMarkupV7(false).includes('Жить — å bo'),true,'Saved lesson help must survive UI rerender');
 session.helpV8.historyByStep['4'].push({role:'assistant',text:'<script>alert(1)</script>'});
 assert(!t.helpMarkupV7(false).includes('<script>alert(1)</script>'),'Stored text must be escaped');
 // A delayed response after changing the stage is never allowed to mark another skill.
 let finish;
 input.value='Как прошедшее время?';
 ctx.neApiPost=()=>new Promise(resolve=>{finish=resolve});
 const before=saved,oldRequest=t.v7AskHelp();
 session.step=5;finish({ok:true,data:{explanation_ru:'å bo — bodde'}});
 await oldRequest;
 assert.equal(saved,before,'Stale help must not save a later lesson stage');
 assert(!session.helpV8.aidedSteps['5'],'Stale help must not mark new activity as aided');
 assert.equal(input.value,'Как прошедшее время?');
 // Network failure never clears the question or changes the lesson evidence.
 ctx.neApiPost=async()=>({ok:false,error:'NETWORK'});
 await t.v7AskHelp();
 assert.equal(input.value,'Как прошедшее время?');
 assert.equal(saved,before);
 // Mic input is explicitly one language at a time and remains a draft.
 let microphone;
 w.SpeechRecognition=class {start(){microphone=this;} abort(){this.onend?.();}};
 box.textContent='';
 input.value='';
 assert.equal(t.v7DictateHelp('ru'),true);
 assert.equal(microphone.lang,'ru-RU');
 microphone.onresult({results:[[{transcript:'Не знаю слово живу'}]]});
 assert.equal(input.value,'Не знаю слово живу');
 assert.equal(input.dataset.fromSpeech,'true');
 assert.equal(t.v7DictateHelp('nb'),true);
 assert.equal(microphone.lang,'nb-NO');
 microphone.onresult({results:[[{transcript:'Hvordan sier jeg det?'}]]});
 assert.equal(input.value,'Не знаю слово живу Hvordan sier jeg det?');
 assert.equal(t.v7DictateHelp('fr'),false);
 assert.equal(called,1,'Microphone does not submit user data or grade the task');
 assert.equal(field.value,'Jeg ... i Norge');
 // No free XP or B2 evidence from generic hints.
 assert(app.includes('helpV8:session.helpV8||null')&&app.includes('helpV8:saved?.helpV8'),'Tutor state must persist and restore');
 assert(app.includes('lessonHelpWasUsed()'),'Lesson evidence must check contextual hint provenance');
 assert(app.includes('ungraded?0:avg'),'Fully assisted lesson must not generate fallback 60/100');
 assert(chat.includes('"lesson_help"'),'Backend should recognize the common help scenario');
 console.log('PASS lesson-wide bilingual Nora help: Russian/Norwegian, persistent context, saved draft, no unearned credit, stale requests, mic and offline');
})().catch(err=>{console.error(err);process.exitCode=1});
