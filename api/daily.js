import {guard} from "./_guard.js";

function parseJson(text){
  const s=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();
  try{return JSON.parse(s)}catch{
    const a=s.indexOf("{"),b=s.lastIndexOf("}");
    if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));
    throw new Error("NO_JSON");
  }
}
function cleanWord(x){return String(x||"").toLowerCase().normalize("NFKC").trim().replace(/^å\s+/,"").replace(/\s+/g," ")}
async function ask(prompt,max=3900,effort="low"){
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,reasoning:{effort},max_output_tokens:max})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error("UPSTREAM"),{code:data?.error?.code||("OPENAI_"+r.status)});
  return (data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"";
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"POST_ONLY"});
  if(!guard(req,res,{limit:24}))return;
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI_NOT_CONFIGURED"});

  const {level="A1",date="",knownWords=[],reviewWords=[],candidateWords=[],weakSkills=[],dayNumber=1}=req.body||{};
  if(!["A1","A2","B1","B2"].includes(level))return res.status(400).json({error:"BAD_LEVEL"});

  const known=Array.isArray(knownWords)?knownWords.slice(-900).map(cleanWord).filter(Boolean):[];
  const knownSet=new Set(known);
  const review=Array.isArray(reviewWords)?reviewWords.slice(0,15).map(x=>({
    word:String(x?.word||"").slice(0,120),
    translation_ru:String(x?.translation_ru||"").slice(0,160),
    daysAgo:Math.max(0,Math.min(365,Number(x?.daysAgo)||0)),
    strength:Math.max(0,Math.min(100,Number(x?.strength)||0)),
    zone:String(x?.zone||"")
  })).filter(x=>x.word):[];
  const candidates=(Array.isArray(candidateWords)?candidateWords:[]).slice(0,12).map(x=>({
    key:String(x?.key||"").slice(0,140),
    lemma:cleanWord(x?.lemma||x?.target_lemma),
    translation_ru:String(x?.translation_ru||"").slice(0,180),
    kind:String(x?.kind||"phrase").slice(0,30),
    occurrences:Math.max(1,Math.min(99,Number(x?.occurrences)||1)),
    confidence:Math.max(0,Math.min(1,Number(x?.confidence)||0.8)),
    reason_ru:String(x?.reason_ru||"").slice(0,260)
  })).filter(x=>x.lemma&&!knownSet.has(x.lemma)).sort((a,b)=>(b.occurrences*10+b.confidence*5)-(a.occurrences*10+a.confidence*5));
  const day=Math.max(1,Math.min(9999,Number(dayNumber)||1));
  const reviewText=review.length?review.map(x=>x.word+" = "+x.translation_ru+" ("+(x.zone||x.daysAgo+" дн.")+", прочность "+x.strength+"%)").join("; "):"нет";
  const candidateText=candidates.length?candidates.map((x,i)=>(i+1)+". key="+x.key+"; "+x.lemma+" = "+x.translation_ru+"; тип="+x.kind+"; встречалось="+x.occurrences+"; причина="+x.reason_ru).join("\n"):"нет";

  const prompt=[
    "Создай ежедневный словарный урок норвежского Bokmål для взрослого русскоязычного ученика.",
    "Уровень CEFR: "+level+". Дата: "+String(date).slice(0,20)+". День программы: "+day+".",
    "Слабые навыки: "+(Array.isArray(weakSkills)?weakSkills.join(", "):"")+".",
    "Уже изученные единицы — НЕЛЬЗЯ выдавать их как новые: "+known.slice(-700).join(", ")+".",
    "",
    "ПЕРСОНАЛЬНЫЕ КАНДИДАТЫ, обнаруженные в собственной речи/письме ученика:",
    candidateText,
    "",
    "ПРАВИЛО ВЫБОРА РОВНО 5 НОВЫХ ЕДИНИЦ:",
    "- Сначала возьми наиболее приоритетные персональные кандидаты. Если их 5 или больше, сегодняшняя пятёрка состоит из пяти лучших кандидатов.",
    "- Если персональных кандидатов меньше 5, используй их ВСЕ, а недостающие позиции дополни частотной полезной лексикой уровня.",
    "- Лексические пробелы ученика важнее искусственной квоты по частям речи.",
    "- Если персональных кандидатов мало, при дополнении старайся дать смесь: обычный глагол, модальный/служебная конструкция, существительное, прилагательное/наречие.",
    "- Для кандидатного слова сохрани candidate_key. Для системно добавленного слова candidate_key должен быть пустой строкой.",
    "",
    "Слова последних трёх учебных дней и слабые старые слова для активного закрепления:",
    reviewText,
    "Используй их в примерах и заданиях максимально часто, но естественно. Слова активных последних 3 дней должны встречаться чаще долговременных.",
    "",
    "ФОРМЫ:",
    "- Для глагола: infinitiv, presens, preteritum, perfektum partisipp, presens perfektum, pluskvamperfektum, будущее (конструкция) и framtid perfektum, где естественно.",
    "- В Bokmål нет отдельного морфологического будущего времени: обозначай его как конструкцию.",
    "- Для модальных/служебных единиц давай только реально существующие формы и типичные конструкции.",
    "- Для существительных: род, ubestemt/bestemt entall и flertall.",
    "- Для прилагательных: common, neuter, plural/definite, comparative, superlative, если формы существуют.",
    "",
    "Для каждой новой единицы дай 3 коротких примера: настоящее/обычное употребление, прошлый контекст, будущее/план — где это грамматически уместно.",
    "Создай 6 практических заданий. В каждом по возможности смешивай минимум одну сегодняшнюю новую единицу и одну единицу предыдущих дней.",
    "Создай 5 reinforcement_sentences, смешивающих сегодняшние и старые слова.",
    "",
    "Верни только JSON без markdown:",
    '{"words":[{"word":"...","lemma":"...","candidate_key":"","source":"learner|system","pos":"verb|modal|noun|adjective|adverb|function|phrase","gender":"","translation_ru":"...","forms":[{"label":"...","form":"..."}],"examples":[{"label":"настоящее","no":"...","ru":"..."},{"label":"прошлое","no":"...","ru":"..."},{"label":"будущее","no":"...","ru":"..."}],"collocation":"...","note_ru":"..."}],"practice":[{"prompt_ru":"...","goal_ru":"...","model_answer_no":"...","review_words":["..."],"new_words":["..."]}],"reinforcement_sentences":[{"no":"...","ru":"...","words":["..."]}]}'
  ].join("\n");

  try{
    let parsed=parseJson(await ask(prompt));
    try{
      const reviewPrompt=[
        "Ты старший преподаватель норвежского Bokmål. Проверь ежедневный словарный JSON уровня "+level+".",
        "Исправь спряжение, род, словоизменение, естественность, переводы и примеры.",
        "Не удаляй персональные candidate_key и source. Сохрани ровно 5 новых единиц и ту же JSON-схему.",
        "Не превращай будущее в несуществующую отдельную форму: это конструкция.",
        "Верни только исправленный JSON.",
        JSON.stringify(parsed)
      ].join("\n");
      const checked=parseJson(await ask(reviewPrompt,3900,"none"));
      if(Array.isArray(checked.words)&&checked.words.length===5)parsed=checked;
    }catch{}

    const raw=Array.isArray(parsed.words)?parsed.words:[];
    const seen=new Set(),words=[];
    for(const item of raw){
      const lemma=cleanWord(item?.lemma||item?.word);
      if(!lemma||knownSet.has(lemma)||seen.has(lemma))continue;
      seen.add(lemma);
      const pos=["verb","modal","noun","adjective","adverb","function","phrase"].includes(item?.pos)?item.pos:"phrase";
      const forms=Array.isArray(item?.forms)?item.forms.slice(0,9).map(x=>({label:String(x?.label||"").slice(0,80),form:String(x?.form||"").slice(0,160)})).filter(x=>x.form):[];
      const examples=Array.isArray(item?.examples)?item.examples.slice(0,3).map(x=>({label:String(x?.label||"").slice(0,40),no:String(x?.no||"").slice(0,280),ru:String(x?.ru||"").slice(0,300)})).filter(x=>x.no):[];
      let candidateKey=String(item?.candidate_key||"").slice(0,140);
      if(!candidateKey){const match=candidates.find(c=>c.lemma===lemma||c.translation_ru.toLowerCase()===String(item?.translation_ru||"").toLowerCase());if(match)candidateKey=match.key}
      words.push({
        word:String(item?.word||lemma).slice(0,140),lemma:String(item?.lemma||item?.word||lemma).slice(0,140),
        candidate_key:candidateKey,source:candidateKey?"learner":"system",pos,
        gender:String(item?.gender||"").slice(0,24),translation_ru:String(item?.translation_ru||"").slice(0,190),
        forms,examples,collocation:String(item?.collocation||"").slice(0,200),note_ru:String(item?.note_ru||"").slice(0,380)
      });
      if(words.length===5)break;
    }
    if(words.length!==5)return res.status(502).json({error:"AI_DAILY_VALIDATION_FAILED",code:"AI_DAILY_VALIDATION_FAILED"});

    const practice=(Array.isArray(parsed.practice)?parsed.practice:[]).slice(0,6).map(x=>({
      prompt_ru:String(x?.prompt_ru||"").slice(0,440),goal_ru:String(x?.goal_ru||"").slice(0,260),
      model_answer_no:String(x?.model_answer_no||"").slice(0,440),
      review_words:Array.isArray(x?.review_words)?x.review_words.slice(0,8).map(y=>String(y).slice(0,120)):[],
      new_words:Array.isArray(x?.new_words)?x.new_words.slice(0,8).map(y=>String(y).slice(0,120)):[]
    })).filter(x=>x.prompt_ru&&x.model_answer_no);
    const reinforcement=(Array.isArray(parsed.reinforcement_sentences)?parsed.reinforcement_sentences:[]).slice(0,5).map(x=>({
      no:String(x?.no||"").slice(0,340),ru:String(x?.ru||"").slice(0,360),
      words:Array.isArray(x?.words)?x.words.slice(0,10).map(y=>String(y).slice(0,120)):[]
    })).filter(x=>x.no);

    return res.status(200).json({
      date:String(date).slice(0,20),level,words,practice,reinforcement_sentences:reinforcement,
      review_words:review.map(x=>x.word),selected_candidate_keys:words.map(x=>x.candidate_key).filter(Boolean)
    });
  }catch(e){
    return res.status(502).json({error:"AI_DAILY_FAILED",code:e?.code||"AI_DAILY_FAILED"});
  }
}
