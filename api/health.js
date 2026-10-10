export default async function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({error:"GET_ONLY"});
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json({ok:true,version:"8.2.1"});
}
