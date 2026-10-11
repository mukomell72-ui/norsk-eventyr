// Shared, conservative normalization of AI teaching feedback.
// This is not a linguistic correctness engine: decisions still need real model evaluation.
const clip=(value,limit=800)=>String(value??"").trim().slice(0,limit);
const scoreOf=value=>typeof value==="number"&&Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):null;
export function normalizeAssessment(raw,{requireDecision=true}={}){
 const d=raw&&typeof raw==="object"&&!Array.isArray(raw)?{...raw}:{};
 const rawScore=scoreOf(d.score);
 const accepted=d.accepted===true;
 const validDecision=typeof d.accepted==="boolean";
 const validScore=rawScore!==null;
 let score=validScore?rawScore:0;
 // A failed task must never become a passing score in learning records.
 if(validDecision&&!accepted)score=Math.min(score,49);
 const improvements=Array.isArray(d.improvements_ru)?d.improvements_ru.map(x=>clip(x,350)).filter(Boolean).slice(0,2):[];
 const strengths=Array.isArray(d.strengths_ru)?d.strengths_ru.map(x=>clip(x,350)).filter(Boolean).slice(0,2):[];
 const corrected=clip(d.corrected,1500);
 const explanation=clip(d.explanation_ru,1600);
 const rule=clip(d.micro_rule_ru,500);
 const tag=clip(d.error_tag,50);
 const explicitReason=clip(d.score_reason_ru,650);
 const noVisibleIssue=!tag&&!improvements.length&&!corrected;
 // Never deduct arbitrary points for a fully accepted response with no stated deficiency.
 if(validDecision&&accepted&&validScore&&score>=85&&noVisibleIssue&&!explicitReason)score=100;
 const status=!validDecision||!validScore?(requireDecision?"unverified":"unverified"):
   !accepted?"incorrect":score===100?"correct":"partial";
 let reason=explicitReason;
 if(!reason&&validScore){
   if(score===100)reason="Баллы не сняты: конкретных ошибок, снижающих оценку, не выявлено.";
   else if(improvements.length)reason=improvements[0];
   else if(tag&&explanation)reason=explanation;
   else reason="Причина снижения балла не была объяснена автоматически; оценка предварительная.";
 }
 const explanationFinal=explanation||(status==="incorrect"?"Ответ не выполнил коммуникативную задачу. Попробуй выразить мысль иначе.":status==="partial"?"Ответ понятен, но есть замечания.":status==="correct"?"Задание выполнено без выявленных ошибок.":"Проверка неполная. Попробуй ещё раз.");
 return {
  ...d,score,score_valid:validScore,accepted:validDecision&&accepted,
  feedback_status:status,score_reason_ru:reason,explanation_ru:explanationFinal,
  improvements_ru:improvements,strengths_ru:strengths,corrected,
  error_tag:tag,micro_rule_ru:rule,error_fragment_ru:clip(d.error_fragment_ru,250),
  retry_prompt_no:clip(d.retry_prompt_no,500),next_action_ru:clip(d.next_action_ru,500)
 };
}
