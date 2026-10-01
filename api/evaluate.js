export default async function handler(req,res){
  if(req.method==="GET"){
    return res.status(200).json({ok:true,configured:Boolean(process.env.OPENAI_API_KEY),model:"gpt-5.6-luna",version:"2.0.0"});
  }
  if(req.method!=="POST") return res.status(405).json({error:"POST_ONLY",code:"POST_ONLY"});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI_NOT_CONFIGURED",code:"AI_NOT_CONFIGURED"});

  const {answer,question,goal,level="A1",mode="lesson"}=req.body||{};
  if(typeof answer!=="string"||typeof question!=="string"||!answer.trim()||!question.trim()){
    return res.status(400).json({error:"MISSING_INPUT",code:"MISSING_INPUT"});
  }
  if(answer.length>6000||question.length>2000){
    return res.status(413).json({error:"INPUT_TOO_LONG",code:"INPUT_TOO_LONG"});
  }
  const allowedLevels=["A1","A2","B1","B2"];
  const target=allowedLevels.includes(level)?level:"A1";
  const exam=String(mode).startsWith("exam");
  const speaking=String(mode).includes("speaking");

  const prompt=[
    "Ты строгий, но практичный преподаватель норвежского Bokmål для русскоязычного взрослого ученика.",
    "Целевой уровень: "+target+".",
    "Режим: "+mode+".",
    "Задание: "+question,
    "Цель задания: "+(goal||question),
    "Ответ ученика:",answer,"",
    "Оцени только качество норвежского языка и выполнение коммуникативной задачи. Не оценивай знания о теме.",
    "Учитывай естественные эквивалентные ответы: не требуй совпадения с образцом.",
    "Для устной речи оценивай текст распознанной речи; не делай выводов о произношении, которого ты не слышишь.",
    "Для экзамена это только тренировочная оценка, не официальный результат Norskprøven.","",
    "Верни ТОЛЬКО один JSON-объект без markdown:",
    '{"accepted":true,"score":0,"cefr_estimate":"'+target+'","breakdown":{"meaning":0,"grammar":0,"vocabulary":0,"coherence":0},"corrected":"","explanation_ru":"","strengths_ru":[""],"improvements_ru":[""],"error_tag":""}',"",
    "Правила:","- score: целое 0–100.","- breakdown: четыре целых 0–100.",
    "- accepted=true, если ответ выполняет задачу и в целом понятен на целевом уровне; мелкие ошибки не должны автоматически давать отказ.",
    "- corrected: естественный улучшенный вариант на норвежском; если исправлять нечего, можно повторить ответ.",
    "- explanation_ru: 1–3 коротких предложения по-русски, конкретно по этому ответу.",
    "- strengths_ru и improvements_ru: максимум по 2 коротких пункта.",
    "- error_tag: word_order, verb_form, article, vocabulary, task, coherence или пустая строка.",
    exam?"- В экзаменационном режиме будь строже к полноте, связности и уровню языка.":"",
    speaking?"- Не оценивай фонетику: доступен только текст распознавания.":""
  ].filter(Boolean).join("\n");

  try{
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
      body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,reasoning:{effort:"none"},max_output_tokens:700})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      const e=data?.error||{};
      return res.status(502).json({error:"AI_REQUEST_FAILED",code:e.code||e.type||("OPENAI_"+r.status),upstreamStatus:r.status});
    }
    const text=(data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"";
    const clean=text.replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();
    let parsed;
    try{parsed=JSON.parse(clean)}catch{
      const a=clean.indexOf("{"),b=clean.lastIndexOf("}");
      if(a<0||b<=a) throw new Error("NO_JSON");
      parsed=JSON.parse(clean.slice(a,b+1));
    }
    parsed.score=Math.max(0,Math.min(100,Math.round(Number(parsed.score)||0)));
    if(!parsed.breakdown||typeof parsed.breakdown!=="object") parsed.breakdown={};
    for(const k of ["meaning","grammar","vocabulary","coherence"]){
      parsed.breakdown[k]=Math.max(0,Math.min(100,Math.round(Number(parsed.breakdown[k])||0)));
    }
    parsed.accepted=Boolean(parsed.accepted);
    parsed.cefr_estimate=String(parsed.cefr_estimate||target);
    parsed.corrected=String(parsed.corrected||"").slice(0,1800);
    parsed.explanation_ru=String(parsed.explanation_ru||"").slice(0,1600);
    parsed.strengths_ru=Array.isArray(parsed.strengths_ru)?parsed.strengths_ru.slice(0,2):[];
    parsed.improvements_ru=Array.isArray(parsed.improvements_ru)?parsed.improvements_ru.slice(0,2):[];
    parsed.error_tag=String(parsed.error_tag||"").slice(0,50);
    return res.status(200).json(parsed);
  }catch(e){
    return res.status(500).json({error:"AI_PARSE_FAILED",code:"AI_PARSE_FAILED"});
  }
}