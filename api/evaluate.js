export default async function handler(req,res){
  if(req.method==="GET"){
    return res.status(200).json({ok:true,configured:Boolean(process.env.OPENAI_API_KEY),model:"gpt-5.6-luna"});
  }
  if(req.method!=="POST") return res.status(405).json({error:"POST_ONLY"});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI_NOT_CONFIGURED",code:"AI_NOT_CONFIGURED"});
  const {answer,question,goal,level="A1"}=req.body||{};
  if(!answer||!question) return res.status(400).json({error:"MISSING_INPUT",code:"MISSING_INPUT"});
  const prompt=`Ты преподаватель норвежского Bokmål для русскоязычного ученика уровня ${level}.
Вопрос собеседника: "${question}"
Цель упражнения: "${goal||""}"
Ответ ученика: "${answer}"
Оцени смысл, грамматику и естественность. Принимай естественные эквивалентные ответы и приветствия перед ответом. Не требуй дословного совпадения.
Верни только JSON:
{"accepted":true,"meaning":true,"grammar":true,"natural":true,"corrected":"...","explanation_ru":"...","error_tag":"","retry":false}
Если смысл верный, но есть важная грамматическая ошибка: accepted=false, corrected=исправленный вариант, explanation_ru=короткое объяснение по-русски, retry=true.`;
  try{
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,reasoning:{effort:"none"},max_output_tokens:400})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      const e=data?.error||{};
      return res.status(502).json({error:"AI_REQUEST_FAILED",code:e.code||e.type||("OPENAI_"+r.status),upstreamStatus:r.status});
    }
    const text=(data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"";
    const clean=text.replace(/^\`\`\`json\s*/i,"").replace(/\`\`\`\s*$/,"").trim();
    const parsed=JSON.parse(clean);
    return res.status(200).json(parsed);
  }catch(e){
    return res.status(500).json({error:"AI_PARSE_FAILED",code:"AI_PARSE_FAILED"});
  }
}