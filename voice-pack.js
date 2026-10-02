// Norsk Eventyr 6.3 — human voice pack registry
// Real human recordings can be added under /audio/nora/ and registered here.
// The app always prefers a matching human recording and falls back to AI TTS for dynamic text.
(() => {
  const normalize=s=>String(s||"").toLowerCase().normalize("NFKC").replace(/[“”„«»]/g,'"').replace(/\s+/g," ").trim();

  // IMPORTANT: Only register clips that are real human recordings with permission/license to use.
  const HUMAN_NORA_CLIPS={
    // Example once recorded:
    // "hei! jeg heter nora. hva heter du?": "/audio/nora/001-hei-jeg-heter-nora.mp3"
  };

  let current=null;
  async function playHumanVoice(text,rate=1){
    const src=HUMAN_NORA_CLIPS[normalize(text)];
    if(!src)return false;
    try{
      current?.pause?.();
      current=new Audio(src);
      current.playbackRate=Math.max(.75,Math.min(1.15,Number(rate)||1));
      await current.play();
      return true;
    }catch{
      return false;
    }
  }

  window.NEHumanVoice={
    speaker:"Nora",
    language:"nb-NO",
    type:"human-recording",
    clips:HUMAN_NORA_CLIPS,
    normalize,
    play:playHumanVoice,
    has:text=>Boolean(HUMAN_NORA_CLIPS[normalize(text)])
  };
})();
