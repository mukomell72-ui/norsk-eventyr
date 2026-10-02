import {guard} from "./_guard.js";

function audioMeta(rawMime=""){
  const base=String(rawMime||"audio/webm").toLowerCase().split(";")[0].trim();
  const map={
    "audio/webm":["audio/webm","speech.webm"],
    "audio/ogg":["audio/ogg","speech.ogg"],
    "audio/mp4":["audio/mp4","speech.m4a"],
    "audio/m4a":["audio/mp4","speech.m4a"],
    "audio/mpeg":["audio/mpeg","speech.mp3"],
    "audio/mp3":["audio/mpeg","speech.mp3"],
    "audio/wav":["audio/wav","speech.wav"],
    "audio/x-wav":["audio/wav","speech.wav"]
  };
  return map[base]||["audio/webm","speech.webm"];
}

async function transcribe(bytes,type,name,model){
  const fd=new FormData();
  fd.append("model",model);
  fd.append("language","no");
  fd.append("file",new Blob([bytes],{type}),name);
  const r=await fetch("https://api.openai.com/v1/audio/transcriptions",{
    method:"POST",
    headers:{"Authorization":"Bearer "+process.env.OPENAI_API_KEY},
    body:fd
  });
  const data=await r.json().catch(()=>({}));
  return {ok:r.ok,status:r.status,data};
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"POST_ONLY",code:"POST_ONLY"});
  if(!guard(req,res,{limit:40}))return;
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI_NOT_CONFIGURED",code:"AI_NOT_CONFIGURED"});

  const {audioBase64="",mime="audio/webm"}=req.body||{};
  if(typeof audioBase64!=="string"||audioBase64.length<100||audioBase64.length>9000000){
    return res.status(400).json({error:"BAD_AUDIO",code:"BAD_AUDIO"});
  }

  try{
    const bytes=Buffer.from(audioBase64,"base64");
    if(bytes.length<64)return res.status(400).json({error:"BAD_AUDIO",code:"BAD_AUDIO"});
    const [type,name]=audioMeta(mime);

    // Use the broadly supported transcription model first. If the account
    // temporarily rejects it, retry once with the full-size transcription model.
    let r=await transcribe(bytes,type,name,"gpt-4o-mini-transcribe");
    if(!r.ok&&(r.status===400||r.status===404||r.data?.error?.code==="invalid_value"||r.data?.error?.code==="model_not_found")){
      r=await transcribe(bytes,type,name,"gpt-4o-transcribe");
    }

    if(!r.ok){
      const e=r.data?.error||{};
      return res.status(502).json({
        error:"TRANSCRIBE_FAILED",
        code:e.code||e.type||("OPENAI_"+r.status),
        detail:String(e.message||"").slice(0,240)
      });
    }

    const text=String(r.data?.text||"").trim();
    if(!text)return res.status(422).json({error:"NO_SPEECH",code:"NO_SPEECH"});
    return res.status(200).json({text});
  }catch{
    return res.status(500).json({error:"TRANSCRIBE_FAILED",code:"TRANSCRIBE_FAILED"});
  }
}
