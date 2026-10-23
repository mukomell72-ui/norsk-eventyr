'use strict';
// First attempt is summative, later rewrites are formative. A lesson restart
// must restore the original score and the original feedback history.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const extract=name=>{
 const start=app.indexOf('function '+name+'(');
 assert(start>=0,'Missing '+name);
 const brace=app.indexOf('{',start);let depth=0,quote='',escape=false,end=-1;
 for(let i=brace;i<app.length;i++){
  const ch=app[i];
  if(quote){if(escape){escape=false;continue}if(ch==='\\'){escape=true;continue}if(ch===quote)quote='';continue}
  if(ch==='\x27'||ch==='"'||ch==='\x60'){quote=ch;continue}
  if(ch==='{')depth++;
  if(ch==='}'&&!--depth){end=i+1;break}
 }
 assert(end>brace,'Unclosed function '+name);
 return app.slice(start,end);
};
let persists=0,assessments=0;
const context={Math,Number,Object,Array,String,persistLessonCheckpoint:()=>persists++,esc:x=>String(x)};
vm.runInNewContext(extract('firstGrade')+'\n'+extract('firstGradeNote')+'\nthis.api={firstGrade,firstGradeNote};',context);
const {firstGrade,firstGradeNote}=context.api;
const session={firstGraded:{}};
assert.equal(firstGrade(session,'free:writing:4',35,()=>assessments++),true);
assert.equal(firstGrade(session,'free:writing:4',92,()=>assessments++),false);
assert.equal(session.firstGraded['free:writing:4'],35);
assert.equal(assessments,1);
assert.equal(persists,1);
assert(firstGradeNote(session,'free:writing:4').includes('35/100'));
const resumed=JSON.parse(JSON.stringify(session));
assert.equal(firstGrade(resumed,'free:writing:4',100,()=>assessments++),false);
assert.equal(resumed.firstGraded['free:writing:4'],35,'App reload must keep the first score');
assert.equal(assessments,1,'No XP/level change from another correction');
assert.equal(firstGrade(resumed,'free:speaking:5',72,()=>assessments++),true);
assert.equal(assessments,2,'A different exercise still counts first attempt');
assert(app.includes('firstGraded:session.firstGraded||{}'),'Checkpoint stores first scores');
assert(app.includes('xpScores:session.xpScores||[]'),'Checkpoint stores XP evidence');
assert(app.includes('feedbackItems:session.feedbackItems||[]'),'Feedback history survives reload');
assert(app.includes('proposedRemediation:session.proposedRemediation||null'),
 'Optional transfer cannot silently override original task');
assert(app.includes('lessonSession.remediation=lessonSession.proposedRemediation'),
 'A new transfer starts only when explicitly opened');
assert(app.includes('const firstAttempt=firstGrade(s,gradeKey')||
 app.includes('firstAttempt=firstGrade(s,gradeKey'),'Actual AI results must use first-grade gate');
assert(app.includes('data-bridge-instruction="true"'),'Ungraded task directions activate Språkbro');
assert(app.includes('ne-task-direction'),'Instructions are outside assessed question text');
console.log('PASS first-grade retry: persisted original scores, formative rewrites, optional transfer, no regrading');
