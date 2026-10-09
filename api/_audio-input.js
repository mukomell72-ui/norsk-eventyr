// Shared, strict decoding for learner audio. Reject malformed input before billable AI calls.
const VALID_BASE64=/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
export function decodeAudioBase64(raw,maxBytes,minBytes=64){
  if(typeof raw!=="string"||!Number.isSafeInteger(maxBytes)||maxBytes<=0||raw.length<4||raw.length>Math.ceil(maxBytes/3)*4)return null;
  if(!VALID_BASE64.test(raw))return null;
  const bytes=Buffer.from(raw,"base64");
  if(bytes.length<minBytes||bytes.length>maxBytes||bytes.toString("base64")!==raw)return null;
  return bytes;
}
export function isWav(bytes){
  return Buffer.isBuffer(bytes)&&bytes.length>=44
    &&bytes.toString("ascii",0,4)==="RIFF"
    &&bytes.toString("ascii",8,12)==="WAVE";
}
