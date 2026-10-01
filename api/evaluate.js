export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST only"});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI_NOT_CONFIGURED"});
  const {answer,question,goal,level="A1"}=req.body||{};
  if(!answer||!question) return res.status(400).json({error:"Missing answer/question"});
  const prompt=`Ты строгий, доброжелательный преподаватель норвежского Bokmål для русскоязычного ученика уровня ${level}.
Вопрос собеседника: "${question}"
Цель упражнения: "${goal||""}"
Ответ ученика: "${answer}"
Оцени СМЫСЛ и ГРАММАТИКУ, а не совпадение с шаблоном. Принимай естественные эквивалентные ответы. Не требуй дословной фразы.
Верни ТОЛЬКО JSON без markdown:
{"accepted":true,"meaning":true,"grammar":true,"natural":true,"corrected":"...","explanation_ru":"...","error_tag":"","retry":false}
accepted=true только если ответ уместен и достаточно грамматически правилен для ${level}. Если смысл понятен, но есть важная ошибка, accepted=false, corrected=исправленная норвежская фраза, explanation_ru=короткое объяснение по-русски, retry=true.`;
  try{
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:300})});
    if(!r.ok) return res.status(502).json({error:"AI_REQUEST_FAILED",status:r.status});
    const data=await r.json();
    const text=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"";
    const clean=text.replace(/^\`\`\`json\s*|\`\`\`$/g,"").trim();
    return res.status(200).json(JSON.parse(clean));
  }catch(e){return res.status(500).json({error:"AI_PARSE_FAILED"});}
}