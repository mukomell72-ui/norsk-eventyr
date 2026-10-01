import {guard} from "./_guard.js";

function parseJson(text){
  const s=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();
  try{return JSON.parse(s)}catch{
    const a=s.indexOf("{"),b=s.lastIndexOf("}");
    if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));
    throw new Error("NO_JSON");
  }
}
function cleanWord(x){
  return String(x||"").toLowerCase().normalize("NFKC").trim().replace(/\s+/g," ");
}

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST_ONLY",code:"POST_ONLY"});
  if(!guard(req,res,{limit:20})) return;
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI_NOT_CONFIGURED",code:"AI_NOT_CONFIGURED"});

  const {level="A1",date="",knownWords=[],weakSkills=[],dayNumber=1}=req.body||{};
  if(!["A1","A2","B1","B2"].includes(level)) return res.status(400).json({error:"BAD_LEVEL",code:"BAD_LEVEL"});
  const known=Array.isArray(knownWords)?knownWords.slice(-600).map(cleanWord).filter(Boolean):[];
  const knownSet=new Set(known);
  const day=Math.max(1,Math.min(9999,Number(dayNumber)||1));

  const prompt=[
    "Ты создаёшь ежедневный словарный урок норвежского Bokmål для взрослого русскоязычного ученика.",
    "Уровень CEFR: "+level+".",
    "Дата урока: "+String(date).slice(0,20)+".",
    "Номер дня программы: "+day+".",
    "Слабые навыки ученика: "+(Array.isArray(weakSkills)?weakSkills.join(", "):"")+".",
    "Уже изученные слова, которые НЕЛЬЗЯ повторять как новые: "+known.slice(-500).join(", ")+".",
    "",
    "Нужно ровно 5 НОВЫХ полезных слов/лексических единиц.",
    "Состав дня: 2 обычных глагола + 1 модальный/вспомогательный или важное служебное слово + 1 существительное + 1 прилагательное/наречие.",
    "Если базовые модальные глаголы уже были изучены, вместо повторения дай другую важную служебную единицу или фразовый глагольный шаблон.",
    "Не используй редкие, книжные или малоупотребительные слова ниже уровня B2.",
    "Для глаголов обязательно дай формы: infinitiv, presens, preteritum, perfektum partisipp, perfektum с har, и будущее как КОНСТРУКЦИЮ (skal/vil/kommer til å + infinitiv).",
    "В Bokmål нет отдельного морфологического будущего времени — не называй future отдельной формой глагола; помечай именно как 'будущее (конструкция)'.",
    "Для модальных глаголов дай реальные употребительные формы и естественную будущую конструкцию.",
    "Для существительных дай род и формы: ubestemt entall, bestemt entall, ubestemt flertall, bestemt flertall.",
    "Для прилагательных дай common, neuter, plural/definite, comparative, superlative. Для наречий/служебных слов вместо несуществующих форм дай usage forms/типичные конструкции.",
    "У каждого слова дай 3 коротких примера: настоящее/обычное употребление, прошлое или прошедший контекст, будущее/план, где это грамматически уместно.",
    "Добавь 1 частотное словосочетание и короткую заметку об употреблении.",
    "Верни только JSON без markdown:",
    '{"words":[{"word":"...","lemma":"...","pos":"verb|modal|noun|adjective|adverb|function","gender":"","translation_ru":"...","forms":[{"label":"...","form":"..."}],"examples":[{"label":"настоящее","no":"...","ru":"..."},{"label":"прошлое","no":"...","ru":"..."},{"label":"будущее","no":"...","ru":"..."}],"collocation":"...","note_ru":"..."}]}'
  ].join("\n");

  try{
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
      body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,reasoning:{effort:"low"},max_output_tokens:2600})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      const e=data?.error||{};
      return res.status(502).json({error:"AI_REQUEST_FAILED",code:e.code||e.type||("OPENAI_"+r.status)});
    }
    const text=(data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"";
    const parsed=parseJson(text);
    const raw=Array.isArray(parsed.words)?parsed.words:[];
    const seen=new Set(),words=[];
    for(const item of raw){
      const lemma=cleanWord(item?.lemma||item?.word);
      if(!lemma||knownSet.has(lemma)||seen.has(lemma))continue;
      seen.add(lemma);
      const pos=["verb","modal","noun","adjective","adverb","function"].includes(item?.pos)?item.pos:"function";
      const forms=Array.isArray(item?.forms)?item.forms.slice(0,8).map(x=>({label:String(x?.label||"").slice(0,60),form:String(x?.form||"").slice(0,120)})).filter(x=>x.form):[];
      const examples=Array.isArray(item?.examples)?item.examples.slice(0,3).map(x=>({label:String(x?.label||"").slice(0,40),no:String(x?.no||"").slice(0,240),ru:String(x?.ru||"").slice(0,260)})).filter(x=>x.no):[];
      words.push({
        word:String(item?.word||lemma).slice(0,120),
        lemma:String(item?.lemma||item?.word||lemma).slice(0,120),
        pos,
        gender:String(item?.gender||"").slice(0,20),
        translation_ru:String(item?.translation_ru||"").slice(0,180),
        forms,
        examples,
        collocation:String(item?.collocation||"").slice(0,180),
        note_ru:String(item?.note_ru||"").slice(0,320)
      });
      if(words.length===5)break;
    }
    if(words.length!==5)return res.status(502).json({error:"AI_DAILY_VALIDATION_FAILED",code:"AI_DAILY_VALIDATION_FAILED"});
    return res.status(200).json({date:String(date).slice(0,20),level,words});
  }catch{
    return res.status(500).json({error:"AI_DAILY_FAILED",code:"AI_DAILY_FAILED"});
  }
}
