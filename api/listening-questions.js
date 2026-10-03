import {guard} from "./_guard.js";
function parseJson(text){const s=String(text||"").replace(/^\x60\x60\x60json\s*/i,"").replace(/\x60\x60\x60\s*$/,"").trim();try{return JSON.parse(s)}catch{const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));throw new Error("NO_JSON")}}
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"POST_ONLY"});
  if(!guard(req,res,{limit:20}))return;
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI_NOT_CONFIGURED"});
  const {transcript="",level="A1",practiceWords=[]}=req.body||{};
  if(typeof transcript!=="string"||transcript.trim().length<40||transcript.length>12000)return res.status(400).json({error:"BAD_TRANSCRIPT"});
  const words=Array.isArray(practiceWords)?practiceWords.slice(0,12).map(x=>String(x).slice(0,80)):[];
  const prompt=[
    "Создай задания на понимание услышанного по данному норвежскому Bokmål-транскрипту.",
    "Уровень ученика: "+level+".",
    "Не придумывай факты, которых нет в транскрипте.",
    "Вопросы по-русски, варианты ответа преимущественно по-норвежски.",
    "Если естественно, обращай внимание на недавно изученные слова: "+(words.join(", ")||"нет")+".",
    "Сделай ровно 5 вопросов с четырьмя вариантами и одним однозначным ответом.",
    "Также дай 5 полезных слов/выражений из самого транскрипта.",
    "Верни только JSON:",
    '{"title":"...","summary_ru":"...","questions":[{"q":"...","opts":["...","...","...","..."],"correct":0,"evidence_no":"..."}],"vocabulary":[["no","ru"]]}',
    "ТРАНСКРИПТ:",
    transcript
  ].join("\n");
  try{
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,reasoning:{effort:"low"},max_output_tokens:1800})});
    const data=await r.json().catch(()=>({}));if(!r.ok)return res.status(502).json({error:"AI_REQUEST_FAILED",code:data?.error?.code||("OPENAI_"+r.status)});
    const text=(data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text||"",out=parseJson(text);
    if(!Array.isArray(out.questions)||out.questions.length<5||!out.questions.every(x=>x&&typeof x.q==="string"&&x.q.trim()&&Array.isArray(x.opts)&&x.opts.length===4&&x.opts.every(o=>typeof o==="string"&&o.trim())&&x.correct!==null&&x.correct!==""&&typeof x.correct!=="boolean"&&Number.isInteger(Number(x.correct))&&Number(x.correct)>=0&&Number(x.correct)<4))return res.status(502).json({error:"BAD_AI_OUTPUT"});
    out.questions=out.questions.slice(0,5).map(x=>({q:String(x.q||"").slice(0,300),opts:Array.isArray(x.opts)?x.opts.slice(0,4).map(y=>String(y).slice(0,180)):[],correct:Math.max(0,Math.min(3,Number(x.correct)||0)),evidence_no:String(x.evidence_no||"").slice(0,360)})).filter(x=>x.opts.length===4);
    out.vocabulary=(Array.isArray(out.vocabulary)?out.vocabulary:[]).slice(0,5).map(x=>[String(x?.[0]||"").slice(0,100),String(x?.[1]||"").slice(0,140)]);
    return res.status(200).json(out);
  }catch{return res.status(500).json({error:"LISTENING_AI_FAILED"})}
}