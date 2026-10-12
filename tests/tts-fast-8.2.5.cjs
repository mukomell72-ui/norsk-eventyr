const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const source=fs.readFileSync(path.join(__dirname,"../v3.js"),"utf8");
const start=source.indexOf("  // Shared speech engine for placement"),end=source.indexOf("  function normSpeech(",start);
assert(start>0&&end>start,"shared speech block missing");
const block=source.slice(start,end);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function rig({norwegian=false,api}={}){
  let calls=0,played=0,aborts=0;
  const voice={name:"Norwegian",lang:"nb-NO"},synth={
    getVoices:()=>norwegian?[voice]:[],
    cancel(){},resume(){},
    speak(u){played++;setTimeout(()=>{u.onstart?.();setTimeout(()=>u.onend?.(),5)},0)}
  };
  class AudioMock{
    constructor(url){this.url=url;this.volume=1;this.playbackRate=1}
    play(){played++;setTimeout(()=>{this.onplaying?.();setTimeout(()=>this.onended?.(),5)},0);return Promise.resolve()}
    pause(){}
  }
  const TTS=class{constructor(t){this.text=t}};
  const context={
    window:{speechSynthesis:synth,SpeechSynthesisUtterance:TTS,NEHumanVoice:{has:()=>false}},
    speechSynthesis:synth,SpeechSynthesisUtterance:TTS,
    document:{activeElement:null,visibilityState:"visible"},Audio:AudioMock,AbortController,
    URL:{createObjectURL:()=>("blob:mock-"+Math.random()),revokeObjectURL:()=>{}},
    setTimeout:(fn,ms)=>setTimeout(fn,ms===4000?120:ms===350?8:ms===1200?40:ms>=10000?90:ms),
    clearTimeout,Date,Map,console
  };
  context.apiPost=async (route,payload,opt)=>{
    calls++;
    if(api)return api(route,payload,opt,()=>{aborts++});
    return {ok:true,response:{blob:async()=>({type:"audio/mpeg",size:1000})}};
  };
  const src="(function(){let speechAudioContext=null,speechAudio=null,speechRequest=0,speechActiveButton=null;let speakText=()=>{},lessonSession=null;const speechCache=new Map(),SPEECH_CACHE_LIMIT=12,state={level:'A1'};\n"+block+"\nreturn {play:speakText,prime:primeSpeech};})()";
  const engine=vm.runInNewContext(src,context,{timeout:3000});
  function button(){
    const values=new Set();
    return {dataset:{},innerHTML:"▶ Прослушать",disabled:false,
      classList:{add:x=>values.add(x),remove:x=>values.delete(x),contains:x=>values.has(x)}};
  }
  return {engine,button,stats:()=>({calls,played,aborts})};
}
(async()=>{
  {
    const r=rig({norwegian:true}),b=r.button();
    const outcome=await r.engine.play("Jeg lærer norsk.",.9,b);
    assert.equal(outcome.source,"device");
    assert.equal(r.stats().calls,0,"native Norwegian must not use the API");
    await sleep(25);
    assert.equal(b.disabled,false,"device completion must restore audio button");
  }
  {
    const r=rig({api:async(_route,_payload,options,onAbort)=>new Promise(resolve=>{
      options.signal.addEventListener("abort",()=>{onAbort();resolve({ok:false,error:"NETWORK"})},{once:true});
    })}),b=r.button();
    const t=Date.now(),outcome=await r.engine.play("Norsk setning.",.9,b);
    assert.equal(outcome.source,"browser","network timeout must activate browser TTS");
    assert(Date.now()-t<500,"timeout exceeded accelerated test bound");
    assert.equal(r.stats().aborts,1,"timed out upstream request must be aborted");
    await sleep(25);
    assert.equal(b.disabled,false,"fallback completion must restore button");
  }
  {
    const r=rig({api:async()=>{await sleep(35);return {ok:true,response:{blob:async()=>({type:"audio/mpeg",size:1000})}}}}),b=r.button();
    r.engine.prime("Jeg tar bussen.","A1");
    await sleep(15);
    const outcome=await r.engine.play("Jeg tar bussen.",.9,b);
    assert.equal(outcome.source,"ai");
    assert.equal(r.stats().calls,1,"prefetch and click must share one request");
    await sleep(25);
    assert.equal(b.disabled,false,"AI audio completion must restore button");
  }
  {
    const r=rig({api:async()=>{await sleep(32);return {ok:true,response:{blob:async()=>({type:"audio/mpeg",size:1000})}}}}),b=r.button();
    const first=r.engine.play("God morgen.",.9,b);
    const second=r.engine.play("God morgen.",.9,b);
    const result=await Promise.all([first,second]);
    assert.equal(result[0].source,"cancelled","superseded playback must be ignored");
    assert.equal(result[1].source,"ai");
    assert.equal(r.stats().calls,1,"concurrent identical audio must be deduplicated");
    await sleep(25);
    assert.equal(b.disabled,false);
  }
  console.log("PASS fast Norwegian TTS: device voice, aborted slow AI, prefetch cache, stale playback cancellation");
})().catch(e=>{console.error(e);process.exitCode=1});
