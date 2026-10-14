// Offline, privacy-minimising descriptive audit of scores assigned by independent human raters.
// No automatic CEFR certification or experimental causal inference is performed.
'use strict';
const fs=require('node:fs');
const SKILLS=['listening','reading','writing','speaking'];
function inspect(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('Expected a nonempty JSON array of anonymized ratings');
 const seen=new Set(),pairs=new Map();
 for(const row of rows){
  const allowed=new Set(['participant','phase','skill','rater','score','instrument']);
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!allowed.has(k)))throw Error('Unsupported field: do not store personal identifiers, text or recordings in ratings');
  if(!/^[a-z0-9-]{3,60}$/i.test(row.participant||'')||!/^[a-z0-9-]{2,30}$/i.test(row.rater||''))throw Error('Use pseudonyms for participants and raters');
  if(!['before','after'].includes(row.phase)||!SKILLS.includes(row.skill))throw Error('Invalid phase or skill');
  if(typeof row.score!=='number'||!Number.isFinite(row.score)||row.score<0||row.score>100)throw Error('Rater scores must be numeric from 0 to 100');
  if(!/^[a-z0-9._-]{3,60}$/i.test(row.instrument||''))throw Error('Pre-register a holdout assessment instrument');
  const key=[row.participant,row.phase,row.skill,row.rater].join(':');
  if(seen.has(key))throw Error('Duplicate independent rater entry: '+key);
  seen.add(key);
  const group=[row.participant,row.phase,row.skill].join(':');
  if(!pairs.has(group))pairs.set(group,[]);
  pairs.get(group).push(row);
 }
 const participants=[...new Set(rows.map(x=>x.participant))],round=x=>Math.round(x*100)/100;
 const metrics=[];
 for(const skill of SKILLS){
  const scored=[];
  for(const participant of participants){
   const ratings={};
   for(const phase of ['before','after']){
    const v=pairs.get([participant,phase,skill].join(':'))||[];
    if(v.length!==2||v[0].rater===v[1].rater||v[0].instrument!==v[1].instrument)continue;
    ratings[phase]={mean:(v[0].score+v[1].score)/2,difference:Math.abs(v[0].score-v[1].score),instrument:v[0].instrument};
   }
   if(!ratings.before||!ratings.after||ratings.before.instrument!==ratings.after.instrument)continue;
   scored.push({before:ratings.before.mean,after:ratings.after.mean,agreementBefore:ratings.before.difference,agreementAfter:ratings.after.difference});
  }
  const avg=(items,field)=>items.length?round(items.reduce((s,x)=>s+x[field],0)/items.length):null;
  metrics.push({skill,pairedN:scored.length,meanBefore:avg(scored,'before'),meanAfter:avg(scored,'after'),
   meanPairedChange:avg(scored.map(x=>({...x,delta:x.after-x.before})),'delta'),
   meanRaterDifferenceBefore:avg(scored,'agreementBefore'),meanRaterDifferenceAfter:avg(scored,'agreementAfter')});
 }
 return {method:'two distinct pseudonymous human raters per phase and skill; exact same held-out instrument before and after',
  totalPseudonymousParticipants:participants.length,metrics,
  comparablePairs:metrics.reduce((n,m)=>n+m.pairedN,0),
  status:'descriptive audit only; independent rater credentials, blinding, consent and instrument validity must be checked externally',
  evidenceOfCausalEffect:false,officialCefrCertification:false,
  warnings:['Unpaired or singly rated observations are excluded, not treated as zero.',
    'Scores do not translate to Norskprøven grades or establish causality.',
    'Do not make comparative performance claims without an adequately powered independent controlled study.']};
}
if(require.main===module){
 try{
  if(process.argv.length!==3)throw Error('Usage: node tools/evaluate-independent-learning.cjs ratings-anonymous.json');
  const rows=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  console.log(JSON.stringify(inspect(rows),null,2));
 }catch(e){console.error('EVALUATION ABORTED: '+e.message);process.exitCode=1}
}
module.exports={inspect};
