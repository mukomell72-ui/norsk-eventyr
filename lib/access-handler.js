import {guard,rateLimit} from '../api/_guard.js';
import {authCall,accessIdentity,accessRpc,setTokens} from '../api/_access.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST_ONLY'});
 if(!await guard({...req,headers:req.headers,url:"/api/access"},res,{limit:240,requireSession:false,requireAccess:false}))return;
 const b=req.body||{},action=b.action;
 try{
  if(action==='logout'){setTokens(res,null);return res.status(200).json({ok:true})}
  if(action==='login'||action==='register'){
   if(!rateLimit(req,'access-credentials',12))return res.status(429).json({error:'RATE_LIMIT'});
   const email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<10||password.length>128)return res.status(400).json({error:'BAD_CREDENTIALS'});
   const out=await authCall(action==='login'?'token?grant_type=password':'signup',{email,password});
   if(!out.ok)return res.status(out.status===429?429:400).json({error:action==='login'?'LOGIN_FAILED':'REGISTRATION_FAILED'});
   if(out.data.access_token)setTokens(res,out.data);
   return res.status(200).json({ok:true,confirmEmail:!out.data.access_token});
  }
  if(action==='confirm'){
   if(!['signup','email'].includes(b.type)||!/^\w{20,200}$/.test(String(b.token_hash||'')))return res.status(400).json({error:'BAD_CONFIRMATION'});
   const out=await authCall('verify',{token_hash:b.token_hash,type:b.type});
   if(!out.ok||!out.data.access_token)return res.status(400).json({error:'CONFIRMATION_FAILED'});
   setTokens(res,out.data);return res.status(200).json({ok:true});
  }
  const identity=await accessIdentity(req,res);
  if(!identity)return res.status(401).json({error:'LOGIN_REQUIRED'});
  if(action==='status')return res.status(200).json({...identity.access,email:identity.user.email});
  if(action==='request'){
   const name=String(b.name||'').trim();if(!name||name.length>80)return res.status(400).json({error:'BAD_NAME'});
   return res.status(200).json(await accessRpc(identity.token,'ne_access_request',{p_name:name}));
  }
  if(action==='list'||action==='decide'){
   if(!identity.access.owner)return res.status(403).json({error:'OWNER_REQUIRED'});
   if(action==='list')return res.status(200).json({requests:await accessRpc(identity.token,'ne_access_list')});
   if(!['approved','denied','revoked'].includes(b.status)||! /^[0-9a-f-]{36}$/i.test(String(b.user_id||'')))return res.status(400).json({error:'BAD_DECISION'});
   return res.status(200).json(await accessRpc(identity.token,'ne_access_decide',{p_user_id:b.user_id,p_status:b.status}));
  }
  return res.status(400).json({error:'BAD_ACTION'});
 }catch{return res.status(503).json({error:'ACCESS_UNAVAILABLE'})}
}
