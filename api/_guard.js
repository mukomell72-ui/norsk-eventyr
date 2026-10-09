import crypto from "node:crypto";
import {requireApproved} from "./_access.js";

// Defense in depth only: these in-memory counters are per server instance.
// Public release also requires a project-wide WAF/distributed rate limit.
const buckets=new Map();
const MAX_BUCKETS=15000;
let lastPrune=0;
function ipOf(req){
  const headers=req.headers||{};
  // Vercel overwrites its forwarding headers to prevent client IP spoofing.
  // Local test servers can still supply x-forwarded-for.
  return String(headers["x-vercel-forwarded-for"]||headers["x-forwarded-for"]||headers["x-real-ip"]||"unknown").split(",")[0].trim().slice(0,128)||"unknown";
}
function sameOrigin(req){
  const headers=req.headers||{};
  // A browser's Fetch Metadata headers remain useful if Origin is omitted.
  if(String(headers["sec-fetch-site"]||"").toLowerCase()==="cross-site")return false;
  const host=String(headers.host||"").toLowerCase();
  const origin=String(headers.origin||"");
  if(!origin)return true;
  try{
    const parsed=new URL(origin);
    return (parsed.protocol==="https:"||((host.startsWith("localhost")||host.startsWith("127.0.0.1"))&&parsed.protocol==="http:"))&&parsed.host.toLowerCase()===host;
  }catch{return false}
}
function signingKey(){
  // A separate NE_SESSION_SECRET is preferred. Keep the old signing key
  // as a compatibility fallback for existing 8.0 sessions during migration.
  const value=process.env.NE_SESSION_SECRET||process.env.OPENAI_API_KEY;
  return typeof value==="string"&&value.length>=16?value:null;
}
function sign(payload){
  const key=signingKey();
  return key?crypto.createHmac("sha256",key).update(payload).digest("base64url"):null;
}
export function createSession(req){
  if(!signingKey())return null;
  const payload=Buffer.from(JSON.stringify({ip:ipOf(req),exp:Date.now()+6*60*60*1000})).toString("base64url");
  return payload+"."+sign(payload);
}
export function verifySession(req){
  const token=String(req.headers?.["x-ne-session"]||"");
  if(token.length>2048)return false;
  const pieces=token.split(".");
  if(pieces.length!==2)return false;
  const [payload,sig]=pieces;
  if(!payload||!sig||!/^[A-Za-z0-9_-]+$/.test(payload)||!/^[A-Za-z0-9_-]{43}$/.test(sig))return false;
  const expected=sign(payload);
  if(!expected)return false;
  const a=Buffer.from(sig),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return false;
  try{
    const d=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
    const now=Date.now();
    return Number.isFinite(d.exp)&&d.exp>now&&d.exp<=now+6*60*60*1000&&d.ip===ipOf(req);
  }catch{return false}
}
function endpointKey(url){
  try{return new URL(String(url||"/api"),"http://local.invalid").pathname}catch{return "/api"}
}
export function rateLimit(req,key,limit=60,windowMs=3600000){
  const now=Date.now();
  if(now-lastPrune>60000&&buckets.size>1000){
    for(const [id,v] of buckets){if(now-v.start>v.windowMs)buckets.delete(id)}
    lastPrune=now;
  }
  const id=String(key).slice(0,160)+":"+ipOf(req),b=buckets.get(id);
  if(!b||now-b.start>windowMs){
    if(!b&&buckets.size>=MAX_BUCKETS)return false; // bounded memory; fail closed
    buckets.set(id,{start:now,count:1,windowMs});
    return true;
  }
  if(b.count>=limit)return false;
  b.count++;
  return true;
}
export async function guard(req,res,{limit=60,requireSession=true,requireAccess=true}={}){
  if(!sameOrigin(req)){res.status(403).json({error:"ORIGIN_DENIED",code:"ORIGIN_DENIED"});return false}
  if(!rateLimit(req,endpointKey(req.url),limit)){res.status(429).json({error:"RATE_LIMIT",code:"RATE_LIMIT"});return false}
  if(requireSession&&!verifySession(req)){res.status(401).json({error:"SESSION_REQUIRED",code:"SESSION_REQUIRED"});return false}
  if(requireAccess&&!await requireApproved(req,res))return false;
  return true
}
