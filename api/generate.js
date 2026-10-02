import {guard} from "./_guard.js";
function parseJson(text){const clean=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();try{return JSON.parse(clean)}catch{const a=clean.indexOf("{"),b=clean.lastIndexOf("}");if(a>=0&&b>a)return JSON.parse(clean.slice(a,b+1));throw new Error("NO_JSON")}}
async function ask(input,max=2600,effort="low"){
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:"gpt-5.6-luna",input,reasoning:{effort},max_output_tokens:max})});
  const data=await r.json().catch(()=>({}));if(!r.ok){const e=data?.error||{};throw Object.assign(new Error("UPSTREAM"),{code:e.code||e.type||("OPENAI_"+r.status)})}
  return (data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"";
}
function validateShape(kind,x){
  if(!x||typeof x!=="object")return false;
  if(kind==="test")return Array.isArray(x.questions)&&x.questions.length>=8&&x.questions.every(q=>Array.isArray(q.opts)&&q.opts.length===4&&Number.isInteger(Number(q.correct)));
  return Array.isArray(x.vocab)&&x.vocab.length>=6&&Array.isArray(x.opts)&&x.opts.length===4&&typeof x.phrase==="string"&&typeof x.read==="string"&&typeof x.writing==="string"&&typeof x.speaking==="string";
}
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"POST_ONLY"});
  if(!guard(req,res,{limit:24}))return;
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI_NOT_CONFIGURED"});
  const {kind="lesson",level="A1",topic="",goal="",weakSkills=[],reviewWords=[]}=req.body||{};
  if(!["A1","A2","B1","B2"].includes(level))return res.status(400).json({error:"BAD_LEVEL"});
  const reinforcement=Array.isArray(reviewWords)?reviewWords.slice(0,15).map(x=>String(x).slice(0,100)).filter(Boolean):[];
  const common=[
    "Ты создаёшь оригинальные задания по норвежскому Bokmål для взрослого русскоязычного ученика.",
    "Уровень CEFR: "+level+". Тема: "+String(topic).slice(0,160)+". Цель: "+String(goal).slice(0,260)+".",
    "Слова прошлых дней для естественного закрепления: "+(reinforcement.join(", ")||"нет")+".",
    "Если список закрепления не пуст, используй эти слова в тексте, примерах, письме или речи настолько часто, насколько это естественно.",
    "Не копируй официальные задания Norskprøven. Используй современный естественный Bokmål.",
    "У каждого тестового вопроса должен быть ровно один однозначный правильный ответ.",
    "Верни только JSON без markdown."
  ];
  let prompt;
  if(kind==="test"){
    prompt=[...common,"Слабые навыки: "+(Array.isArray(weakSkills)?weakSkills.join(", "):"")+".","Создай разнообразный тест, который нельзя пройти по памяти.","JSON: {\"questions\":[8 объектов],\"writing\":\"...\",\"speaking\":\"...\"}.","Каждый questions: {\"type\":\"reading|grammar|vocabulary|listening\",\"context\":\"...\",\"audio\":\"...\",\"q\":\"вопрос по-русски\",\"opts\":[4 варианта],\"correct\":0}. Сделай по 2 задания каждого типа."].join("\n");
  }else{
    prompt=[...common,"Создай полноценный тематический микроурок.","JSON: {\"title\":\"...\",\"grammarTitle\":\"...\",\"grammarRuleRu\":\"...\",\"grammarExamples\":[3 строки],\"grammarQ\":\"...\",\"grammarOpts\":[4 строки],\"grammarCorrect\":0,\"phrase\":\"...\",\"ru\":\"...\",\"vocab\":[[\"no\",\"ru\"],... 8 элементов],\"read\":\"...\",\"q\":\"...\",\"opts\":[4 строки],\"correct\":0,\"writing\":\"...\",\"speaking\":\"...\"}.","На A1 текст короткий; на A2 длиннее; на B1-B2 — связный и содержательный. Письмо и речь требуют самостоятельного ответа."].join("\n");
  }
  try{
    const firstText=await ask(prompt),first=parseJson(firstText);
    const reviewPrompt=[
      "Ты старший методист норвежского как второго языка. Проверь JSON учебного материала уровня "+level+".",
      "Исправь только реальные проблемы: неестественный Bokmål, неверную грамматику, неоднозначные варианты, несоответствие уровню, плохие переводы, слишком искусственные фразы.",
      "Сохрани ту же JSON-схему и количество заданий. Ничего не объясняй, верни только исправленный JSON.",
      JSON.stringify(first)
    ].join("\n");
    let out=first;
    try{const checked=parseJson(await ask(reviewPrompt,2800,"none"));if(validateShape(kind,checked))out=checked}catch{}
    if(!validateShape(kind,out))return res.status(502).json({error:"AI_GENERATION_INVALID",code:"AI_GENERATION_INVALID"});
    return res.status(200).json(out);
  }catch(e){return res.status(502).json({error:"AI_GENERATION_FAILED",code:e?.code||"AI_GENERATION_FAILED"})}
}