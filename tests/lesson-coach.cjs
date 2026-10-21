'use strict';
// Grammar tutor integration smoke checks: explanation, retry, speech, resume and every topic.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../lesson-coach.js'),'utf8');
let session=null,saved=0,spoken=[];
const task={innerHTML:''},counter={textContent:''};
const window={
 get neLessonSession(){return session},
 nePersistCoach(){saved++},
 speakText(sentence,rate){spoken.push([sentence,rate])}
};
const document={
 getElementById(id){return id==='neLessonCoachTask'?task:null},
 querySelector(sel){return sel==='.ne-coach-count'?counter:null}
};
vm.runInNewContext(source,{window,document});
assert(window.NELessonCoach,'Tutor must export its lesson integration API');
const tutor=window.NELessonCoach;
assert.equal(tutor.render({grammarRuleRu:'утренние дела'}),'','No irrelevant grammar tutor should be injected');
const topics=[
 ['perfekt',[1,3]],['preteritum',[1,2]],['infinitiv',[2,0]],
 ['ordstilling',[0,2]],['presens',[2,0]],['leddsetning',[1,2]],['kondisjonalis',[2,0]]
];
for(const [keyword,correct] of topics){
 const lesson={id:'test-'+keyword,grammarRuleRu:keyword,grammarQ:'Выбери верный вариант'};
 session={lesson,coach:null,step:2,xpScores:[]};
 const initial=tutor.render(lesson);
 assert(initial.includes('ne-lesson-coach'),keyword+' tutor must display');
 assert(initial.includes('Пример 1 из 2'),keyword+' tutor must have two examples');
 assert(initial.includes('ne-coach-option'),keyword+' answer buttons must not use the scored choice selector');
 const before=saved;
 tutor.hint();
 assert(task.innerHTML.includes('Подсказка'),keyword+' hint is visible');
 const wrong=(correct[0]+1)%4;
 tutor.answer(wrong);
 assert(session.coach.incorrect.includes(wrong),keyword+' should remember mistaken choice');
 assert(task.innerHTML.includes('Разберём ошибку'),keyword+' should explain the error');
 tutor.answer(wrong);
 assert.equal(session.coach.incorrect.length,1,keyword+' repeated click must not count twice');
 tutor.answer(correct[0]);
 assert(session.coach.last.correct,keyword+' valid response acknowledged');
 assert(task.innerHTML.includes('Почему именно так'),keyword+' correct answer also explained');
 const priorSpeech=spoken.length;
 tutor.speak();
 assert.equal(spoken.length,priorSpeech+1,keyword+' correct sentence can be heard');
 tutor.next();
 assert.equal(session.coach.index,1,keyword+' moves to second question');
 tutor.answer(correct[1]);
 assert(session.coach.last.correct,keyword+' second correct answer acknowledged');
 tutor.next();
 assert.equal(session.coach.done,true,keyword+' two exercises finished');
 assert(task.innerHTML.includes('Два примера разобраны'),keyword+' completed indicator');
 tutor.restart();
 assert.equal(session.coach.index,0,keyword+' restart resets index');
 assert.equal(session.coach.done,false,keyword+' restart resets completion');
 assert(saved>before,keyword+' actions persist progress');
 assert.deepEqual(session.xpScores,[],keyword+' optional practice must not alter scored steps');
}
console.log('PASS lesson coach: 7 grammar topics, explanations, retries, speech, persistence, score isolation');
