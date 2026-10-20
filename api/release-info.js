// Read the publication timestamp of the exact Git commit deployed by Vercel.
// Never substitute the current request time: that would misdate old versions.
const REPOSITORY='mukomell72-ui/norsk-eventyr';
const SHA_RE=/^[0-9a-f]{40}$/i;
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET_ONLY'});
 res.setHeader('Cache-Control','no-store');
 const sha=String(process.env.VERCEL_GIT_COMMIT_SHA||'').trim();
 if(!SHA_RE.test(sha))return res.status(503).json({ok:false,error:'RELEASE_COMMIT_UNAVAILABLE'});
 let response;
 try{
  response=await fetch('https://api.github.com/repos/'+REPOSITORY+'/statuses/'+sha,{
   headers:{Accept:'application/vnd.github+json','User-Agent':'Norsk-Eventyr-Release-Timestamp'},
   signal:AbortSignal.timeout(4500)
  });
 }catch{return res.status(503).json({ok:false,error:'RELEASE_STATUS_UNAVAILABLE'})}
 if(!response.ok)return res.status(503).json({ok:false,error:'RELEASE_STATUS_UNAVAILABLE'});
 let statuses;
 try{statuses=await response.json()}catch{return res.status(503).json({ok:false,error:'RELEASE_STATUS_INVALID'})}
 // GitHub returns the most recent status first. Only a successful Vercel status
 // confirms an actual deployment, not just a source-code commit.
 const deployment=Array.isArray(statuses)?statuses.find(status=>
  status?.context==='Vercel'&&status?.state==='success'&&
  typeof status.updated_at==='string'&&Number.isFinite(Date.parse(status.updated_at))
 ):null;
 if(!deployment)return res.status(503).json({ok:false,error:'RELEASE_TIME_UNCONFIRMED'});
 res.setHeader('Cache-Control','public, max-age=0, s-maxage=900, stale-while-revalidate=3600');
 return res.status(200).json({
  ok:true,commit_sha:sha,published_at:deployment.updated_at,
  time_basis:'verified_vercel_status',time_zone:'Europe/Oslo'
 });
}
