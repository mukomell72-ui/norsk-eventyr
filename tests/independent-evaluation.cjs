'use strict';
const assert=require('node:assert/strict');
const {inspect}=require('../tools/evaluate-independent-learning.cjs');
function rowsFor(id,before,after,skill='speaking'){
 return ['before','after'].flatMap((phase,i)=>[
  {participant:id,phase,skill,rater:'rater-a',score:i?after:before,instrument:'holdout-2026-v1'},
  {participant:id,phase,skill,rater:'rater-b',score:i?after+2:before+4,instrument:'holdout-2026-v1'}
 ]);
}
let report=inspect([...rowsFor('p001',45,62),...rowsFor('p002',55,66,'reading')]);
let speaking=report.metrics.find(m=>m.skill==='speaking');
assert.equal(report.totalPseudonymousParticipants,2);
assert.equal(speaking.pairedN,1);
assert.equal(speaking.meanBefore,47);
assert.equal(speaking.meanAfter,63);
assert.equal(speaking.meanPairedChange,16);
assert.equal(speaking.meanRaterDifferenceBefore,4);
assert.equal(report.officialCefrCertification,false);
assert.equal(report.evidenceOfCausalEffect,false);
assert.equal(report.comparablePairs,2);
assert(report.metrics.find(m=>m.skill==='listening').meanPairedChange===null,'Do not fabricate missing results');
const onlyOne=rowsFor('p003',50,65).filter(r=>r.phase!=='after'||r.rater==='rater-a');
assert.equal(inspect(onlyOne).comparablePairs,0,'Single-rater post scores must not count as independent evidence');
const bad=rowsFor('p004',55,60);bad[0].email='person@example.org';
assert.throws(()=>inspect(bad),/Unsupported field/,'Reject personal data in ratings');
const mismatch=rowsFor('p005',55,60);mismatch[2].instrument='easier-new-test';
mismatch[3].instrument='easier-new-test';
assert.equal(inspect(mismatch).comparablePairs,0,'Changing the test form must not create comparable gains');
assert.throws(()=>inspect([...rowsFor('p006',55,60),...rowsFor('p006',55,60)]),/Duplicate/);
console.log('PASS blind external audit: paired scores, two raters, task equivalence, protected inputs, no fabricated efficacy');
