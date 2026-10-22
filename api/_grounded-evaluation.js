// Check evidence and grading consistency against the original text and task.
// This is a grounding guard, not a full Norwegian grammar engine.
const line=(x,max=600)=>String(x??'').normalize('NFKC').replace(/\s+/gu,' ').trim().slice(0,max);
const excerpt=(x,max=250)=>line(x,max).replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
const kinds=new Set(['spelling','word_order','verb_form','agreement','article','preposition','vocabulary','coherence','task']);
const matches=(haystack,needle)=>!!needle&&excerpt(haystack,8000).includes(excerpt(needle,500));
const validPenalty=x=>Number.isInteger(x)&&x>=1&&x<=40;
function guardIssue(issue,{answer,question,goal,mode}){
 if(!issue||typeof issue!=='object'||Array.isArray(issue)||!kinds.has(issue.category))return null;
 if(!validPenalty(issue.deduction)||typeof issue.explanation_ru!=='string'||line(issue.explanation_ru).length<12)return null;
 // A microphone transcript contains ASR spelling, not the learner's own spelling.
 // Never deduct orthography points from speech converted to text.
 if(String(mode||'').includes('speaking')&&issue.category==='spelling')return null;
 if(issue.category==='task'){
  // Missing requirements must be grounded in the actual task, not invented.
  const q=line(issue.requirement_quote,220);
  if(q.length<6||(!matches(question,q)&&!matches(goal,q)))return null;
  return {category:'task',source_fragment:'',requirement_quote:q,
   deduction:issue.deduction,explanation_ru:line(issue.explanation_ru,350),
   corrected_fragment:line(issue.corrected_fragment,220)};
 }
 const fragment=excerpt(issue.source_fragment,250);
 if(fragment.length<2||!matches(answer,fragment))return null;
 // In meeting invitations "vi kunne møtes" is a legitimate polite suggestion.
 if(/\bvi kunne møtes\b/iu.test(answer)&&/\bkunne\b/iu.test(fragment)&&
    issue.category==='verb_form'&&/\bkan\b/iu.test(issue.explanation_ru))return null;
 // The written "i morgen" is not a misspelling of "mørgen".
 if(issue.category==='spelling'&&/^(?:i )?morgen$/iu.test(fragment)&&
    /\bi morgen\b/iu.test(answer)&&!/\bmørgen\b/iu.test(answer))return null;
 return {category:issue.category,source_fragment:fragment,requirement_quote:'',
  deduction:issue.deduction,explanation_ru:line(issue.explanation_ru,350),
  corrected_fragment:line(issue.corrected_fragment,220)};
}
export function groundAssessment(raw,{answer,question,goal,mode}={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.accepted!=='boolean'||
    !Number.isInteger(raw.score)||raw.score<0||raw.score>100)
  return {ok:false,error:'INVALID_DECISION'};
 if(!Array.isArray(raw.issues)||raw.issues.length>5)
  return {ok:false,error:'MISSING_EVIDENCE'};
 const issues=[];
 for(const issue of raw.issues){
  const checked=guardIssue(issue,{answer,question,goal,mode});
  if(!checked)return {ok:false,error:'UNGROUNDED_ISSUE'};
  issues.push(checked);
 }
 if(new Set(issues.map(x=>[x.category,x.source_fragment,x.requirement_quote].join(':'))).size!==issues.length)
  return {ok:false,error:'DUPLICATE_ISSUE'};
 const penalty=issues.reduce((total,x)=>total+x.deduction,0);
 if(penalty>100||Math.abs(raw.score-(100-penalty))>1)
  return {ok:false,error:'SCORE_DISAGREEMENT'};
 const score=100-penalty;
 if((!raw.accepted&&score>49)||(raw.accepted&&score<50))
  return {ok:false,error:'CONTRADICTORY_DECISION'};
 // Assemble the entire visible criticism from validated evidence, not free-form
 // model comments that might repeat fabricated mistakes.
 const explanation=issues.length?issues.map((x,i)=>(i+1)+'. '+x.explanation_ru).join(' '):
  'Ответ соответствует заданию. Конкретных ошибок, за которые нужно снижать баллы, не обнаружено.';
 const detail=issues.map(x=>(x.category==='task'?'Не выполнено условие «'+x.requirement_quote+'»':
  'Фрагмент «'+x.source_fragment+'»')+' — минус '+x.deduction+' баллов').join('; ');
 return {ok:true,assessment:{
  ...raw,score,issues,
  error_tag:issues[0]?.category||'',
  error_fragment_ru:issues.find(x=>x.source_fragment)?.source_fragment||'',
  score_reason_ru:issues.length?'Проверенные замечания: '+detail+'. Итого: '+score+'/100.':
   'Баллы не сняты: проверенных ошибок и невыполненных требований нет.',
  explanation_ru:explanation.slice(0,1600),
  improvements_ru:issues.map(x=>x.explanation_ru).slice(0,2),
  micro_rule_ru:issues[0]?.explanation_ru||'',
  corrected:issues.length?line(raw.corrected,1500):'',
  strengths_ru:Array.isArray(raw.strengths_ru)?raw.strengths_ru.slice(0,2):[]
 }};
}
