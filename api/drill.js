import {guard} from "./_guard.js";
function parseJson(text){const s=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();try{return JSON.parse(s)}catch{const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));throw new Error("NO_JSON")}}
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"POST_ONLY"});
  if(!guard(req,res,{limit:28}))return;
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI_NOT_CONFIGURED"});
  const {kind="dictation",level="A1",practiceWords=[],weakSkills=[]}=req.body||{};
  const words=Array.isArray(practiceWords)?practiceWords.slice(0,12).map(x=>String(x).slice(0,90)):[];
  const weak=Array.isArray(weakSkills)?weakSkills.slice(0,4).map(String):[];
  const base=["Ты преподаватель норвежского Bokmål.","Уровень: "+level+".","Недавно изученные слова: "+(words.join(", ")||"нет")+".","Слабые навыки: "+weak.join(", ")+".","Используй естественный современный Bokmål. Не копируй официальные экзаменационные задания.","Верни только JSON."];
  let prompt;
  if(kind==="grammar"){
    prompt=[...base,"Создай 6 коротких грамматических заданий. Используй недавно изученные слова, где естественно.","JSON: {\"items\":[{\"q_ru\":\"...\",\"opts\":[4 варианта на норвежском],\"correct\":0,\"explanation_ru\":\"...\"}]}"].join("\n");
  }else{
    prompt=[...base,"Создай 6 предложений для диктанта. Смешивай старую и новую лексику; покрой настоящее, прошлое, perfektum и планы/будущее. Длина зависит от уровня.","JSON: {\"items\":[{\"audio_no\":\"...\",\"translation_ru\":\"...\",\"focus_words\":[\"...\"]}]}"].join("\n");
  }
  try{
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,reasoning:{effort:"low"},max_output_tokens:1500})});
    const data=await r.json().catch(()=>({}));if(!r.ok)return res.status(502).json({error:"AI_REQUEST_FAILED",code:data?.error?.code||("OPENAI_"+r.status)});
    const text=(data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"",out=parseJson(text);
    if(!Array.isArray(out.items)||out.items.length<4)return res.status(502).json({error:"BAD_AI_OUTPUT"});
    return res.status(200).json({kind,items:out.items.slice(0,6)});
  }catch{return res.status(500).json({error:"DRILL_AI_FAILED"})}
}