'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const source=read('api/speech.js').replace('import {guard} from "./_guard.js";','').replace('export default async function handler','async function handler');
const calls=[];
const response=()=>({status(n){this.code=n;return this},json(v){this.data=v;return this},setHeader(){},send(v){this.buffer=v;return this}});
const ctx={guard:async()=>true,process:{env:{OPENAI_API_KEY:'mock'}},AbortController,Buffer,
 fetch:async(url,options)=>{calls.push(JSON.parse(options.body));return{ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}},
 setTimeout,clearTimeout};
vm.runInNewContext(source+'\nthis.handler=handler;',ctx);
(async()=>{
 let res=response();await ctx.handler({method:'POST',body:{text:'Привет!',language:'ru-RU',voice:'marin'}},res);
 assert.equal(res.code,200);assert.match(calls[0].instructions,/natural, clearly articulated Russian/);
 res=response();await ctx.handler({method:'POST',body:{text:'Jeg bor i Norge',language:'nb-NO'}},res);
 assert.equal(res.code,200);assert.match(calls[1].instructions,/Norwegian Bokmål/);
 res=response();await ctx.handler({method:'POST',body:{text:'Hallo',language:'de-DE'}},res);
 assert.equal(res.code,400);assert.equal(res.data.error,'BAD_LANGUAGE');assert.equal(calls.length,2);
 assert(read('v3.js').includes('speechKey(text,level,voice,language)'),'Voice cache must not mix Russian and Norwegian');
 assert(read('visual-world.js').includes("window.speakText(text,.92,null,'marin','ru-RU')"));
 console.log('PASS AI Russian Nora explanations and Norwegian scenes: language routing, safe validation, voice cache and text fallbacks');
})().catch(e=>{console.error(e);process.exitCode=1});