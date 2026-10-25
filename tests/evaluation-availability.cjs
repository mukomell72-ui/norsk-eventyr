const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
for(const file of ["api/chat.js","api/daily.js","api/drill.js","api/evaluate.js","api/generate.js","api/listening-questions.js"]){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 assert.match(source,/model:"gpt-6-luna"/,'Supported evaluation model missing from '+file);
 assert.doesNotMatch(source,/gpt-5\.6-luna/,'Obsolete model remains in '+file);
}
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const start=app.indexOf('function evaluationErrorMessage(error){');
assert(start>=0,'Error mapper must exist');
const end=app.indexOf('\n}\n',start);
assert(end>start,'Error mapper must end');
const context={};
vm.runInNewContext(app.slice(start,end+3)+'\nthis.map=evaluationErrorMessage;',context);
for(const reason of ['AI_QUOTA_UNAVAILABLE','AI_NOT_CONFIGURED','SESSION_REQUIRED','FEEDBACK_NOT_VERIFIED','NETWORK','model_not_found']){
 const msg=context.map(reason);
 assert(msg.length>65,'Error must be informative: '+reason);
 assert(msg.includes('оценка и XP не изменены'),'Failure must clarify unchanged progress: '+reason);
}
assert.equal((app.match(/esc\(evaluationErrorMessage\(r\.error\)\)/g)||[]).length,2,
 'Dialogue and written responses must show the actual failure reason');
assert(app.includes('verifiedNorwegianHintsHtml(r.verifiedHints)'),
 'Free response feedback must display bounded, escaped linguistic hints without awarding XP');
assert(!app.includes('Проверка временно недоступна. Попробуй ещё раз.'),
 'Ambiguous evaluator failure banner must be removed');
console.log('PASS evaluation availability: supported model, readable failure reasons, no erroneous grade');
