import {guard} from "./_guard.js";
const voices=["marin","cedar","coral","sage"];
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST_ONLY"});
  if(!guard(req,res,{limit:50})) return;
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI_NOT_CONFIGURED"});
  const {text="",voice="",level="A1"}=req.body||{};
  if(typeof text!=="string"||!text.trim()||text.length>900)return res.status(400).json({error:"BAD_TEXT"});
  const chosen=voices.includes(voice)?voice:"coral";
  const speed=level==="A1"?.82:level==="A2"?.9:level==="B1"?1:1.05;
  try{
    const r=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:"gpt-4o-mini-tts",voice:chosen,input:text,instructions:"Speak natural Norwegian Bokmål with a neutral Norwegian accent. Clear articulation, natural intonation, no theatrical delivery.",response_format:"mp3",speed})});
    if(!r.ok)return res.status(502).json({error:"TTS_FAILED",code:"OPENAI_"+r.status});
    const buf=Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type","audio/mpeg");res.setHeader("Cache-Control","private, max-age=86400");return res.status(200).send(buf);
  }catch{return res.status(500).json({error:"TTS_FAILED"})}
}
