// Nora must vary repeated sessions without changing the learning objective or saved progress.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'api/generate.js'),'utf8')
 .replace(/^import \{guard\} from ".\/_guard.js";\s*/,'const guard=async()=>true;\n')
 .replace('export default async function handler','async function handler');
const old={dialogueScene:'В автобусе на дороге на работу',dialogueTask:'Ответь водителю, куда ты едешь сегодня',
 phrase:'Jeg reiser til jobben med buss i dag.',listeningAudio:'Jeg reiser til jobben med buss i dag.',
 read:'I dag reiser jeg til jobben med buss i dag.',grammarQ:'Hva sier du til sjåføren på bussen?',
 writing:'Skriv tre setninger om hvordan du reiser til jobben.',
 speaking:'Fortell sjåføren hvordan du reiser til jobben.'};
const sandbox={process:{env:{OPENAI_API_KEY:'test'}},JSON,console,Set,Number,String,Array,Object};
vm.runInNewContext(src+'\nthis.helpers={pastLessonSnippets,repeatsRecent};this.handler=handler;',sandbox,{filename:'api/generate.js'});
const snippets=sandbox.helpers.pastLessonSnippets([old]);
assert.equal(sandbox.helpers.repeatsRecent({...old},snippets),true,'Identical exercises must be identified');
assert.equal(sandbox.helpers.repeatsRecent({...old,phrase:'JEG reiser til jobben med BUSS i dag!' },snippets),true,'Punctuation and case do not make a new sentence');
const fresh={...old,dialogueScene:'В библиотеке после работы',dialogueTask:'Попроси сотрудника помочь найти учебник.',
 phrase:'Jeg leter etter en norsk lærebok til kurset.',listeningAudio:'Bibliotekaren forklarer hvor språkhyllen står.',
 read:'På biblioteket finner jeg en ny bok om norsk språk.',
 grammarQ:'Hva kan du spørre om når du ikke finner en bok?',
 writing:'Skriv en melding til biblioteket om lånekort.',
 speaking:'Spør bibliotekaren om åpningstiden på lørdag.'};
assert.equal(sandbox.helpers.repeatsRecent(fresh,snippets),false,'Different sentences in the same course must pass');
assert.equal(sandbox.helpers.pastLessonSnippets(Array(8).fill(old)).length,5,'Limit history and model input');
const priorAnswers={...old,opts:['En','To','Tre','Fire'],grammarOpts:['Jeg','Du','Han','Vi'],listeningOpts:['Jobb','Mat','Hus','Tid']};
const repeatAnswers={...fresh,opts:['Fire','Tre','To','En'],grammarOpts:['Vi','Jeg','Han','Du'],listeningOpts:['Bibliotek','Skole','Butikk','Kino']};
assert.equal(sandbox.helpers.repeatsRecent(repeatAnswers,sandbox.helpers.pastLessonSnippets([priorAnswers])),true,'Two reused choice sets must prompt a new variant');
const teacher=fs.readFileSync(path.join(root,'adaptive-teacher.js'),'utf8');
assert(teacher.includes('recentLessons,bridgeLearned,bridgeDifficult,learningLoad,teacherMode:true'),
 'Past exercises and personalized learner vocabulary must reach the server');
assert(teacher.includes('personalFocus?.(16)'), 'Learner-specific difficulty must come from scoped bridge history');
const buildLesson=(details)=>({vocab:Array.from({length:6},(_,i)=>['ord'+i,'слово'+i]),
 opts:['En','To','Tre','Fire'],correct:0,grammarOpts:['Jeg','Du','Han','Vi'],grammarCorrect:0,
 listeningQ:'Hva handler lyden om?',listeningOpts:['Jobb','Mat','Hus','Tid'],listeningCorrect:0,
 q:'Hva forstår du fra teksten?',...details});
async function check(){
 let calls=0,prompts=[];
 const freshChoiceSets={...fresh,opts:['Bok','Kart','Avis','Billett'],grammarOpts:['Jeg søker','Du søker','Vi søker','De søker'],listeningOpts:['Bibliotek','Skole','Butikk','Kino']};
 const results=[buildLesson(old),buildLesson(freshChoiceSets),buildLesson(freshChoiceSets)];
 sandbox.fetch=async(_url,options)=>{prompts.push(JSON.parse(options.body).input);
  return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(results[calls++])}]}]})};};
 const res={status(code){this.code=code;return this},json(value){this.body=value;return value}};
 await sandbox.handler({method:'POST',body:{kind:'lesson',level:'A1',teacherMode:true,recentLessons:[old],
  bridgeLearned:[{word:'å begynne',ru:'начинать',weight:90,mastered:true}],
  bridgeDifficult:[{word:'å begynne',ru:'начинать',weight:90,mastered:true},
   {word:'å slutte',ru:'заканчивать',weight:88,mastered:false}],
  scenarioVariation:'Новое место'}},res);
 assert(prompts[0].includes('ПЕРСОНАЛЬНЫЙ ЯЗЫКОВОЙ МОСТ'),'Generator sees mastered user vocabulary');
 assert(prompts[0].includes('å begynne'),'Generator receives a weak known verb for varied contexts');
 assert(prompts[0].includes('ЛИЧНО ТРУДНЫЕ СЛОВА'),'Generator receives the weak-word priority');
 assert(prompts[0].includes('"mastered":false'),'Unmastered words are never mislabelled as mastered');
 assert(prompts[0].includes('ПРЯМО ВНУТРЬ текста задания'),'Vocabulary must appear inside the task itself');
 assert(prompts[0].includes('НЕ добавляй новых обязательных заданий'),'Repeat difficult words without extra workload');
 assert.equal(calls,3,'One repeated draft must trigger a fresh generation followed by quality review');
 assert.equal(res.code,200,'Fresh retry must reach the learner');
 assert.equal(res.body.phrase,fresh.phrase);
 // Even a reviewer returning old text cannot silently publish a duplicate.
 calls=0;
 const bad=[buildLesson(old),buildLesson(freshChoiceSets),buildLesson(old)];
 sandbox.fetch=async()=>({ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(bad[calls++])}]}]})});
 const rejected={status(code){this.code=code;return this},json(value){this.body=value;return value}};
 await sandbox.handler({method:'POST',body:{kind:'lesson',level:'A1',teacherMode:true,recentLessons:[old]}},rejected);
 assert.equal(rejected.code,502);
 assert.equal(rejected.body.error,'AI_LESSON_REPETITIVE');
 console.log('PASS Nora: new scenarios, bounded prior examples, retry and duplicate guard');
}
check().catch(e=>{console.error(e);process.exitCode=1});
