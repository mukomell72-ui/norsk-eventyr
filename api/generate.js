import {guard} from "./_guard.js";
function parseJson(text){const clean=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();try{return JSON.parse(clean)}catch{const a=clean.indexOf("{"),b=clean.lastIndexOf("}");if(a>=0&&b>a)return JSON.parse(clean.slice(a,b+1));throw new Error("NO_JSON")}}
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST_ONLY"});
  if(!guard(req,res,{limit:24})) return;
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI_NOT_CONFIGURED"});
  const {kind="lesson",level="A1",topic="",goal="",weakSkills=[]}=req.body||{};
  if(!["A1","A2","B1","B2"].includes(level)) return res.status(400).json({error:"BAD_LEVEL"});
  const common=["Ты создаёшь оригинальные задания по норвежскому Bokmål для взрослого русскоязычного ученика.","Уровень CEFR: "+level+".","Тема: "+String(topic).slice(0,160)+".","Цель: "+String(goal).slice(0,260)+".","Не копируй официальные задания Norskprøven. Делай новые задания того же типа.","Проверяй, чтобы у каждого тестового вопроса был ровно один однозначно правильный ответ.","Используй естественный современный Bokmål.","Верни только JSON без markdown."];
  let prompt;
  if(kind==="test"){
    prompt=[...common,"Слабые навыки ученика: "+(Array.isArray(weakSkills)?weakSkills.join(", "):"")+".","Создай разнообразный тест, который нельзя пройти по памяти.","JSON: {\"questions\":[8 объектов],\"writing\":\"...\",\"speaking\":\"...\"}.","Каждый объект questions: {\"type\":\"reading|grammar|vocabulary|listening\",\"context\":\"текст или пусто\",\"audio\":\"фраза для listening или пусто\",\"q\":\"вопрос по-русски\",\"opts\":[4 варианта],\"correct\":0}.","Сделай по 2 задания каждого типа: reading, grammar, vocabulary, listening."].join("\n");
  }else{
    prompt=[...common,"Создай полноценный тематический микроурок.","JSON: {\"title\":\"...\",\"grammarTitle\":\"...\",\"grammarRuleRu\":\"...\",\"grammarExamples\":[3 строки],\"grammarQ\":\"...\",\"grammarOpts\":[4 строки],\"grammarCorrect\":0,\"phrase\":\"...\",\"ru\":\"...\",\"vocab\":[[\"no\",\"ru\"],... 8 элементов],\"read\":\"...\",\"q\":\"...\",\"opts\":[4 строки],\"correct\":0,\"writing\":\"...\",\"speaking\":\"...\"}.","Текст read должен соответствовать уровню и быть длиннее на более высоких уровнях. Письмо и речь должны требовать самостоятельного ответа."].join("\n");
  }
  try{
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,reasoning:{effort:"low"},max_output_tokens:2600})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(502).json({error:"AI_REQUEST_FAILED",code:data?.error?.code||("OPENAI_"+r.status)});
    const text=(data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"";
    const parsed=parseJson(text);
    return res.status(200).json(parsed);
  }catch(e){return res.status(500).json({error:"AI_GENERATION_FAILED",code:"AI_GENERATION_FAILED"})}
}
