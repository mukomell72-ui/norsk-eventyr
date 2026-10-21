import assert from 'node:assert/strict';
import {groundAssessment} from '../api/_grounded-evaluation.js';
const sample='Vi kunne møtes i morgen klokka tre. I dag jeg møtes ikke ettermiddag';
const context={answer:sample,question:'Предложи встречу завтра, скажи, что сегодня днём не можешь встретиться.',goal:'Скажи, что сегодня днём не можешь встретиться.'};
const result=(score,issues,accepted=true,extras={})=>({accepted,score,issues,
 corrected:'Vi kunne møtes i morgen klokka tre. I dag kan jeg ikke møtes på ettermiddagen.',
 explanation_ru:'Модель придумала ошибку «mørgen».',score_reason_ru:'Минус за mørgen',
 error_fragment_ru:'mørgen',improvements_ru:['Поправь mørgen'],...extras});
const issue=(category,source_fragment,deduction,explanation_ru,more={})=>({
 category,source_fragment,deduction,explanation_ru,corrected_fragment:'Исправь фразу',...more
});
assert.equal(groundAssessment(result(65,[issue('spelling','mørgen',10,'Ошибка в написании слова morgen.')]),context).error,'UNGROUNDED_ISSUE');
assert.equal(groundAssessment(result(90,[issue('spelling','I morgen',10,'Нужно писать i morgen.')]),context).error,'UNGROUNDED_ISSUE',
 'Do not invent capitalization in the learner sentence');
assert.equal(groundAssessment(result(90,[issue('verb_form','Vi kunne møtes',10,'Здесь требуется kan, а не kunne.')]),context).error,'UNGROUNDED_ISSUE',
 'Polite kunne is not automatically an incorrect tense');
assert.equal(groundAssessment(result(85,[issue('task','',15,'Не сказано о невозможности встретиться.')] ),context).error,'UNGROUNDED_ISSUE',
 'A task omission must be cited from the original assignment');
const grounded=groundAssessment(result(85,[issue('word_order','I dag jeg møtes',15,
 'В главном предложении после I dag личный глагол ставится перед jeg.')]),context);
assert(grounded.ok);
assert.equal(grounded.assessment.score,85);
assert.equal(grounded.assessment.error_fragment_ru,'I dag jeg møtes');
assert(!grounded.assessment.explanation_ru.includes('mørgen'),'Ungrounded model prose cannot leak into final feedback');
assert(!grounded.assessment.score_reason_ru.includes('mørgen'),'Fabricated deductions must not appear in score reason');
assert(grounded.assessment.score_reason_ru.includes('минус 15'));
assert(grounded.assessment.explanation_ru.includes('после I dag'));
const omission=groundAssessment(result(85,[issue('task','',15,'Не выполнено требование описать невозможность встретиться.',
 {requirement_quote:'сегодня днём не можешь встретиться'})]),context);
assert(omission.ok);
assert.equal(omission.assessment.error_fragment_ru,'');
assert(omission.assessment.score_reason_ru.includes('Не выполнено условие'));
assert.equal(groundAssessment(result(65,[issue('word_order','I dag jeg møtes',15,'Ошибка порядка слов.')]),context).error,'SCORE_DISAGREEMENT');
assert.equal(groundAssessment(result(100,[]),context).ok,true);
const perfect=groundAssessment(result(100,[]),context);
assert.equal(perfect.assessment.error_tag,'');
assert.equal(perfect.assessment.corrected,'');
assert.equal(perfect.assessment.improvements_ru.length,0);
assert.equal(groundAssessment(result(65,null),context).error,'MISSING_EVIDENCE');
assert.equal(groundAssessment(result(90,[issue('word_order','I dag jeg møtes',10,'Ошибка порядка слов.')],false),context).error,'CONTRADICTORY_DECISION');
assert.equal(groundAssessment(result(90,[issue('word_order','I dag jeg møtes',10,'Ошибка порядка слов.'),issue('word_order','I dag jeg møtes',10,'Та же ошибка.')]),context).error,'DUPLICATE_ISSUE');
assert.equal(groundAssessment(result(90,[issue('spelling','morgen',10,'Ошибка написания',{})]),context).ok,true,
 'A valid excerpt alone does not prove the model grammar judgment: separate verifier is still needed');
console.log('PASS: grounding rejects invented mørgen, invented uppercase, arbitrary kunne penalty, unquoted task omission and inconsistent deductions; real word-order error preserved');
