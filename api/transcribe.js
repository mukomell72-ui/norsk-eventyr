import {guard} from "./_guard.js";
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST_ONLY"});
  if(!guard(req,res,{limit:35})) return;
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI_NOT_CONFIGURED"});
  const {audioBase64="",mime="audio/webm",expected=""}=req.body||{};
  if(typeof audioBase64!=="string"||audioBase64.length<100||audioBase64.length>9000000)return res.status(400).json({error:"BAD_AUDIO"});
  try{
    const bytes=Buffer.from(audioBase64,"base64");
    const fd=new FormData();fd.append("model","gpt-transcribe");fd.append("file",new Blob([bytes],{type:mime}),mime.includes("ogg")?"speech.ogg":mime.includes("mp4")?"speech.m4a":"speech.webm");
    if(expected)fd.append("prompt","Norwegian Bokmål practice. Expected topic or phrase: "+String(expected).slice(0,500));
    const r=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{"Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:fd});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(502).json({error:"TRANSCRIBE_FAILED",code:data?.error?.code||("OPENAI_"+r.status)});
    return res.status(200).json({text:String(data.text||"").trim()});
  }catch{return res.status(500).json({error:"TRANSCRIBE_FAILED"})}
}
