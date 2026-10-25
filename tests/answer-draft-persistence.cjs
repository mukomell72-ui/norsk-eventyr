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
 lessonSession:session,lessonDraftTimer:null,setTimeout(fn){slot=fn;return 1},clearTimeout(){slot=null},
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
// Guided conversation keeps the lesson step constant while the dialogue index changes.
// Previously every turn reused one key, which restored the previous accepted answer.
session.step=6;
session.guidedSpeech={lessonId:session.lesson.id,index:0,turns:[]};
box.value='';a.restoreLessonDraft(session);
box.value='Kan du møte meg ved butikken?';box.callbacks.input();
const turn0Key=a.lessonDraftKey(session,'speaking');
assert.equal(session.answerDrafts[turn0Key],box.value);
session.guidedSpeech.turns.push({answer:box.value});
session.guidedSpeech.index=1;
box.value='';a.restoreLessonDraft(session);
const turn1Key=a.lessonDraftKey(session,'speaking');
assert.notEqual(turn1Key,turn0Key,'Different dialogue turns require independent keys');
assert.equal(box.value,'','A new task must not show the previous accepted answer');
box.value='På mandag klokka tre passer bra.';box.callbacks.input();
box.value='';a.restoreLessonDraft(session);
assert.equal(box.value,'På mandag klokka tre passer bra.','An unfinished turn survives rerender');
session.guidedSpeech.turns.push({answer:box.value});
session.guidedSpeech.index=2;
box.value='';a.restoreLessonDraft(session);
assert.equal(box.value,'','Next dialogue turn begins empty even after autosave');
// Migration: an older draft from a finished turn must never populate a new one.
const legacyKey=a.lessonDraftKey({...session,guidedSpeech:null},'speaking');
session.answerDrafts[legacyKey]='На mandag klokka tre passer bra.';
box.value='';a.restoreLessonDraft(session);
assert.equal(box.value,'На mandag klokka tre passer bra.','A distinct unfinished legacy draft is preserved');
assert.equal(session.answerDrafts[legacyKey],undefined,'Migrated draft is no longer shared');
// A legacy draft matching a completed turn is stale and must stay hidden.
session.guidedSpeech.index=3;
session.answerDrafts[legacyKey]='Kan du møte meg ved butikken?';
box.value='';a.restoreLessonDraft(session);
assert.equal(box.value,'','Completed legacy answer must not leak to another turn');
console.log('PASS drafts: cached by task, saved on input, flushed on navigation, restored without XP impact');
