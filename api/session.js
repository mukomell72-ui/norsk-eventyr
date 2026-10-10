import accessHandler from "../lib/access-handler.js";
import {createSession,guard} from "./_guard.js";
export default async function handler(req,res){
  if(req.body?.action)return accessHandler(req,res);
  if(req.method!=="POST") return res.status(405).json({error:"POST_ONLY"});
  if(!await guard(req,res,{limit:30,requireSession:false})) return;
  res.setHeader("Cache-Control","no-store");
  const token=createSession(req);
  if(!token)return res.status(503).json({error:"SESSION_UNAVAILABLE",code:"SESSION_UNAVAILABLE"});
  return res.status(200).json({token,expiresIn:21600});
}
