import {guard} from "./_guard.js";

function parseJson(text){
  const clean=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();
  try{return JSON.parse(clean)}catch{
    const a=clean.indexOf("{"),b=clean.lastIndexOf("}");
    if(a<0||b<=a)throw new Error("NO_JSON");
    return JSON.parse(clean.slice(a,b+1));
  }
}
async function ask(prompt,max=900,effort="none"){
  const r=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
    body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,reasoning:{effort},max_output_tokens:max})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
    const e=data?.error||{};
    throw Object.assign(new Error("UPSTREAM"),{code:e.code||e.type||("OPENAI_"+r.status),status:r.status});
  }
  return (data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"";
}
function clean(x,n=180){return String(x||"").replace(/\s+/g," ").trim().slice(0,n)}
function normLemma(x){return clean(x,120).toLowerCase().replace(/^å\s+/,"").replace(/\s+/g," ")}

export default async function handler(req,res){
  if(req.method==="GET")return res.status(200).json({ok:true,configured:Boolean(process.env.OPENAI_API_KEY),model:"gpt-5.6-luna",version:"4.1.0"});
  if(req.method!=="POST")return res.status(405).json({error:"POST_ONLY",code:"POST_ONLY"});
  if(!await guard(req,res,{limit:85}))return;
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI_NOT_CONFIGURED",code:"AI_NOT_CONFIGURED"});

  const body=req.body||{};
  if(body.action==="lexical_gap"){
    const {text="",context="",level="A1",source="answer"}=body;
    if(typeof text!=="string"||!text.trim())return res.status(200).json({candidates:[]});
    if(text.length>2500)return res.status(413).json({error:"TEXT_TOO_LONG"});
    const target=["A1","A2","B1","B2"].includes(level)?level:"A1";
    const hasCyr=/[\u0400-\u04FF]/.test(text);
    const prompt=[
      "Ты анализируешь реальную попытку русскоязычного ученика говорить или писать на норвежском Bokmål.",
      "Уровень ученика: "+target+". Источник: "+source+".",
      "Контекст: "+clean(context,600)+".",
      "Реплика ученика: "+text,
      "",
      "Найди только реальные ЛЕКСИЧЕСКИЕ пробелы: слово или устойчивую конструкцию, которой ученику не хватило.",
      "Если внутри норвежской фразы вставлен русский фрагмент, определи нужный норвежский эквивалент по смыслу.",
      "Не путай уже известное норвежское слово с пробелом. Пример: «Jeg буду gå på tur» — ученик уже знает gå; пробел здесь — конструкция будущего, например skal + infinitiv / kommer til å + infinitiv, а не слово gå.",
      "Если проблема только в артикле, порядке слов или окончании, не создавай словарный кандидат.",
      "Если неверный выбор норвежского слова явно показывает нужный частотный лемматический эквивалент, кандидат допустим.",
      "Для глагола target_lemma указывай инфинитив без å. Для конструкции — компактно: skal + infinitiv, ha lyst til å + infinitiv и т.п.",
      "confidence 0–1; useful_now=true только если единицу действительно стоит учить сейчас.",
      "Верни только JSON:",
      '{"candidates":[{"target_lemma":"...","translation_ru":"...","kind":"verb|modal|noun|adjective|adverb|function|phrase","source_fragment":"...","reason_ru":"...","confidence":0.0,"useful_now":true,"corrected_sentence":"..."}]}',
      "Максимум 3 кандидата, обычно 0–1."
    ].join("\n");
    try{
      const out=parseJson(await ask(prompt,900,hasCyr?"low":"none"));
      const arr=(Array.isArray(out.candidates)?out.candidates:[]).slice(0,3).map(x=>({
        target_lemma:normLemma(x.target_lemma),
        translation_ru:clean(x.translation_ru,180),
        kind:["verb","modal","noun","adjective","adverb","function","phrase"].includes(x.kind)?x.kind:"phrase",
        source_fragment:clean(x.source_fragment,220),
        reason_ru:clean(x.reason_ru,360),
        confidence:Math.max(0,Math.min(1,Number(x.confidence)||0)),
        useful_now:Boolean(x.useful_now),
        corrected_sentence:clean(x.corrected_sentence,500)
      })).filter(x=>x.target_lemma&&x.translation_ru&&x.useful_now&&x.confidence>=0.68);
      return res.status(200).json({candidates:arr});
    }catch(e){return res.status(502).json({error:"LEXICAL_GAP_FAILED",code:e?.code||"LEXICAL_GAP_FAILED"})}
  }

  const {answer,question,goal,level="A1",mode="lesson"}=body;
  if(typeof answer!=="string"||typeof question!=="string"||!answer.trim()||!question.trim())return res.status(400).json({error:"MISSING_INPUT",code:"MISSING_INPUT"});
  if(answer.length>6000||question.length>2000)return res.status(413).json({error:"INPUT_TOO_LONG",code:"INPUT_TOO_LONG"});
  const target=["A1","A2","B1","B2"].includes(level)?level:"A1";
  const exam=String(mode).startsWith("exam"),speaking=String(mode).includes("speaking");
  const prompt=[
    "Ты строгий, но практичный преподаватель норвежского Bokmål для русскоязычного взрослого ученика.",
    "Целевой уровень: "+target+". Режим: "+mode+".",
    "Задание: "+question,
    "Цель задания: "+(goal||question),
    "Ответ ученика:",answer,"",
    "Оцени только качество норвежского языка и выполнение коммуникативной задачи. Не оценивай знания о теме.",
    "Учитывай естественные эквивалентные ответы: не требуй совпадения с образцом.",
    "Если ученик вставил русское слово или фрагмент внутрь норвежской фразы, считай это лексическим пробелом: сохрани понятный смысл, замени русский фрагмент естественным Bokmål в corrected и используй error_tag=vocabulary. Не приписывай незнание уже правильно использованного норвежского слова.",
    "Для устной речи оценивай текст распознанной речи; не делай выводов о произношении, которого ты не слышишь.",
    "Для экзамена это только тренировочная оценка, не официальный результат Norskprøven.","",
    "Верни только один JSON-объект:",
    '{"accepted":true,"score":0,"cefr_estimate":"'+target+'","breakdown":{"meaning":0,"grammar":0,"vocabulary":0,"coherence":0},"corrected":"","explanation_ru":"","strengths_ru":[""],"improvements_ru":[""],"error_tag":""}',"",
    "score и breakdown: целые 0–100.",
    "accepted=true, если ответ выполняет задачу и в целом понятен на целевом уровне; мелкие ошибки не должны автоматически давать отказ.",
    "corrected: естественный улучшенный вариант на норвежском.",
    "explanation_ru: 1–3 коротких конкретных предложения.",
    "strengths_ru и improvements_ru: максимум по 2 пункта.",
    "error_tag: word_order, verb_form, article, vocabulary, task, coherence или пустая строка.",
    exam?"В экзаменационном режиме будь строже к полноте, связности и уровню языка.":"",
    speaking?"Не оценивай фонетику: доступен только текст распознавания.":""
  ].filter(Boolean).join("\n");
  try{
    const parsed=parseJson(await ask(prompt,700,"none"));
    parsed.score=Math.max(0,Math.min(100,Math.round(Number(parsed.score)||0)));
    if(!parsed.breakdown||typeof parsed.breakdown!=="object")parsed.breakdown={};
    for(const k of ["meaning","grammar","vocabulary","coherence"])parsed.breakdown[k]=Math.max(0,Math.min(100,Math.round(Number(parsed.breakdown[k])||0)));
    parsed.accepted=Boolean(parsed.accepted);parsed.cefr_estimate=String(parsed.cefr_estimate||target);
    parsed.corrected=String(parsed.corrected||"").slice(0,1800);parsed.explanation_ru=String(parsed.explanation_ru||"").slice(0,1600);
    parsed.strengths_ru=Array.isArray(parsed.strengths_ru)?parsed.strengths_ru.slice(0,2):[];
    parsed.improvements_ru=Array.isArray(parsed.improvements_ru)?parsed.improvements_ru.slice(0,2):[];
    parsed.error_tag=String(parsed.error_tag||"").slice(0,50);
    return res.status(200).json(parsed);
  }catch(e){
    return res.status(502).json({error:"AI_EVALUATE_FAILED",code:e?.code||"AI_EVALUATE_FAILED"});
  }
}
