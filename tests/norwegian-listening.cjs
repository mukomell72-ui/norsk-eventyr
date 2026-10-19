'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const w={window:{},Object,Array,String,Number};
vm.runInNewContext(read('norwegian-listening.js'),w);
const bank=w.window.NENorwegianListening;
assert(bank,'Norwegian listening course must load before elite.js');
assert.equal(bank.audioLanguage,'nb-NO');
assert.equal(bank.taskLanguage,'ru');
assert.equal(bank.sourceType,'synthetic_norwegian','Do not mislabel TTS as human-recorded speech');
assert.equal(bank.lessons.length,8);
let questionCount=0;
for(const level of ['A1','A2','B1','B2']){
 const lessons=bank.byLevel(level);
 assert.equal(lessons.length,2,level+' must have two authored listening situations');
 for(const lesson of lessons){
  assert.equal(lesson.level,level);
  assert.equal(bank.find(lesson.id),lesson);
  assert(lesson.no.length>40&&/[æøåÆØÅ]/i.test(lesson.no),'Phrase should be substantive Bokmål');
  assert(/[А-Яа-яЁё]/.test(lesson.ru),'A Russian explanation must be present');
  assert.equal(lesson.questions.length,2);
  for(const q of lesson.questions){
   questionCount++;
   assert.equal(q.opts.length,3);
   assert.equal(new Set(q.opts).size,3);
   assert(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<=2);
   assert(/[А-Яа-яЁё]/.test(q.q+q.explain));
   assert(q.opts.every(opt=>/[А-Яа-яЁё]/.test(opt)||/\d/.test(opt)));
  }
 }
}
assert.equal(questionCount,16);
assert.equal(bank.find('not-a-lesson'),null);
const access=read('access.js'),sw=read('sw.js'),html=read('index.html'),elite=read('elite.js');
assert(access.includes("'lexicon.js','norwegian-listening.js','elite.js'"),'Lesson scripts load before Listening Lab');
for(const asset of ['/norwegian-listening.js?v=8.3.0-lesson24-listening1','/elite.js?v=8.3.0-lesson24-listening1','/access.js?v=8.3.0-lesson24-listening1'])
 assert(sw.includes(asset),'Installed PWA must cache updated: '+asset);
assert(html.includes('/access.js?v=8.3.0-lesson24-listening1'));
assert(elite.indexOf('Норвежская речь — русский интерфейс')<elite.indexOf('Дополнительный архив: Norwegian Headstart'),'Main listening must be Norwegian-first, not English archival tapes');
assert(elite.includes('<details class="card ne-english-archive">'),'English-mixed source should be collapsed into extras');
assert(elite.includes('onerror="NEHeadstartAudioError('),'Historical audio reports load failure, including unit 3');
assert(elite.includes('p.heard&&!p.revealed'),'No listening credit from reading transcripts instead of hearing audio');
assert(!elite.includes('onended="NEStudyMarkListening()"'),'Playback of English-mixed legacy recording must not count as Norwegian listening');
console.log('PASS Norwegian-first listening: 8 Bokmål scripts, 16 Russian questions, transparent TTS, safe archive and offline revision');
