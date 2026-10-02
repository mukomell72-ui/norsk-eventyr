import {guard} from "./_guard.js";
const SB_URL="https://rskgbkgtrigtznnksbyp.supabase.co";
const SB_KEY="sb_publishable_Nxf788Y3FWMaDNSj0upOMA_aWtmL665";
const ALLOWED=new Set(["norsk_eventyr_sync_create","norsk_eventyr_sync_pull","norsk_eventyr_sync_push","norsk_eventyr_sync_delete"]);
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"POST_ONLY"});
  if(!guard(req,res,{limit:90}))return;
  const {name,params}=req.body||{};
  if(!ALLOWED.has(name))return res.status(400).json({error:"BAD_ACTION"});
  if(!params||typeof params!=="object")return res.status(400).json({error:"BAD_PARAMS"});
  const secret=String(params.p_secret||"");if(secret.length<40||secret.length>200)return res.status(400).json({error:"BAD_SECRET"});
  if(name==="norsk_eventyr_sync_push"||name==="norsk_eventyr_sync_create"){
    const size=Buffer.byteLength(JSON.stringify(params.p_state||{}),"utf8");
    if(size>750000)return res.status(413).json({error:"STATE_TOO_LARGE"});
  }
  try{
    const r=await fetch(SB_URL+"/rest/v1/rpc/"+name,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY},body:JSON.stringify(params)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return res.status(r.status).json({error:"CLOUD_FAILED",detail:String(data?.message||"").slice(0,240)});
    return res.status(200).json(data);
  }catch{return res.status(500).json({error:"CLOUD_FAILED"})}
}