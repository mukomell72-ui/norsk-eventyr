// Offline-only review tool for consenting anonymized learner ratings.
// Input MUST contain scores/anonymous IDs only. Never upload essays or audio to the repo.
'use strict';
const fs=require('node:fs');
const LEVELS=new Set(['A1','A2','B1','B2']);
const SKILLS=new Set(['writing','speaking','reading','listening','pronunciation']);
const FIELDS=new Set(['id','level','skill','expert_1','expert_2','ai_score']);
const round=x=>x===null?null:Math.round(x*100)/100;
function report(items,{maximumExpertGap=15,severeAiGap=20}={}){
 if(!Array.isArray(items))throw Error('Expected a JSON array of anonymized score records');
 const seen=new Set(),adjudication=[],accepted=[];
 for(const [i,item] of items.entries()){
  if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid row '+i);
  for(const key of Object.keys(item))if(!FIELDS.has(key))throw Error('Forbidden field '+key+': never supply text, voices or personal information');
  if(!/^[A-Za-z0-9_-]{1,48}$/.test(item.id||'')||seen.has(item.id))throw Error('Missing/duplicate nonidentifying ID at '+i);
  seen.add(item.id);
  if(!LEVELS.has(item.level)||!SKILLS.has(item.skill))throw Error('Invalid CEFR level or skill at '+i);
  for(const key of ['expert_1','expert_2','ai_score'])if(!Number.isFinite(item[key])||item[key]<0||item[key]>100)throw Error('Scores must be finite 0–100: '+i+' '+key);
  const gap=Math.abs(item.expert_1-item.expert_2);
  if(gap>maximumExpertGap){adjudication.push({id:item.id,expertGap:round(gap)});continue}
  const expert=(item.expert_1+item.expert_2)/2,err=item.ai_score-expert;
  accepted.push({id:item.id,level:item.level,skill:item.skill,expertGap:gap,error:err,absoluteError:Math.abs(err)});
 }
 function stats(xs){
  if(!xs.length)return {count:0,mae:null,bias:null,severeDisagreements:0,expertGapMean:null};
  return {count:xs.length,
   mae:round(xs.reduce((n,x)=>n+x.absoluteError,0)/xs.length),
   bias:round(xs.reduce((n,x)=>n+x.error,0)/xs.length),
   severeDisagreements:xs.filter(x=>x.absoluteError>=severeAiGap).length,
   expertGapMean:round(xs.reduce((n,x)=>n+x.expertGap,0)/xs.length)};
 }
 const byLevel={},bySkill={};
 for(const level of LEVELS)byLevel[level]=stats(accepted.filter(x=>x.level===level));
 for(const skill of SKILLS)bySkill[skill]=stats(accepted.filter(x=>x.skill===skill));
 return {reportType:'norsk-eventyr-ai-assessment-calibration-v1',
  methodology:'Two independent expert scores (mean used ONLY when disagreement <= maximumExpertGap). Requires independent qualified raters and learner consent; the script does not validate either.',
  submitted:items.length,adjudicationRequired:adjudication,
  expertGapThreshold:maximumExpertGap,severeAiGapThreshold:severeAiGap,
  overall:stats(accepted),byLevel,bySkill,
  disclaimer:'These statistical results do NOT alone demonstrate accuracy, CEFR certification, evaluator qualification or representative sampling.'};
}
if(require.main===module){
 try{
  const filename=process.argv[2];
  if(!filename)throw Error('Usage: node tools/assessment-calibration.cjs ./PRIVATE-anonymous-ratings.json');
  const data=JSON.parse(fs.readFileSync(filename,'utf8'));
  process.stdout.write(JSON.stringify(report(data.items),null,2)+'\n');
 }catch(e){console.error('Calibration input error:',e.message);process.exitCode=1}
}
module.exports={report};
