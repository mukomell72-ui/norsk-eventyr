import {guard} from "./_guard.js";
const SB_URL="https://rskgbkgtrigtznnksbyp.supabase.co";
const SB_KEY="sb_publishable_Nxf788Y3FWMaDNSj0upOMA_aWtmL665";
const ALLOWED={
  norsk_eventyr_sync_create:new Set(["p_sync_id","p_secret","p_state"]),
  norsk_eventyr_sync_pull:new Set(["p_sync_id","p_secret"]),
  norsk_eventyr_sync_push:new Set(["p_sync_id","p_secret","p_state","p_expected_revision"]),
  norsk_eventyr_sync_delete:new Set(["p_sync_id","p_secret"])
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validInput(name,params){
  if(!Object.hasOwn(ALLOWED,name)||!params||typeof params!=="object"||Array.isArray(params))return false;
  if(Object.keys(params).some(key=>!ALLOWED[name].has(key)))return false;
  if(typeof params.p_sync_id!=="string"||!UUID.test(params.p_sync_id))return false;
  if(typeof params.p_secret!=="string"||params.p_secret.length<40||params.p_secret.length>200)return false;
  if(name.endsWith("_create")||name.endsWith("_push")){
    if(!params.p_state||typeof params.p_state!=="object"||Array.isArray(params.p_state))return false;
    // Reject maliciously deep or oversized states before database writes.
    const stateText=JSON.stringify(params.p_state);
    if(!stateText||Buffer.byteLength(stateText,"utf8")>750000)return false;
  }
  if(name.endsWith("_push")){
    if(!Number.isSafeInteger(params.p_expected_revision)||params.p_expected_revision<0)return false;
  }
  return true;
}
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"POST_ONLY"});
  res.setHeader?.("Cache-Control","no-store");
  if(!await guard(req,res,{limit:90}))return;
  const {name,params}=req.body||{};
  if(!Object.hasOwn(ALLOWED,name))return res.status(400).json({error:"BAD_ACTION"});
  try{
    if(!validInput(name,params))return res.status(400).json({error:"BAD_PARAMS"});
  }catch{return res.status(400).json({error:"BAD_PARAMS"})}
  // The production migration is fail-closed: authenticated, account-owned RPC
  // only. Preview retains legacy sync until the staged Supabase migration is tested.
  const strict=process.env.VERCEL_ENV==="production"||process.env.NE_SYNC_V2_ENFORCE==="enforce";
  const token=req.neAccessIdentity?.token;
  if(strict&&!token)return res.status(503).json({error:"CLOUD_UNAVAILABLE"});
  const operation=name.slice("norsk_eventyr_sync_".length);
  const rpcName=strict?"ne_sync_v2":name;
  const outgoing=strict?{...params,p_action:operation}:params;
  const rpcHeaders={"Content-Type":"application/json","apikey":SB_KEY,...(strict?{"Authorization":"Bearer "+token}:{})};
  try{
    const r=await fetch(SB_URL+"/rest/v1/rpc/"+rpcName,{method:"POST",headers:rpcHeaders,body:JSON.stringify(outgoing),signal:AbortSignal.timeout(12000)});
    const data=await r.json().catch(()=>({}));
    // The database error text must never be sent back to clients.
    if(!r.ok)return res.status(r.status===429?429:503).json({error:"CLOUD_UNAVAILABLE"});
    return res.status(200).json(data);
  }catch{return res.status(503).json({error:"CLOUD_UNAVAILABLE"})}
}
