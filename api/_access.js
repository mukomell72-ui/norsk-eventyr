const URL='https://rskgbkgtrigtznnksbyp.supabase.co';
const KEY='sb_publishable_Nxf788Y3FWMaDNSj0upOMA_aWtmL665';
function cookies(req){const out={};for(const part of String(req.headers.cookie||'').split(';')){const i=part.indexOf('=');if(i>0)out[part.slice(0,i).trim()]=part.slice(i+1).trim()}return out}
export function setTokens(res,data){
 const opts='; Path=/; HttpOnly; Secure; SameSite=Strict';
 res.setHeader('Set-Cookie',[
  'ne_access='+String(data?.access_token||'')+opts+'; Max-Age='+(data?Number(data.expires_in)||3600:0),
  'ne_refresh='+String(data?.refresh_token||'')+opts+'; Max-Age='+(data?2592000:0)
 ]);
}
export async function authCall(path,body,token,method){
 const verb=method||(body?'POST':'GET');
 const response=await fetch(URL+'/auth/v1/'+path,{method:verb,headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
 const data=await response.json().catch(()=>({}));
 return {ok:response.ok,status:response.status,data};
}
export async function accessRpc(token,name,params={}){
 const response=await fetch(URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(params),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('ACCESS_UNAVAILABLE');return response.json();
}
export async function publicRpc(name,params={}){
 const response=await fetch(URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(params),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('ACCESS_UNAVAILABLE');return response.json();
}
export async function accessIdentity(req,res){
 const c=cookies(req);let token=c.ne_access;
 if(!token&&!c.ne_refresh)return null;
 let user=token?await authCall('user',null,token):{ok:false,status:401};
 if(!user.ok&&user.status===401&&c.ne_refresh){
  const refresh=await authCall('token?grant_type=refresh_token',{refresh_token:c.ne_refresh});
  if(!refresh.ok)return null;
  setTokens(res,refresh.data);token=refresh.data.access_token;user=await authCall('user',null,token);
 }
 if(!user.ok){if(user.status>=500)throw new Error('ACCESS_UNAVAILABLE');return null}
 if(!user.data.email_confirmed_at)return null;
 const access=await accessRpc(token,'ne_access_status_v2');
 let device={allowed:true,owner:access?.owner===true};
 if(access?.owner!==true){
  const deviceId=String(req.headers['x-ne-device-id']||'').trim();
  const deviceName=String(req.headers['x-ne-device-name']||'Устройство').trim().slice(0,120)||'Устройство';
  device=deviceId
   ?await accessRpc(token,'ne_device_authorize',{p_device_id:deviceId,p_device_name:deviceName})
   :{allowed:false,reason:'DEVICE_REQUIRED',max_devices:2};
 }
 return {token,user:user.data,access,device};
}
export async function requireApproved(req,res){
 try{const identity=await accessIdentity(req,res);
  if(!identity){res.status(401).json({error:'LOGIN_REQUIRED',code:'LOGIN_REQUIRED'});return false}
  if(identity.device?.allowed!==true){
   const code=String(identity.device?.reason||'DEVICE_REQUIRED');
   res.status(403).json({error:code,code});return false
  }
  if(identity.access.access_granted!==true){res.status(403).json({error:'APPROVAL_REQUIRED',code:'APPROVAL_REQUIRED'});return false}
  return true;
 }catch{res.status(503).json({error:'ACCESS_UNAVAILABLE',code:'ACCESS_UNAVAILABLE'});return false}
}
