'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../visual-world.js'),'utf8');
const state={learningV8:{}},lesson={id:'x',level:'A2'},progress={index:0,turns:[]};
const scene={scene:'På jobben',actor:'Mari',opening:'Hei! Når kan du komme?',steps:[{task:'Svar kort.'}]};
let running=null,mouth='',active=false,voice='';
const partner={classList:{add(name){if(name==='ne-world-talking')active=true},remove(name){if(name==='ne-world-talking')active=false}},
 setAttribute(name,value){if(name==='data-ne-viseme')mouth=value},removeAttribute(name){if(name==='data-ne-viseme')mouth=''}};
const document={querySelector:selector=>selector.includes('data-ne-role="partner"')?partner:null,querySelectorAll:()=>[partner],
 getElementById:id=>id==='neWorldVoiceStatus'?{textContent:''}:null};
const window={neLearnerState:state,neLessonSession:{lesson,guidedSpeech:progress},NEGuidedSpeaking:{definition:()=>scene},
 speakText:(text,rate,button,actorVoice)=>{voice=actorVoice;return Promise.resolve({source:'ai'})},
 setInterval(fn){running=fn;return 1},clearInterval(){running=null},matchMedia:()=>({matches:false})};
vm.runInNewContext(source,{window,document,Date},{filename:'visual-world.js'});
const V=window.NEVisualWorld;
V.speakPartner();assert.equal(voice,'sage');
scene.actor='Erik';V.speakPartner();assert.equal(voice,'cedar');
scene.actor='Ingrid';V.speakPartner();assert.equal(voice,'coral');
scene.actor='Nora';V.speakPartner();assert.equal(voice,'marin');
scene.actor='Mari';V.speakPartner();
const pcm=new Float32Array(88200).fill(.12),ctx={currentTime:0};
const data={text:scene.opening,buffer:{duration:2,sampleRate:44100,getChannelData:()=>pcm},context:ctx,startTime:0,rate:1};
assert.equal(V.onAudioStart(data),true);
assert.equal(active,true);assert.equal(mouth,'round','PCM amplitude must drive the mouth');
ctx.currentTime=1.1;pcm.fill(0);running();assert.equal(mouth,'closed');
ctx.currentTime=2.01;running();assert.equal(active,false);assert.equal(running,null);
assert.equal(V.onAudioStart({...data,text:'unrelated audio'}),false);
ctx.currentTime=0;pcm.fill(.12);assert.equal(V.onAudioStart(data),true);
window.matchMedia=()=>({matches:true});running();assert.equal(active,false);
window.matchMedia=()=>({matches:false});assert.equal(V.onAudioStart(data),true);
assert.equal(V.onAudioStop(),true);assert.equal(active,false);assert.equal(running,null);
assert.equal(V.freeTurnLimit('A1'),8);assert.equal(V.freeTurnLimit('A2'),10);
assert.equal(V.freeTurnLimit('B1'),12);assert.equal(V.freeTurnLimit('B2'),12);
assert(fs.readFileSync(path.join(__dirname,'../v3.js'),'utf8').includes('NEVisualWorld?.onAudioStart?.('));
console.log('PASS AI PCM mouth motion, distinct actor TTS voices, silence, reduced motion and adaptive dialogue length');
