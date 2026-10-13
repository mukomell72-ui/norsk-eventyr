// Repeatable offline baseline of human-authored COURSE TEXTS only.
// This does NOT prove CEFR level, learning outcomes, native speech or rights.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const file=f=>fs.readFileSync(path.join(root,f),'utf8');
const LEVELS=['A1','A2','B1','B2'];
const runtimeFiles=['curriculum-v8.js','practice-foundations.js','foundation-extensions.js','advanced-b1.js','advanced-b2.js'];
function wordCount(value){return (String(value||'').match(/\p{L}+(?:[-’']\p{L}+)*/gu)||[]).length}
function summary(numbers){
 const sorted=numbers.slice().sort((a,b)=>a-b);
 if(!sorted.length)return {count:0,min:null,median:null,max:null};
 const mid=Math.floor(sorted.length/2);
 return {count:sorted.length,min:sorted[0],median:sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2,max:sorted.at(-1)};
}
function inspect(){
 const sandbox={window:{},Date,Math,Object,Array,Number,String,JSON,Set,Intl};
 vm.createContext(sandbox);
 for(const name of runtimeFiles)vm.runInContext(file(name),sandbox,{filename:name,timeout:2000});
 const C=sandbox.window.NECurriculum,B=sandbox.window.NECurated;
 if(!C||!B)throw Error('Curriculum or authored bank is missing');
 const byLevel={},issues=[],moduleData=[];
 for(const level of LEVELS){
  const mods=C.modules(level),listening=[],reading=[];
  for(const m of mods){
   const l=B.get(m.id);
   if(!l){issues.push({severity:'error',moduleId:m.id,code:'MISSING_CURATED_MODULE'});continue;}
   const clips=Array.isArray(l.listeningSets)?l.listeningSets:[];
   const clipWords=clips.map(clip=>wordCount(clip.audio));
   const row={
    level,id:m.id,title:m.title,
    readingWords:wordCount(l.read),listeningWords:clipWords,
    listeningClips:clips.length,
    objectives:Array.isArray(m.canDo)?m.canDo.length:0,
    vocabEntries:Array.isArray(l.vocab)?l.vocab.length:0,
    hasWritingPrompt:!!String(l.writing||'').trim(),
    hasSpeakingPrompt:!!String(l.speaking||'').trim(),
    hasSpeakingFollowUp:!!String(l.speakingFollowUp||'').trim(),
    // Metadata must be explicit. No label of verified native speaker without source proof.
    verifiedHumanAudioClips:clips.filter(c=>c.sourceType==='human_recording'&&c.consentRecordId&&c.licenceId&&c.editorApprovalId).length,
    editorialApprovalRecorded:!!(l.editorialApproval?.reviewerId&&l.editorialApproval?.date&&l.editorialApproval?.version)
   };
   if(clips.length<2||clips.length>3)issues.push({severity:'error',moduleId:m.id,code:'LISTENING_STAGE_COUNT'});
   if(!row.hasSpeakingFollowUp||!row.hasSpeakingPrompt||!row.hasWritingPrompt)
    issues.push({severity:'error',moduleId:m.id,code:'MISSING_PRODUCTIVE_PROMPT'});
   if(level==='B1'&&clipWords.some(w=>w<130))
    issues.push({severity:'advisory',moduleId:m.id,code:'B1_LONG_LISTENING_OPPORTUNITY'});
   if(level==='B2'&&clipWords.some(w=>w<180))
    issues.push({severity:'advisory',moduleId:m.id,code:'B2_LONG_LISTENING_OPPORTUNITY'});
   if(!row.editorialApprovalRecorded)
    issues.push({severity:'advisory',moduleId:m.id,code:'EDITORIAL_APPROVAL_NOT_DOCUMENTED'});
   if(row.verifiedHumanAudioClips<clips.length)
    issues.push({severity:'advisory',moduleId:m.id,code:'HUMAN_AUDIO_RIGHTS_NOT_DOCUMENTED'});
   moduleData.push(row);listening.push(...clipWords);reading.push(row.readingWords);
  }
  byLevel[level]={modules:mods.length,authoredListeningClips:listening.length,readingWords:summary(reading),listeningWords:summary(listening)};
 }
 const totalClips=moduleData.reduce((n,x)=>n+x.listeningClips,0);
 return {
  reportType:'norsk-eventyr-authored-course-baseline-v1',
  scope:'Locally authored teaching text only. No AI-generated variants or user uploads.',
  totalModules:moduleData.length,
  authoredListeningClips:totalClips,
  recordedNativeSpeakerClipsWithVerifiedMetadata:moduleData.reduce((n,x)=>n+x.verifiedHumanAudioClips,0),
  modulesWithRecordedEditorialApproval:moduleData.filter(x=>x.editorialApprovalRecorded).length,
  disclaimer:'Missing metadata means not documented in the curated bank, NOT proof no external review ever occurred. Clips are text prompts for speech generation, not verified recordings.',
  byLevel,modules:moduleData,issues
 };
}
if(require.main===module){
 try{
  const report=inspect();
  if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(report,null,2)+'\n');
  else {
   console.log('Norsk Eventyr authored content baseline — not an independent CEFR assessment');
   console.log('Modules:',report.totalModules,'authored listening scripts:',report.authoredListeningClips);
   console.log('Documented editor approvals:',report.modulesWithRecordedEditorialApproval,'verified human recordings in bank:',report.recordedNativeSpeakerClipsWithVerifiedMetadata);
   for(const [level,r] of Object.entries(report.byLevel))console.log(level+': '+r.modules+' modules; reading words median '+r.readingWords.median+'; listening words median '+r.listeningWords.median+' ('+r.listeningWords.min+'–'+r.listeningWords.max+')');
   console.log('Diagnostic issue counts:',report.issues.reduce((a,i)=>(a[i.code]=(a[i.code]||0)+1,a),{}));
  }
 }catch(e){console.error(e);process.exitCode=1}
}
module.exports={inspect,wordCount,summary};
