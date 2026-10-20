// A release date must be grounded in GitHub's successful Vercel deployment status.
import assert from 'node:assert/strict';
import handler from '../api/release-info.js';

const originalFetch=globalThis.fetch;
const originalSha=process.env.VERCEL_GIT_COMMIT_SHA;
const sha='a'.repeat(40);
function reply(){
 let status=200,headers={};
 return {status(code){status=code;return this},setHeader(key,value){headers[key]=value},
  json(body){this.body=body;this.code=status;this.headers=headers;return this}};
}
try{
 process.env.VERCEL_GIT_COMMIT_SHA=sha;
 let calls=0;
 globalThis.fetch=async(url,options)=>{
  calls++;
  assert(url.endsWith('/statuses/'+sha));
  assert.equal(options.headers['User-Agent'],'Norsk-Eventyr-Release-Timestamp');
  return {ok:true,async json(){return [
   {context:'Other system',state:'success',updated_at:'2026-10-20T09:40:00Z'},
   {context:'Vercel',state:'pending',updated_at:'2026-10-20T09:35:00Z'},
   {context:'Vercel',state:'success',updated_at:'2026-10-20T09:20:00Z'}]}}
 };
 let res=reply();await handler({method:'GET'},res);
 assert.equal(res.code,200);
 assert.equal(res.body.commit_sha,sha);
 assert.equal(res.body.published_at,'2026-10-20T09:20:00Z');
 assert.equal(res.body.time_basis,'verified_vercel_status');
 assert.equal(res.body.time_zone,'Europe/Oslo');
 assert.equal(calls,1);
 res=reply();await handler({method:'POST'},res);assert.equal(res.code,405);
 delete process.env.VERCEL_GIT_COMMIT_SHA;
 res=reply();await handler({method:'GET'},res);
 assert.equal(res.code,503);assert.equal(res.body.error,'RELEASE_COMMIT_UNAVAILABLE');
 assert.equal(calls,1,'No GitHub call when deployment SHA unavailable');
 process.env.VERCEL_GIT_COMMIT_SHA=sha;
 globalThis.fetch=async()=>({ok:true,json:async()=>[{context:'Vercel',state:'pending',updated_at:'2026-10-20T09:20:00Z'}]});
 res=reply();await handler({method:'GET'},res);
 assert.equal(res.code,503);assert.equal(res.body.error,'RELEASE_TIME_UNCONFIRMED');
 assert(!('published_at' in res.body),'Never invent a release date');
 globalThis.fetch=async()=>({ok:false,status:429});
 res=reply();await handler({method:'GET'},res);
 assert.equal(res.code,503);assert.equal(res.body.error,'RELEASE_STATUS_UNAVAILABLE');
 console.log('PASS timestamp API: exact SHA, verified successful Vercel time, missing/unconfirmed/offline safe');
} finally {
 globalThis.fetch=originalFetch;
 if(originalSha===undefined)delete process.env.VERCEL_GIT_COMMIT_SHA;
 else process.env.VERCEL_GIT_COMMIT_SHA=originalSha;
}
