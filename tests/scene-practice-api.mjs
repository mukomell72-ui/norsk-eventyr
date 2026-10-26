import assert from 'node:assert/strict';
import chat from '../api/chat.js';
import {createSession} from '../api/_guard.js';
process.env.OPENAI_API_KEY='qa-scene-dummy-key';
process.env.NE_SESSION_SECRET='qa-scene-test-very-long-signing-key-at-least-32';
const body={message:'Jeg finner ikke riktig buss. Kan du hjelpe meg?',mode:'scene_practice',level:'A2',scenario:'Voksne på bussholdeplassen. Du er Lars, en forbipasserende.',history:[{role:'assistant',text:'Trenger du hjelp?'}],practiceWords:['billett','hjelp']};
let lastPrompt='';
async function run(output,options={}){
 globalThis.fetch=async(url,config)=>{
  if(url.includes('/auth/v1/user'))return {ok:true,json:async()=>({email_confirmed_at:'2026-01-01'})};
  if(url.includes('/rpc/ne_access_status'))return {ok:true,json:async()=>({status:'free',access_granted:true})};
  if(url.includes('/rpc/ne_device_authorize'))return {ok:true,json:async()=>({allowed:true,max_devices:2})};
  if(url.includes('/responses')){
   lastPrompt=JSON.parse(config.body).input;
   return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]})};
  }
  throw new Error('Unexpected network URL in test: '+url);
 };
 const req={method:'POST',url:'/api/chat',body:{...body,...options},headers:{cookie:'ne_access=qa',host:'localhost','x-forwarded-for':'qa-scene-'+Math.random(),'x-ne-device-id':'device_qa_scene_123456','x-ne-device-name':'QA scene'}};
 req.headers['x-ne-session']=createSession(req);
 let status,data;
 const res={status(v){status=v;return this;},json(v){data=v;return this}};
 await chat(req,res);
 return {status,data};
}
let result=await run({reply_no:'Ja, ta buss nummer to. Skal du til sentrum?',accepted:false,score:0,feedback_status:'incorrect',suggested_level:'B2'});
assert.equal(result.status,200,'Free dialogue must not reject a natural NPC reply: '+JSON.stringify(result.data));
assert.equal(result.data.reply_no,'Ja, ta buss nummer to. Skal du til sentrum?','Creative NPC reply was overwritten with an assessment fallback');
assert.equal(result.data.accepted,false,'Ungraded dialogue cannot award credit');
assert.equal(result.data.feedback_status,'not_assessed');
assert.equal(result.data.score_valid,false);
assert.equal(Object.hasOwn(result.data,'score'),false,'Server must strip hallucinated scores');
assert.equal(Object.hasOwn(result.data,'suggested_level'),false,'Server must strip level recommendations');
assert(lastPrompt.includes('scene_practice')&&lastPrompt.includes('bussholdeplassen'),'Conversation lost scenario');
assert(lastPrompt.includes('Trenger du hjelp?'),'Conversation lost NPC history');
assert(lastPrompt.includes('Слова из текущего урока: billett, hjelp'),'NPC must receive grounded active lesson words');
assert(lastPrompt.includes('не больше 1–2 слов'),'NPC should recycle vocabulary sparingly, without becoming an exam');
result=await run({reply_no:'Я отвечаю по-русски.'});
assert.equal(result.status,502,'Russian roleplay replies should not be accepted as Bokmål');
result=await run({reply_no:'<script>alert(1)</script>'});
assert.equal(result.status,502,'Markup roleplay replies must be rejected');
result=await run({reply_no:'Du kan prøve busstoppet der borte.'},{mode:'scene_practice',level:'B1'});
assert.equal(result.status,200);
result=await run({reply_no:'Du kan prøve busstoppet der borte.'},{mode:'explain'});
assert.equal(result.status,200,'Existing explanation mode must remain supported');
console.log('PASS ungraded NPC API: natural responses preserved, scoring stripped, role memory, input checks and explanation compatibility');
