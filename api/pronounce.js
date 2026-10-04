import {guard} from "./_guard.js";
function parseJson(text){const s=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();try{return JSON.parse(s)}catch{const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));throw new Error("NO_JSON")}}
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST_ONLY"});
  if(!await guard(req,res,{limit:24})) return;
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI_NOT_CONFIGURED"});
  const {audioBase64="",expected=""}=req.body||{};
  if(typeof audioBase64!=="string"||audioBase64.length<500||audioBase64.length>12000000||typeof expected!=="string"||!expected.trim()) return res.status(400).json({error:"BAD_INPUT"});
  const prompt="Ты преподаватель произношения норвежского Bokmål. Прослушай аудиозапись ученика и сравни с целевой фразой: "+expected.slice(0,500)+". Оцени именно слышимую речь: разборчивость, звуки, ударение/ритм и насколько произнесённая фраза соответствует образцу. Не оценивай голос как личную характеристику. Верни только JSON: {\"score\":0,\"clarity\":0,\"rhythm\":0,\"accuracy\":0,\"pronunciation_ru\":\"1-3 коротких предложения\",\"difficult_words\":[\"...\"]}. Все баллы целые 0-100.";
  try{
    const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:"gpt-audio-1.5",modalities:["text"],messages:[{role:"user",content:[{type:"text",text:prompt},{type:"input_audio",input_audio:{data:audioBase64,format:"wav"}}]}]})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(502).json({error:"PRONUNCIATION_FAILED",code:data?.error?.code||("OPENAI_"+r.status)});
    const text=data?.choices?.[0]?.message?.content||"";
    const out=parseJson(text);
    for(const k of ["score","clarity","rhythm","accuracy"])out[k]=Math.max(0,Math.min(100,Math.round(Number(out[k])||0)));
    out.pronunciation_ru=String(out.pronunciation_ru||"").slice(0,1200);
    out.difficult_words=Array.isArray(out.difficult_words)?out.difficult_words.slice(0,5):[];
    return res.status(200).json(out);
  }catch{return res.status(500).json({error:"PRONUNCIATION_FAILED"})}
}
