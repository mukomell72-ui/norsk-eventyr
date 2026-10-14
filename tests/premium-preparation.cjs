'use strict';
const assert=require('node:assert/strict');
const baseline=require('../tools/learning-quality-baseline.cjs');
const calibration=require('../tools/assessment-calibration.cjs');
const b=baseline.inspect();
assert.equal(b.totalModules,32);
assert.equal(b.authoredListeningClips,72);
assert.equal(new Set(b.modules.map(m=>m.id)).size,32);
for(const level of ['A1','A2','B1','B2']){
 assert.equal(b.byLevel[level].modules,8);
 assert.equal(b.byLevel[level].authoredListeningClips,18);
 assert(b.byLevel[level].readingWords.min>0);
 assert(b.byLevel[level].listeningWords.min>0);
}
for(const m of b.modules){
 assert([2,3].includes(m.listeningClips),m.id);
 assert.equal(m.listeningWords.length,m.listeningClips,m.id);
 assert(m.objectives>0&&m.vocabEntries>0,m.id);
 assert(m.hasWritingPrompt&&m.hasSpeakingPrompt&&m.hasSpeakingFollowUp,m.id);
}
assert.equal(b.issues.filter(i=>i.severity==='error').length,0);
assert.equal(baseline.wordCount('Jeg bor i Norge. Og lærer norsk!'),7);
const rows=[
 {id:'anon-001',level:'A1',skill:'writing',expert_1:80,expert_2:84,ai_score:78},
 {id:'anon-002',level:'B1',skill:'speaking',expert_1:40,expert_2:42,ai_score:70},
 {id:'anon-003',level:'B2',skill:'writing',expert_1:50,expert_2:95,ai_score:60}
];
const c=calibration.report(rows);
assert.equal(c.submitted,3);
assert.equal(c.adjudicationRequired.length,1);
assert.equal(c.overall.count,2);
assert.equal(c.overall.mae,16.5);
assert.equal(c.overall.bias,12.5);
assert.equal(c.overall.severeDisagreements,1);
assert.equal(c.byLevel.A2.mae,null);
assert.throws(()=>calibration.report([{...rows[0],payload:'raw'}]),/Forbidden field/);
assert.throws(()=>calibration.report([rows[0],rows[0]]),/duplicate/);
assert.throws(()=>calibration.report([{...rows[0],ai_score:NaN}]),/Scores/);
console.log('PASS premium research preparation: author corpus baseline and blinded double-rating accuracy arithmetic');
