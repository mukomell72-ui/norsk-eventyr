// Security release regression: no production services, identities or secrets are used.
import assert from 'node:assert/strict';
import {createSession,verifySession,guard} from '../api/_guard.js';
import cloud from '../api/cloud.js';
import transcribe from '../api/transcribe.js';
import pronounce from '../api/pronounce.js';
import evaluate from '../api/evaluate.js';
import health from '../api/health.js';
import {decodeAudioBase64,isWav} from '../api/_audio-input.js';
process.env.NE_SESSION_SECRET='qa-standalone-session-signing-key-2026';
process.env.OPENAI_API_KEY='qa-only-no-live-provider-key-2026';
const BASE_IP='198.51.100.';
function req(url,ip,body,origin){
  const headers={host:'norsk-eventyr-mvp.vercel.app',cookie:'ne_access=qa',
    'x-vercel-forwarded-for':ip,'x-ne-device-id':'qa-device-id',
    'x-ne-device-name':'Test device'};
  if(origin!==undefined)headers.origin=origin;
  const r={method:'POST',url,headers,body};
  r.headers['x-ne-session']=createSession(r);
  return r;
}
function response(){return {code:0,data:null,headers:{},status(n){this.code=n;return this},json(x){this.data=x;return this},setHeader(n,v){this.headers[n]=v}}}
const good=req('/api/cloud',BASE_IP+'1',{name:'norsk_eventyr_sync_pull',params:{}});
assert(verifySession(good),'signed session must validate');
const forged={...good,headers:{...good.headers,'x-vercel-forwarded-for':BASE_IP+'2'}};
assert(!verifySession(forged),'session must be bound to a verified source address');
const tampered={...good,headers:{...good.headers,'x-ne-session':good.headers['x-ne-session']+'.extra'}};
assert(!verifySession(tampered),'ambiguous extra signature segments must be rejected');
const cross=req('/api/cloud',BASE_IP+'3',{});
cross.headers['sec-fetch-site']='cross-site';
const blocked=response();
assert.equal(await guard(cross,blocked,{requireSession:false,requireAccess:false}),false);
assert.equal(blocked.code,403,'cross-site request must be denied even without Origin');
const wrongScheme=req('/api/cloud',BASE_IP+'4',{},'http://norsk-eventyr-mvp.vercel.app');
const insecure=response();
assert.equal(await guard(wrongScheme,insecure,{requireSession:false,requireAccess:false}),false);
assert.equal(insecure.code,403);
const routed=req('/api/cloud?nonce=one',BASE_IP+'5',{});
assert.equal(await guard(routed,response(),{requireSession:false,requireAccess:false,limit:1}),true);
const viaQuery=req('/api/cloud?nonce=two',BASE_IP+'5',{});
const limitResponse=response();
assert.equal(await guard(viaQuery,limitResponse,{requireSession:false,requireAccess:false,limit:1}),false);
assert.equal(limitResponse.code,429,'changing query string must not bypass per-route limiter');
const savedKey=process.env.NE_SESSION_SECRET,savedOpenAI=process.env.OPENAI_API_KEY;
delete process.env.NE_SESSION_SECRET;delete process.env.OPENAI_API_KEY;
assert.equal(createSession(good),null,'never sign sessions with a public fallback constant');
assert(!verifySession(good),'unconfigured server cannot verify forged/default-key tokens');
process.env.NE_SESSION_SECRET=savedKey;process.env.OPENAI_API_KEY=savedOpenAI;
let cloudCalls=0,remoteError=false;
globalThis.fetch=async url=>{
 const u=String(url);
 if(u.includes('/auth/v1/user'))return {ok:true,status:200,json:async()=>({email_confirmed_at:'2026-01-01'})};
 if(u.includes('/rpc/ne_access_status_v2'))return {ok:true,status:200,json:async()=>({status:'trial',access_granted:true,owner:false})};
 if(u.includes('/rpc/ne_device_authorize'))return {ok:true,status:200,json:async()=>({allowed:true})};
 if(u.includes('/rest/v1/rpc/norsk_eventyr_sync_')){
   cloudCalls++;return remoteError?{ok:false,status:500,json:async()=>({message:'DATABASE INTERNAL SECRET'})}:
     {ok:true,status:200,json:async()=>({ok:true,revision:1,state:{}})};
 }
 throw new Error('Unexpected mocked URL '+u);
};
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',secret='a'.repeat(43);
let seq=10;
async function invoke(name,params){const input=req('/api/cloud',BASE_IP+(seq++),{name,params});const res=response();await cloud(input,res);return res}
for(const params of [
 {p_sync_id:'invalid',p_secret:secret},
 {p_sync_id:id,p_secret:'short'},
 {p_sync_id:id,p_secret:secret,unexpected:'forbidden'},
 [],
 null
])assert.equal((await invoke('norsk_eventyr_sync_pull',params)).code,400);
for(const invalid of [[],null,'not-object'])assert.equal(
 (await invoke('norsk_eventyr_sync_create',{p_sync_id:id,p_secret:secret,p_state:invalid})).code,400);
assert.equal((await invoke('norsk_eventyr_sync_push',{p_sync_id:id,p_secret:secret,p_state:{},p_expected_revision:-1})).code,400);
assert.equal((await invoke('norsk_eventyr_sync_create',{p_sync_id:id,p_secret:secret,p_state:{payload:'x'.repeat(760000)}})).code,400);
assert.equal(cloudCalls,0,'invalid requests must never reach database');
assert.equal((await invoke('norsk_eventyr_sync_pull',{p_sync_id:id,p_secret:secret})).code,200);
assert.equal(cloudCalls,1);
remoteError=true;
const failure=await invoke('norsk_eventyr_sync_pull',{p_sync_id:id,p_secret:secret});
assert.equal(failure.code,503);
assert(!JSON.stringify(failure.data).includes('SECRET'),'remote database error text must stay private');
// Unauthenticated status endpoints must not advertise secret/configured AI details.
const healthRes=response();await health({method:'GET'},healthRes);
assert.equal(healthRes.code,200);
assert(!Object.hasOwn(healthRes.data,'aiConfigured'));
const evalRes=response();await evaluate({method:'GET'},evalRes);
assert.equal(evalRes.code,200);
assert(!Object.hasOwn(evalRes.data,'configured'));
assert(!Object.hasOwn(evalRes.data,'model'));

// Reject oversized payloads consistently before reaching downstream services.
const oversized=req('/api/chat',BASE_IP+'50',{message:'x'.repeat(135000)});
const oversizedRes=response();
assert.equal(await guard(oversized,oversizedRes,{requireSession:false,requireAccess:false}),false);
assert.equal(oversizedRes.code,413);
const claimed=req('/api/chat',BASE_IP+'51',{message:'hei'});
claimed.headers['content-length']='200000';
const claimedRes=response();
assert.equal(await guard(claimed,claimedRes,{requireSession:false,requireAccess:false}),false);
assert.equal(claimedRes.code,413);

// The audio decoder is intentionally strict: malformed base64 cannot reach a paid provider.
const rawAudio=Buffer.alloc(256,7),encodedAudio=rawAudio.toString('base64');
assert.equal(decodeAudioBase64(encodedAudio,300)?.length,256);
assert.equal(decodeAudioBase64(encodedAudio+'!',300),null);
assert.equal(decodeAudioBase64(encodedAudio,128),null);
assert.equal(decodeAudioBase64(encodedAudio.replace(/=$/,'/'),300),null);
assert(!isWav(rawAudio));
const invalidTranscribe=response();
await transcribe(req('/api/transcribe',BASE_IP+'52',{audioBase64:encodedAudio,mime:'application/octet-stream'}),invalidTranscribe);
assert.equal(invalidTranscribe.code,400,'unsupported audio type must be denied');
const malformedTranscribe=response();
await transcribe(req('/api/transcribe',BASE_IP+'53',{audioBase64:encodedAudio+'!',mime:'audio/webm'}),malformedTranscribe);
assert.equal(malformedTranscribe.code,400,'non-canonical base64 must be denied');
const badWav=response();
await pronounce(req('/api/pronounce',BASE_IP+'54',{audioBase64:encodedAudio,expected:'God dag'}),badWav);
assert.equal(badWav.code,400,'pronunciation requires a real WAV header');
console.log('PASS release security guards: origin, session, resource limits and cloud parameter/error isolation, bounded media, API input sizes and diagnostic privacy');

