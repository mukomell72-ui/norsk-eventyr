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

// 1. Every installed PWA asset must exist. cache.addAll() fails atomically
//    if even one missing file is in the list, preventing service-worker install.
const sw=read('sw.js'),access=read('access.js'),index=read('index.html');
const app=read('app.js'),health=read('api/health.js');
const v=(app.match(/const APP_VERSION="([^"]+)"/)||[])[1];
assert.match(v||'',/^\d+\.\d+\.\d+$/,'APP_VERSION missing');
const revision=(access.match(/const ASSET_REV='([^']+)'/)||[])[1];
assert.equal(revision,v,'Access bootstrap must fetch the published revision');
const baseCache='norsk-eventyr-v'+v.replaceAll('.','-');
const actualCache=(sw.match(/^const CACHE="([^"]+)";/m)||[])[1];
// New narrative assets use independent cache-busting suffixes. Preserve the
// established 8.3.0 release gates while verifying the story bundle separately.
const worldRevision=(actualCache?.match(/-world[1-9][0-9]*$/)||[])[0]||'';
const cacheWithoutWorld=actualCache?.slice(0,actualCache.length-worldRevision.length)||'';
const storyRevision=(cacheWithoutWorld.startsWith(baseCache)?cacheWithoutWorld.match(/-story[1-9][0-9]*$/)?.[0]:'')||'';
const worldSuffix=pathname=>['/access.js','/guided-speaking.js','/visual-world.js'].includes(pathname)?'-world1':'';
const assetRevision=cacheWithoutWorld.startsWith(baseCache)?cacheWithoutWorld.slice(baseCache.length,cacheWithoutWorld.length-storyRevision.length):null;
const storySuffix=pathname=>pathname==='/access.js'||pathname==='/v8.css'||['/app.js','/guided-speaking.js','/adaptive-teacher.js','/living-day.js','/story-journey.js'].includes(pathname)?'-story1':
 pathname==='/story-journey-advanced.js'?'-story2':'';
const auditSuffix=(assetRevision?.match(/(-audit[1-9][0-9]*)$/)||[])[1]||'';
const legacyRevision=assetRevision?.slice(0,assetRevision.length-auditSuffix.length)||'';
assert(assetRevision!==null&&(/^(?:-(?:ui|auth|lesson)[1-9][0-9]*(?:-listening[1-9][0-9]*)?(?:-translate[1-9][0-9]*)?(?:-wordhelp[1-9][0-9]*)?(?:-stamp[1-9][0-9]*)?(?:-tap[1-9][0-9]*)?(?:-watch[1-9][0-9]*)?(?:-taponly[1-9][0-9]*)?(?:-clock[1-9][0-9]*)?(?:-feedback[1-9][0-9]*)?(?:-explain[1-9][0-9]*)?(?:-ruforms[1-9][0-9]*)?(?:-skulle[1-9][0-9]*)?(?:-teacher[1-9][0-9]*)?(?:-coach[1-9][0-9]*)?(?:-fresh[1-9][0-9]*)?(?:-bridge[1-9][0-9]*)?)?$/).test(legacyRevision),
  'PWA cache must match the release version or a numbered patch revision');
const bridgeSuffix=(legacyRevision.match(/(-bridge[1-9][0-9]*)$/)||[])[1]||'';
const withoutBridge=legacyRevision.slice(0,legacyRevision.length-bridgeSuffix.length);
const freshnessSuffix=(withoutBridge.match(/(-fresh[1-9][0-9]*)$/)||[])[1]||'';
const withoutFresh=withoutBridge.slice(0,withoutBridge.length-freshnessSuffix.length);
const coachSuffix=(withoutFresh.match(/(-coach[1-9][0-9]*)$/)||[])[1]||'';
const withoutCoach=withoutFresh.slice(0,withoutFresh.length-coachSuffix.length);
const teacherSuffix=(withoutCoach.match(/(-teacher[1-9][0-9]*)$/)||[])[1]||'';
const withoutTeacher=withoutCoach.slice(0,withoutCoach.length-teacherSuffix.length);
const skulleSuffix=(withoutTeacher.match(/(-skulle[1-9][0-9]*)$/)||[])[1]||'';
const withoutSkulle=withoutTeacher.slice(0,withoutTeacher.length-skulleSuffix.length);
const ruFormsSuffix=(withoutSkulle.match(/(-ruforms[1-9][0-9]*)$/)||[])[1]||'';
const withoutRuForms=withoutSkulle.slice(0,withoutSkulle.length-ruFormsSuffix.length);
const explainSuffix=(withoutRuForms.match(/(-explain[1-9][0-9]*)$/)||[])[1]||'';
const withoutExplain=withoutRuForms.slice(0,withoutRuForms.length-explainSuffix.length);
const feedbackSuffix=(withoutExplain.match(/(-feedback[1-9][0-9]*)$/)||[])[1]||'';
const withoutFeedback=withoutExplain.slice(0,withoutExplain.length-feedbackSuffix.length);
const clockSuffix=(withoutFeedback.match(/(-clock[1-9][0-9]*)$/)||[])[1]||'';
const withoutClock=withoutFeedback.slice(0,withoutFeedback.length-clockSuffix.length);
const tapOnlySuffix=(withoutClock.match(/(-taponly[1-9][0-9]*)$/)||[])[1]||'';
const withoutTapOnly=withoutClock.slice(0,withoutClock.length-tapOnlySuffix.length);
const watchSuffix=(withoutTapOnly.match(/(-watch[1-9][0-9]*)$/)||[])[1]||'';
const withoutWatch=withoutTapOnly.slice(0,withoutTapOnly.length-watchSuffix.length);
const tapSuffix=(withoutWatch.match(/(-tap[1-9][0-9]*)$/)||[])[1]||'';
const withoutTap=withoutWatch.slice(0,withoutWatch.length-tapSuffix.length);
const stampSuffix=(withoutTap.match(/(-stamp[1-9][0-9]*)$/)||[])[1]||'';
const withoutStamp=withoutTap.slice(0,withoutTap.length-stampSuffix.length);
const wordHelpSuffix=(withoutStamp.match(/(-wordhelp[1-9][0-9]*)$/)||[])[1]||'';
const withoutWordHelp=withoutStamp.slice(0,withoutStamp.length-wordHelpSuffix.length);
const translationSuffix=(withoutWordHelp.match(/(-translate[1-9][0-9]*)$/)||[])[1]||'';
const withoutTranslation=withoutWordHelp.slice(0,withoutWordHelp.length-translationSuffix.length);
const audioSuffix=(withoutTranslation.match(/(-listening[1-9][0-9]*)$/)||[])[1]||'';
const baseRevision=withoutTranslation.slice(0,withoutTranslation.length-audioSuffix.length);
// Independently validate a narrowly scoped audio-cache refresh: core lessons
// remain on their tested revision, while access, audio bank and elite reload.
assert(index.includes('<title>Norsk Eventyr '+v),'Page must show exact application version');
assert(health.includes('version:"'+v+'"'),'Health endpoint must report the deployed version');
const assetsLiteral=(sw.match(/^const ASSETS=(\[[^\n]+\]);/m)||[])[1];
assert(assetsLiteral,'PWA precache manifest missing or changed format');
const assets=JSON.parse(assetsLiteral);
assert.equal(new Set(assets).size,assets.length,'Duplicate PWA precache entries');
assert(assets.length>=30,'A large PWA manifest was unexpectedly truncated');
for(const asset of assets){
 assert(asset==='/'||asset.startsWith('/'),'Only same-origin paths can be precached: '+asset);
 const [pathname,query]=asset.split('?');
 if(asset!=='/')assert(exists(pathname.replace(/^\//,'')),'PWA update will fail: missing '+asset);
 if(query&&pathname!=='/manifest.json'){
  const patched=assetRevision?.startsWith('-lesson')?['/v8.css','/access.js','/access.css','/app.js','/guided-speaking.js','/v3.js','/adaptive-teacher.js','/course-methodology.js','/verified-learning-resources.js','/norwegian-listening.js','/elite.js','/ui-v7.js','/nordic-quest-play.js','/nordic-quest.js','/nordic-quest.css','/living-day.js','/card-grammar.js','/card-form-practice.js','/mini-path.js','/living-words.js','/admin-dashboard.js','/admin-dashboard.css','/study-activity.js']:
   assetRevision?.startsWith('-auth')?['/v8.css','/access.js','/access.css']:['/v8.css'];
  const expected='v='+v+(patched.includes(pathname)?baseRevision:'')+
   (audioSuffix&&['/access.js','/elite.js','/norwegian-listening.js'].includes(pathname)?audioSuffix:'')+
   (translationSuffix&&['/access.js','/ui-v7.js','/ui-v8.js','/updates.js','/card-form-practice.js','/living-words.js'].includes(pathname)?translationSuffix:'')+
   (wordHelpSuffix&&['/access.js','/card-form-practice.js','/living-words.js'].includes(pathname)?wordHelpSuffix:'')+
   (stampSuffix&&['/access.js','/updates.js','/ui-v8.js'].includes(pathname)?stampSuffix:'')+
   (tapSuffix&&['/access.js','/card-form-practice.js','/living-words.js'].includes(pathname)?tapSuffix:'')+
   (watchSuffix&&['/access.js','/card-form-practice.js','/living-words.js'].includes(pathname)?watchSuffix:'')+
   (tapOnlySuffix&&['/access.js','/card-form-practice.js','/living-words.js'].includes(pathname)?tapOnlySuffix:'')+
   (clockSuffix&&['/access.js','/card-form-practice.js','/living-words.js'].includes(pathname)?clockSuffix:'')+
   (feedbackSuffix&&['/access.js','/card-form-practice.js','/living-words.js'].includes(pathname)?feedbackSuffix:'')+
   (explainSuffix&&['/access.js','/living-words.js'].includes(pathname)?explainSuffix:'')+
   (ruFormsSuffix&&['/access.js','/card-grammar.js','/living-words.js'].includes(pathname)?ruFormsSuffix:'')+
   (skulleSuffix&&['/access.js','/card-grammar.js','/card-form-practice.js'].includes(pathname)?skulleSuffix:'')+
   (teacherSuffix&&['/access.js','/course-methodology.js','/adaptive-teacher.js','/app.js','/guided-speaking.js','/living-day.js','/ui-v7.js'].includes(pathname)?teacherSuffix:'')+
   (coachSuffix&&['/access.js','/app.js','/lesson-coach.js','/lesson-coach.css','/language-bridge.js','/language-bridge.css','/cloze-coach.js','/functional-practice.js','/living-words.js'].includes(pathname)?coachSuffix:'')+
   (freshnessSuffix&&['/access.js','/adaptive-teacher.js'].includes(pathname)?freshnessSuffix:'')+
   (bridgeSuffix&&['/access.js','/adaptive-teacher.js','/app.js','/language-bridge.js','/ui-v7.js','/v7.css','/v3.js','/elite.js','/nora-experience.js'].includes(pathname)?bridgeSuffix:'')+
   (auditSuffix&&['/access.js','/v7.css','/nora-experience.js','/living-day.js','/app.js','/guided-speaking.js','/language-bridge.js','/ui-v7.js','/adaptive-teacher.js','/word-learning-evidence.js'].includes(pathname)?auditSuffix:'')+storySuffix(pathname)+worldSuffix(pathname);
  assert.equal(query,expected,'Mixed asset revision in service worker: '+asset);
}
}
if(assetRevision){
  assert(index.includes('href="/v8.css?v='+v+baseRevision+storySuffix('/v8.css')+'"'),
    'UI patch must force the same fresh stylesheet on the page');
  assert(assets.includes('/v8.css?v='+v+baseRevision+storySuffix('/v8.css')),
    'UI patch stylesheet must be available offline');
}
if(assetRevision?.startsWith('-auth')){
  for(const [tag,asset] of [['src','access.js'],['href','access.css']]){
    const expected=tag+'="/'+asset+'?v='+v+assetRevision+storySuffix('/'+asset)+worldSuffix('/'+asset)+'"';
    assert(index.includes(expected),'Page must load fresh authentication bootstrap: '+expected);
    assert(assets.includes('/'+asset+'?v='+v+assetRevision+storySuffix('/'+asset)+worldSuffix('/'+asset)),
      'PWA precache must include fresh authentication bootstrap: '+asset);
  }
}
if(assetRevision?.startsWith('-lesson')){
  assert(index.includes('src="/access.js?v='+v+assetRevision+storySuffix('/access.js')+worldSuffix('/access.js')+'"'),
    'Lesson patch must fetch fresh lesson bootstrap');
  assert(assets.includes('/access.js?v='+v+assetRevision+storySuffix('/access.js')+worldSuffix('/access.js')),
    'PWA must precache updated lesson bootstrap');
  assert(access.includes("LESSON_PATCH='"+baseRevision+"'")&&
   (!audioSuffix||access.includes("'"+audioSuffix+"'"))&&
   (!translationSuffix||access.includes("'"+translationSuffix+"'"))&&
   (!wordHelpSuffix||access.includes("'"+wordHelpSuffix+"'"))&&
   (!stampSuffix||access.includes("'"+stampSuffix+"'"))&&
   (!tapSuffix||access.includes("'"+tapSuffix+"'"))&&
   (!watchSuffix||access.includes("'"+watchSuffix+"'"))&&
   (!tapOnlySuffix||access.includes("'"+tapOnlySuffix+"'"))&&
   (!clockSuffix||access.includes("'"+clockSuffix+"'"))&&
   (!feedbackSuffix||access.includes("'"+feedbackSuffix+"'"))&&
   (!explainSuffix||access.includes("'"+explainSuffix+"'"))&&
   (!ruFormsSuffix||access.includes("'"+ruFormsSuffix+"'"))&&
   (!skulleSuffix||access.includes("'"+skulleSuffix+"'"))&&
   (!teacherSuffix||access.includes("'"+teacherSuffix+"'"))&&
   (!freshnessSuffix||access.includes("'"+freshnessSuffix+"'")), 
    'Access bootstrap and offline cache must agree on lesson patch revision');
}
if(bridgeSuffix)assert.equal(bridgeSuffix,'-bridge8','Unexpected language bridge revision');
if(skulleSuffix)assert.equal(skulleSuffix,'-skulle1','Unexpected modal grammar revision');
if(ruFormsSuffix){
 assert(ruFormsSuffix==='-ruforms2','Unexpected Russian morphology patch revision');
 for(const filename of ['card-grammar.js','living-words.js'])
  assert(assets.some(asset=>asset.startsWith('/'+filename+'?v=')&&asset.endsWith(ruFormsSuffix+(filename==='card-grammar.js'?skulleSuffix:coachSuffix))),
   'Russian form translations must be precached: '+filename);
}
const assetSet=new Set(assets);
const bootstrap=access.match(/const ASSET_REV='[^']+'(?:,LESSON_PATCH='[^']+')?,scripts=(\[[^\]]+\]);/);
assert(bootstrap,'Dynamic asset dependency list must be declared');
const scripts=[...bootstrap[1].matchAll(/'([^']+\.js)'/g)].map(m=>m[1]);
assert(scripts.length>=15,'Critical dynamic scripts dropped');
assert(scripts.indexOf('word-learning-evidence.js')>scripts.indexOf('lesson-vocabulary-trays.js')&&scripts.indexOf('word-learning-evidence.js')<scripts.indexOf('app.js'),
 'Word-usage evidence must load after word trays and before Nora answers');
for(const filename of scripts){
 const patch=assetRevision?.startsWith('-lesson')&&['app.js','guided-speaking.js','v3.js','adaptive-teacher.js','course-methodology.js','verified-learning-resources.js','norwegian-listening.js','elite.js','ui-v7.js','nordic-quest-play.js','nordic-quest.js','living-day.js','card-grammar.js','card-form-practice.js','mini-path.js','living-words.js'].includes(filename)?baseRevision:'';
 const suffix=(audioSuffix&&['norwegian-listening.js','elite.js'].includes(filename)?audioSuffix:'')+
   (translationSuffix&&['ui-v7.js','ui-v8.js','updates.js','card-form-practice.js','living-words.js'].includes(filename)?translationSuffix:'')+
   (wordHelpSuffix&&['card-form-practice.js','living-words.js'].includes(filename)?wordHelpSuffix:'')+
   (stampSuffix&&['ui-v8.js','updates.js'].includes(filename)?stampSuffix:'')+
   (tapSuffix&&['card-form-practice.js','living-words.js'].includes(filename)?tapSuffix:'')+
   (watchSuffix&&['card-form-practice.js','living-words.js'].includes(filename)?watchSuffix:'')+
   (tapOnlySuffix&&['card-form-practice.js','living-words.js'].includes(filename)?tapOnlySuffix:'')+
   (clockSuffix&&['card-form-practice.js','living-words.js'].includes(filename)?clockSuffix:'')+
   (feedbackSuffix&&['card-form-practice.js','living-words.js'].includes(filename)?feedbackSuffix:'')+
   (explainSuffix&&filename==='living-words.js'?explainSuffix:'')+
   (ruFormsSuffix&&['card-grammar.js','living-words.js'].includes(filename)?ruFormsSuffix:'')+
   (skulleSuffix&&['card-grammar.js','card-form-practice.js'].includes(filename)?skulleSuffix:'')+
   (teacherSuffix&&['course-methodology.js','adaptive-teacher.js','app.js','guided-speaking.js','living-day.js','ui-v7.js'].includes(filename)?teacherSuffix:'')+
   (coachSuffix&&['lesson-coach.js','language-bridge.js','cloze-coach.js','functional-practice.js','app.js','living-words.js'].includes(filename)?coachSuffix:'')+
   (freshnessSuffix&&filename==='adaptive-teacher.js'?freshnessSuffix:'')+
   (bridgeSuffix&&['adaptive-teacher.js','app.js','language-bridge.js','ui-v7.js','v3.js','elite.js','nora-experience.js'].includes(filename)?bridgeSuffix:'')+
   (auditSuffix&&['nora-experience.js','living-day.js','app.js','guided-speaking.js','language-bridge.js','ui-v7.js','adaptive-teacher.js','word-learning-evidence.js'].includes(filename)?auditSuffix:'')+storySuffix('/'+filename)+worldSuffix('/'+filename);
 assert(assetSet.has('/'+filename+'?v='+v+patch+suffix),'PWA must cache bootstrapped script '+filename);
}
for(const m of index.matchAll(/\b(?:src|href)="(\/[^"]+)"/g)){
 const url=m[1];
 if(url.includes('?v='))assert(assetSet.has(url),'PWA must cache HTML dependency '+url);
}
const ordered=['data.js','curriculum-v8.js','course-methodology.js','verified-learning-resources.js','practice-foundations.js','foundation-extensions.js','advanced-b1.js','advanced-b2.js','adaptive-teacher.js','lesson-coach.js','app.js','voice-pack.js','v3.js','guided-speaking.js','ui-v8.js'];
for(let i=1;i<ordered.length;i++){
 assert(scripts.indexOf(ordered[i-1])>=0&&scripts.indexOf(ordered[i])>scripts.indexOf(ordered[i-1]),
  'Bootstrap dependency order changed: '+ordered[i-1]+' -> '+ordered[i]);
}
// Scoped teaching-data patch: a new cache namespace must include both updated
// learning scripts and the new bootstrap URL, without caching student API data.
if(translationSuffix==='-translate3'){
 const expectedBootstrap='/access.js?v='+v+assetRevision;
 assert(index.includes('src="'+expectedBootstrap+'"'),'New HTML must load the updated bootstrap');
 assert(assetSet.has(expectedBootstrap),'New bootstrap must be available to installed PWAs');
 for(const filename of ['card-form-practice.js','living-words.js']){
  const expectedUrl='/'+filename+'?v='+v+baseRevision+translationSuffix;
  assert(assetSet.has(expectedUrl),'New learning asset missing from PWA: '+expectedUrl);
 }
 assert(access.includes("'"+translationSuffix+"'"),'Loader must agree with learning patch');
}
if(translationSuffix==='-translate4'){
 for(const pathname of ['/ui-v7.js','/ui-v8.js','/updates.js']){
  const rev=pathname==='/ui-v7.js'?baseRevision:'';
  assert(assetSet.has(pathname+'?v='+v+rev+translationSuffix+(stampSuffix&&['/ui-v8.js','/updates.js'].includes(pathname)?stampSuffix:'')+(teacherSuffix&&pathname==='/ui-v7.js'?teacherSuffix:'')+(bridgeSuffix&&pathname==='/ui-v7.js'?bridgeSuffix:'')+(auditSuffix&&pathname==='/ui-v7.js'?auditSuffix:'')),'Installed PWA must fetch fresh version UI: '+pathname);
 }
 assert(sw.includes('NE_GET_VERSION')&&sw.includes('cache:CACHE'),
   'Installed SW must reveal its actual active cache revision via MessageChannel');
 assert(index.includes('/access.js?v='+v+assetRevision),
   'Version check must use a fresh bootstrap URL');
}
assert(assets.includes('/word-learning-evidence.js?v='+v+auditSuffix),
 'Offline word-use evidence module must be precached');
assert(!assets.some(x=>x.startsWith('/api/')),'Never cache authenticated AI responses');
assert(sw.includes('u.pathname.startsWith("/api/")'),'Service worker must bypass /api calls');
console.log('PASS release gate: '+assets.length+' existing PWA assets, atomic precache manifest, release revision, boot order and uncached API');

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

// Tutor release: no stale bootstrap, missing offline assets, or accidental scoring coupling.
if(coachSuffix){
 assert(assets.includes('/lesson-coach.js?v='+v+coachSuffix),'PWA must precache the interactive grammar tutor');
 assert(assets.includes('/lesson-coach.css?v='+v+coachSuffix),'PWA must precache tutor styles');
 assert(index.includes('src="/access.js?v='+v+assetRevision+storySuffix('/access.js')+'"'),'Tutor release must bust the HTML loader cache');
 assert(scripts.indexOf('lesson-coach.js')<scripts.indexOf('app.js'),'Tutor must load before the lesson UI');
 assert(app.includes('NELessonCoach?.render(l)'),'Grammar step must mount tutor');
 assert(scripts.indexOf('language-bridge.js')<scripts.indexOf('nora-experience.js')&&
  scripts.indexOf('nora-experience.js')<scripts.indexOf('app.js'),
  'Nora experience should initialize before app screens and after language bridge');
 assert(assets.includes('/nora-experience.js?v='+v+bridgeSuffix+auditSuffix),
  'Human-centered Nora lesson experience must be installed offline');
 assert(assets.includes('/v7.css?v='+v+bridgeSuffix+auditSuffix),
  'Human-centered UI styles must use the new cache-busting revision');
 assert(app.includes('NEExperience?.lessonHeader?.('),'New mission context must mount in lesson UI');
 assert(read('v3.js').includes('NEExperience?.lessonHeader?.('),'Legacy lesson render must mount Nora experience');
 assert(assets.includes('/v3.js?v='+v+baseRevision+bridgeSuffix),'Offline legacy lesson must reload on release');
 assert(app.includes('NELanguageBridge?.controlHtml?.()'),'Language bridge must offer an opt-out on the homepage');
 assert(assets.includes('/language-bridge.js?v='+v+coachSuffix+bridgeSuffix+auditSuffix),'PWA must precache the language bridge');
 assert(assets.includes('/cloze-coach.js?v='+v+coachSuffix),'PWA must cache word explanation engine');
 assert(assets.includes('/functional-practice.js?v='+v+coachSuffix),'PWA must cache updated cloze practice');
 assert(assets.includes('/language-bridge.css?v='+v+coachSuffix),'PWA must precache bridge styles');
 assert(scripts.indexOf('language-bridge.js')>scripts.indexOf('lesson-coach.js')&&
  scripts.indexOf('language-bridge.js')<scripts.indexOf('app.js'),'Language bridge must initialize before the app UI');
 assert(app.includes('btn.closest("article.card")?.querySelectorAll(".choice")'),'Scored choices must be isolated from tutor buttons');
}
