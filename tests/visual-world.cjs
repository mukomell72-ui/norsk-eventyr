// Animated living-world integration: safe presentation and natural speaking.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const source=read('visual-world.js'),style=read('visual-world.css'),guided=read('guided-speaking.js');
const s={learningV8:{}};
let own={textContent:''},reaction={hidden:true,textContent:''},picture={src:''},voiceStatus={textContent:''};
const elements={neWorldOwnWords:own,neWorldReaction:reaction,neWorldSelfImage:picture,neWorldVoiceStatus:voiceStatus};
let saved=0,spoke='',calls=0;
const lesson={id:'l1',level:'A2',_adaptive:{moduleId:'a2-work'}};
const scene={scene:'В офисе <неожиданность>',actor:'Mari · руководитель',opening:'Hei! Når kan du komme?',steps:[
 {task:'Скажи, когда <можешь> прийти.',reply:'Det passer fint.'},
 {task:'Уточни время встречи.',reply:'Vi sees i morgen.'}]};
const progress={index:0,turns:[]};
const fakeDocument={
 getElementById:id=>elements[id]||null,
 querySelector:()=>({classList:{remove(){},add(){}},offsetWidth:100}),
 querySelectorAll:()=>[]
};
const window={
 neLearnerState:s,neLessonSession:{lesson,guidedSpeech:progress},NEGuidedSpeaking:{definition:()=>scene},
 saveState:()=>{saved++;return true},
 speakText:text=>{spoke=text;calls++}
};
vm.runInNewContext(source,{window,document:fakeDocument},{filename:'visual-world.js'});
const V=window.NEVisualWorld;
assert(V,'Living-world module failed to load');
const markup=V.render({lesson,scene,progress,step:scene.steps[0],moduleId:'a2-work'});
assert(markup.includes('ne-world-office')&&markup.includes('Нора'), 'Interactive work scenario missing');
assert(markup.includes('assets/characters/mari.svg'),'Attractive adult character portrait not selected');
assert(markup.includes('aria-label="Анимированная жизненная ситуация"'),'Scene lacks accessibility label');
assert(markup.includes('&lt;неожиданность&gt;')&&!markup.includes('<неожиданность>'),'User-facing scene must escape content');
assert(markup.includes('&lt;можешь&gt;'),'Spoken lesson goal must escape content');
assert(markup.includes('NEVisualWorld.speakPartner()')&&markup.includes('NEVisualWorld.speakTask()'),'Speaking cues missing');
assert(V.chooseAvatar('ingrid')===true&&s.learningV8.visualWorld.avatar==='ingrid'&&saved===1,'Avatar preference not retained');
assert.equal(picture.src,'/assets/characters/ingrid.svg');
assert.equal(V.chooseAvatar('../evil.svg'),false,'Untrusted avatar path allowed');
V.updateOwn('Jeg kommer klokka ni.');
assert.equal(own.textContent,'Jeg kommer klokka ni.','Learner response not visible');
V.accepted('Jeg kommer klokka ni.','Vi sees!');
assert.equal(reaction.hidden,false);
assert(reaction.textContent.includes('Vi sees!'),'Partner response not displayed');
V.speakPartner();assert.equal(spoke,scene.opening,'Partner playback incorrect');
progress.turns=[{answer:'Jeg kommer klokka ni.',reply:'Det passer fint.',spoken:true}];progress.index=1;
V.speakPartner();assert.equal(spoke,'Det passer fint.','Next scene should speak actual previous reply');
const hidden=V.render({lesson:{...lesson,_adaptive:{moduleId:'a1-foundation'}},
 scene:{...scene,actor:'Erik · сотрудник'},progress:{index:0,turns:[]},step:scene.steps[0],moduleId:'a1-foundation'});
assert(!hidden.includes('Erik · сотрудник'),'A1 character name must not be leaked before disclosure');
assert(hidden.includes('Сотрудник'),'A1 undisclosed character role missing');
const current=V.render({lesson,scene,progress,step:scene.steps[1],moduleId:'a2-work'});
assert(current.includes('Det passer fint.'),'Historical dialogue should carry forward into new stage');
assert(style.includes('prefers-reduced-motion:reduce'),'Motion accessibility preference unsupported');
assert(style.includes('.ne-world-character')&&style.includes('ne-world-talk'),'No actual character animation');
for(const f of ['ingrid.svg','mari.svg','erik.svg']){
 const img=read('assets/characters/'+f);
 assert(img.includes('<svg')&&img.includes('viewBox='),'Illustration asset incomplete: '+f);
 assert(!img.includes('<script'),'SVG contains executable script: '+f);
}
assert(guided.includes('window.NEVisualWorld?.render?.')&&guided.includes('window.NEVisualWorld?.updateOwn?.')&&guided.includes('window.NEVisualWorld?.accepted?.'),'Native dialogue not connected');
const access=read('access.js'),sw=read('sw.js'),html=read('index.html');
assert(read('nora-experience.js').includes('NEVisualWorld?.guide?.(b)'),'Nora visual guide must appear throughout the lesson');
assert(access.includes("'visual-world.js','guided-speaking.js'"),'Visual world should load before guided speech');
assert(sw.includes('/visual-world.js?v=8.3.0-world1')&&sw.includes('/visual-world.css?v=8.3.0-world1'),'Offline assets missing');
assert(html.includes('/visual-world.css?v=8.3.0-world1'),'Fresh styles not loaded');
assert(source.includes('typeof window.saveState')&&source.includes('aria-pressed'),'Avatar state not personal');
console.log('PASS animated conversations: adult illustrations, escaped scene, learner answers, voice response, continuity, saved avatar, reduced motion and PWA');

(async()=>{
 const {chromium}=require('playwright');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const testProgress={index:0,turns:[]};
  const visual=V.render({lesson,scene,progress:testProgress,step:scene.steps[0],moduleId:'a2-work'});
  const embedded=visual.replace(/src="(\/assets\/[^"]+)"/g,(_,src)=>{
   const full=path.join(root,src.slice(1)),buffer=fs.readFileSync(full);
   const mime=src.endsWith('.svg')?'image/svg+xml':'image/webp';
   return 'src="data:'+mime+';base64,'+buffer.toString('base64')+'"';
  });
  await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<style>body{margin:0;padding:10px;background:#e7edf2;font-family:system-ui,Arial,sans-serif}main{max-width:720px;margin:auto}</style>'+
   '<style>'+style+'</style></head><body><main>'+embedded+'</main></body></html>');
  const found=await page.locator('.ne-world-character').count();
  assert.equal(found,3,'All three characters must render in Chromium');
  const missing=await page.locator('.ne-world-character img').evaluateAll(nodes=>nodes.filter(x=>!x.complete||x.naturalWidth===0).length);
  assert.equal(missing,0,'Characters images must render as real images on Android-size viewport');
  const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(horizontal,false,'Visual stage overflows mobile viewport');
  fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
  await page.screenshot({path:path.join(__dirname,'artifacts','nora-living-world-mobile.png'),fullPage:true});
  await page.close();
  console.log('PASS illustrated mobile Chromium: 3 portraits loaded, colorful scene, no horizontal overflow, screenshot stored');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});

