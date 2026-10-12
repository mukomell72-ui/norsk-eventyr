const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const main=fs.readFileSync(path.join(__dirname,"../v3.js"),"utf8");
const i=main.indexOf("  // Universal speech engine"),j=main.indexOf("  function normSpeech(",i);
assert(i>0&&j>i,"universal speech engine missing");
const moduleSource="(function(){let speechAudioContext=null,speechAudio=null,speechRequest=0,speechActiveButton=null;let speakText=()=>{},lessonSession=null;const speechCache=new Map(),SPEECH_CACHE_LIMIT=12,state={level:'A1'};\n"+main.slice(i,j)+"\nreturn {speak:speakText,prime:primeSpeech};})()";
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function rig({provider,voices=[{lang:"nb-NO"}],webAudio=true}={}){
  let apiCalls=0,webAudioStarts=0,htmlAttempts=0,nativeStarts=0,abortCount=0;
  class Context{
    constructor(){this.state="suspended";this.destination={}}
    resume(){this.state="running";return Promise.resolve()}
    decodeAudioData(data){assert(data.byteLength===16);return Promise.resolve({duration:0.15})}
    createBufferSource(){return {playbackRate:{value:1},connect(){},disconnect(){},
      start(){webAudioStarts++;setTimeout(()=>this.onended?.(),8)},stop(){}}}
  }
  const speech={
    getVoices:()=>voices,cancel(){},resume(){},
    speak(u){nativeStarts++;setTimeout(()=>{u.onstart?.();setTimeout(()=>u.onend?.(),4)},2)}
  };
  class MediaAudio{play(){htmlAttempts++;return Promise.reject(new Error("NotAllowedError"))} pause(){}}
  const mockUrl={createObjectURL:()=>"blob:mock-audio",revokeObjectURL:()=>{}};
  const fakeWindow={speechSynthesis:speech,SpeechSynthesisUtterance:class {constructor(t){this.text=t}},NEHumanVoice:{has:()=>false},...(webAudio?{AudioContext:Context}:{})};
  const mockApi=async (_path,_body,{signal})=>{
    apiCalls++;
    if(provider)return provider(signal,()=>{abortCount++});
    await delay(30);
    return {ok:true,response:{blob:async()=>({type:"audio/mpeg",size:2048})}};
  };
  const clock=(cb,ms)=>setTimeout(cb,ms===18500?75:ms===350?10:ms>=5000?100:ms);
  const context={
    apiPost:mockApi,window:fakeWindow,document:{activeElement:null,visibilityState:"visible"},
    speechSynthesis:speech,SpeechSynthesisUtterance:fakeWindow.SpeechSynthesisUtterance,
    Audio:MediaAudio,AbortController,
    URL:mockUrl,setTimeout:clock,clearTimeout,
    fetch:async()=>({arrayBuffer:async()=>new ArrayBuffer(16)}),
    Promise,Map,Date,console
  };
  const engine=vm.runInNewContext(moduleSource,context,{timeout:3000});
  const button=()=>{
    const cls=new Set();
    return {innerHTML:"▶ Прослушать",disabled:false,dataset:{},isConnected:true,classList:{
      add:v=>cls.add(v),remove:v=>cls.delete(v),contains:v=>cls.has(v)}};
  };
  return {engine,button,stats:()=>({apiCalls,webAudioStarts,htmlAttempts,nativeStarts,abortCount})};
}
(async()=>{
  {
    const r=rig(),b=r.button();
    const result=await r.engine.speak("Jeg lærer norsk.",.9,b);
    assert.equal(result.source,"ai","AI must be primary even with unreliable Android listed device voice");
    assert.equal(r.stats().nativeStarts,0);
    assert.equal(r.stats().webAudioStarts,1,"audio must start after asynchronous generation");
    assert.equal(r.stats().htmlAttempts,0,"must not rely on autoplay-blocked HTML audio");
    await delay(20);
    assert.equal(b.disabled,false);
  }
  {
    const r=rig({voices:[],provider:async()=>({ok:false,error:"AI_NOT_CONFIGURED"})}),b=r.button();
    const result=await r.engine.speak("Hallo",.9,b);
    assert.equal(result.source,"unavailable","do not pretend to speak on failed network and missing voice");
    assert.match(b.innerHTML,/Звук недоступен/);
    assert.equal(b.disabled,false);
  }
  {
    const r=rig({voices:[],provider:(signal,onAbort)=>new Promise(resolve=>{
      signal.addEventListener("abort",()=>{onAbort();resolve({ok:false,error:"NETWORK"})},{once:true});
    })}),b=r.button();
    const result=await r.engine.speak("Noe å høre.",.9,b);
    assert.equal(result.source,"unavailable");
    assert.equal(r.stats().abortCount,1,"network is bounded rather than indefinite");
    assert.match(b.innerHTML,/Звук недоступен/);
  }
  {
    const r=rig({voices:[],provider:async()=>{await delay(40);return {ok:true,response:{blob:async()=>({type:"audio/mpeg",size:2048})}}}}),b=r.button();
    r.engine.prime("Dette er en test.","A1");
    await delay(18);
    const result=await r.engine.speak("Dette er en test.",.9,b);
    assert.equal(result.source,"ai");
    assert.equal(r.stats().apiCalls,1,"preload and tap share one AI task");
    assert.equal(r.stats().webAudioStarts,1);
  }
  {
    const r=rig({voices:[],provider:async()=>{await delay(40);return {ok:true,response:{blob:async()=>({type:"audio/mpeg",size:2048})}}}}),b=r.button();
    const a=r.engine.speak("Først.",.9,b),b2=r.engine.speak("Etterpå.",.9,b);
    const result=await Promise.all([a,b2]);
    assert.equal(result[0].source,"cancelled");
    assert.equal(result[1].source,"ai");
    assert.equal(r.stats().webAudioStarts,1,"old sound must not play after navigation");
  }
  console.log("PASS 8.2.6: Android async Web Audio, device voice bypass, errors visible, bounded timeout, prefetch, cancellation");
})().catch(e=>{console.error(e);process.exitCode=1});
