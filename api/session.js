import {createSession,guard} from "./_guard.js";
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST_ONLY"});
  if(!guard(req,res,{limit:30,requireSession:false})) return;
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json({token:createSession(req),expiresIn:21600});
}
