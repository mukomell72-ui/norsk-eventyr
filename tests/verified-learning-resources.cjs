'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const sandbox={window:{},Array,Object,Set,String,URL};vm.createContext(sandbox);
vm.runInContext(read('verified-learning-resources.js'),sandbox);
const library=sandbox.window.NEResources;assert(library,'Missing provenance-aware source catalogue');
assert.equal(library.entries.length,13,'A broad catalogue is required before release');
const ids=new Set(),expectedLevels=['A1','A2','B1','B2'];
for(const r of library.entries){
 assert(!ids.has(r.id),'Resource identifier reused');ids.add(r.id);
 assert(expectedLevels.some(l=>r.levels.includes(l)),'Resource has no CEFR category');
 assert(['course','listening','assessment','speech_corpus','licensing'].includes(r.kind),'Unknown resource type');
 assert(['external','cc0_dataset'].includes(r.rights),'Rights must be explicit');
 assert(['university_authored','official_exam','transcribed_research_corpus','curated_platform'].includes(r.quality),'Editorial provenance must be explicit');
 const parsed=new URL(r.url);assert.equal(parsed.protocol,'https:');
 assert(['www.ntnu.edu','www.nb.no','prove.hkdir.no','hkdir.no','support.ndla.no','huggingface.co'].includes(parsed.hostname),'Only whitelisted institutional sources may be listed');
 if(r.rights==='cc0_dataset')assert(['www.nb.no','huggingface.co'].includes(parsed.hostname),'Never relabel restricted third-party teaching content as CC0');
 if(r.publisher.includes('NTNU'))assert.equal(r.rights,'external','A publicly accessible NTNU course is not blanket permission to republish');
}
for(const level of expectedLevels){
 const available=library.byLevel(level);
 assert(available.some(r=>r.kind==='course'||r.kind==='assessment'),'Level lacks credible learning or assessment reference: '+level);
 assert(available.some(r=>r.quality==='official_exam'),'Level lacks an independent exam reference: '+level);
}
assert.equal(library.byLevel('B1',['speech_corpus']).length,3);
assert(library.byLevel('B2',['speech_corpus']).some(r=>r.id==='nb-samtale'));
assert.equal(library.entries.find(r=>r.id==='nb-parliament').url,'https://www.nb.no/sprakbanken/ressurskatalog/en/oai-nb-no-sbr-84/','Use corrected and reviewed corpus release');
const access=read('access.js'),sw=read('sw.js'),elite=read('elite.js'),map=read('ui-v7.js');
assert(access.includes("'course-methodology.js','verified-learning-resources.js','practice-foundations.js'"),'Catalogue must load before course and listening pages');
assert(sw.includes('/verified-learning-resources.js?v=8.3.0-lesson17'),'Catalogue must be in offline PWA cache');
assert(elite.includes("window.NEResources?.byLevel(state.level"),'Listening Lab must expose real recorded-speech resources by level');
assert(elite.includes('CC0-корпуса Språkbanken')&&elite.includes('ещё не встроены в наш плеер'),'Listening Lab must disclose that archives are not yet playable in-app');
assert(map.includes("window.NEResources?.byLevel(courseLevel,['course'])"),'Course map must include professional learning links');
assert(!read('verified-learning-resources.js').includes('sourceType:\'human_recording\''),'A corpus catalogue is not reviewed/approved in-app recordings');
console.log('PASS verified external Norwegian resources: 13 traceable institutional sources, explicit licensing and integrated level-filtered UI');
