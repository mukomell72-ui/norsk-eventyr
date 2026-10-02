export default async function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({error:"GET_ONLY"});
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json({ok:true,version:"7.0.1",aiConfigured:Boolean(process.env.OPENAI_API_KEY),features:{evaluate:true,generate:true,speech:true,transcribe:true,pronunciation:true,chat:true,daily:true,cloud:true,contextVocabulary:true,storyWorld:true,interfaceV6:true,interfaceV7:true,humanVoicePipeline:true}});
}