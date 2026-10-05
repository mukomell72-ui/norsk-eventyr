import {guard} from "./_guard.js";
function parseJson(text){const clean=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();try{return JSON.parse(clean)}catch{const a=clean.indexOf("{"),b=clean.lastIndexOf("}");if(a>=0&&b>a)return JSON.parse(clean.slice(a,b+1));throw new Error("NO_JSON")}}
async function ask(input,max=2600,effort="low"){
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:"gpt-5.6-luna",input,reasoning:{effort},max_output_tokens:max})});
  const data=await r.json().catch(()=>({}));if(!r.ok){const e=data?.error||{};throw Object.assign(new Error("UPSTREAM"),{code:e.code||e.type||("OPENAI_"+r.status)})}
  return (data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"";
}
function validChoice(opts,correct){return Array.isArray(opts)&&opts.length===4&&opts.every(o=>typeof o==="string"&&o.trim())&&correct!==null&&correct!==""&&typeof correct!=="boolean"&&Number.isInteger(Number(correct))&&Number(correct)>=0&&Number(correct)<opts.length}
function validateShape(kind,x){
  if(!x||typeof x!=="object")return false;
  if(kind==="test")return Array.isArray(x.questions)&&x.questions.length>=8&&x.questions.every(q=>q&&typeof q.q==="string"&&q.q.trim()&&validChoice(q.opts,q.correct));
  return Array.isArray(x.vocab)&&x.vocab.length>=6&&x.vocab.every(v=>Array.isArray(v)&&v.length===2&&v.every(w=>typeof w==="string"&&w.trim()))&&validChoice(x.opts,x.correct)&&validChoice(x.grammarOpts,x.grammarCorrect)&&typeof x.phrase==="string"&&typeof x.read==="string"&&typeof x.writing==="string"&&typeof x.speaking==="string";
}
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"POST_ONLY"});
  if(!await guard(req,res,{limit:24}))return;
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI_NOT_CONFIGURED"});
  const {kind="lesson",level="A1",topic="",goal="",weakSkills=[],reviewWords=[],moduleId="",skillFocus="",canDo=[],grammarFocus="",lexiconFocus="",mastery={},errorPatterns=[],teacherMode=false,reviewMode=false}=req.body||{};
  if(!["A1","A2","B1","B2"].includes(level))return res.status(400).json({error:"BAD_LEVEL"});
  const reinforcement=Array.isArray(reviewWords)?reviewWords.slice(0,15).map(x=>String(x).slice(0,100)).filter(Boolean):[];
  const common=[
    "Ты создаёшь оригинальные задания по норвежскому Bokmål для взрослого русскоязычного ученика.",
    "Уровень CEFR: "+level+". Модуль: "+String(moduleId).slice(0,90)+". Тема: "+String(topic).slice(0,220)+". Цель: "+String(goal).slice(0,500)+".",
    "Can-do цели: "+(Array.isArray(canDo)?canDo.slice(0,6).map(x=>String(x).slice(0,180)).join("; "):"")+".",
    "Главный навык занятия: "+String(skillFocus).slice(0,40)+". Грамматика: "+String(grammarFocus).slice(0,220)+". Лексическое поле: "+String(lexiconFocus).slice(0,220)+".",
    "Текущий профиль мастерства 0–100: "+JSON.stringify(mastery||{}).slice(0,500)+". Повторяющиеся ошибки: "+(Array.isArray(errorPatterns)?errorPatterns.slice(0,8).join(", "):"")+".",
    "Слова прошлых дней для естественного закрепления: "+(reinforcement.join(", ")||"нет")+".",
    "Если список закрепления не пуст, используй эти слова в тексте, примерах, письме или речи настолько часто, насколько это естественно.",
    "Если teacherMode=true, работай как требовательный преподаватель: одна ясная цель, короткое объяснение, затем активное извлечение из памяти, применение и перенос в новую ситуацию.",
    "Не подсказывай ответ формулировкой вопроса. Сначала требуй самостоятельное производство языка, а не узнавание по вариантам, кроме этапов чтения/аудирования/грамматики.",
    "Делай материал жизненным: работа, жильё, услуги, здоровье, транспорт, общение, новости и реальные общественные ситуации. Избегай детских и искусственных тем.",
    "Сложность должна быть чуть выше устойчивого текущего результата, но не превращаться в угадывание. Слабый навык получит больше нагрузки, сильный — меньше.",
    "Если reviewMode=true, не повторяй старую формулировку: проверь тот же навык в новом контексте без прямой подсказки.",
    "Русский используй только для точного короткого объяснения; основная языковая работа должна происходить на норвежском.",
    "Никаких заявлений, что ученик уже достиг уровня: материал только собирает доказательства владения.",
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
      "Ты старший преподаватель и методист норвежского как второго языка. Проверь JSON учебного материала уровня "+level+" на реальную учебную ценность.",
      "Проверь соответствие can-do цели, естественность Bokmål, возрастающую когнитивную нагрузку, отсутствие подсказки в самом вопросе и возможность переноса навыка в новую ситуацию.",
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