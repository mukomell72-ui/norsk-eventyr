import assert from "node:assert/strict";
import fs from "node:fs";
import {normalizeAssessment} from "../api/_feedback.js";
import chat from "../api/chat.js";
import evaluate from "../api/evaluate.js";
import {createSession} from "../api/_guard.js";

// 1. Alternative, correct answers must never lose unexplained points.
const alt=normalizeAssessment({accepted:true,score:95,explanation_ru:"Естественный ответ."});
assert.equal(alt.score,100);
assert.equal(alt.feedback_status,"correct");
assert.match(alt.score_reason_ru,/Баллы не сняты/);

// 2. Partial answer: cite the exact flaw, repair it, explain a deduction.
const partial=normalizeAssessment({accepted:true,score:95,explanation_ru:"Пропущен предлог i.",error_fragment_ru:"Like måte",corrected:"Takk, i like måte!",score_reason_ru:"Снято 5 баллов за отсутствие i.",error_tag:"vocabulary"});
assert.equal(partial.score,95);
assert.equal(partial.feedback_status,"partial");
assert.match(partial.score_reason_ru,/5 баллов/);

// 3. Nonsense must never pass because the language model emitted a large score.
const nonsense=normalizeAssessment({accepted:false,score:98,explanation_ru:"Реплика не является заказом.",error_tag:"task",corrected:"Jeg vil ha en kopp kaffe."});
assert.equal(nonsense.score,49);
assert.equal(nonsense.feedback_status,"incorrect");
assert.equal(nonsense.accepted,false);
const unverified=normalizeAssessment({accepted:"false",score:100,explanation_ru:""});
assert.equal(unverified.feedback_status,"unverified");
assert.equal(unverified.accepted,false);

// Integration contract with fake upstream, no live requests or user data.
process.env.OPENAI_API_KEY="qa-local-dummy";
process.env.NE_SESSION_SECRET="qa-session-signing-secret-32-characters";
async function query(handler,pathname,body,llm){
 let upstreamPrompt="";
 globalThis.fetch=async (url,opts)=>{
  if(url.includes("/auth/v1/user"))return {ok:true,json:async()=>({email_confirmed_at:"2026-01-01"})};
  if(url.includes("/rpc/ne_access_status"))return {ok:true,json:async()=>({status:"free",access_granted:true})};
  if(url.includes("/rpc/ne_device_authorize"))return {ok:true,json:async()=>({allowed:true,max_devices:2})};
  upstreamPrompt=JSON.parse(opts.body).input;
  return {ok:true,json:async()=>({output:[{content:[{type:"output_text",text:JSON.stringify(llm)}]}]})};
 };
 const req={method:"POST",url:pathname,headers:{cookie:"ne_access=qa",host:"localhost","x-forwarded-for":pathname+Math.random(),"x-ne-device-id":"device_qa_nora_feedback_123456","x-ne-device-name":"QA"},body};
 req.headers["x-ne-session"]=createSession(req);
 let status,response;
 const res={status(s){status=s;return this},json(v){response=v;return this}};
 await handler(req,res);return {status,response,upstreamPrompt};
}
const fail={reply_no:"Flott! Neste spørsmål.",translation_ru:"Отлично! Следующий вопрос.",accepted:false,score:96,explanation_ru:"Нельзя понять заказ.",score_reason_ru:"Ответ не выполняет задание.",error_tag:"task",corrected:"Jeg vil ha en kopp kaffe."};
const cafe=await query(chat,"/api/chat",{message:"Lotten! Takk",level:"A1",mode:"roleplay",scenario:"XP-миссия Норы. Кафе Fjordvik. Закажи напиток."},fail);
assert.equal(cafe.status,200);
assert.equal(cafe.response.accepted,false);
assert.equal(cafe.response.feedback_status,"incorrect");
assert.equal(cafe.response.score,49);
assert(!cafe.response.reply_no.includes("Neste spørsmål"),"Do not advance cafe scene on nonsense");
const ok=await query(chat,"/api/chat",{message:"Jeg vil ha en kopp espresso.",level:"A1",mode:"roleplay",scenario:"XP-миссия Норы. Кафе Fjordvik."},{reply_no:"Ja, vil du ha noe mer?",translation_ru:"Да, ещё что-нибудь?",accepted:true,score:100,explanation_ru:"Уместный заказ."});
assert.equal(ok.response.feedback_status,"correct");
assert.equal(ok.response.score,100);
const voice=await query(chat,"/api/chat",{message:"Jeg har femti to stjørelse",inputSource:"voice_transcript",level:"A1",mode:"roleplay",scenario:"Klesbutikk"},{reply_no:"Hvilken størrelse trenger du?",translation_ru:"Какой размер вам нужен?",accepted:true,score:82,explanation_ru:"Возможно, запись распознана неверно.",corrected:"Jeg skal ha størrelse femtito.",error_tag:"word_order",score_reason_ru:"Грамматика по расшифровке."});
assert.equal(voice.status,200);
assert.equal(voice.response.assessment_source,"voice_transcript");
assert.match(voice.upstreamPrompt,/автоматическая расшифровка его ГОЛОСОВОГО ответа/);
assert.match(voice.upstreamPrompt,/не оценивай акцент/);
assert.equal(ok.response.assessment_source,"typed_text");
const voiceUi=fs.readFileSync(new URL("../ui-v7.js",import.meta.url),"utf8");
const voiceClient=fs.readFileSync(new URL("../v3.js",import.meta.url),"utf8");
assert.match(voiceUi,/Предварительная оценка смысла распознанной речи/);
assert.match(voiceClient,/inputSource:wasVoice\?"voice_transcript":"typed_text"/);
assert.match(voiceClient,/\["true","recognition"\]/);
const explainWord=await query(chat,"/api/chat",{mode:"explain",level:"A1",message:"Meaning of ting"},{reply_no:"",translation_ru:"",explanation_ru:"ting means thing."});
assert.equal(explainWord.status,200);
assert.equal(explainWord.response.explanation_ru,"ting means thing.");
assert.equal(explainWord.response.score_valid,false);
assert.equal(explainWord.response.feedback_status,"not_assessed");
assert.equal(explainWord.response.score,undefined);
const translatedWord=await query(chat,"/api/chat",{mode:"explain",message:"Explain ting"},{reply_no:"",translation_ru:"thing",explanation_ru:""});
assert.equal(translatedWord.status,200);
assert.equal(translatedWord.response.explanation_ru,"thing");
const missingTranslation=await query(chat,"/api/chat",{mode:"explain",message:"Explain ting"},{reply_no:"",translation_ru:"",explanation_ru:""});
assert.equal(missingTranslation.status,502);
assert.equal(missingTranslation.response.code,"AI_EXPLANATION_EMPTY");
const evalFail=await query(evaluate,"/api/evaluate",{answer:"Lotten! Takk",question:"Bestill kaffe",goal:"Закажи кофе по-норвежски",level:"A1",mode:"dialogue"},{accepted:false,score:91,explanation_ru:"Непонятно, что вы хотите заказать.",corrected:"Jeg vil ha en kaffe.",error_tag:"task"});
assert.equal(evalFail.status,200);assert.equal(evalFail.response.accepted,false);assert.equal(evalFail.response.score,49);
const ui=fs.readFileSync(new URL("../ui-v7.js",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../app.js",import.meta.url),"utf8");
assert(ui.includes("v7NoraFeedback(meta)")&&ui.includes("Почему такая оценка:"));
assert(app.includes("clearerTaskPrompt(p)")&&app.includes("Переведите на норвежский:"));
console.log("PASS Nora 8.2.2: clear verdict, reasons, alternate answers, nonsense blocked, dialogue/XP contract");
