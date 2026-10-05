import {guard,rateLimit} from '../api/_guard.js';
import {authCall,accessIdentity,accessRpc,publicRpc,setTokens} from '../api/_access.js';
const TERMS_VERSION='2026-10-05-v1';
const PRIVACY_VERSION='2026-10-05-v2';
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
   const referral=String(b.referral_code||'').trim().toUpperCase();
   if(referral&&!/^[A-Z0-9]{12,32}$/.test(referral))return res.status(400).json({error:'BAD_REFERRAL'});
   const payload=action==='register'&&referral?{email,password,data:{ne_referral_code:referral}}:{email,password};
   const out=await authCall(action==='login'?'token?grant_type=password':'signup',payload);
   if(!out.ok){
    if(action==='login'&&out.data?.error_code==='email_not_confirmed')return res.status(409).json({error:'EMAIL_NOT_CONFIRMED'});
    return res.status(out.status===429?429:400).json({error:action==='login'?'LOGIN_FAILED':'REGISTRATION_FAILED'});
   }
   if(out.data.access_token)setTokens(res,out.data);
   return res.status(200).json({ok:true,confirmEmail:!out.data.access_token});
  }
  if(action==='confirm'){
   if(!['signup','email'].includes(b.type)||!/^\w{20,200}$/.test(String(b.token_hash||'')))return res.status(400).json({error:'BAD_CONFIRMATION'});
   const out=await authCall('verify',{token_hash:b.token_hash,type:b.type});
   if(!out.ok||!out.data.access_token){
    if(out.data?.error_code==='otp_expired')return res.status(400).json({error:'CONFIRMATION_EXPIRED'});
    return res.status(400).json({error:'CONFIRMATION_FAILED'});
   }
   setTokens(res,out.data);return res.status(200).json({ok:true});
  }
  if(action==='resend_confirmation'){
   if(!rateLimit(req,'access-resend-confirmation',5,3600000))return res.status(429).json({error:'RATE_LIMIT'});
   const email=String(b.email||'').trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return res.status(400).json({error:'BAD_EMAIL'});
   const out=await authCall('resend',{type:'signup',email});
   if(!out.ok)return res.status(out.status===429?429:503).json({error:out.status===429?'RATE_LIMIT':'EMAIL_DELIVERY_FAILED'});
   return res.status(200).json({ok:true});
  }
  if(action==='feedback_public'){
   return res.status(200).json({feedback:await publicRpc('ne_feedback_public')});
  }
  const identity=await accessIdentity(req,res);
  if(!identity)return res.status(401).json({error:'LOGIN_REQUIRED'});
  if(action==='status')return res.status(200).json({...identity.access,email:identity.user.email});
  if(action==='accept_terms'){
   const terms=String(b.terms_version||''),privacy=String(b.privacy_version||'');
   if(terms!==TERMS_VERSION||privacy!==PRIVACY_VERSION)return res.status(400).json({error:'TERMS_VERSION_MISMATCH'});
   const suppliedReferral=String(b.referral_code||'').trim().toUpperCase();
   const metadataReferral=String(identity.user?.user_metadata?.ne_referral_code||'').trim().toUpperCase();
   const referral=suppliedReferral||metadataReferral;
   if(referral&& !/^[A-Z0-9]{12,32}$/.test(referral))return res.status(400).json({error:'BAD_REFERRAL'});
   const access=await accessRpc(identity.token,'ne_accept_terms',{p_terms_version:terms,p_privacy_version:privacy,p_referral_code:referral||null});
   return res.status(200).json({...access,email:identity.user.email});
  }
  if(action==='share_info'){
   if(identity.access.access_granted!==true)return res.status(403).json({error:'APPROVAL_REQUIRED'});
   return res.status(200).json(await accessRpc(identity.token,'ne_referral_info'));
  }
  if(action==='request'){
   if(identity.access.status==='terms_required')return res.status(403).json({error:'TERMS_REQUIRED'});
   const name=String(b.name||'').trim();if(!name||name.length>80)return res.status(400).json({error:'BAD_NAME'});
   return res.status(200).json(await accessRpc(identity.token,'ne_access_request',{p_name:name}));
  }
  if(action==='feedback_submit'){
   if(!rateLimit(req,'feedback-submit',10,3600000))return res.status(429).json({error:'RATE_LIMIT'});
   const rating=Number(b.rating),comment=typeof b.comment==='string'?b.comment.trim():'',suggestion=typeof b.suggestion==='string'?b.suggestion.trim():'';
   if(!Number.isInteger(rating)||rating<1||rating>5||comment.length>1200||suggestion.length>1200)return res.status(400).json({error:'BAD_FEEDBACK'});
   return res.status(200).json(await accessRpc(identity.token,'ne_feedback_submit',{p_rating:rating,p_comment:comment,p_suggestion:suggestion}));
  }
  if(action==='install_seen'){
   if(!rateLimit(req,'install-seen',30,3600000))return res.status(429).json({error:'RATE_LIMIT'});
   const platform=typeof b.platform==='string'?b.platform.trim().slice(0,80):'';
   const source=typeof b.source==='string'?b.source.trim().slice(0,32):'unknown';
   return res.status(200).json(await accessRpc(identity.token,'ne_install_seen',{p_platform:platform,p_source:source||'unknown'}));
  }
  if(action==='feedback_list'){
   if(!identity.access.owner)return res.status(403).json({error:'OWNER_REQUIRED'});
   return res.status(200).json({feedback:await accessRpc(identity.token,'ne_feedback_list')});
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
