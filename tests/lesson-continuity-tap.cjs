'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const ui=read('ui-v7.js'),start=ui.indexOf('  function v7ContinueToday(){'),end=ui.indexOf('  function v7Step(',start);
assert(start>0&&end>start);
const script=ui.slice(start,end)+'\nthis.resume=v7ContinueToday;';
let starts=0,views=0;const lessonEngine={begin:()=>{starts++;return true},details:()=>({finished:false})};
const shortcut={window:{NELivingDay:lessonEngine},navigate:()=>{views++;return true}};
vm.runInNewContext(script,shortcut);assert.equal(shortcut.resume(),true);assert.equal(starts,1);assert.equal(views,0);
lessonEngine.details=()=>({finished:true});shortcut.resume();assert.equal(starts,1);assert.equal(views,1);
const lesson={id:'a2-work',level:'A2'},progress={index:0,turns:[],helpChat:[]};
const scene={actor:'Mari',scene:'På jobben',opening:'Hei, hvor bor du?',steps:[{task:'Svar hvor du bor.'}]};
const answer={value:'Jeg ... i Norge',isConnected:true},input={value:'',isConnected:true,dataset:{}};
const send={disabled:false,isConnected:true},status={textContent:''},log={append(){}},details={open:false};
const dom={getElementById:id=>({neWorldHelpInput:input,neWorldHelpSend:send,neWorldHelpStatus:status,
 neWorldHelpLog:log,freeAnswer:answer}[id]||null),
 querySelector:sel=>sel==='.ne-world-help'?details:null,
 createElement:()=>({append(){},textContent:''})};
let saves=0,api=0;
const win={neLessonSession:{lesson,guidedSpeech:progress},NEGuidedSpeaking:{definition:()=>scene},
 persistLessonCheckpoint:()=>saves++,neApiPost:async(path,p)=>{
  assert.equal(path,'/api/chat');assert.equal(p.mode,'explain');assert.equal(p.scenario,'guided_help');
  assert(p.message.includes('bor'));api++;return {ok:true,data:{explanation_ru:'bor — живу (å bo).'}};
 }};
vm.runInNewContext(read('visual-world.js'),{window:win,document:dom});
const V=win.NEVisualWorld;
assert(V.tapWords('Hei, hvor bor du?').includes('data-ne-word="bor"'));
assert(!V.tapWords('<script>hi</script>').includes('<script>'));
assert.equal(V.inspectWord({dataset:{neWord:'<script>'}}),false);
assert.equal(V.inspectWord({dataset:{neWord:'bor'}}),true);
(async()=>{
 await new Promise(done=>setImmediate(done));
 assert.equal(api,1);assert.equal(progress.index,0);assert.equal(answer.value,'Jeg ... i Norge');
 assert.equal(progress.aidedTurns['0'],true);assert.equal(progress.helpChat.length,2);
 assert.equal(saves,1);assert.equal(details.open,true);assert.equal(input.value,'');
 assert(read('adaptive-teacher.js').includes('lessonContinuity?.('));
 assert(read('living-day.js').includes('chapterRecap(d)'));
 console.log('PASS one-click Nora day and persistent storyline; safe word tap opens ungraded explanations');
})().catch(e=>{console.error(e);process.exitCode=1});