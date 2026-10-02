import {guard} from "./_guard.js";

function parseJson(text){
  const s=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();
  try{return JSON.parse(s)}catch{
    const a=s.indexOf("{"),b=s.lastIndexOf("}");
    if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));
    throw new Error("NO_JSON");
  }
}

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST_ONLY",code:"POST_ONLY"});
  if(!guard(req,res,{limit:90})) return;
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI_NOT_CONFIGURED",code:"AI_NOT_CONFIGURED"});

  const {message="",level="A1",mode="free",topic="",scenario="",history=[],start=false,practiceWords=[]}=req.body||{};
  if(!start&&(typeof message!=="string"||!message.trim())) return res.status(400).json({error:"MISSING_MESSAGE",code:"MISSING_MESSAGE"});
  if(message.length>1800) return res.status(413).json({error:"MESSAGE_TOO_LONG",code:"MESSAGE_TOO_LONG"});
  const allowedLevels=["A1","A2","B1","B2"];
  const target=allowedLevels.includes(level)?level:"A1";
  const allowedModes=["free","corrections","exam","roleplay"];
  const chatMode=allowedModes.includes(mode)?mode:"free";
  const cleanHistory=Array.isArray(history)?history.slice(-16).map(x=>({
    role:x?.role==="assistant"?"assistant":"user",
    text:String(x?.text||"").slice(0,700)
  })).filter(x=>x.text):[];

  const levelRules={
    A1:"Используй очень короткие предложения, частотные слова и один вопрос за раз. Говори медленно по смыслу: без длинных конструкций.",
    A2:"Используй простые бытовые фразы, связки fordi/men/derfor и умеренно короткие ответы.",
    B1:"Поддерживай естественный разговор, проси объяснять причины и развивать ответ. Используй нормальную разговорную лексику.",
    B2:"Говори естественно и нюансированно, допускай абстрактные темы, аргументацию, идиомы умеренной сложности и контраргументы."
  };
  const modeRules={
    free:"Веди естественный разговор. Исправляй только ошибки, которые мешают смыслу, и не превращай каждый ответ в урок.",
    corrections:"После каждого ответа кратко исправляй важные ошибки и сразу продолжай разговор.",
    exam:"Веди себя как экзаменатор: не подсказывай формулировки, задавай один вопрос за раз, проси развить ответ. После ответа дай очень краткую учебную обратную связь, но не выставляй официальный балл.",
    roleplay:"Оставайся в выбранной роли и поддерживай правдоподобный бытовой или рабочий диалог."
  };

  const transcript=cleanHistory.map(x=>(x.role==="assistant"?"Собеседник":"Ученик")+": "+x.text).join("\n");const learned=Array.isArray(practiceWords)?practiceWords.slice(0,15).map(x=>String(x).slice(0,100)).filter(Boolean):[];
  const prompt=[
    "Ты норвежский собеседник для практики Bokmål с русскоязычным взрослым учеником.",
    "Уровень ученика: "+target+".",
    "Режим: "+chatMode+".",
    "Тема разговора: "+(String(topic).slice(0,180)||"любая тема, которую выбрал ученик")+".",
    chatMode==="roleplay"?"Ролевая ситуация: "+(String(scenario).slice(0,240)||"естественная бытовая ситуация")+".":"",
    levelRules[target],
    modeRules[chatMode],
    "Основной язык разговора — норвежский Bokmål.",
    "Не требуй дословных ответов. Реагируй на смысл того, что сказал ученик.",
    learned.length?"Слова, которые ученик недавно изучил: "+learned.join(", ")+". Естественно используй 2–4 из них в своих репликах и вопросах, чтобы они регулярно повторялись в контексте. Не вставляй их насильно.":"",
    "Не задавай два-три новых вопроса одновременно: максимум один основной вопрос в конце.",
    "Если ученик явно просит объяснение по-русски, можно кратко объяснить по-русски и затем вернуться к норвежскому.",
    "Если ошибка есть, corrected должен содержать естественный исправленный вариант ответа ученика целиком или пустую строку, если исправление не нужно.",
    "explanation_ru — максимум 2 коротких предложения, только если есть полезное исправление.",
    "Оцени ответ учебно по 0–100, где score отражает понятность и соответствие уровню, но не является официальной оценкой.",
    "suggested_level может быть A1/A2/B1/B2 или пустой строкой. Меняй его только если по нескольким репликам очевидно, что текущий уровень слишком лёгкий или слишком трудный.",
    transcript?"Предыдущий разговор:\n"+transcript:"",
    start?"Начни разговор первым: естественно поздоровайся и задай один вопрос по выбранной теме на нужном уровне.":"Новая реплика ученика: "+message,
    "",
    "Верни ТОЛЬКО JSON без markdown:",
    '{"reply_no":"...","translation_ru":"","corrected":"","explanation_ru":"","score":0,"error_tag":"","suggested_level":""}',
    "reply_no: 1–5 предложений на Bokmål и в конце максимум один естественный вопрос.",
    "translation_ru: короткий перевод reply_no на русский; нужен для кнопки подсказки, а не для постоянного показа.",
    "error_tag: word_order, verb_form, article, vocabulary, coherence, task или пустая строка."
  ].filter(Boolean).join("\n");

  try{
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
      body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,reasoning:{effort:"low"},max_output_tokens:900})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      const e=data?.error||{};
      return res.status(502).json({error:"AI_REQUEST_FAILED",code:e.code||e.type||("OPENAI_"+r.status)});
    }
    const text=(data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"";
    const out=parseJson(text);
    out.reply_no=String(out.reply_no||"").slice(0,1800);
    out.translation_ru=String(out.translation_ru||"").slice(0,1800);
    out.corrected=String(out.corrected||"").slice(0,1200);
    out.explanation_ru=String(out.explanation_ru||"").slice(0,1000);
    out.score=Math.max(0,Math.min(100,Math.round(Number(out.score)||0)));
    out.error_tag=String(out.error_tag||"").slice(0,50);
    out.suggested_level=allowedLevels.includes(out.suggested_level)?out.suggested_level:"";
    return res.status(200).json(out);
  }catch{
    return res.status(500).json({error:"AI_CHAT_FAILED",code:"AI_CHAT_FAILED"});
  }
}
