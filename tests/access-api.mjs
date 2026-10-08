import assert from 'node:assert/strict';
import handler from '../api/session.js';import {guard,createSession} from '../api/_guard.js';
process.env.NE_LEGAL_CONTROLLER_NAME='QA Controller';
let status='pending',owner=false,confirmed=true,down=false,rpcCalls=[],lastFetchUrl='';
globalThis.fetch=async(url,options)=>{
 lastFetchUrl=String(url);
 if(down)throw new Error('offline');
 if(url.endsWith('/user'))return {ok:true,status:200,json:async()=>({email:'student@example.com',email_confirmed_at:confirmed?'2026-01-01':null})};
 if(url.includes('/rpc/')){const name=url.split('/').pop();rpcCalls.push(name);return {ok:true,json:async()=>name==='ne_access_status'?{status,owner,access_granted:status==='approved',user_id:'11111111-1111-4111-8111-111111111111'}:name==='ne_access_list'?[]:{ok:true}}}
 if(url.includes('/token?'))return {ok:true,json:async()=>({access_token:'new-token',refresh_token:'new-refresh',expires_in:3600})};
 if(url.includes('/recover?'))return {ok:true,status:200,json:async()=>({})};
 throw Error('Unexpected '+url);
};
function response(){return {headers:{},status(v){this.code=v;return this},json(v){this.data=v;return this},setHeader(k,v){this.headers[k]=v}}}
function request(body={},cookie='ne_access=test'){return {method:'POST',url:'/api/access',headers:{host:'localhost',origin:'http://localhost',cookie,'x-forwarded-for':String(Math.random())},body}}
async function invoke(body,cookie){const res=response();await handler(request(body,cookie),res);return res}
assert.equal((await invoke({action:'status'},'')).code,401);
assert.equal((await invoke({action:'feedback_list'})).code,403);
assert.equal((await invoke({action:'status'})).data.status,'pending');
assert.equal((await invoke({action:'legal_info'})).data.controller,'QA Controller');
for(const action of ['list','decide'])assert.equal((await invoke({action,user_id:'11111111-1111-4111-8111-111111111111',status:'approved'})).code,403);
assert(!rpcCalls.includes('ne_access_decide'));
for(const state of ['pending','denied','revoked','unrequested','approved']){
 status=state;const req=request();req.url='/api/evaluate';req.headers['x-ne-session']=createSession(req);const res=response();const allowed=await guard(req,res);assert.equal(allowed,state==='approved');if(!allowed)assert.equal(res.code,403);
}
status='approved';
assert.equal((await invoke({action:'feedback_submit',rating:6,comment:'x'})).code,400);
const submitted=await invoke({action:'feedback_submit',rating:5,comment:'Отлично',suggestion:'Больше историй'});assert.equal(submitted.code,200);assert(rpcCalls.includes('ne_feedback_submit'));
confirmed=false;assert.equal((await invoke({action:'status'})).code,401);confirmed=true;
owner=true;assert.equal((await invoke({action:'feedback_list'})).code,200);assert(rpcCalls.includes('ne_feedback_list'));assert.equal((await invoke({action:'list'})).code,200);assert.equal((await invoke({action:'decide',user_id:'11111111-1111-4111-8111-111111111111',status:'approved'})).code,200);
const req=request();req.headers.origin='https://other.example';const res=response();await handler(req,res);assert.equal(res.code,403);
const refresh=await invoke({action:'status'},'ne_refresh=old');assert.equal(refresh.code,200);assert(refresh.headers['Set-Cookie'].every(c=>c.includes('HttpOnly')&&c.includes('Secure')&&c.includes('SameSite=Strict')));
process.env.VERCEL_ENV='preview';process.env.VERCEL_URL='norsk-eventyr-previewtest-fffff19.vercel.app';const reset=await invoke({action:'password_reset_request',email:'student@example.com'},'');assert.equal(reset.code,200);assert(lastFetchUrl.includes(encodeURIComponent('https://norsk-eventyr-previewtest-fffff19.vercel.app/?password_recovery=1')));delete process.env.VERCEL_ENV;delete process.env.VERCEL_URL;
assert.equal(typeof (await invoke({})).data.token,'string');
down=true;assert.equal((await invoke({action:'status'})).code,503);
const logout=await invoke({action:'logout'});assert.equal(logout.code,200);assert(logout.headers['Set-Cookie'].every(c=>c.includes('Max-Age=0')));
console.log('PASS access API: authentication, confirmation, approvals, owner-only decisions, revocation, origin, cookie refresh, outage and logout');
