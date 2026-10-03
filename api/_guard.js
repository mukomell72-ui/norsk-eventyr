import crypto from "node:crypto";
import {requireApproved} from "./_access.js";

const buckets=new Map();
function ipOf(req){return String(req.headers["x-forwarded-for"]||req.headers["x-real-ip"]||"unknown").split(",")[0].trim()}
function sameOrigin(req){
  const host=String(req.headers.host||"").toLowerCase();
  const origin=String(req.headers.origin||"");
  if(!origin) return true;
  try{return new URL(origin).host.toLowerCase()===host}catch{return false}
}
function secret(){return process.env.OPENAI_API_KEY||"missing-secret"}
function sign(body){return crypto.createHmac("sha256",secret()).update(body).digest("base64url")}
export function createSession(req){
  const payload=Buffer.from(JSON.stringify({ip:ipOf(req),exp:Date.now()+6*60*60*1000})).toString("base64url");
  return payload+"."+sign(payload);
}
export function verifySession(req){
  const token=String(req.headers["x-ne-session"]||"");
  const [payload,sig]=token.split(".");
  if(!payload||!sig) return false;
  const expected=sign(payload);
  const a=Buffer.from(sig),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) return false;
  try{const d=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));return d.exp>Date.now()&&d.ip===ipOf(req)}catch{return false}
}
export function rateLimit(req,key,limit=60,windowMs=3600000){
  const now=Date.now(),id=key+":"+ipOf(req),b=buckets.get(id);
  if(!b||now-b.start>windowMs){buckets.set(id,{start:now,count:1});return true}
  if(b.count>=limit)return false;b.count++;return true
}
export async function guard(req,res,{limit=60,requireSession=true,requireAccess=true}={}){
  if(!sameOrigin(req)){res.status(403).json({error:"ORIGIN_DENIED",code:"ORIGIN_DENIED"});return false}
  if(!rateLimit(req,req.url||"api",limit)){res.status(429).json({error:"RATE_LIMIT",code:"RATE_LIMIT"});return false}
  if(requireSession&&!verifySession(req)){res.status(401).json({error:"SESSION_REQUIRED",code:"SESSION_REQUIRED"});return false}
  if(requireAccess&&!await requireApproved(req,res))return false;
  return true
}
