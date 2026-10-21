/* Norsk Eventyr: original practice simulations, not official forms or certified assessment. */
(function(){
 'use strict';
 const LEVELS=['A1','A2','B1','B2'];
 const cloze=[
  ['a1-presens-1','A1','presens','Hver dag ___ jeg norsk.','lærer','Настоящее время (presens): å lære → lærer.'],
  ['a1-presens-2','A1','presens','Hun ___ i Kongsberg.','bor','Å bo в настоящем времени: bor.'],
  ['a1-plural-1','A1','flertall','Vi har tre ___. (en bok)','bøker','Не все существительные образуют множественное число на -er: en bok → bøker.'],
  ['a1-singular','A1','entall','Jeg har et ___. (hus)','hus','После et употребляется неопределённая форма единственного числа: et hus.'],
  ['a1-adjective','A1','adjektiv','Det er et ___ hus. (stor)','stort','У прилагательного после et обычно окончание -t: et stort hus.'],
  ['a1-negation','A1','presens','Jeg ___ ikke kaffe. (å drikke)','drikker','В простом предложении: jeg drikker ikke kaffe.'],
  ['a1-question','A1','ordstilling','___ du norsk? (å snakke)','Snakker','В вопросе без вопросительного слова глагол стоит первым: Snakker du norsk?'],
  ['a1-plural-2','A1','flertall','Jeg har to ___. (en bil)','biler','En bil → to biler.'],
  ['a2-preteritum-1','A2','preteritum','I går ___ jeg på jobb. (å jobbe)','jobbet','Завершённое действие вчера: å jobbe → jobbet.'],
  ['a2-preteritum-2','A2','preteritum','Forrige uke ___ jeg syk. (å være)','var','Прошедшее время å være → var.'],
  ['a2-perfektum','A2','perfektum','Jeg har ___ i Norge i to år. (å bo)','bodd','После har используется причастие: har bodd.'],
  ['a2-infinitiv','A2','infinitiv','I morgen skal jeg ___ legen. (å besøke)','besøke','После skal нужен инфинитив без å: besøke.'],
  ['a2-plural','A2','flertall','Hun kjøpte to ___. (et eple)','epler','Et eple → to epler.'],
  ['a2-strong','A2','preteritum','Vi ___ til byen i går. (å gå)','gikk','Сильный глагол å gå → gikk.'],
  ['a2-letter','A2','preteritum','På mandag ___ vi søknaden. (å sende)','sendte','Прошедшее время å sende → sendte.'],
  ['a2-auxiliary','A2','perfektum','Jeg ___ aldri vært på dette kontoret.','har','Для perfektum: har + vært.'],
  ['b1-condition','B1','modalverb','Hvis jeg får fri, ___ jeg besøke familien. (å ville)','vil','В главном предложении после придаточного — vil jeg.'],
  ['b1-v2','B1','ordstilling','Etter jobb ___ jeg hjem. (å gå)','går','Если в начале обстоятельство, личная форма глагола на втором месте.'],
  ['b1-reason','B1','presens','Jeg søker jobb fordi jeg ___ erfaring. (å ha)','har','После fordi прямой порядок слов: jeg har erfaring.'],
  ['b1-concession','B1','ordstilling','Selv om det regner, ___ vi på tur. (å gå)','går','После придаточного главное начинается с личной формы глагола.'],
  ['b1-passive','B1','passiv','Dokumentene ___ sendt i går. (å bli)','ble','Прошедшее время пассива: ble sendt.'],
  ['b1-duration','B1','preposisjon','Jeg har ventet ___ tre uker.','i','Длительность периода без завершения обычно выражается i: i tre uker.'],
  ['b1-reported','B1','preteritum','Han fortalte at han ikke ___ komme. (å kunne)','kunne','В косвенной речи здесь используется kunne.'],
  ['b1-plural','B1','flertall','Flere ___ ble vurdert. (en søknad)','søknader','En søknad → flere søknader.'],
  ['b2-passiv','B2','passiv','Brevet bør ___ før fristen. (å sende)','sendes','После bør допустим s-passiv: bør sendes.'],
  ['b2-conditional','B2','modalverb','Dersom saken ikke blir avklart, ___ jeg be om en begrunnelse. (å ville)','vil','После начального придаточного следует личная форма глагола: vil jeg.'],
  ['b2-counterfactual','B2','pluskvamperfektum','Forslaget ville vært bedre dersom vi ___ vurdert kostnadene først.','hadde','Нереальное прошлое: dersom vi hadde vurdert.'],
  ['b2-review','B2','passiv','Vedtaket må ___ på nytt. (å vurdere)','vurderes','Et vedtak må vurderes — модальный глагол и s-passiv.'],
  ['b2-subordinate','B2','passiv','Det er avgjørende at alle parter ___ hørt. (å bli)','blir','Пассив настоящего времени: blir hørt.'],
  ['b2-relative','B2','perfektum','Dokumentasjonen som ___ vedlagt, beskriver problemet. (å være)','er','Som er vedlagt — относительное придаточное.'],
  ['b2-hypothetical','B2','modalverb','Hvis rapporten hadde vært ferdig, ___ vi sendt den i går. (å ville)','ville','Нереальное условие в прошлом: ville vi sendt.'],
  ['b2-precision','B2','adjektiv','Vi trenger et mer ___ svar. (presis)','presist','Средний род: et mer presist svar.']
 ].map(([id,level,tag,sentence,answer,rule])=>({id,level,tag,sentence,answer,rule}));
 const forms=[
  {id:'a1-course',level:'A1',name:'Påmelding til norskkurs',kind:'Анкета на языковые курсы',scene:'У Анны Берг адрес Fjellveien 4, 3616 Kongsberg. Она хочет записаться на курс A1. Используй вымышленные сведения ниже, а не свои.',fields:[
   ['fornavn','Fornavn','Anna'],['etternavn','Etternavn','Berg'],['postnummer','Postnummer','3616'],['kurs','Ønsket kurs','A1']]},
  {id:'a1-library',level:'A1',name:'Innmelding på biblioteket',kind:'Регистрация в библиотеке',scene:'Ученик Эрик Хансен живёт по адресу Storgata 12, 3611 Kongsberg. Заполни учебную анкету.',fields:[
   ['fornavn','Fornavn','Erik'],['etternavn','Etternavn','Hansen'],['adresse','Adresse','Storgata 12'],['postnummer','Postnummer','3611']]},
  {id:'a2-absence',level:'A2',name:'Melding om fravær',kind:'Сообщение работодателю об отсутствии',scene:'Лена Холм сообщает работодателю об отсутствии 15.10.2026. Причина — sykdom. Используй только эти данные; это не официальная egenmelding.',fields:[
   ['navn','Navn','Lena Holm'],['dato','Fraværsdato','15.10.2026'],['grunn','Årsak','sykdom'],['melding','Melding til leder',null,'Jeg er syk og kan ikke komme på jobb i dag.']]},
  {id:'a2-job',level:'A2',name:'Kort jobbsøknad',kind:'Краткая заявка на работу',scene:'Мария Лунд подаёт заявку на должность renholder в компании Fjordvik Service. Она может работать fra mandag til fredag.',fields:[
   ['navn','Navn','Maria Lund'],['stilling','Stilling','renholder'],['bedrift','Bedrift','Fjordvik Service'],['tid','Tilgjengelighet',null,'Jeg kan jobbe fra mandag til fredag.']]},
  {id:'b1-holiday',level:'B1',name:'Søknad om ferie',kind:'Заявление на отпуск',scene:'Оскар Нильсен просит отпуск с 03.11.2026 по 06.11.2026 и хочет получить письменный ответ от работодателя.',fields:[
   ['navn','Ansatt','Oskar Nilsen'],['fra','Fra dato','03.11.2026'],['til','Til dato','06.11.2026'],['begrunnelse','Forespørsel',null,'Jeg ønsker å søke om ferie fra 3. til 6. november 2026. Kan dere bekrefte søknaden skriftlig?']]},
  {id:'b1-kommune',level:'B1',name:'Forespørsel til kommunen',kind:'Обращение в коммуну',scene:'Сара Вик спрашивает коммуну о сроках рассмотрения её обращения. Номер дела K-2026-104. Требуется вежливо попросить письменное разъяснение.',fields:[
   ['navn','Navn','Sara Vik'],['saksnr','Saksnummer','K-2026-104'],['emne','Emne','saksbehandling'],['melding','Forespørsel',null,'Jeg viser til sak K-2026-104. Kan dere opplyse om forventet behandlingstid? Jeg ønsker et skriftlig svar.']]},
  {id:'b2-complaint',level:'B2',name:'Klage på fiktivt vedtak',kind:'Учебная жалоба на решение',scene:'Учебная ситуация: Кари Даль получила решение 01.10.2026 по делу KD-204. Она считает, что часть представленных документов не учтена, и просит пересмотреть решение.',fields:[
   ['navn','Navn','Kari Dahl'],['referanse','Referansenummer','KD-204'],['vedtaksdato','Dato for vedtak','01.10.2026'],['begrunnelse','Begrunnelse og ønsket resultat',null,'Jeg ber om en ny vurdering av vedtaket i sak KD-204. Etter min oppfatning er ikke alle vedlagte dokumenter vurdert. Jeg ber om en skriftlig begrunnelse.']]},
  {id:'b2-consumer',level:'B2',name:'Reklamasjon til butikk',kind:'Письменная рекламация',scene:'Юнас Вике купил кофеварку 02.10.2026, заказ FV-218. Она перестала включаться через неделю. Он просит письменный ответ о возможном решении.',fields:[
   ['navn','Kundenavn','Jonas Vike'],['bestilling','Ordrenummer','FV-218'],['kjopsdato','Kjøpsdato','02.10.2026'],['klage','Beskrivelse av problemet',null,'Jeg reklamerer på kaffetrakteren i bestilling FV-218. Den sluttet å virke etter én uke. Jeg ber om skriftlig informasjon om hvordan saken løses.']]}
 ].map(x=>({...x,fields:x.fields.map(([id,label,answer,example])=>({id,label,answer:answer||null,example:example||''}))}));
 let session=null;
 function clean(value){return String(value||'').trim().replace(/\s+/g,' ').normalize('NFC').toLocaleLowerCase('nb-NO')}
 function html(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function safeLevel(level){return LEVELS.includes(level)?level:(LEVELS.includes(state.level)?state.level:'A1')}
 function progress(){
  if(!state.functionalPractice||typeof state.functionalPractice!=='object'||Array.isArray(state.functionalPractice))state.functionalPractice={attempts:[],weaknesses:{}};
  const p=state.functionalPractice;if(!Array.isArray(p.attempts))p.attempts=[];if(!p.weaknesses||typeof p.weaknesses!=='object'||Array.isArray(p.weaknesses))p.weaknesses={};return p;
 }
 function saveResult(kind,level,id,score,weakness=[]){
  const p=progress();p.attempts.push({kind,level,id,score,date:new Date().toISOString()});p.attempts=p.attempts.slice(-100);
  for(const tag of weakness){const key=level+':'+tag;p.weaknesses[key]=Math.min(99,(Number(p.weaknesses[key])||0)+1)}
  saveState();if(typeof touchStudy==='function')touchStudy();
 }
 function wrap(body){
  shell('<section class="applied-practice"><div class="screen-head"><button class="back" onclick="navigate(\'hub\')" aria-label="Вернуться">←</button><div><small>Практика реального норвежского</small><h2>Документы и грамматика</h2></div></div>'+
   '<div class="applied-tabs"><button onclick="NEFunctionalPractice.open(\'forms\')" class="'+(session?.mode==='forms'?'active':'')+'">Анкеты и заявления</button><button onclick="NEFunctionalPractice.open(\'cloze\')" class="'+(session?.mode==='cloze'?'active':'')+'">Вставить слово</button></div>'+
   '<p class="applied-note">Все документы — самостоятельные учебные имитации, не официальные бланки. Заполняй только вымышленные данные из задания. Ответы в полях не отправляются на сервер.</p>'+body+'</section>','hub');
 }
 function levelTabs(mode,level){
  return '<div class="applied-levels" aria-label="Выбор уровня">'+LEVELS.map(l=>'<button class="'+(level===l?'active':'')+'" onclick="NEFunctionalPractice.open(\''+mode+'\',\''+l+'\')">'+l+'</button>').join('')+'</div>';
 }
 function open(mode,level){
  const m=mode==='cloze'?'cloze':'forms',l=safeLevel(level);
  session={mode:m,level:l,kind:'menu'};
  if(m==='forms'){
   const examples=forms.filter(f=>f.level===l);
   const attempts=progress().attempts;
   wrap(levelTabs(m,l)+'<div class="applied-list">'+examples.map(f=>{
    const done=[...attempts].reverse().find(a=>a.kind==='form'&&a.id===f.id);
    return '<button class="applied-tile" onclick="NEFunctionalPractice.startForm(\''+f.id+'\')"><span><b>'+html(f.name)+'</b><small>'+html(f.kind)+'</small></span><em>'+(done?'Последняя попытка '+done.score+'%':'Начать')+' →</em></button>';
   }).join('')+'</div>');
  }else{
   const attempts=progress().attempts.filter(x=>x.kind==='cloze'&&x.level===l);
   const last=attempts.at(-1);
   wrap(levelTabs(m,l)+'<article class="applied-sheet"><h3>Грамматика в контексте · '+l+'</h3><p>8 предложений с пропусками. Вводи нужную форму самостоятельно, без вариантов для угадывания. После ответа Нора показывает правило и повторяет слабые темы.</p><p>'+(last?'Последняя попытка: '+last.score+'%.':'Результаты появятся после первой тренировки.')+'</p><button class="btn" onclick="NEFunctionalPractice.startCloze()">Начать тренировку →</button></article>');
  }
 }
 function startCloze(redo){
  const level=session?.mode==='cloze'?session.level:safeLevel();
  const pool=cloze.filter(x=>x.level===level);
  const p=progress(),weight=x=>Number(p.weaknesses[level+':'+x.tag]||0);
  const questions=(Array.isArray(redo)&&redo.length?pool.filter(x=>redo.includes(x.id)):pool.slice().sort((a,b)=>weight(b)-weight(a))).slice(0,8);
  session={mode:'cloze',level,kind:'quiz',questions,index:0,results:[],locked:false,helped:false,missed:false,draft:'',help:null,last:null};
  renderCloze();
 }
 function renderCloze(){
  const s=session;if(!s||s.kind!=='quiz')return;
  const item=s.questions[s.index];
  if(!item){
   const n=s.results.filter(x=>x.ok).length,total=s.questions.length,score=Math.round(100*n/Math.max(total,1));
   const misses=s.results.filter(x=>!x.ok).map(x=>x.id);
   saveResult('cloze',s.level,'cloze-'+s.level,score,s.results.filter(x=>!x.ok).map(x=>x.tag));
   s.kind='done';s.misses=misses;
   wrap('<article class="applied-sheet"><h3>Тренировка завершена</h3><p class="applied-score">'+n+' из '+total+' · '+score+'%</p><p>Неверные ответы: '+misses.length+'. Этот результат записан как дополнительная практика и сам по себе не открывает следующий уровень.</p><div class="applied-actions">'+(misses.length?'<button class="btn" onclick="NEFunctionalPractice.redoMistakes()">Повторить ошибки</button>':'')+'<button class="btn secondary" onclick="NEFunctionalPractice.open(\'cloze\',\''+s.level+'\')">К заданиям</button></div></article>');return;
  }
  const checked=s.locked,ok=s.last?.ok,helper=s.help;
  const note=s.last?'<div class="applied-feedback '+(ok?'good':'bad')+'" role="status"><b>'+(ok?'Верно!':s.last.kind==='wrong-form'?'Форма слова не подходит':s.last.kind==='wrong-word'?'Проверь значение слова':'Разберём ответ')+'</b><p>'+html(s.last.message)+'</p></div>':'';
  const expl=helper?'<div class="applied-feedback" role="status"><b>Нора объясняет</b>'+
   '<p><b>Предложение:</b> <span lang="nb">'+html(helper.sentenceNo)+'</span></p>'+
   '<p><b>Перевод:</b> '+html(helper.sentenceRu)+'</p>'+
   '<p><b>Слово:</b> '+html(helper.lemma)+' — '+html(helper.translation)+'</p>'+
   '<p><b>Нужная форма:</b> '+html(helper.requiredForm)+'</p>'+
   '<p><b>Почему:</b> '+html(helper.rule)+'</p>'+
   '<p>Добавлено в словарь и повторение. Этот ответ уже не считается самостоятельным.</p></div>':'';
  wrap('<article class="applied-sheet"><small>Задание '+(s.index+1)+' из '+s.questions.length+' · '+html(s.level)+' · '+html(item.tag)+'</small>'+
   '<div class="applied-prompt">'+html(item.sentence).replace('___','<span class="applied-gap">______</span>')+'</div>'+
   '<label for="appliedAnswer">Недостающее слово</label><input id="appliedAnswer" type="text" maxlength="70" autocomplete="off" autocapitalize="off" spellcheck="false" '+(checked?'disabled':'')+' value="'+html(s.draft||'')+'" placeholder="Введи слово" aria-label="Недостающее слово">'+
   note+expl+
   '<div class="applied-actions">'+(checked?'<button class="btn" onclick="NEFunctionalPractice.nextCloze()">Следующее →</button>':
    '<button class="btn" onclick="NEFunctionalPractice.checkCloze()">Проверить ответ</button>'+
    '<button class="btn secondary" onclick="NEFunctionalPractice.explainCloze()">Не знаю слово</button>')+'</div></article>');
  if(!checked){const input=document.getElementById('appliedAnswer');input?.addEventListener('keydown',e=>{if(e.key==='Enter')checkCloze()});}
 }
 function checkCloze(){
  const s=session;if(!s||s.kind!=='quiz'||s.locked)return;
  const input=document.getElementById('appliedAnswer'),value=String(input?.value||'').trim();if(!value){input?.focus();return}
  const item=s.questions[s.index],ok=clean(value)===clean(item.answer),coach=window.NEClozeCoach;
  s.draft=value;
  if(!ok){
   s.missed=true;
   const diagnosis=coach?.diagnose?.(item,value);
   s.last={ok:false,kind:diagnosis?.kind||'unverified',
    message:diagnosis?.message||'Проверь значение и форму. '+item.rule};
   renderCloze();return;
  }
  // Only the very first correct, unassisted attempt counts as independent recall.
  s.results.push({id:item.id,tag:item.tag,ok:!s.helped&&!s.missed});
  s.locked=true;
  s.last={ok:true,message:s.helped?'Правильно заполнено после объяснения. Слово ещё будет повторяться.':'Ответ правильный — это самостоятельное применение слова.'};
  renderCloze();
 }
 function explainCloze(){
  const s=session;if(!s||s.kind!=='quiz'||s.locked)return false;
  const item=s.questions[s.index],coach=window.NEClozeCoach;if(!item||!coach)return false;
  s.draft=String(document.getElementById('appliedAnswer')?.value||s.draft||'').slice(0,70);
  s.help=coach.help(item);s.helped=true;
  if(coach.queueReview(item,state))saveState();
  renderCloze();return true;
 }
 function nextCloze(){if(!session||session.kind!=='quiz'||!session.locked)return;session.index++;session.locked=false;session.last=null;session.help=null;session.helped=false;session.missed=false;session.draft='';renderCloze()}
 function redoMistakes(){if(!session||session.kind!=='done'||!session.misses?.length)return;startCloze(session.misses)}
 function startForm(id){
  const f=forms.find(x=>x.id===id);if(!f)return;
  session={mode:'forms',level:f.level,kind:'form',form:f,submitted:false,values:{}};
  renderForm();
 }
 function renderForm(){
  const s=session;if(!s||s.kind!=='form')return;const f=s.form;
  const rows=f.fields.map((field,index)=>{
   const value=s.values[field.id]||'',show=s.submitted,result=s.checked?.[field.id],open=!field.answer;
   return '<div class="applied-field"><label for="applied-field-'+index+'">'+html(field.label)+(open?' <small>· свободный ответ, самопроверка</small>':'')+'</label>'+
    (open?'<textarea rows="4" maxlength="800" id="applied-field-'+index+'" data-field="'+html(field.id)+'" '+(show?'readonly':'')+'>'+html(value)+'</textarea>':
     '<input id="applied-field-'+index+'" data-field="'+html(field.id)+'" type="text" maxlength="120" autocomplete="off" value="'+html(value)+'" '+(show?'readonly':'')+'>')+
    (show?(open?'<div class="applied-feedback"><b>Пример формулировки:</b> '+html(field.example)+'<p>Свободный текст автоматически не оценён.</p></div>':
     '<div class="applied-feedback '+(result?'good':'bad')+'">'+(result?'Верно':'Ожидаемый ответ: '+html(field.answer))+'</div>'):'')+'</div>';
  }).join('');
  const closed=f.fields.filter(x=>x.answer),n=s.submitted?closed.filter(x=>s.checked?.[x.id]).length:0;
  wrap('<article class="applied-sheet"><div class="applied-illustrative">Учебный документ · '+html(f.level)+'</div><h3>'+html(f.name)+'</h3><p class="applied-scenario">'+html(f.scene)+'</p>'+
   '<form id="appliedDocument" onsubmit="return NEFunctionalPractice.submitForm(event)"><div class="applied-fields">'+rows+'</div>'+
   (s.submitted?'<div class="applied-feedback" role="status"><b>Проверка структурированных полей: '+n+' из '+closed.length+'</b><p>Свободное заявление сравни с образцом по смыслу, вежливости и полноте. Это не автоматическая оценка письма.</p></div>'+
    '<button class="btn secondary" type="button" onclick="NEFunctionalPractice.startForm(\''+f.id+'\')">Заполнить заново</button>':'<button class="btn" type="submit">Проверить заполнение</button>')+
   '</form></article>');
 }
 function submitForm(event){
  event?.preventDefault?.();const s=session;if(!s||s.kind!=='form'||s.submitted)return false;
  for(const field of s.form.fields){
   const input=document.querySelector('#appliedDocument [data-field="'+field.id+'"]');
   s.values[field.id]=String(input?.value||'').slice(0,800);
  }
  const closed=s.form.fields.filter(x=>x.answer);
  const entered=s.form.fields.some(f=>s.values[f.id]?.trim());
  if(!entered){document.getElementById('appliedDocument')?.querySelector('input,textarea')?.focus();return false}
  s.checked=Object.fromEntries(closed.map(x=>[x.id,clean(s.values[x.id])===clean(x.answer)]));s.submitted=true;
  const right=closed.filter(f=>s.checked[f.id]).length,score=Math.round(100*right/closed.length);
  saveResult('form',s.level,s.form.id,score,closed.filter(f=>!s.checked[f.id]).map(f=>'form:'+f.id));
  renderForm();return false;
 }
 window.NEFunctionalPractice={open,startCloze,checkCloze,explainCloze,nextCloze,redoMistakes,startForm,submitForm,
  getCatalog:()=>({cloze:cloze.map(x=>({...x})),forms:forms.map(x=>({...x,fields:x.fields.map(y=>({...y}))}))}),
  normalize:clean};
})();