const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const js=fs.readFileSync(path.join(__dirname,"../v3.js"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
const start=js.indexOf("  function monitorMicActivity(stream){");
const end=js.indexOf("  toggleMic=async function(",start);
assert(start>0&&end>start,"microphone silence monitor must exist");
assert(js.includes("micRecordingProblem(blob.size,durationMs,silentAudio,target)"),"silent/short audio must be rejected before upload");
assert(js.indexOf("micRecordingProblem(blob.size,durationMs,silentAudio,target)")<js.indexOf('apiPost("/api/transcribe",{audioBase64:b64'),"guard must run before transcription");
assert(js.includes("if(e.results[i].isFinal)t+="),"interim speech recognition is not stable enough to insert");
assert(app.includes('id="freeAnswer" class="input" autocomplete="off"'),"speaking field should not inherit earlier browser autocomplete");
const micGuardStart=js.indexOf("  function micRecordingProblem(");
const micGuardEnd=js.indexOf("  // Track near-silent microphone input",micGuardStart);
assert(micGuardStart>0&&micGuardEnd>micGuardStart,"minimum recording gate must exist");
const recordingProblem=vm.runInNewContext("("+js.slice(micGuardStart,micGuardEnd).trim()+")");
assert.equal(recordingProblem(2000,150,false,"freeAnswer"),"TOO_SHORT","rapid stop must not be sent for transcription");
assert.equal(recordingProblem(2000,850,false,"freeAnswer"),"TOO_SHORT","brief nonspeech noise must not reach AI");
assert.equal(recordingProblem(2000,1199,false,"freeAnswer"),"TOO_SHORT");
assert.equal(recordingProblem(2000,1200,false,"freeAnswer"),"","normal speaking duration must pass");
assert.equal(recordingProblem(2000,1400,true,"freeAnswer"),"SILENT","near-digital silence must be suppressed");
assert.equal(recordingProblem(2000,700,false,"pronText"),"","short isolated pronunciation may pass");
assert.equal(recordingProblem(200,1500,false,"freeAnswer"),"TOO_SHORT");
assert(js.indexOf("micRecordingProblem(blob.size,durationMs,silentAudio,target)")<js.indexOf('apiPost("/api/transcribe",{audioBase64:b64'),"early mic gate must precede network");
async function test(amplitude,expected){
 let sampling=0,closed=0;
 class Context{
   constructor(){this.state="running"}
   createMediaStreamSource(){return{connect(){},disconnect(){}}}
   createAnalyser(){return{fftSize:1024,getFloatTimeDomainData:arr=>{sampling++;arr.fill(amplitude)}}}
   resume(){return Promise.resolve()}
   close(){closed++}
 }
 const sandbox={window:{AudioContext:Context},Float32Array,Promise,
   setInterval:(fn,_ms)=>setInterval(fn,3),clearInterval,Math};
 const make=vm.runInNewContext("("+js.slice(start,end).trim().replace(/^\s*function monitorMicActivity/,"function monitorMicActivity")+")",sandbox);
 const m=make({});
 assert(m,"mic monitoring must be available");
 await new Promise(resolve=>setTimeout(resolve,23));
 assert(sampling>=3,"must sample mic waveform");
 assert.equal(m.silent(),expected);
 m.close();
 assert.equal(closed,1);
}
(async()=>{
 await test(0,true);
 await test(0.007,false);
 const disabled=vm.runInNewContext("("+js.slice(start,end).trim().replace(/^\s*function monitorMicActivity/,"function monitorMicActivity")+")",{window:{}});
 assert.equal(disabled({}),null,"unsupported Web Audio should not block legitimate speech");
 console.log("PASS silent mic 8.2.7: reject actual silence, preserve quiet audible speech, ignore interim transcripts and autofill");
})().catch(e=>{console.error(e);process.exitCode=1});
