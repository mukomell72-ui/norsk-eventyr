import {guard,rateLimit} from '../api/_guard.js';
import {authCall,accessIdentity,accessRpc,publicRpc,setTokens} from '../api/_access.js';
const TERMS_VERSION='2026-10-08-v2';
const PRIVACY_VERSION='2026-10-08-v4';
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
   const cleanTag=(value,max)=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9_.-]/g,'').slice(0,max);
   const source=cleanTag(b.utm_source,40),campaign=cleanTag(b.utm_campaign,80),medium=cleanTag(b.utm_medium,40);
   const metadata={ne_app:'norsk_eventyr',...(referral?{ne_referral_code:referral}:{}),...(source?{ne_utm_source:source}:{}),...(campaign?{ne_utm_campaign:campaign}:{}),...(medium?{ne_utm_medium:medium}:{})};
   const payload=action==='register'?{email,password,...(Object.keys(metadata).length?{data:metadata}:{})}:{email,password};
   const out=await authCall(action==='login'?'token?grant_type=password':'signup',payload);
   if(!out.ok){
    if(action==='login'&&out.data?.error_code==='email_not_confirmed')return res.status(409).json({error:'EMAIL_NOT_CONFIRMED'});
    return res.status(out.status===429?429:400).json({error:action==='login'?'LOGIN_FAILED':'REGISTRATION_FAILED'});
   }
   if(out.data.access_token)setTokens(res,out.data);
   return res.status(200).json({ok:true,confirmEmail:!out.data.access_token});
  }
  if(action==='confirm'){
   if(!['signup','email','recovery'].includes(b.type)||!/^\w{20,200}$/.test(String(b.token_hash||'')))return res.status(400).json({error:'BAD_CONFIRMATION'});
   const out=await authCall('verify',{token_hash:b.token_hash,type:b.type});
   if(!out.ok||!out.data.access_token){
    if(out.data?.error_code==='otp_expired')return res.status(400).json({error:'CONFIRMATION_EXPIRED'});
    return res.status(400).json({error:b.type==='recovery'?'RECOVERY_FAILED':'CONFIRMATION_FAILED'});
   }
   setTokens(res,out.data);
   if(b.type!=='recovery')try{await accessRpc(out.data.access_token,'ne_lifecycle_touch')}catch{}
   return res.status(200).json({ok:true,recovery:b.type==='recovery'});
  }
  if(action==='resend_confirmation'){
   if(!rateLimit(req,'access-resend-confirmation',5,3600000))return res.status(429).json({error:'RATE_LIMIT'});
   const email=String(b.email||'').trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return res.status(400).json({error:'BAD_EMAIL'});
   const out=await authCall('resend',{type:'signup',email});
   if(!out.ok)return res.status(out.status===429?429:503).json({error:out.status===429?'RATE_LIMIT':'EMAIL_DELIVERY_FAILED'});
   return res.status(200).json({ok:true});
  }
  if(action==='password_reset_request'){
   if(!rateLimit(req,'access-password-reset',5,3600000))return res.status(429).json({error:'RATE_LIMIT'});
   const email=String(b.email||'').trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return res.status(400).json({error:'BAD_EMAIL'});
   const forwardedHost=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim().toLowerCase();
   const vercelHost=String(process.env.VERCEL_ENV==='preview'?process.env.VERCEL_URL:(process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL)||'').replace(/^https?:\/\//,'').split('/')[0].trim().toLowerCase();
   const candidateHost=vercelHost||forwardedHost;
   const allowedHost=candidateHost==='norsk-eventyr-mvp.vercel.app'||candidateHost==='norsk-eventyr-mvp-fffff19.vercel.app'||/^[a-z0-9-]+-fffff19\.vercel\.app$/.test(candidateHost);
   const redirect='https://'+(allowedHost?candidateHost:'norsk-eventyr-mvp.vercel.app')+'/?password_recovery=1';
   const out=await authCall('recover?redirect_to='+encodeURIComponent(redirect),{email});
   if(!out.ok)return res.status(out.status===429?429:503).json({error:out.status===429?'RATE_LIMIT':'PASSWORD_RESET_UNAVAILABLE'});
   return res.status(200).json({ok:true});
  }
  if(action==='recovery_session'){
   if(!rateLimit(req,'access-recovery-session',20,3600000))return res.status(429).json({error:'RATE_LIMIT'});
   const accessToken=String(b.access_token||''),refreshToken=String(b.refresh_token||'');
   if(accessToken.length<20||accessToken.length>8192||refreshToken.length<20||refreshToken.length>8192)return res.status(400).json({error:'RECOVERY_FAILED'});
   const user=await authCall('user',null,accessToken);
   if(!user.ok||!user.data?.email_confirmed_at)return res.status(400).json({error:'RECOVERY_FAILED'});
   setTokens(res,{access_token:accessToken,refresh_token:refreshToken,expires_in:3600});
   return res.status(200).json({ok:true});
  }
  if(action==='feedback_public'){
   return res.status(200).json({feedback:await publicRpc('ne_feedback_public')});
  }
  if(action==='growth_first_visit'){
   if(!rateLimit(req,'growth-first-visit',20,3600000))return res.status(429).json({error:'RATE_LIMIT'});
   return res.status(200).json(await publicRpc('ne_growth_first_visit'));
  }
  const identity=await accessIdentity(req,res);
  if(!identity)return res.status(401).json({error:'LOGIN_REQUIRED'});
  if(identity.device?.allowed!==true){
   const code=String(identity.device?.reason||'DEVICE_REQUIRED');
   return res.status(403).json({error:code,...identity.device});
  }
  if(action==='status'){
   try{await accessRpc(identity.token,'ne_lifecycle_touch')}catch{}
   return res.status(200).json({...identity.access,email:identity.user.email});
  }
  if(action==='update_password'){
   const password=String(b.password||'');
   if(password.length<10||password.length>128)return res.status(400).json({error:'BAD_NEW_PASSWORD'});
   const out=await authCall('user',{password},identity.token,'PUT');
   if(!out.ok)return res.status(out.status===429?429:400).json({error:out.status===429?'RATE_LIMIT':'PASSWORD_UPDATE_FAILED'});
   return res.status(200).json({ok:true});
  }
  if(action==='legal_info'){
   const controller=String(process.env.NE_LEGAL_CONTROLLER_NAME||'').trim();
   if(!controller)return res.status(503).json({error:'LEGAL_INFO_UNAVAILABLE'});
   return res.status(200).json({controller});
  }
  if(action==='accept_terms'){
   const terms=String(b.terms_version||''),privacy=String(b.privacy_version||'');
   if(terms!==TERMS_VERSION||privacy!==PRIVACY_VERSION)return res.status(400).json({error:'TERMS_VERSION_MISMATCH'});
   const suppliedReferral=String(b.referral_code||'').trim().toUpperCase();
   const metadataReferral=String(identity.user?.user_metadata?.ne_referral_code||'').trim().toUpperCase();
   const referral=suppliedReferral||metadataReferral;
   if(referral&& !/^[A-Z0-9]{12,32}$/.test(referral))return res.status(400).json({error:'BAD_REFERRAL'});
   const access=await accessRpc(identity.token,'ne_accept_terms_v2',{p_terms_version:terms,p_privacy_version:privacy,p_referral_code:referral||null});
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
  if(action==='growth_activity'){
   if(!rateLimit(req,'growth-activity',30,3600000))return res.status(429).json({error:'RATE_LIMIT'});
   return res.status(200).json(await accessRpc(identity.token,'ne_growth_activity'));
  }
  if(action==='purchase_interest'){
   if(!rateLimit(req,'purchase-interest',10,3600000))return res.status(429).json({error:'RATE_LIMIT'});
   const price=Number(b.price_nok);
   if(!Number.isInteger(price)||price<1||price>100000)return res.status(400).json({error:'BAD_PRICE'});
   return res.status(200).json(await accessRpc(identity.token,'ne_purchase_interest_v2',{p_price_nok:price}));
  }
  if(action==='promo_redeem'){
   if(!rateLimit(req,'promo-redeem',12,3600000))return res.status(429).json({error:'RATE_LIMIT'});
   const code=String(b.code||'').trim().toUpperCase();
   if(!/^[A-Z0-9_-]{4,32}$/.test(code))return res.status(400).json({error:'BAD_PROMO'});
   return res.status(200).json(await accessRpc(identity.token,'ne_promo_redeem',{p_code:code}));
  }
  if(action==='feedback_list'){
   if(!identity.access.owner)return res.status(403).json({error:'OWNER_REQUIRED'});
   return res.status(200).json({feedback:await accessRpc(identity.token,'ne_feedback_list')});
  }
  if(action==='feedback_moderate'){
   if(!identity.access.owner)return res.status(403).json({error:'OWNER_REQUIRED'});
   const feedbackId=String(b.feedback_id||'');
   if(!/^[0-9a-f-]{36}$/i.test(feedbackId)||typeof b.is_public!=='boolean')return res.status(400).json({error:'BAD_FEEDBACK_MODERATION'});
   return res.status(200).json(await accessRpc(identity.token,'ne_feedback_moderate',{p_feedback_id:feedbackId,p_public:b.is_public}));
  }
  if(action==='client_error'){
   if(!rateLimit(req,'client-error',20,3600000))return res.status(429).json({error:'RATE_LIMIT'});
   const code=String(b.code||'').slice(0,80),message=String(b.message||'').slice(0,500),path=String(b.path||'').slice(0,300),appVersion=String(b.app_version||'').slice(0,32),userAgent=String(b.user_agent||'').slice(0,250);
   if(!message&&!code)return res.status(400).json({error:'BAD_CLIENT_ERROR'});
   return res.status(200).json(await accessRpc(identity.token,'ne_client_error_submit',{p_code:code,p_message:message,p_path:path,p_app_version:appVersion,p_user_agent:userAgent}));
  }
  if(['owner_dashboard','owner_errors','owner_backup','owner_growth','owner_admin_overview','owner_events','owner_payments','owner_user_detail','owner_grant_free','owner_confirm_payment','owner_promo_list','owner_promo_create','owner_promo_toggle','owner_devices_reset'].includes(action)){
   if(!identity.access.owner)return res.status(403).json({error:'OWNER_REQUIRED'});
   if(action==='owner_dashboard')return res.status(200).json({dashboard:await accessRpc(identity.token,'ne_owner_dashboard')});
   if(action==='owner_errors')return res.status(200).json({errors:await accessRpc(identity.token,'ne_owner_error_list')});
   if(action==='owner_growth')return res.status(200).json({growth:await accessRpc(identity.token,'ne_owner_growth_funnel')});
   if(action==='owner_admin_overview')return res.status(200).json({overview:await accessRpc(identity.token,'ne_owner_admin_overview')});
   if(action==='owner_events'){
    const limit=Math.max(1,Math.min(300,Number(b.limit)||100));
    return res.status(200).json({events:await accessRpc(identity.token,'ne_owner_lifecycle_feed',{p_limit:limit})});
   }
   if(action==='owner_payments'){
    const limit=Math.max(1,Math.min(500,Number(b.limit)||200));
    return res.status(200).json({payments:await accessRpc(identity.token,'ne_owner_payments',{p_limit:limit})});
   }
   if(action==='owner_grant_free'){
    const userId=String(b.user_id||''),days=Number(b.days),note=String(b.note||'').trim().slice(0,300);
    if(!/^[0-9a-f-]{36}$/i.test(userId)||!Number.isInteger(days)||days<1||days>3650)return res.status(400).json({error:'BAD_GRANT'});
    return res.status(200).json(await accessRpc(identity.token,'ne_owner_grant_free',{p_user_id:userId,p_days:days,p_note:note||null}));
   }
   if(action==='owner_confirm_payment'){
    const userId=String(b.user_id||''),days=Number(b.days),amount=Number(b.amount_nok),note=String(b.note||'').trim().slice(0,300);
    if(!/^[0-9a-f-]{36}$/i.test(userId)||!Number.isInteger(days)||days<1||days>3650||!Number.isFinite(amount)||amount<1||amount>100000)return res.status(400).json({error:'BAD_PAYMENT'});
    return res.status(200).json(await accessRpc(identity.token,'ne_owner_confirm_manual_payment',{p_user_id:userId,p_amount_nok:amount,p_days:days,p_note:note||null}));
   }
   if(action==='owner_promo_list')return res.status(200).json({promos:await accessRpc(identity.token,'ne_owner_promo_list')});
   if(action==='owner_promo_create'){
    const code=String(b.code||'').trim().toUpperCase(),days=Number(b.days),max=Number(b.max_redemptions),note=String(b.note||'').trim().slice(0,300);
    let validUntil=null;
    if(b.valid_until){const t=Date.parse(String(b.valid_until));if(!Number.isFinite(t)||t<=Date.now())return res.status(400).json({error:'BAD_PROMO'});validUntil=new Date(t).toISOString()}
    if(!/^[A-Z0-9_-]{4,32}$/.test(code)||!Number.isInteger(days)||days<1||days>3650||!Number.isInteger(max)||max<1||max>100000)return res.status(400).json({error:'BAD_PROMO'});
    return res.status(200).json(await accessRpc(identity.token,'ne_owner_promo_create',{p_code:code,p_days:days,p_max_redemptions:max,p_valid_until:validUntil,p_note:note||null}));
   }
   if(action==='owner_promo_toggle'){
    const promoId=String(b.promo_id||'');
    if(!/^[0-9a-f-]{36}$/i.test(promoId)||typeof b.active!=='boolean')return res.status(400).json({error:'BAD_PROMO'});
    return res.status(200).json(await accessRpc(identity.token,'ne_owner_promo_set_active',{p_promo_id:promoId,p_active:b.active}));
   }
   if(action==='owner_devices_reset'){
    const userId=String(b.user_id||'');
    if(!/^[0-9a-f-]{36}$/i.test(userId))return res.status(400).json({error:'BAD_USER'});
    return res.status(200).json(await accessRpc(identity.token,'ne_owner_devices_reset',{p_user_id:userId}));
   }
   if(action==='owner_user_detail'){
    const userId=String(b.user_id||'');
    if(!/^[0-9a-f-]{36}$/i.test(userId))return res.status(400).json({error:'BAD_USER'});
    return res.status(200).json({detail:await accessRpc(identity.token,'ne_owner_user_detail',{p_user_id:userId})});
   }
   return res.status(200).json({backup:await accessRpc(identity.token,'ne_owner_backup')});
  }
  if(action==='list'||action==='decide'){
   if(!identity.access.owner)return res.status(403).json({error:'OWNER_REQUIRED'});
   if(action==='list')return res.status(200).json({requests:await accessRpc(identity.token,'ne_access_list')});
   if(!['approved','denied','revoked'].includes(b.status)||! /^[0-9a-f-]{36}$/i.test(String(b.user_id||'')))return res.status(400).json({error:'BAD_DECISION'});
   return res.status(200).json(await accessRpc(identity.token,'ne_access_decide',{p_user_id:b.user_id,p_status:b.status}));
  }
  return res.status(400).json({error:'BAD_ACTION'});
 }catch(error){
  const code=String(error?.code||error?.message||'ACCESS_UNAVAILABLE').trim();
  const conflict=new Set(['PROMO_UNAVAILABLE','PROMO_ALREADY_USED','PROMO_EXISTS']);
  const bad=new Set(['BAD_PROMO','BAD_GRANT','BAD_PAYMENT','BAD_DECISION','BAD_USER','BAD_PRICE','TERMS_VERSION_MISMATCH']);
  const missing=new Set(['PROMO_NOT_FOUND','USER_NOT_FOUND','REQUEST_NOT_FOUND','ENTITLEMENT_REQUIRED']);
  if(conflict.has(code))return res.status(409).json({error:code});
  if(bad.has(code))return res.status(400).json({error:code});
  if(missing.has(code))return res.status(404).json({error:code});
  return res.status(503).json({error:'ACCESS_UNAVAILABLE'});
 }
}
