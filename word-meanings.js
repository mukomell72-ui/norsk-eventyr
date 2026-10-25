// Norsk Eventyr — verified meanings in context. Offline and read-only: no study credit.
(function(){
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('nb-NO').trim()
  .replace(/^(?:en|ei|et|å)\s+/u,'').replace(/^[.,!?;:()\[\]{}]+|[.,!?;:()\[\]{}]+$/gu,'').replace(/\s+/gu,' ');
 // Editorial examples are Bokmål examples, NOT machine-inferred senses.
 // A translation is valid in its accompanying context, not for every occurrence.
 const entries={
  til:{pos:'предлог',senses:[
   ['к','Jeg går til legen.','Я иду к врачу.','направление к человеку'],
   ['в','Jeg reiser til Oslo.','Я еду в Осло.','направление к месту'],
   ['до','Jeg jobber til klokka fem.','Я работаю до пяти часов.','конечный момент времени'],
   ['для','Dette er til deg.','Это для тебя.','получатель'],
   ['ещё','Jeg vil ha en til.','Я хочу ещё один.','только в сочетаниях, например en til']
  ],phrases:[['en gang til','ещё раз'],['litt til','ещё немного'],['til slutt','в конце, наконец'],['fra ... til ...','от ... до ...']]},
  i:{pos:'предлог',senses:[
   ['в','Jeg bor i Norge.','Я живу в Норвегии.','местонахождение'],
   ['в течение','Jeg har bodd her i to år.','Я живу здесь два года.','продолжительность периода']
  ],phrases:[['i dag','сегодня'],['i morgen','завтра'],['i går','вчера']]},
  på:{pos:'предлог',senses:[
   ['на','Boka ligger på bordet.','Книга лежит на столе.','поверхность'],
   ['в','Jeg er på jobb.','Я на работе.','устойчивое обозначение места'],
   ['в понедельник','Vi møtes på mandag.','Мы встретимся в понедельник.','указание дня'],
   ['в','Jeg sitter på bussen.','Я сижу в автобусе.','норвежский транспортный оборот']
  ],phrases:[['på norsk','по-норвежски'],['på jobb','на работе']]},
  om:{pos:'предлог / союз',senses:[
   ['о','Vi snakker om jobben.','Мы говорим о работе.','тема разговора'],
   ['через','Jeg kommer om en time.','Я приду через час.','время в будущем'],
   ['если','Om du vil, kan vi gå.','Если хочешь, можем пойти.','условие']
  ],phrases:[['om morgenen','по утрам'],['om kvelden','по вечерам']]},
  med:{pos:'предлог',senses:[
   ['с','Jeg snakker med læreren.','Я разговариваю с учителем.','совместное действие'],
   ['на','Jeg reiser med buss.','Я еду на автобусе.','средство транспорта'],
   ['с','Kaffe med melk, takk.','Кофе с молоком, пожалуйста.','состав']
  ],phrases:[['bli med','пойти вместе / присоединиться']]},
  for:{pos:'предлог / союз / наречие',senses:[
   ['для','Dette er for deg.','Это для тебя.','в чьих-либо интересах'],
   ['слишком','Det er for dyrt.','Это слишком дорого.','чрезмерная степень'],
   ['потому что','Jeg er glad, for du kom.','Я рад, потому что ты пришёл.','причина, союз']
  ],phrases:[['for eksempel','например'],['for to dager siden','два дня назад']]},
  som:{pos:'союз / относительное местоимение',senses:[
   ['который','Jeg har en venn som bor i Oslo.','У меня есть друг, который живёт в Осло.','относительное предложение'],
   ['в качестве','Hun jobber som lærer.','Она работает учителем.','роль / профессия'],
   ['как будто','Det ser ut som det skal regne.','Похоже, собирается дождь.','сравнение']
  ],phrases:[]},
  da:{pos:'наречие / союз',senses:[
   ['тогда','Da gikk jeg hjem.','Тогда я пошёл домой.','последовательность событий'],
   ['когда','Da jeg var liten, bodde jeg i Bergen.','Когда я был маленьким, я жил в Бергене.','событие в прошлом']
  ],phrases:[]},
  gå:{pos:'глагол',senses:[
   ['идти','Jeg går hjem nå.','Я сейчас иду домой.','передвижение пешком'],
   ['проходить','Tiden går fort.','Время идёт быстро.','ход времени'],
   ['работать','Klokka går.','Часы идут.','о механизме']
  ],phrases:[['Hvordan går det?','Как дела?']]},
  time:{pos:'существительное · en',senses:[
   ['час','Det tar en time.','Это занимает час.','единица времени'],
   ['запись на приём','Jeg har time hos legen.','Я записан к врачу.','медицинский приём'],
   ['урок','Vi har norsktime nå.','У нас сейчас урок норвежского.','учебное занятие (часто в сложных словах)']
  ],phrases:[]},
  aktivitet:{pos:'существительное · en',senses:[
   ['занятие','Vi har en aktivitet i dag.','Сегодня у нас занятие.','организованное занятие'],
   ['деятельность','Fysisk aktivitet er viktig.','Физическая активность важна.','род деятельности'],
   ['активность','Det er mye aktivitet her.','Здесь высокая активность.','оживлённость / происходящие действия']
  ],phrases:[]}
 };
 const catalogue=Object.freeze(Object.fromEntries(Object.entries(entries).map(([word,item])=>
  [word,Object.freeze({pos:item.pos,senses:Object.freeze(item.senses.map(([ru,no,translation,note])=>
   Object.freeze({ru,no,translation,note}))),phrases:Object.freeze(item.phrases.map(([no,ru])=>Object.freeze({no,ru})))})])));
 function unpack(input){
  const source=typeof input==='string'?{word:input}:input&&typeof input==='object'?input:{};
  const word=String(source.lemma||source.word||source.headword||'').trim();
  const base=catalogue[key(word)];
  const extra=source.meaningsVerified===true?(Array.isArray(source.meanings)?source.meanings:Array.isArray(source.senses)?source.senses:null):null;
  // Additional senses must be explicitly editorially verified, not merely AI-generated.
  const provided=extra?.filter(x=>x&&typeof x==='object'&&typeof x.ru==='string'&&
   typeof x.no==='string'&&typeof x.translation==='string'&&x.ru.trim()&&x.no.trim()&&x.translation.trim())
   .slice(0,12).map(x=>({ru:x.ru,no:x.no,translation:x.translation,note:String(x.note||'')}))||[];
  const senses=provided.length?provided:base?.senses||[];
  const translation=String(source.translation_ru||source.translation||source.ru||'').trim();
  const examples=Array.isArray(source.examples)?source.examples.filter(x=>x&&typeof x.no==='string'&&typeof x.ru==='string').slice(0,3):[];
  return {word,translation,pos:base?.pos||'',senses,phrases:base?.phrases||[],examples};
 }
 function searchText(input){
  const entry=unpack(input);
  return [entry.word,entry.translation,...entry.senses.flatMap(s=>[s.ru,s.no,s.translation]),...entry.phrases.flatMap(p=>[p.no,p.ru])].join(' ').toLocaleLowerCase('ru');
 }
 function render(input,options={}){
  const x=unpack(input);if(!x.word)return '';
  const open=options.expanded?' open':'';
  const compact=options.compact?' ne-meanings-compact':'';
  const context=x.translation?'<div class="ne-meaning-context"><b>В текущем задании:</b> '+esc(x.translation)+'</div>':'';
  const senses=x.senses.length?'<ol class="ne-meaning-list">'+x.senses.map(s=>
   '<li><b>'+esc(s.ru)+'</b><span lang="nb">'+esc(s.no)+'</span><span>'+esc(s.translation)+'</span>'+
   (s.note?'<small>'+esc(s.note)+'</small>':'')+'</li>').join('')+'</ol>':
   '<p class="ne-meaning-empty">Здесь сохранён перевод для задания. Другие значения пока не проверены: сверяй их по словарю.</p>'+
   (x.examples.length?'<ul>'+x.examples.map(e=>'<li><span lang="nb">'+esc(e.no)+'</span> — '+esc(e.ru)+'</li>').join('')+'</ul>':'');
  const phrases=x.phrases.length?'<div class="ne-meaning-phrases"><b>Устойчивые сочетания</b>'+
   x.phrases.map(p=>'<p><span lang="nb">'+esc(p.no)+'</span> — '+esc(p.ru)+'</p>').join('')+'</div>':'';
  return '<details class="ne-meanings'+compact+'"'+open+' data-ne-meanings="'+esc(key(x.word))+'">'+
   '<summary>Значения слова'+(x.senses.length?' ('+x.senses.length+')':'')+' и примеры</summary>'+
   context+senses+phrases+
   '<a href="https://ordbokene.no/bm/'+encodeURIComponent(key(x.word))+'" target="_blank" rel="noopener noreferrer">Проверить в Bokmålsordboka ↗</a>'+
   '</details>';
 }
 function styles(){
  if(typeof document==='undefined'||document.getElementById('ne-meanings-style'))return;
  const e=document.createElement('style');e.id='ne-meanings-style';
  e.textContent='.ne-meanings{margin:12px 0;padding:12px;border:1px solid rgba(140,171,198,.45);border-radius:14px;background:rgba(55,111,151,.1);line-height:1.5;overflow-wrap:anywhere}.ne-meanings summary{font-weight:700;cursor:pointer}.ne-meaning-context{padding:9px 0;font-size:.94em}.ne-meaning-list{list-style:decimal;padding-left:23px;margin:10px 0}.ne-meaning-list li{padding:9px 0;border-top:1px solid rgba(140,171,198,.25)}.ne-meaning-list li>b{display:block}.ne-meaning-list li>span{display:block}.ne-meaning-list li>span[lang=nb]{font-weight:650}.ne-meaning-list li>small{display:block;opacity:.77}.ne-meaning-phrases{margin:10px 0}.ne-meaning-phrases p{margin:4px 0}.ne-meanings a{display:inline-block;margin-top:8px}.ne-meanings-compact{font-size:13px;padding:10px}.ne-meanings-compact .ne-meaning-list{padding-left:20px}';
  document.head.appendChild(e);
 }
 styles();
 window.NEWordMeanings=Object.freeze({lookup:unpack,searchText,render,hasVerified:input=>unpack(input).senses.length>0});
})();