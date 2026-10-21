import assert from 'node:assert/strict';
import handler from '../api/evaluate.js';
import {createSession} from '../api/_guard.js';
process.env.OPENAI_API_KEY='qa-placeholder-not-an-actual-credential';
process.env.NE_SESSION_SECRET='qa-session-signing-secret-at-least-32-chars';
const answer='Vi kunne møtes i morgen klokka tre. I dag jeg møtes ikke ettermiddag';
const question='Предложи встречу на завтра и скажи, что сегодня во второй половине дня встретиться не можешь.';
const valid={
 accepted:true,score:85,
 issues:[{category:'word_order',source_fragment:'I dag jeg møtes',requirement_quote:'',deduction:15,
 explanation_ru:'После I dag нужно поставить личный глагол перед jeg.',corrected_fragment:'I dag kan jeg ikke møtes'}],
 corrected:'Vi kunne møtes i morgen klokka tre. I dag kan jeg ikke møtes på ettermiddagen.',
 strengths_ru:['Время завтрашней встречи указано ясно.']
};
const invented={...valid,score:65,issues:[
 {category:'spelling',source_fragment:'mørgen',deduction:10,explanation_ru:'Написано mørgen вместо morgen.'},
 {category:'verb_form',source_fragment:'Vi kunne møtes',deduction:10,explanation_ru:'Нужно kan вместо kunne.'},
 {category:'word_order',source_fragment:'I dag jeg møtes',deduction:15,explanation_ru:'Второе предложение нарушает порядок слов.'}
]};
let calls=0,outcomes=[];
globalThis.fetch=async url=>{
 if(String(url).includes('/auth/v1/user'))return {ok:true,json:async()=>({email_confirmed_at:'2026-01-01'})};
 if(String(url).includes('/rpc/ne_access_status'))return {ok:true,json:async()=>({status:'free',access_granted:true})};
 if(String(url).includes('/rpc/ne_device_authorize'))return {ok:true,json:async()=>({allowed:true,max_devices:2})};
 if(String(url).includes('api.openai.com')){
  const next=outcomes[calls++]||invented;
  return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(next)}]}]})};
 }
 throw new Error('Unexpected network request in test: '+url);
};
let serial=0;
async function evaluate(fakeResults){
 outcomes=fakeResults;calls=0;
 const req={method:'POST',url:'/api/evaluate',headers:{
  host:'localhost','x-forwarded-for':'qa-grounded-'+(++serial),
  'x-ne-device-id':'device_qa_grounded_20261022',
  'x-ne-device-name':'QA'
 },body:{answer,question,goal:question,level:'A1',mode:'writing'}};
 req.headers['x-ne-session']=createSession(req);
 let code=0,payload=null;
 const res={status(n){code=n;return this},json(x){payload=x;return this},setHeader(){}};
 await handler(req,res);
 return {code,payload,calls};
}
const recovered=await evaluate([invented,valid]);
assert.equal(recovered.code,200,'Second grounded response should be used');
assert.equal(recovered.calls,2,'Exactly one retry for invalid evidence');
assert.equal(recovered.payload.score,85);
assert.equal(recovered.payload.error_fragment_ru,'I dag jeg møtes');
assert(!JSON.stringify(recovered.payload).includes('mørgen'),'Invented spelling must never reach the student');
assert.equal(recovered.payload.feedback_status,'partial');
const unsupported=await evaluate([invented,invented]);
assert.equal(unsupported.code,422,'Repeated inventions must not create a learning score');
assert.equal(unsupported.payload.code,'FEEDBACK_NOT_VERIFIED');
assert.equal(unsupported.payload.score,undefined,'Unverified feedback must not affect progress');
assert.equal(unsupported.calls,2);
const perfect=await evaluate([{accepted:true,score:100,issues:[],corrected:'',strengths_ru:[]}]);
assert.equal(perfect.code,200);
assert.equal(perfect.payload.score,100);
assert.equal(perfect.calls,1);
console.log('PASS API Nora evidence retry: invented mørgen and incorrect kunne penalty filtered; valid feedback accepted; unverified score never stored');
