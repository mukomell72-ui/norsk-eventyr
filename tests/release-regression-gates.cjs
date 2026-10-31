// Pre-release regression gates. Run against the exact branch being merged.
// These checks prevent detectable cross-module damage; they are NOT a proof
// that Android hardware, TTS providers, AI judgments or teaching outcomes work.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));

// Validate actual runtime and offline URLs instead of reconstructing historical suffix order.
const manifest=require('./release-assets.cjs')(root);
const {sw,access,index,scripts,assets,urls,cache:actualCache}=manifest;
const app=read('app.js'),health=read('api/health.js');
const v=(app.match(/const APP_VERSION="([^"]+)"/)||[])[1];
assert.match(v||'',/^\d+\.\d+\.\d+$/,'APP_VERSION missing');
assert.equal(manifest.version,v,'Loader and application release must agree');
assert(index.includes('<title>Norsk Eventyr '+v),'Page must show exact application version');
assert(health.includes('version:"'+v+'"'),'Health and application release must agree');
assert(actualCache.startsWith('norsk-eventyr-v'+v.replaceAll('.','-')+'-'),'Cache must belong to this release');
const cacheTokens=actualCache.slice(('norsk-eventyr-v'+v.replaceAll('.','-')+'-').length).split('-');
for(const token of cacheTokens)assert(/^(?:feedback|tutor|lesson|listening|translate|wordhelp|stamp|tap|watch|taponly|clock|explain|ruforms|skulle|teacher|coach|fresh|bridge|audit|story|world|scene|pilot)[1-9][0-9]*$/.test(token),'Unknown cache revision '+token);
assert(cacheTokens.includes(manifest.lessonPatch.slice(1)),'Lesson cache revision missing');
const assetSet=new Set(assets);
assert(assets.length>=30,'PWA manifest was unexpectedly truncated');
assert.equal(assetSet.size,assets.length,'Duplicate precache URL');
for(const asset of assets){
 const u=new URL(asset,'https://local.invalid');
 assert.equal(u.origin,'https://local.invalid','Precache must contain only local resources');
 assert(!u.pathname.startsWith('/api/'),'Never cache authenticated AI responses');
 assert(exists(u.pathname==='/'?'index.html':u.pathname.slice(1)),'Missing PWA asset '+asset);
}
for(const url of urls)assert(assetSet.has(url),'PWA must cache exact bootstrapped URL '+url);
for(const m of index.matchAll(/\b(?:src|href)="(\/[^"]+)"/g))
 if(m[1].includes('?v='))assert(assetSet.has(m[1]),'PWA must cache exact HTML dependency '+m[1]);
assert(sw.includes('u.pathname.startsWith("/api/")'),'SW must bypass API calls');
assert(sw.includes('cache:"no-cache"'),'Scripts must refresh online');
assert(sw.includes('NE_GET_VERSION')&&sw.includes('cache:CACHE'),'SW must expose its active cache');
const ordered=['data.js','curriculum-v8.js','course-methodology.js','verified-learning-resources.js','practice-foundations.js','foundation-extensions.js','advanced-b1.js','advanced-b2.js','adaptive-teacher.js','lesson-coach.js','app.js','voice-pack.js','v3.js','guided-speaking.js','ui-v8.js'];
for(let i=1;i<ordered.length;i++)assert(scripts.indexOf(ordered[i-1])>=0&&scripts.indexOf(ordered[i])>scripts.indexOf(ordered[i-1]),'Bootstrap dependency order '+ordered[i]);
assert(scripts.indexOf('lesson-vocabulary-trays.js')<scripts.indexOf('word-learning-evidence.js')&&scripts.indexOf('word-learning-evidence.js')<scripts.indexOf('nora-experience.js'),'Word evidence must initialize before Nora');
console.log('PASS release gate: '+assets.length+' existing local PWA assets, exact runtime URLs, release revision, dependency order and uncached API');

// 2. Verify all 32 structured lessons and multiple exercise rounds. A change
//    that corrupts an answer index can teach the learner the wrong answer.
const env={window:{},Math,Number,String,Date,Object,Array,JSON,Set};
vm.createContext(env);
for(const file of ['curriculum-v8.js','practice-foundations.js','foundation-extensions.js','advanced-b1.js','advanced-b2.js'])
 vm.runInContext(read(file),env,{filename:file});
const curriculum=env.window.NECurriculum,bank=env.window.NECurated;
assert(curriculum&&bank,'Course bank unavailable');
const levels=['A1','A2','B1','B2'],ids=new Set();
let checked=0;
for(const level of levels){
 const modules=curriculum.modules(level);
 assert.equal(modules.length,8,level+' curriculum must contain eight target modules');
 for(const module of modules){
  assert(!ids.has(module.id),'Duplicate curriculum identifier: '+module.id);ids.add(module.id);
  const lesson=bank.get(module.id);
  assert(lesson,'Missing course content: '+module.id);
  for(const field of ['title','phrase','listeningAudio','listeningQ','read','q','writing','speaking','speakingFollowUp','grammarRuleRu']){
   assert(typeof lesson[field]==='string'&&lesson[field].trim().length>=5,module.id+': missing '+field);
  }
  assert(Array.isArray(lesson.vocab)&&lesson.vocab.length>=4,module.id+': inadequate vocabulary');
  assert(Array.isArray(lesson.listeningSets)&&[2,3].includes(lesson.listeningSets.length),module.id+': lost staged audio');
  for(const round of [0,1,2,3,6]){
   const variant=bank.variant(module.id,round);
   assert(variant,module.id+': missing variation '+round);
   for(const [answers,index] of [['opts','correct'],['grammarOpts','grammarCorrect'],['listeningOpts','listeningCorrect']]){
    const choices=variant[answers];
    assert(Array.isArray(choices)&&choices.length===4,module.id+': '+answers+' must contain four options');
    assert.equal(new Set(choices).size,4,module.id+': duplicate options in '+answers);
    assert(Number.isInteger(variant[index])&&variant[index]>=0&&variant[index]<4,module.id+': invalid answer index');
    assert.equal(choices[variant[index]],lesson[answers][lesson[index]],module.id+': '+answers+' correct answer changed');
   }
   for(let step=0;step<lesson.listeningSets.length;step++){
    const options=variant.listeningSets[step],baseline=lesson.listeningSets[step];
    assert(options.opts.length===4&&Number.isInteger(options.correct),module.id+': bad stage '+step);
    assert.equal(options.opts[options.correct],baseline.opts[baseline.correct],module.id+': lost staged-audio answer '+step);
   }
  }
  checked++;
 }
}
assert.equal(checked,32);
assert.equal(bank.get('a1-home').speaking,'Spør hvor nøkkelen er. Si hvor du leter etter den.');
assert(!bank.get('a1-home').speaking.includes('har lett'),'Do not restore advanced tense in A1 key prompt');
console.log('PASS release gate: 32 A1–B2 modules, 160 exercise variants and answer keys, staged listening and speaking');

// 3. Keep historically repaired subsystems present; dedicated behavior suites
//    cover them more deeply. This gate catches accidental removal or route drift.
const voice=read('v3.js');
assert(voice.includes('micRecordingProblem(blob.size,durationMs,silentAudio,target)'),'Rapid tap guard removed');
assert(voice.includes('monitorMicActivity(mediaStream)'),'Microphone silence guard removed');
assert(voice.includes('Date.now()-recognitionStartedAt>=1200'),'Short browser ASR protection removed');
assert(voice.includes('primeSpeech')&&voice.includes('speechAudioContext'),'Mobile speech engine removed');
assert(access.includes('function deviceId()'),'Device identity bootstrap removed');
assert(app.includes('function lessonFreeTask(')&&app.includes('p=lessonFreeTask(l,mode,rem,s.speakingFollowup===true)'),
 'Shown A1 question and AI check must use the same canonical task');
assert(app.includes('data-translation="on-request"'),'Opt-in translation must be available');
assert(app.includes('<summary>Перевести задание</summary>'),'Translation disclosure removed');
assert(!app.includes('<details class="grammar-fold a1-task-support" open'),'Do not expose task translation automatically');
const tests=JSON.parse(read('tests/package.json')).scripts.test;
for(const name of ['a1-key-prompt-8.2.8.cjs','silent-mic-8.2.7.cjs','tts-audio-8.2.6.cjs','browser.cjs','mobile-mic-browser.cjs','updates.cjs','access-browser.cjs','release-regression-gates.cjs','premium-preparation.cjs','deep-listening-adaptation-8.3.cjs','staging-preflight-8.3.cjs'])
 assert(tests.includes(name),'Mandatory test missing from premerge QA: '+name);
console.log('PASS release gate: microphone, audio, opt-in translation, progress and QA coverage contracts');

// Tutor integration remains required independently of release suffix naming.
for(const name of ['lesson-coach.js','lesson-coach.css','language-bridge.js','language-bridge.css','nora-experience.js','v3.js','cloze-coach.js','functional-practice.js'])
 assert(assets.some(u=>u.startsWith('/'+name+'?v='+v)),'Tutor resource missing '+name);
assert(scripts.indexOf('lesson-coach.js')<scripts.indexOf('language-bridge.js')&&scripts.indexOf('language-bridge.js')<scripts.indexOf('nora-experience.js')&&scripts.indexOf('nora-experience.js')<scripts.indexOf('app.js'),'Tutor dependency order');
assert(app.includes('NELessonCoach?.render(l)'),'Grammar step must mount tutor');
assert(app.includes('NEExperience?.lessonHeader?.(')&&read('v3.js').includes('NEExperience?.lessonHeader?.('),'Mission context must mount in both lesson renderers');
assert(app.includes('NELanguageBridge?.controlHtml?.()'),'Language bridge opt-out must remain');
assert(app.includes('btn.closest("article.card")?.querySelectorAll(".choice")'),'Scored choices must be isolated from tutor buttons');
