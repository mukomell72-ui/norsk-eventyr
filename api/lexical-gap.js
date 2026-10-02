import {guard} from "./_guard.js";

function parseJson(text){
  const s=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();
  try{return JSON.parse(s)}catch{
    const a=s.indexOf("{"),b=s.lastIndexOf("}");
    if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));
    throw new Error("NO_JSON");
  }
}
function clean(x,n=180){return String(x||"").replace(/\s+/g," ").trim().slice(0,n)}
function normLemma(x){return clean(x,120).toLowerCase().replace(/^å\s+/,"").replace(/\s+/g," ")}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"POST_ONLY"});
  if(!guard(req,res,{limit:80}))return;
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI_NOT_CONFIGURED"});

  const {text="",context="",level="A1",source="answer"}=req.body||{};
  if(typeof text!=="string"||!text.trim())return res.status(200).json({candidates:[]});
  if(text.length>2500)return res.status(413).json({error:"TEXT_TOO_LONG"});
  const target=["A1","A2","B1","B2"].includes(level)?level:"A1";
  const hasCyr=/[\u0400-\u04FF]/.test(text);

  const prompt=[
    "Ты анализируешь реальную попытку русскоязычного ученика говорить или писать на норвежском Bokmål.",
    "Уровень ученика: "+target+". Источник: "+source+".",
    "Контекст задания/разговора: "+clean(context,600)+".",
    "Реплика ученика: "+text,
    "",
    "Найди ТОЛЬКО реальные лексические пробелы — слово или устойчивую грамматико-лексическую конструкцию, которой ученику не хватило.",
    "Особенно важно:",
    "1) Если внутри норвежской фразы вставлено русское слово/фрагмент, определи, какое норвежское слово ИЛИ конструкция нужна по смыслу.",
    "2) Не путай уже известное норвежское слово с пробелом. Пример: «Jeg буду gå på tur» — ученик уже знает gå; пробел здесь не «идти», а конструкция будущего, например skal + infinitiv / kommer til å + infinitiv.",
    "3) Если ученик пишет «не знаю как сказать ...», выбери полезный норвежский эквивалент.",
    "4) Если проблема чисто грамматическая (артикль, порядок слов, окончание), НЕ создавай новый словарный кандидат.",
    "5) Если неправильный выбор слова явно показывает, что нужен другой частотный лемматический эквивалент, можно создать кандидата.",
    "6) Кандидат должен быть полезным и частотным для уровня A1–B2. Не добавляй редкие или случайные слова.",
    "",
    "Для глагола target_lemma указывай инфинитив БЕЗ å: kjøpe, gå, forstå.",
    "Для конструкции target_lemma указывай компактно: skal + infinitiv, kommer til å + infinitiv, ha lyst til å + infinitiv.",
    "translation_ru — краткий смысл по-русски.",
    "confidence 0–1. useful_now=true только если это действительно стоит учить сейчас.",
    "corrected_sentence — естественный исправленный Bokmål-вариант всей реплики, если возможно.",
    "",
    "Верни только JSON:",
    '{"candidates":[{"target_lemma":"...","translation_ru":"...","kind":"verb|modal|noun|adjective|adverb|function|phrase","source_fragment":"...","reason_ru":"...","confidence":0.0,"useful_now":true,"corrected_sentence":"..."}]}',
    "Максимум 3 кандидата; обычно 0–1."
  ].join("\n");

  try{
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
      body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,reasoning:{effort:hasCyr?"low":"none"},max_output_tokens:900})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(502).json({error:"AI_REQUEST_FAILED",code:data?.error?.code||("OPENAI_"+r.status)});
    const out=parseJson((data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"");
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
  }catch{return res.status(500).json({error:"LEXICAL_GAP_FAILED"})}
}
