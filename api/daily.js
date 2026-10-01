import {guard} from "./_guard.js";

function parseJson(text){
  const s=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();
  try{return JSON.parse(s)}catch{
    const a=s.indexOf("{"),b=s.lastIndexOf("}");
    if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));
    throw new Error("NO_JSON");
  }
}
function cleanWord(x){return String(x||"").toLowerCase().normalize("NFKC").trim().replace(/\s+/g," ")}

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST_ONLY",code:"POST_ONLY"});
  if(!guard(req,res,{limit:20})) return;
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI_NOT_CONFIGURED",code:"AI_NOT_CONFIGURED"});

  const {level="A1",date="",knownWords=[],reviewWords=[],weakSkills=[],dayNumber=1}=req.body||{};
  if(!["A1","A2","B1","B2"].includes(level)) return res.status(400).json({error:"BAD_LEVEL",code:"BAD_LEVEL"});
  const known=Array.isArray(knownWords)?knownWords.slice(-700).map(cleanWord).filter(Boolean):[];
  const knownSet=new Set(known);
  const review=Array.isArray(reviewWords)?reviewWords.slice(0,14).map(x=>({
    word:String(x?.word||"").slice(0,100),
    translation_ru:String(x?.translation_ru||"").slice(0,140),
    daysAgo:Math.max(0,Math.min(365,Number(x?.daysAgo)||0)),
    strength:Math.max(0,Math.min(100,Number(x?.strength)||0))
  })).filter(x=>x.word):[];
  const day=Math.max(1,Math.min(9999,Number(dayNumber)||1));
  const reviewText=review.length?review.map(x=>x.word+" = "+x.translation_ru+" (изучено "+x.daysAgo+" дн. назад, прочность "+x.strength+"%)").join("; "):"нет — это первый день";

  const prompt=[
    "Ты создаёшь ежедневный словарный урок норвежского Bokmål для взрослого русскоязычного ученика.",
    "Уровень CEFR: "+level+". Дата: "+String(date).slice(0,20)+". День программы: "+day+".",
    "Слабые навыки: "+(Array.isArray(weakSkills)?weakSkills.join(", "):"")+".",
    "Уже изученные слова, которые нельзя выдавать как новые: "+known.slice(-600).join(", ")+".",
    "Слова прошлых дней, которые НУЖНО активно закреплять сегодня: "+reviewText+".",
    "",
    "Сгенерируй 7 кандидатов новых полезных единиц; сервер выберет первые 5 уникальных.",
    "Состав новых пяти: 2 обычных глагола + 1 модальный/вспомогательный или важная служебная конструкция + 1 существительное + 1 прилагательное/наречие.",
    "Не повторяй старые слова как новые. Не используй редкую книжную лексику ниже B2.",
    "Для обычных глаголов: infinitiv, presens, preteritum, perfektum partisipp, perfektum с har, будущее как КОНСТРУКЦИЯ (skal/vil/kommer til å + infinitiv).",
    "В Bokmål нет отдельного морфологического будущего времени. Всегда пиши 'будущее (конструкция)', не 'future form'.",
    "Для модальных глаголов дай реальные употребительные формы и естественные конструкции настоящего, прошлого и будущего.",
    "Для существительных: род, ubestemt entall, bestemt entall, ubestemt flertall, bestemt flertall.",
    "Для прилагательных: common, neuter, plural/definite, comparative, superlative. Для наречий/служебных слов — только реально существующие формы/конструкции.",
    "",
    "КЛЮЧЕВОЕ ПРАВИЛО ЗАКРЕПЛЕНИЯ:",
    "- Если reviewWords не пуст, в примерах новых слов естественно используй слова прошлых дней как можно чаще, без искусственных фраз.",
    "- Создай 6 заданий practice. В каждом, где это естественно, сочетай хотя бы 1 новое слово и 1 слово прошлых дней.",
    "- Создай 5 reinforcement_sentences: короткие норвежские предложения, смешивающие новые и старые слова. Одно и то же старое слово допустимо повторять несколько раз, если оно слабое.",
    "- В заданиях должны встречаться настоящее, прошедшее и будущее/план.",
    "",
    "Верни только JSON без markdown:",
    '{"words":[{"word":"...","lemma":"...","pos":"verb|modal|noun|adjective|adverb|function","gender":"","translation_ru":"...","forms":[{"label":"...","form":"..."}],"examples":[{"label":"настоящее","no":"...","ru":"..."},{"label":"прошлое","no":"...","ru":"..."},{"label":"будущее","no":"...","ru":"..."}],"collocation":"...","note_ru":"..."}],"practice":[{"prompt_ru":"...","goal_ru":"...","model_answer_no":"...","review_words":["..."],"new_words":["..."]}],"reinforcement_sentences":[{"no":"...","ru":"...","words":["..."]}]}'
  ].join("\n");

  try{
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
      body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,reasoning:{effort:"low"},max_output_tokens:3600})
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
      const forms=Array.isArray(item?.forms)?item.forms.slice(0,8).map(x=>({label:String(x?.label||"").slice(0,70),form:String(x?.form||"").slice(0,140)})).filter(x=>x.form):[];
      const examples=Array.isArray(item?.examples)?item.examples.slice(0,3).map(x=>({label:String(x?.label||"").slice(0,40),no:String(x?.no||"").slice(0,260),ru:String(x?.ru||"").slice(0,280)})).filter(x=>x.no):[];
      words.push({
        word:String(item?.word||lemma).slice(0,120),lemma:String(item?.lemma||item?.word||lemma).slice(0,120),pos,
        gender:String(item?.gender||"").slice(0,20),translation_ru:String(item?.translation_ru||"").slice(0,180),
        forms,examples,collocation:String(item?.collocation||"").slice(0,180),note_ru:String(item?.note_ru||"").slice(0,340)
      });
      if(words.length===5)break;
    }
    if(words.length!==5)return res.status(502).json({error:"AI_DAILY_VALIDATION_FAILED",code:"AI_DAILY_VALIDATION_FAILED"});

    const practice=(Array.isArray(parsed.practice)?parsed.practice:[]).slice(0,6).map(x=>({
      prompt_ru:String(x?.prompt_ru||"").slice(0,420),
      goal_ru:String(x?.goal_ru||"").slice(0,240),
      model_answer_no:String(x?.model_answer_no||"").slice(0,420),
      review_words:Array.isArray(x?.review_words)?x.review_words.slice(0,6).map(y=>String(y).slice(0,100)):[],
      new_words:Array.isArray(x?.new_words)?x.new_words.slice(0,6).map(y=>String(y).slice(0,100)):[]
    })).filter(x=>x.prompt_ru&&x.model_answer_no);
    const reinforcement=(Array.isArray(parsed.reinforcement_sentences)?parsed.reinforcement_sentences:[]).slice(0,5).map(x=>({
      no:String(x?.no||"").slice(0,320),ru:String(x?.ru||"").slice(0,340),
      words:Array.isArray(x?.words)?x.words.slice(0,8).map(y=>String(y).slice(0,100)):[]
    })).filter(x=>x.no);

    return res.status(200).json({date:String(date).slice(0,20),level,words,practice,reinforcement_sentences:reinforcement,review_words:review.map(x=>x.word)});
  }catch{
    return res.status(500).json({error:"AI_DAILY_FAILED",code:"AI_DAILY_FAILED"});
  }
}
