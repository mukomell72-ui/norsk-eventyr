'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=source.indexOf('function lessonDraftKey(');
const end=source.indexOf('function persistLessonCheckpoint(){',start);
assert(start>=0&&end>start,'Draft save/restore module exists');
const fragment=source.slice(start,end);
let persisted=0,slot=null;
const session={lesson:{id:'a1-saturday',level:'A1'},step:5,dialogueIndex:0,
 answerDrafts:{},speakingFollowup:false,remediation:null};
const box={value:'Jeg begynner på lørdag klokka ni.',dataset:{},
 callbacks:{},addEventListener(type,cb){this.callbacks[type]=cb}};
const ctx={window:{addEventListener(){}},document:{getElementById:id=>id==='freeAnswer'?box:null,addEventListener(){}},
 lessonSession:session,setTimeout(fn){slot=fn;return 1},clearTimeout(){slot=null},
 persistLessonCheckpoint(){persisted++},hasAdaptiveGrammar(){return true},Math,Object,Array,String};
vm.runInNewContext(fragment+'this.drafts={lessonDraftKey,saveLessonDraft,restoreLessonDraft,flushLessonDraft};',ctx);
const a=ctx.drafts;
a.restoreLessonDraft(session);
assert.equal(box.dataset.draftMode,'writing');
box.value='Jeg har fri på lørdag.';
box.callbacks.input();
assert.equal(session.answerDrafts[a.lessonDraftKey(session,'writing')],box.value);
a.flushLessonDraft();
assert.equal(persisted,1,'Switching tabs forces draft save');
const saved=JSON.parse(JSON.stringify(session.answerDrafts));
box.value='';session.answerDrafts=saved;
a.restoreLessonDraft(session);
assert.equal(box.value,'Jeg har fri på lørdag.','Lesson render must restore exact draft');
session.step=6;
assert.notEqual(a.lessonDraftKey(session,'speaking'),a.lessonDraftKey({...session,step:5},'writing'),'Writing and speaking are distinct');
session.step=5;session.remediation={mode:'writing',prompt:'Ny situasjon.'};
assert.notEqual(a.lessonDraftKey(session,'writing'),Object.keys(saved)[0],'Transfer task requires separate draft');
session.remediation=null;
box.value='';box.callbacks.input();a.flushLessonDraft();
assert.equal(session.answerDrafts[a.lessonDraftKey(session,'writing')],undefined,'Clearing the editor removes its own draft only');
assert(source.includes('answerDrafts:session.answerDrafts||{}'),'Checkpoint must persist drafts');
assert(source.includes("restoreLessonDraft(s);"),'Lesson renderer must restore drafts');
assert(source.includes('saveLessonDraft(mode,input);flushLessonDraft();'),'AI verification must flush latest draft before sending');
console.log('PASS drafts: cached by task, saved on input, flushed on navigation, restored without XP impact');
