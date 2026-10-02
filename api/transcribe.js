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

function cleanHint(v,max=420){
  return String(v||"").replace(/[\r\n\t]+/g," ").replace(/\s{2,}/g," ").trim().slice(0,max);
}

function norwegianPrompt(expected="",context=""){
  const exp=cleanHint(expected,260),ctx=cleanHint(context,420);
  let p="Dette er tale på norsk bokmål fra en språkelev med utenlandsk aksent. Transkriber nøyaktig det som faktisk blir sagt. Bruk vanlig bokmålsortografi. Ikke oversett, ikke rett grammatikk, og ikke bytt til svensk, dansk, engelsk eller et annet språk bare på grunn av aksenten. Hvis eleven faktisk sier et russisk eller ukrainsk ord fordi et norsk ord mangler, behold det ordet i stedet for å gjette et norsk ord.";
  if(exp)p+=" Øvingsfrase: "+exp+". Ikke anta at eleven sa hele frasen; bruk den bare som uttalekontekst.";
  if(ctx)p+=" Kontekst og relevante norske ord: "+ctx+". Ikke kopier konteksten hvis den ikke høres i opptaket.";
  return p;
}

async function transcribe(bytes,type,name,model,prompt,language="no"){
  const fd=new FormData();
  fd.append("model",model);
  fd.append("language",language);
  fd.append("temperature","0");
  fd.append("response_format","json");
  fd.append("prompt",prompt);
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
  if(!guard(req,res,{limit:50}))return;
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI_NOT_CONFIGURED",code:"AI_NOT_CONFIGURED"});

  const {audioBase64="",mime="audio/webm",expected="",context=""}=req.body||{};
  if(typeof audioBase64!=="string"||audioBase64.length<100||audioBase64.length>9000000){
    return res.status(400).json({error:"BAD_AUDIO",code:"BAD_AUDIO"});
  }

  try{
    const bytes=Buffer.from(audioBase64,"base64");
    if(bytes.length<64)return res.status(400).json({error:"BAD_AUDIO",code:"BAD_AUDIO"});
    const [type,name]=audioMeta(mime),hint=norwegianPrompt(expected,context);

    // Accuracy matters more than a small latency saving for a language learner:
    // use the full transcription model first, then the mini model as fallback.
    let r=await transcribe(bytes,type,name,"gpt-4o-transcribe",hint,"no");
    if(!r.ok){
      r=await transcribe(bytes,type,name,"gpt-4o-mini-transcribe-2025-12-15",hint,"no");
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
    return res.status(200).json({text,model:r.data?.model||undefined});
  }catch{
    return res.status(500).json({error:"TRANSCRIBE_FAILED",code:"TRANSCRIBE_FAILED"});
  }
}
