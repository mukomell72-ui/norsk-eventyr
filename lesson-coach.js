/* Norsk Eventyr — optional, topic-matched micro-lessons for the grammar stage.
   This tutor does not replace graded lesson tasks or the level-gating system. */
(() => {
 'use strict';
 const TOPICS = [
  {id:'perfekt',match:/perfekt|perfect|перфект|совершенн.*врем|причасти/i,
   title:'Перфект: har + причастие',rule:'Чтобы сказать, что действие уже выполнено и важно сейчас, часто используют har + причастие прошедшего времени (perfektum partisipp).',
   questions:[
    {q:'Jeg har □ frokost i dag.',sentence:'Jeg har spist frokost i dag.',opts:['spiser','spist','spiste','spise'],ok:1,why:['spiser — настоящее время; после har нужен причастный вид.','spist — причастие глагола spise, поэтому har spist.','spiste — прошедшее простое время, не форма после har.','spise — инфинитив, после har для перфекта не подходит.']},
    {q:'Hun har □ i Norge i tre år.',sentence:'Hun har bodd i Norge i tre år.',opts:['bor','bodde','bo','bodd'],ok:3,why:['bor — настоящее время, после har оно не ставится.','bodde — претеритум, а здесь нужен perfektum partisipp.','bo — инфинитив; конструкция har + инфинитив здесь неверна.','bodd — причастие от bo: har bodd.']}
   ]},
  {id:'preteritum',match:/preteritum|прошедш.*врем|простое прошедшее/i,
   title:'Претеритум: завершённое прошлое',rule:'Когда речь о событии в завершённый момент прошлого (например, i går), обычно используют прошедшую форму — preteritum.',
   questions:[
    {q:'I går □ jeg hjemme.',sentence:'I går var jeg hjemme.',opts:['er','var','være','vært'],ok:1,why:['er — форма настоящего времени.','var — прошедшая форма глагола være.','være — инфинитив, не сказуемое в этом предложении.','vært — причастие, обычно требует вспомогательного глагола.']},
    {q:'Forrige uke □ jeg mye.',sentence:'Forrige uke jobbet jeg mye.',opts:['jobber','jobbe','jobbet','å jobbe'],ok:2,why:['jobber описывает настоящее, не завершённую прошлую неделю.','jobbe — инфинитив без вспомогательного глагола.','jobbet — прошедшая форма глагола jobbe.','å jobbe — инфинитив с å, не форма прошедшего времени.']}
   ]},
  {id:'modal',match:/infinitiv|инфинитив|modalverb|модальн|\b(skal|vil|kan|må|bør)\b/i,
   title:'Инфинитив: когда нужно å',rule:'После модальных глаголов skal, vil, kan, må, bør основной глагол обычно стоит в инфинитиве без å. После prøver в конструкции «пытаюсь сделать» ставят å + инфинитив.',
   questions:[
    {q:'Jeg skal □ deg i morgen.',sentence:'Jeg skal ringe deg i morgen.',opts:['ringer','å ringe','ringe','ringte'],ok:2,why:['ringer — настоящее время, после skal нужен инфинитив.','После модального skal частицу å не ставят.','После skal нужна форма ringe без å.','ringte — прошедшая форма, здесь она не подходит.']},
    {q:'Jeg prøver □ norsk.',sentence:'Jeg prøver å lære norsk.',opts:['å lære','lærer','lære','lært'],ok:0,why:['После prøver, когда речь о попытке что-то сделать, употребляется å + инфинитив.','lærer — настоящее время, а после prøver здесь нужен инфинитив с å.','lære — инфинитив, но в этой конструкции не хватает å.','lært — причастие, не инфинитив с å.']}
   ]},
  {id:'ordstilling',match:/ordstilling|inversjon|порядок слов|инверси|правил.*v2|\bv2\b/i,
   title:'Порядок слов: глагол на втором месте',rule:'В обычном главном повествовательном предложении спрягаемый глагол занимает вторую позицию. Если сначала идёт i morgen или på mandag, подлежащее ставят после глагола.',
   questions:[
    {q:'I morgen □ jeg norsk.',sentence:'I morgen lærer jeg norsk.',opts:['lærer','jeg lærer','å lære','lærer jeg'],ok:0,why:['lærer стоит сразу после обстоятельства i morgen, затем идёт jeg.','jeg lærer даст повтор подлежащего и нарушит порядок слов.','å lære — инфинитив, а здесь нужно спрягаемое сказуемое.','lærer jeg даст лишнее jeg, так как оно уже есть в предложении.']},
    {q:'På mandag □ hun tid.',sentence:'På mandag har hun tid.',opts:['hun har','å ha','har','hadde hun'],ok:2,why:['hun har даёт два подлежащих hun и неверный порядок.','å ha — инфинитив, нужен спрягаемый глагол.','har занимает второе место после På mandag.','hadde hun приведёт к повторению hun.']}
   ]},
  {id:'presens',match:/presens|настоящ.*врем/i,
   title:'Презенс: привычки и настоящее',rule:'Для привычных действий в настоящем времени используют presens. У многих правильных глаголов эта форма оканчивается на -r.',
   questions:[
    {q:'Hver dag □ jeg norsk.',sentence:'Hver dag lærer jeg norsk.',opts:['lære','lært','lærer','å lære'],ok:2,why:['lære — инфинитив без формы настоящего времени.','lært — причастие, не presens.','lærer — presens от lære, для привычного действия.','å lære — инфинитив с å, а здесь требуется сказуемое в настоящем времени.']},
    {q:'Han □ kaffe hver morgen.',sentence:'Han drikker kaffe hver morgen.',opts:['drikker','drakke','drukket','drikke'],ok:0,why:['drikker — presens для регулярного действия.','drakke — неверная форма глагола drikke.','drukket — причастие, а не настоящее время.','drikke — инфинитив; после han здесь нужна форма presens.']}
   ]},
  {id:'leddsetning',match:/leddsetning|придаточн|подчинённ|fordi.*ikke|место.*ikke/i,
   title:'Придаточное предложение: место ikke',rule:'В обычном придаточном предложении после at или fordi слово ikke ставится перед спрягаемым глаголом: at han ikke kommer.',
   questions:[
    {q:'Jeg vet at han □ kommer.',sentence:'Jeg vet at han ikke kommer.',opts:['kommer ikke','ikke','kan ikke','vil ikke'],ok:1,why:['kommer ikke даст лишний kommer и неверный порядок.','ikke стоит после han и перед kommer.','kan ikke здесь не подходит: после него потребуется инфинитив komme.','vil ikke здесь не подходит: после него потребуется инфинитив komme.']},
    {q:'Hun sier at hun □ forstår.',sentence:'Hun sier at hun ikke forstår.',opts:['forstår ikke','kan ikke','ikke','vil ikke'],ok:2,why:['forstår ikke создаёт повтор forstår и неверный порядок в придаточном.','kan ikke требует инфинитива forstå, а не forstår.','ikke стоит перед forstår в придаточном после at.','vil ikke требует инфинитива forstå, а не forstår.']}
   ]},
  {id:'conditional',match:/kondisjonalis|условн.*наклон|hypotetisk|гипотетич/i,
   title:'Условная ситуация: ville',rule:'Для нереальной или воображаемой ситуации часто используют hvis + прошедшее время и ville + инфинитив в главном предложении.',
   questions:[
    {q:'Hvis jeg hadde tid, □ jeg reise mer.',sentence:'Hvis jeg hadde tid, ville jeg reise mer.',opts:['vil','skal','ville','har'],ok:2,why:['vil выражает желание в настоящем, но здесь гипотетическое условие с hadde.','skal обозначает план, не соответствуя этой условной конструкции.','ville согласуется с гипотетическим условием hadde tid.','har — вспомогательный глагол, здесь не выражает требуемое следствие условия.']},
    {q:'Hvis jeg hadde fri, □ jeg besøke familien.',sentence:'Hvis jeg hadde fri, ville jeg besøke familien.',opts:['ville','skal','vil','må'],ok:0,why:['ville обозначает то, что я сделал бы при выполнении условия.','skal сообщает о плане, а не о гипотетическом следствии.','vil выражает желание, не условное «сделал бы».','må выражает необходимость, а не гипотетическое следствие.']}
   ]}
 ];
 const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const match=l=>{
  const description=[l?.grammarRuleRu,l?.grammarQ,l?.grammar].filter(Boolean).join(' ');
  return TOPICS.find(t=>t.match.test(description))||null;
 };
 const current=()=>window.neLessonSession;
 const context=()=>{
  const session=current();if(!session?.lesson)return null;
  const topic=match(session.lesson);if(!topic)return null;
  if(!session.coach||session.coach.topic!==topic.id){
   session.coach={topic:topic.id,index:0,incorrect:[],hint:false,passed:0,done:false};
  }
  return{session,topic,progress:session.coach};
 };
 function display(){
  const ctx=context();if(!ctx)return '';
  const {topic,progress}=ctx,question=topic.questions[progress.index];
  if(progress.done)return '<div class="ne-coach-result"><b>Два примера разобраны.</b><p>Если в задании ниже будет трудно, снова открой правило и повтори практику.</p><button type="button" class="btn secondary" onclick="NELessonCoach.restart()">Повторить мини-тест</button></div>';
  const passed=progress.passed>progress.index;
  const options=question.opts.map((o,i)=>'<button type="button" class="choice '+(progress.incorrect.includes(i)?'bad':'')+'" '+(progress.incorrect.includes(i)||passed?'disabled':'')+' onclick="NELessonCoach.answer('+i+')">'+escapeHtml(o)+'</button>').join('');
  return '<div class="ne-coach-prompt" lang="nb">'+escapeHtml(question.q)+'</div><div class="choice-list">'+options+'</div>'+
   (progress.hint?'<div class="ne-coach-hint">Подсказка: вернись к правилу и подумай, какая форма глагола нужна именно после слова перед пропуском.</div>':'<button type="button" class="btn ghost" onclick="NELessonCoach.hint()">Подсказка</button>')+
   (progress.last?'<div class="feedback '+(progress.last.correct?'good':'bad')+'"><b>'+(progress.last.correct?'Правильно. Почему именно так:':'Разберём ошибку:')+'</b><p>'+escapeHtml(progress.last.text)+'</p>'+(progress.last.correct?'<p lang="nb">'+escapeHtml(question.sentence)+'</p><button type="button" class="btn secondary" onclick="NELessonCoach.speak()">▶ Послушать пример</button>':'<p>Попробуй другой вариант — правило осталось открытым.</p>')+'</div>':'')+
   (passed?'<button type="button" class="btn lesson-next-v8" onclick="NELessonCoach.next()">'+(progress.index===topic.questions.length-1?'Завершить разбор':'Следующий пример →')+'</button>':'');
 }
 function refresh(){const el=document.getElementById('neLessonCoachTask');if(el)el.innerHTML=display();}
 function render(lesson){
  const topic=match(lesson);if(!topic)return '';
  const ctx=context();if(!ctx||ctx.topic.id!==topic.id)return '';
  return '<article class="card ne-lesson-coach"><div class="eyebrow">Нора объясняет · 2–3 минуты</div><h3>'+escapeHtml(topic.title)+'</h3><p>'+escapeHtml(topic.rule)+'</p><p class="muted">Выбери форму, прочитай причину ошибки и попробуй ещё раз. Эта мини-проверка не изменяет оценку основного урока.</p><div class="ne-coach-count">Пример '+Math.min(ctx.progress.index+1,topic.questions.length)+' из '+topic.questions.length+'</div><div id="neLessonCoachTask">'+display()+'</div></article>';
 }
 function answer(i){
  const ctx=context();if(!ctx||ctx.progress.done||ctx.progress.passed>ctx.progress.index)return;
  const q=ctx.topic.questions[ctx.progress.index];if(!Number.isInteger(i)||i<0||i>=q.opts.length||ctx.progress.incorrect.includes(i))return;
  const correct=i===q.ok;
  ctx.progress.last={correct,text:q.why[i]};
  if(correct)ctx.progress.passed=ctx.progress.index+1;
  else ctx.progress.incorrect.push(i);
  refresh();
 }
 function hint(){const ctx=context();if(ctx){ctx.progress.hint=true;refresh()}}
 function next(){
  const ctx=context();if(!ctx||ctx.progress.passed<=ctx.progress.index)return;
  if(ctx.progress.index+1>=ctx.topic.questions.length){ctx.progress.done=true;}
  else{ctx.progress.index++;ctx.progress.incorrect=[];ctx.progress.last=null;ctx.progress.hint=false;}
  const count=document.querySelector('.ne-coach-count');
  if(count)count.textContent=ctx.progress.done?'Мини-проверка завершена':'Пример '+(ctx.progress.index+1)+' из '+ctx.topic.questions.length;
  refresh();
 }
 function restart(){const ctx=context();if(!ctx)return;ctx.session.coach={topic:ctx.topic.id,index:0,incorrect:[],hint:false,passed:0,done:false};const count=document.querySelector('.ne-coach-count');if(count)count.textContent='Пример 1 из '+ctx.topic.questions.length;refresh()}
 function speak(){const ctx=context();if(!ctx)return;const q=ctx.topic.questions[ctx.progress.index];if(ctx.progress.passed>ctx.progress.index&&typeof window.speakText==='function')window.speakText(q.sentence,.85)}
 window.NELessonCoach={render,answer,hint,next,restart,speak};
})();