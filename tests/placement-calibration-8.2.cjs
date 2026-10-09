// Norsk Eventyr 8.2: isolated two-stage placement behavior tests.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const script=read('placement-calibration.js');
new vm.Script(script); // Parse the entire module without running a browser.
function harness(level=null){
 const routes=[],screens=[],attempts=[],elements={
  calibrationAnswer:{value:'',dataset:{fromVoice:'false'}},
  calibrationFeedback:{innerHTML:'',isConnected:true},
  calibrationSubmit:{disabled:false,isConnected:true}
 };
 const state={level:level||'A1',placement:level?{level,recommendedStart:level,scope:'receptive_screening'}:null,chatPrefs:{level:level||'A1'},
  learningV8:{skills:{},levelSkills:{A1:{},A2:{},B1:{},B2:{}},attempts:[]}};
 const adaptive={
  ensure(st){return st.learningV8},
  recordAttempt(st,input){attempts.push(input);st.learningV8.attempts.push(input);}
 };
 let evaluator=async()=>({ok:true,data:{score:80}});
 const navigateStub=(route)=>{routes.push(route)};
 const document={querySelector:()=>null,getElementById:id=>elements[id]||null};
 const ctx={state,document,window:{navigate:navigateStub,NEAdaptive:adaptive},navigate:navigateStub,
  NEAdaptive:adaptive,saveState:()=>{},shell:html=>screens.push(html),aiEvaluate:(...args)=>evaluator(...args),
  Date,Math,Number,Array,Object,String,JSON,Set,Intl,console};
 vm.createContext(ctx);vm.runInContext(script,ctx);
 return{ctx,state,routes,screens,attempts,elements,setEvaluator:fn=>{evaluator=fn},api:ctx.window.NECalibration};
}
(async()=>{
 const beginner=harness();
 beginner.api.beginner();
 assert.equal(beginner.state.level,'A1');
 assert.equal(beginner.state.placement.scope,'beginner_choice');
 assert.equal(beginner.state.placement.productive.status,'postponed');
 assert.equal(beginner.routes.at(-1),'teacher');
 assert.equal(beginner.attempts.length,0,'Beginner self-selection is not test evidence');

 const user=harness('B2');
 user.api.render();
 assert(user.screens.at(-1).includes('Письмо'));
 user.elements.calibrationAnswer.value='Et digitalt tilbud er nyttig, men ikke alltid rettferdig.';
 user.setEvaluator(async()=>({ok:true,data:{score:78}}));
 await user.api.submit();
 assert.equal(user.state.placement.productive.nextIndex,1);
 assert.equal(user.attempts[0].skill,'writing');
 assert.equal(user.attempts[0].source,'placement2_written');
 assert.equal(user.state.learningV8.levelSkills.B2.writing,65);

 // Merely typing into a speaking task must not produce oral evidence.
 user.elements.calibrationAnswer.value='Jeg tror det er en dårlig idé.';
 user.elements.calibrationAnswer.dataset.fromVoice='false';
 await user.api.submit();
 assert.equal(user.state.placement.productive.nextIndex,1);
 assert.equal(user.attempts.length,1);
 assert(user.elements.calibrationFeedback.innerHTML.includes('вручную'));

 // Unavailable AI must not invent an assessment or advance.
 user.elements.calibrationAnswer.dataset.fromVoice='true';
 user.setEvaluator(async()=>({ok:false,error:'UNAVAILABLE'}));
 await user.api.submit();
 assert.equal(user.state.placement.productive.nextIndex,1);
 assert.equal(user.attempts.length,1);

 // Both microphone-origin markers are accepted, but no phonetics claims.
 user.setEvaluator(async()=>({ok:true,data:{score:20}}));
 await user.api.submit();
 assert.equal(user.state.placement.productive.nextIndex,2);
 assert.equal(user.attempts[1].skill,'speaking');
 assert.equal(user.attempts[1].source,'placement2_voice');
 user.elements.calibrationAnswer.dataset.fromVoice='recognition';
 await user.api.submit();
 assert.equal(user.state.placement.productive.status,'complete');
 assert.equal(user.state.level,'B2','Weak speaking must not erase strong B2 starting level');
 assert.equal(user.state.placement.productive.remediation.speaking.level,'A2');
 assert.equal(user.state.placement.productive.remediation.writing,undefined);
 assert(user.screens.at(-1).includes('не к фонетике'));
 assert.equal(user.state.learningV8.levelSkills.B2.writing,65);
 assert.equal(user.attempts.filter(x=>x.skill==='speaking').length,2);

 const retry=harness('A2');
 retry.api.render();retry.elements.calibrationAnswer.value='Jeg blir litt forsinket fordi bussen er sen.';
 retry.setEvaluator(async()=>{throw new Error('NETWORK')});
 await retry.api.submit();
 assert.equal(retry.state.placement.productive.nextIndex,0);
 assert.equal(retry.attempts.length,0);
 retry.api.postpone();
 assert.equal(retry.state.placement.productive.status,'postponed');
 assert.equal(retry.routes.at(-1),'teacher');
 retry.api.render();
 assert.equal(retry.state.placement.productive.nextIndex,0);

 assert(read('access.js').includes("'ui-v8.js','placement-calibration.js','updates.js'"));
 assert(read('sw.js').includes('/placement-calibration.js?v='));
 assert(read('v3.js').includes("navigate(\\'calibration\\')"));
 const adaptiveText=read('adaptive-teacher.js');
 assert(adaptiveText.includes("kind:'remediation'")&&adaptiveText.includes("gap.done=true"),'A targeted remediation must complete and not loop forever');
 console.log('PASS 8.2 placement: beginner, typed/voice distinction, AI failure, mixed B2 skills, resume and wiring');
})().catch(e=>{console.error(e);process.exitCode=1});