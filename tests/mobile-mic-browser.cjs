// Chromium mobile-device regression, using mocked microphone input.
// Does NOT claim to test physical Android audio hardware or transcription quality.
'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.startsWith('/api/')){
  for await(const chunk of req){} // Drain request stream.
  let response={score:90,accepted:true,explanation_ru:'Верно',text:'Jeg leter etter nøkkelen på kjøkkenet.'};
  if(pathname==='/api/session')response={token:'qa',status:'approved',access_granted:true,owner:true,user_id:'11111111-1111-4111-8111-111111111111',email:'owner@example.com'};
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify(response));return;
 }
 const file=pathname==='/'?'index.html':pathname.slice(1);
 try{
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
  res.end(fs.readFileSync(path.join(root,file)));
 }catch{res.statusCode=404;res.end('Not found')}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({...(process.env.NE_CHROMIUM_PATH?{executablePath:process.env.NE_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
  const ctx=await browser.newContext({
   viewport:{width:393,height:873},deviceScaleFactor:3,isMobile:true,hasTouch:true,
   userAgent:'Mozilla/5.0 (Linux; Android 17; Pixel 9 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
   serviceWorkers:'block'
  });
  const page=await ctx.newPage(),errors=[],dialogs=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.dismiss()});
  await page.addInitScript(()=>{
   window.__qaMicAmplitude=0;
   const track={readyState:'live',enabled:true,stop(){this.readyState='ended'}};
   const stream={getAudioTracks:()=>[track],getTracks:()=>[track]};
   if(!navigator.mediaDevices)Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{}});
   Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>stream});
   class FakeRecorder{
    static isTypeSupported(){return true}
    constructor(){this.state='inactive';this.mimeType='audio/webm'}
    start(){this.state='recording'}
    stop(){
     if(this.state!=='recording')return;
     this.state='inactive';
     queueMicrotask(()=>{
      this.ondataavailable?.({data:new Blob(['x'.repeat(2400)],{type:'audio/webm'})});
      this.onstop?.();
     })
    }
   }
   Object.defineProperty(window,'MediaRecorder',{configurable:true,value:FakeRecorder});
   class FakeContext{
    constructor(){this.state='running'}
    createMediaStreamSource(){return{connect(){},disconnect(){}}}
    createAnalyser(){return{fftSize:1024,getFloatTimeDomainData:array=>array.fill(window.__qaMicAmplitude)}}
    resume(){this.state='running';return Promise.resolve()}
    close(){this.state='closed';return Promise.resolve()}
   }
   Object.defineProperty(window,'AudioContext',{configurable:true,value:FakeContext});
  });
  let uploads=0;
  await page.route('**/api/transcribe',async route=>{
   uploads++;
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'Jeg leter etter nøkkelen på kjøkkenet.'})});
  });
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>window.NEAccess?.ready()===true&&typeof state!=='undefined');
  await page.evaluate(()=>{
   const lesson={...NECurated.get('a1-home'),id:'a1-home',level:'A1'};
   lessonSession={lesson,step:6,locked:false,speakingFollowup:false};
   renderLesson();
  });
  const field=page.locator('#freeAnswer'),mic=page.locator('#micBtn');
  assert.equal(await mic.count(),1,'Mobile speaking screen must have microphone button');
  await field.fill('Jeg skriver selv.');
  await mic.tap();
  await page.waitForFunction(()=>document.getElementById('micBtn')?.textContent.includes('Слушаю'));
  await mic.tap();
  await page.waitForFunction(()=>document.getElementById('micBtn')?.textContent.includes('Говорить'));
  assert(dialogs.some(x=>x.includes('слишком короткая')),'Instant stop must explain the minimum recording duration');
  assert.equal(uploads,0,'Instant microphone stop must never reach AI');
  assert.equal(await field.inputValue(),'Jeg skriver selv.','Rejecting short audio must preserve typed answers');

  await page.evaluate(()=>{window.__qaMicAmplitude=0});
  await mic.tap();
  await page.waitForFunction(()=>document.getElementById('micBtn')?.textContent.includes('Слушаю'));
  await page.waitForTimeout(1350);
  await mic.tap();
  await page.waitForFunction(()=>document.getElementById('micBtn')?.textContent.includes('Говорить'));
  assert(dialogs.some(x=>x.includes('не обнаружен звук речи')),'Sustained silence should give understandable feedback');
  assert.equal(uploads,0,'Silence must never be sent for hallucinated transcription');
  assert.equal(await field.inputValue(),'Jeg skriver selv.','Silent input must preserve existing text');

  await page.evaluate(()=>{window.__qaMicAmplitude=0.012});
  await mic.tap();
  await page.waitForFunction(()=>document.getElementById('micBtn')?.textContent.includes('Слушаю'));
  await page.waitForTimeout(1350);
  await mic.tap();
  await page.waitForFunction(()=>document.getElementById('freeAnswer')?.value==='Jeg leter etter nøkkelen på kjøkkenet.',null,{timeout:7000});
  assert.equal(uploads,1,'Genuine-duration audio should reach the transcriber exactly once');
  assert.equal(await field.getAttribute('data-from-voice'),'true','Only transcribed speech should be marked as voice');
  await field.fill('Jeg retter selv.');
  assert.equal(await field.getAttribute('data-from-voice'),'false','Manual editing must clear voice provenance');
  assert.deepEqual(errors,[],'No uncaught browser errors in mobile audio flow');
  console.log('PASS Android-like Chromium mic regression: rapid stop, silence, audible audio, text preservation, and voice provenance');
  await ctx.close();
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
