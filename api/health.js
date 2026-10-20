// Health stays a single Vercel function; the optional release query supplies
// a publication timestamp verified against the deployed commit's Vercel status.
export default async function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({error:"GET_ONLY"});
  res.setHeader("Cache-Control","no-store");
  if(req.query?.release!=="1")return res.status(200).json({ok:true,version:"8.3.0"});

  const sha=String(process.env.VERCEL_GIT_COMMIT_SHA||"").trim();
  if(!/^[0-9a-f]{40}$/i.test(sha))return res.status(503).json({ok:false,error:"RELEASE_COMMIT_UNAVAILABLE"});
  let response;
  try{
    response=await fetch("https://api.github.com/repos/mukomell72-ui/norsk-eventyr/statuses/"+sha,{
      headers:{Accept:"application/vnd.github+json","User-Agent":"Norsk-Eventyr-Release-Timestamp"},
      signal:AbortSignal.timeout(4500)
    });
  }catch{return res.status(503).json({ok:false,error:"RELEASE_STATUS_UNAVAILABLE"})}
  if(!response.ok)return res.status(503).json({ok:false,error:"RELEASE_STATUS_UNAVAILABLE"});
  let statuses;
  try{statuses=await response.json()}catch{return res.status(503).json({ok:false,error:"RELEASE_STATUS_INVALID"})}
  const deployment=Array.isArray(statuses)?statuses.find(status=>
    status?.context==="Vercel"&&status?.state==="success"&&
    typeof status.updated_at==="string"&&Number.isFinite(Date.parse(status.updated_at))
  ):null;
  if(!deployment)return res.status(503).json({ok:false,error:"RELEASE_TIME_UNCONFIRMED"});
  res.setHeader("Cache-Control","public, max-age=0, s-maxage=900, stale-while-revalidate=3600");
  return res.status(200).json({
    ok:true,commit_sha:sha,published_at:deployment.updated_at,
    time_basis:"verified_vercel_status",time_zone:"Europe/Oslo"
  });
}
