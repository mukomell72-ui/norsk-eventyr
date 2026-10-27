'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const ui=read('ui-v7.js');
const start=ui.indexOf('  function v7IsNoraHelpRequest('),end=ui.indexOf('  // Recognize explicit help requests',start);
assert(start>=0&&end>start);
const c={};vm.runInNewContext(ui.slice(start,end)+'\nthis.isTutorHelp=v7IsNoraHelpRequest;',c);
for(const s of [
 'Jeg ... забыл, как сказать живу ... i Norge','Я не понял вопрос.',
 'Как будет «живу» в прошедшем?','Nora, hva betyr det?',
 'Nora, kan du snakke litt saktere?','Hva betyr ordet «lenge»?',
 'Hvordan sier jeg «я живу» på norsk?','Hvordan oversetter man «жил» på norsk?',
 'Kan du forklare verbet «bo»?','Jeg husker ikke hva ordet «lenge» betyr',
 'Jeg vet ikke hvordan jeg sier dette på norsk'
])assert.equal(c.isTutorHelp(s),true,'Explicit help request should reach Nora: '+s);
for(const s of [
 'Jeg bor i Norge.','Jeg bodde i Norge, men nå bor jeg i Bergen.',
 'Kan du gjenta det, vær så snill?','Hvor er busstasjonen?',
 'Hva betyr dette for oss?','Kan du forklare hva som skjedde på jobb?',
 'Hvorfor må jeg betale så mye?','Nora hjelper meg med norsk hver dag.',
 '', 'Kan du fortelle mer om Norge?'
])assert.equal(c.isTutorHelp(s),false,'Ordinary dialogue must still be assessed: '+s);
assert(read('guided-speaking.js').includes('window.neNoraHelpIntent?.(a)===true&&window.v7HelpFromLessonAnswer?.(a,input)===true'));
assert(ui.includes('if(!v7IsNoraHelpRequest(raw))return false;'));
assert(read('app.js').includes('Правильно с подсказкой · не самостоятельная оценка'));
assert(read('app.js').includes('Пока неверно · тренировка с подсказкой.'));
console.log('PASS Nora bilingual intent: 11 help queries; 10 genuine dialogue answers; no false perfect scores');
