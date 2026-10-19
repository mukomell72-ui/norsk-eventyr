// Every card: understand the translation, then independently USE the word in context.
// Verified Bokmål morphology controls a randomized target. Nora checks meaning,
// grammar and appropriateness of the complete Norwegian sentence.
(function(){
'use strict';
const forms={
 noun:['Единственное число с артиклем','Определённая форма единственного числа',
       'Множественное число, неопределённая форма','Множественное число, определённая форма'],
 verb:['Инфинитив с å','Настоящее время (presens)','Прошедшее время (preteritum)',
       'Перфект (har + причастие)','Будущее с skal'],
 adjective:['Общий род (en)','Средний род (et)','Множественное число / определённая форма',
            'Сравнительная степень','Превосходная степень']
};
const situations={
 noun:['Расскажи, что у тебя есть или что ты видишь.',
       'Расскажи о конкретном предмете, о котором собеседник уже знает.',
       'Опиши несколько таких предметов в жизни.',
       'Расскажи о нескольких определённых предметах, уже известных собеседнику.'],
 verb:['Скажи, что тебе нравится или важно делать.',
       'Расскажи, что ты делаешь сейчас или обычно.',
       'Расскажи, что произошло вчера или на прошлой неделе.',
       'Расскажи о том, что ты уже сделал.',
       'Расскажи, что собираешься сделать завтра или позже.'],
 adjective:['Опиши конкретного человека или предмет общего рода (en).',
       'Опиши предмет среднего рода (et).',
       'Расскажи о нескольких людях или предметах.',
       'Сравни двух людей, два предмета или ситуации.',
       'Скажи, кто или что обладает этим признаком в наибольшей степени.']
};
const contexts=[
 'Придумай осмысленную фразу из повседневной жизни с этим словом.',
 'Представь разговор с другом и напиши собственное предложение с этим словом.',
 'Расскажи о работе, доме или учёбе, используя это слово в подходящей форме.'
];
// Carefully authored prompts for translating a complete Russian sentence into Bokmål.
// Norwegian solutions are used ONLY for checking/hints, never shown before the answer.
const authoredAdjectives=new Map([["stor",[["Это большая машина.","Это большой дом.","Это большие дома.","Этот дом больше другого.","Это самый большой стол в комнате."],["Dette er en stor bil.","Dette er et stort hus.","Dette er store hus.","Dette huset er større enn det andre.","Dette er det største bordet i rommet."]]],["liten",[["Это маленькая машина.","Это маленькое здание.","Это маленькие дома.","Этот дом меньше другого.","Этот дом самый маленький."],["Dette er en liten bil.","Dette er et lite hus.","Dette er små hus.","Dette huset er mindre enn det andre.","Dette huset er minst."]]],["god",[["Это хорошая работа.","Это хорошее предложение.","Это хорошие друзья.","Это предложение лучше другого.","Этот вариант самый лучший."],["Dette er en god jobb.","Dette er et godt forslag.","Dette er gode venner.","Dette forslaget er bedre enn det andre.","Dette alternativet er best."]]],["ny",[["Это новая машина.","Это новое здание.","Это новые дома.","Этот дом новее другого.","Этот дом самый новый."],["Dette er en ny bil.","Dette er et nytt hus.","Dette er nye hus.","Dette huset er nyere enn det andre.","Dette huset er nyest."]]],["viktig",[["Это важная работа.","Это важное сообщение.","Это важные сообщения.","Это сообщение важнее другого.","Это сообщение самое важное."],["Dette er en viktig jobb.","Dette er et viktig budskap.","Dette er viktige beskjeder.","Denne beskjeden er viktigere enn den andre.","Denne beskjeden er viktigst."]]],["lang",[["Это длинная дорога.","Это долгое собрание.","Это длинные дни.","Эта дорога длиннее другой.","Эта дорога самая длинная."],["Dette er en lang vei.","Dette er et langt møte.","Dette er lange dager.","Denne veien er lengre enn den andre.","Denne veien er lengst."]]],["kort",[["Это короткая пауза.","Это короткое письмо.","Это короткие письма.","Это письмо короче другого.","Это письмо самое короткое."],["Dette er en kort pause.","Dette er et kort brev.","Dette er korte brev.","Dette brevet er kortere enn det andre.","Dette brevet er kortest."]]],["gammel",[["Это старая машина.","Это старое здание.","Это старые дома.","Этот дом старше другого.","Этот дом самый старый."],["Dette er en gammel bil.","Dette er et gammelt hus.","Dette er gamle hus.","Dette huset er eldre enn det andre.","Dette huset er eldst."]]],["fin",[["Это красивая машина.","Это красивое здание.","Это красивые дома.","Этот дом красивее другого.","Этот дом самый красивый."],["Dette er en fin bil.","Dette er et fint hus.","Dette er fine hus.","Dette huset er finere enn det andre.","Dette huset er finest."]]],["dyr",[["Это дорогая машина.","Это дорогое здание.","Это дорогие дома.","Этот дом дороже другого.","Этот дом самый дорогой."],["Dette er en dyr bil.","Dette er et dyrt hus.","Dette er dyre hus.","Dette huset er dyrere enn det andre.","Dette huset er dyrest."]]],["billig",[["Это дешёвая машина.","Это дешёвое здание.","Это дешёвые дома.","Этот дом дешевле другого.","Этот дом самый дешёвый."],["Dette er en billig bil.","Dette er et billig hus.","Dette er billige hus.","Dette huset er billigere enn det andre.","Dette huset er billigst."]]],["rask",[["Это быстрая машина.","Это быстрое транспортное средство.","Это быстрые машины.","Эта машина быстрее другой.","Эта машина самая быстрая."],["Dette er en rask bil.","Dette er et raskt kjøretøy.","Dette er raske biler.","Denne bilen er raskere enn den andre.","Denne bilen er raskest."]]],["forsinket",[["Этот автобус опаздывает.","Этот поезд опаздывает.","Эти автобусы опаздывают.","Этот автобус опаздывает сильнее, чем другой.","Из всех автобусов этот опаздывает больше всего."],["Denne bussen er forsinket.","Dette toget er forsinket.","Disse bussene er forsinkede.","Denne bussen er mer forsinket enn den andre.","Av alle bussene er denne mest forsinket."]]]]);
const authoredNouns=new Map([["bil",["машина","машина","машин","машины","f"]],["hus",["дом","дом","домов","дома","m"]],["bok",["книга","книга","книг","книги","f"]],["jobb",["работа","работа","работ","работы","f"]],["nøkkel",["ключ","ключ","ключей","ключи","m"]],["time",["час","час","часов","часы","m"]],["oppgave",["задание","задание","заданий","задания","n"]],["pause",["перерыв","перерыв","перерывов","перерывы","m"]],["faktura",["счёт","счёт","счетов","счета","m"]],["brød",["хлеб","хлеб","хлебов","хлеба","m"]],["møte",["встреча","встреча","встреч","встречи","f"]],["avtale",["договорённость","договорённость","договорённостей","договорённости","f"]],["beskjed",["сообщение","сообщение","сообщений","сообщения","n"]],["erfaring",["опыт","опыт","опытов","опыты","m"]],["misforståelse",["недоразумение","недоразумение","недоразумений","недоразумения","n"]],["søknad",["заявление","заявление","заявлений","заявления","n"]],["vedtak",["решение","решение","решений","решения","n"]],["spørsmål",["вопрос","вопрос","вопросов","вопросы","m"]],["målgruppe",["целевая группа","целевая группа","целевых групп","целевые группы","f"]],["avveining",["оценка вариантов","оценка вариантов","оценок вариантов","оценки вариантов","f"]],["forbehold",["оговорка","оговорка","оговорок","оговорки","f"]],["rapport",["отчёт","отчёт","отчётов","отчёты","m"]],["eple",["яблоко","яблоко","яблок","яблоки","n"]],["dag",["день","день","дней","дни","m"]],["uke",["неделя","неделя","недель","недели","f"]],["år",["год","год","лет","годы","m"]],["butikk",["магазин","магазин","магазинов","магазины","m"]],["rom",["комната","комната","комнат","комнаты","f"]],["ord",["слово","слово","слов","слова","n"]],["barn",["ребёнок","ребёнок","детей","дети","m"]],["jente",["девочка","девочка","девочек","девочки","f"]],["skole",["школа","школа","школ","школы","f"]],["venn",["друг","друг","друзей","друзья","m"]],["klokke",["часы","часы","часов","часы","n"]]]);
const authoredVerbs=new Map([["være",["быть дома","дома","был дома","был дома","hjemme"]],["ha",["иметь время","есть время","было время","было время","tid"]],["gjøre",["сделать задание","делаю задание","сделал задание","сделал задание","en oppgave"]],["gå",["пойти домой","иду домой","пошёл домой","ушёл домой","hjem"]],["komme",["прийти домой","прихожу домой","пришёл домой","пришёл домой","hjem"]],["bo",["жить в Норвегии","живу в Норвегии","жил в Норвегии","жил в Норвегии","i Norge"]],["lære",["учить норвежский","учу норвежский","учил норвежский","выучил норвежский","norsk"]],["jobbe",["работать дома","работаю дома","работал дома","поработал дома","hjemme"]],["snakke",["говорить по-норвежски","говорю по-норвежски","говорил по-норвежски","говорил по-норвежски","norsk"]],["spørre",["спросить учителя","спрашиваю учителя","спросил учителя","спросил учителя","læreren"]],["svare",["ответить на вопрос","отвечаю на вопрос","ответил на вопрос","ответил на вопрос","på spørsmålet"]],["skrive",["написать сообщение","пишу сообщение","написал сообщение","написал сообщение","en melding"]],["lese",["прочитать книгу","читаю книгу","читал книгу","прочитал книгу","en bok"]],["se",["увидеть машину","вижу машину","видел машину","увидел машину","en bil"]],["ta",["сделать перерыв","делаю перерыв","сделал перерыв","сделал перерыв","en pause"]],["få",["получить сообщение","получаю сообщение","получил сообщение","получил сообщение","en beskjed"]],["spise",["съесть яблоко","ем яблоко","ел яблоко","съел яблоко","et eple"]],["drikke",["выпить воду","пью воду","пил воду","выпил воду","vann"]],["kjøpe",["купить хлеб","покупаю хлеб","покупал хлеб","купил хлеб","brød"]],["velge",["выбрать эту машину","выбираю эту машину","выбрал эту машину","выбрал эту машину","denne bilen"]],["legge",["положить ключ сюда","кладу ключ сюда","положил ключ сюда","положил ключ сюда","nøkkelen her"]],["ligge",["лежать здесь","лежу здесь","лежал здесь","лежал здесь","her"]],["forstå",["понять вопрос","понимаю вопрос","понял вопрос","понял вопрос","spørsmålet"]],["finne",["найти ключ","нахожу ключ","нашёл ключ","нашёл ключ","nøkkelen"]],["sende",["отправить сообщение","отправляю сообщение","отправил сообщение","отправил сообщение","en melding"]],["besøke",["навестить друга","навещаю друга","навещал друга","навестил друга","en venn"]],["vente",["ждать автобус","жду автобус","ждал автобус","дождался автобуса","på bussen"]],["begynne",["начать работу","начинаю работу","начал работу","начал работу","på jobb"]],["slutte",["перестать работать","перестаю работать","перестал работать","перестал работать","å jobbe"]],["logge inn",["войти в систему","вхожу в систему","вошёл в систему","вошёл в систему","på nettsiden"]],["ordne opp",["разобраться с проблемой","разбираюсь с проблемой","разобрался с проблемой","разобрался с проблемой","i problemet"]],["rekke",["успеть на автобус","успеваю на автобус","успел на автобус","успел на автобус","bussen"]],["oppdage",["заметить ошибку","замечаю ошибку","заметил ошибку","заметил ошибку","en feil"]],["beklage",["извиниться за ошибку","извиняюсь за ошибку","извинился за ошибку","извинился за ошибку","feilen"]],["foretrekke",["предпочесть чай","предпочитаю чай","предпочёл чай","предпочёл чай","te"]],["vaske",["помыть пол","мою пол","мыл пол","помыл пол","gulvet"]],["rengjøre",["убрать комнату","убираю комнату","убрал комнату","убрал комнату","rommet"]],["hente",["забрать детей","забираю детей","забрал детей","забрал детей","barna"]],["åpne",["открыть дверь","открываю дверь","открыл дверь","открыл дверь","døren"]]]);
function authoredTranslation(g,task){
 const i=task.index,word=String(g.lemma||'');
 if(g.type==='adjective'&&authoredAdjectives.has(word)){
  const [ru,no]=authoredAdjectives.get(word);return {russianSentence:ru[i],modelAnswer:no[i]};
 }
 if(g.type==='noun'&&authoredNouns.has(word)){
  const [acc,nom,genPl,nomPl,gender]=authoredNouns.get(word);
  const f=task.requiredForm;
  const desc=gender==='f'?'Эта':gender==='n'?'Это':'Этот';
  const pluralVerb=nomPl==='дети'?'важны':'важны';
  const ru=['У меня есть '+acc+'.',desc+' '+nom+' здесь.','Здесь есть несколько '+genPl+'.','Эти '+nomPl+' важны.'];
  const no=['Jeg har '+f+'.',f.charAt(0).toUpperCase()+f.slice(1)+' er her.','Det er flere '+f+' her.',f.charAt(0).toUpperCase()+f.slice(1)+' er viktige.'];
  return {russianSentence:ru[i],modelAnswer:no[i]};
 }
 // Modal verbs require hand-authored contexts: generic verb templates may be misleading.
 if(g.type==='verb'&&word==='kunne'){
  const russian=[
   'Полезно уметь говорить по-норвежски.',
   'Я могу тебе помочь.',
   'Вчера я не мог прийти.',
   'Раньше я мог тебе помогать.',
   'После курса я смогу говорить по-норвежски.'
  ];
  const norwegian=[
   'Det er nyttig å kunne snakke norsk.',
   'Jeg kan hjelpe deg.',
   'Jeg kunne ikke komme i går.',
   'Jeg har kunnet hjelpe deg før.',
   'Etter kurset skal jeg kunne snakke norsk.'
  ];
  return {russianSentence:russian[i],modelAnswer:norwegian[i]};
 }
 if(g.type==='verb'&&authoredVerbs.has(word)){
  const [inf,pres,past,perfect,complement]=authoredVerbs.get(word),f=task.requiredForm;
  const ru=['Я стараюсь '+inf+'.','Сегодня я '+pres+'.','Вчера я '+past+'.','Я уже '+perfect+'.','Завтра я собираюсь '+inf+'.'];
  const no=['Jeg prøver '+f+' '+complement+'.','I dag '+(f.includes(' ')?f.split(' ')[0]+' jeg '+f.split(' ').slice(1).join(' '):f+' jeg')+' '+complement+'.','I går '+(f.includes(' ')?f.split(' ')[0]+' jeg '+f.split(' ').slice(1).join(' '):f+' jeg')+' '+complement+'.','Jeg '+f+' '+complement+'.','I morgen '+f.replace(/^skal /,'skal jeg ')+' '+complement+'.'];
  if(word==='være'){
   ru[1]='Сегодня я дома.';ru[2]='Вчера я был дома.';ru[3]='Я уже был дома.';
  }
  if(word==='ha'){
   ru[1]='Сегодня у меня есть время.';ru[2]='Вчера у меня было время.';ru[3]='У меня уже было время.';
  }
  if(word==='ligge'){
   ru[1]='Сегодня я лежу здесь.';ru[2]='Вчера я лежал здесь.';ru[3]='Я уже лежал здесь.';
  }
  // Passive AI grading checks meaning against this model, not exact wording.
  return {russianSentence:ru[i],modelAnswer:no[i]};
 }
 return null; // Never fabricate a translation for an unverified lexical entry.
}
const norm=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('nb-NO')
 .replace(/[.,!?;:"“”«»()[\]{}]/g,' ').replace(/\s+/g,' ').trim();
function taskList(word){
 const g=window.NECardGrammar?.describe?.(word);
 if(g?.verified===true&&Array.isArray(g.forms)&&g.forms.length>1){
  return g.forms.map((f,i)=>{
   const target={index:i,requiredForm:f.form},authored=authoredTranslation(g,target);
   return {
    kind:'sentence',index:i,type:g.type,label:forms[g.type]?.[i]||String(f.label),
    prompt:authored?'Переведи на норвежский: «'+authored.russianSentence+'»':
      (situations[g.type]?.[i]||'Составь собственное предложение.')+
      ' Используй «'+g.headword+'» в указанной форме: '+(forms[g.type]?.[i]||f.label)+'.',
    russianSentence:authored?.russianSentence||null,
    modelAnswer:authored?.modelAnswer||null,
    requiredForm:f.form,answer:f.form,word:g.headword,lemma:g.lemma,
    help:g.help||'',url:g.url||''
   };
  });
 }
 return contexts.map((context,i)=>({
  kind:'sentence',index:i,type:g?.type||'other',label:'Применение слова в речи',
  prompt:context+' Используй слово «'+(g?.headword||String(word.word||''))+'» так, чтобы смысл предложения был понятен.',
  russianSentence:null,modelAnswer:null,
  requiredForm:null,answer:null,word:g?.headword||String(word.word||''),
  lemma:g?.lemma||String(word.word||''),help:'Напиши полноценное предложение; Нора оценит значение, контекст и грамматику.',
  url:g?.url||''
 }));
}
function choose(word,avoid=-1,rand=Math.random){
 const tasks=taskList(word),options=tasks.filter(t=>t.index!==avoid);
 const pool=options.length?options:tasks,roll=Number(rand())||0;
 return pool[Math.max(0,Math.min(pool.length-1,Math.floor(roll*pool.length)))];
}
function variants(task,word){
 if(!task?.requiredForm)return [];
 const v=[task.requiredForm],g=window.NECardGrammar?.describe?.(word);
 if(g?.type==='noun'){
  const lemma=g.lemma;
  const feminine=['bok','jente','klokke','uke','oppgave','pause','skole'];
  if(feminine.includes(lemma)){
   if(task.index===0&&/^(en|ei) /.test(task.requiredForm))
    v.push((task.requiredForm.startsWith('en ')?'ei ':'en ')+lemma);
   if(task.index===1){
    const a=String(task.requiredForm);
    if(a.endsWith('en'))v.push(a.slice(0,-2)+'a');
    if(a.endsWith('a'))v.push(a.slice(0,-1)+'en');
   }
  }
 }
 return v;
}
function includesSequence(sentence,form){
 const actual=' '+norm(sentence)+' ',expected=' '+norm(form)+' ';
 return !!norm(form)&&actual.includes(expected);
}
function hasRequiredForm(task,sentence,word){
 if(!task?.requiredForm)return false;
 const g=window.NECardGrammar?.describe?.(word);
 if(variants(task,word).some(form=>includesSequence(sentence,form)))return true;
 // Natural definite superlatives inflect: stor -> størst / største.
 if(g?.type==='verb'&&[1,2].includes(task.index)&&String(task.requiredForm).includes(' ')){
  const parts=norm(task.requiredForm).split(' '),tokens=norm(sentence).split(' ');
  // Split particle verbs respect V2: "I dag logger jeg inn".
  for(let k=0;k<tokens.length-parts.length;k++)
   if(tokens[k]===parts[0]&&['jeg','du','han','hun','vi','dere','de','man'].includes(tokens[k+1])&&
      tokens.slice(k+2,k+parts.length+1).join(' ')===parts.slice(1).join(' '))return true;
 }
 if(g?.type==='verb'&&task.index===4){
  // Standard V2 order: "I morgen skal jeg begynne", not "skal begynne jeg".
  const pieces=norm(task.requiredForm).split(' ');
  const tokens=norm(sentence).split(' ');
  const index=tokens.indexOf(pieces[0]);
  if(index>=0&&index+pieces.length<tokens.length&&
   ['jeg','du','han','hun','vi','dere','de','man'].includes(tokens[index+1])&&
   tokens.slice(index+2,index+pieces.length+1).join(' ')===pieces.slice(1).join(' '))
   return true;
 }
 if(g?.type==='adjective'&&task.index===4){
  const form=String(task.requiredForm);
  if(includesSequence(sentence,form+'e'))return true;
  // Adjectives in -et can also appear with -ede in older/formal Bokmål.
  if(form.startsWith('mest ')&&form.endsWith('et')&&includesSequence(sentence,form.slice(0,-2)+'ede'))return true;
 }
 if(g?.type==='noun'&&task.index===0){
  // Indefinite noun may have adjectives between article and noun: "en gammel bil".
  const words=norm(sentence).split(' '),noun=norm(g.lemma);
  for(let i=0;i<words.length;i++){
   if(words[i]!==noun)continue;
   for(let back=1;back<=3&&i-back>=0;back++){
    if(['en','ei','et'].includes(words[i-back])){
     const acceptedArticle=variants(task,word).map(v=>norm(v).split(' ')[0]);
     if(acceptedArticle.includes(words[i-back]))return true;
    }
   }
  }
 }
 return false;
}
function containsWord(task,sentence,word){
 if(task?.requiredForm)return hasRequiredForm(task,sentence,word);
 const lemma=String(task?.lemma||window.NECardGrammar?.describe?.(word)?.lemma||word?.word||'');
 if(includesSequence(sentence,lemma))return true;
 const words=norm(lemma).replace(/^å /,'').split(' ').filter(Boolean);
 if(words.length>1)return includesSequence(sentence,words.join(' '));
 // Unknown regular conjugations: this is a preliminary check only, not grading.
 const base=words[0]||'',stem=base.slice(0,Math.max(3,base.length-2));
 return stem.length>=3&&norm(sentence).split(' ').some(token=>token.startsWith(stem));
}
// Give precise local feedback only when a supplied translation differs by one
// near-identical word. Other valid formulations remain for Nora to assess.
function spellingHint(task,sentence){
 if(!task?.russianSentence||!task.modelAnswer)return '';
 const actual=norm(sentence).split(' ').filter(Boolean),expected=norm(task.modelAnswer).split(' ').filter(Boolean);
 if(actual.length!==expected.length||actual.length<3)return '';
 let changed=-1;
 for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i]){
  if(changed!==-1)return '';
  changed=i;
 }
 if(changed<0)return '';
 const wrong=actual[changed],correct=expected[changed];
 if(wrong.length<3||correct.length<4||Math.abs(wrong.length-correct.length)>2)return '';
 let prefix=0;
 while(prefix<wrong.length&&prefix<correct.length&&wrong[prefix]===correct[prefix])prefix++;
 if(prefix<3)return '';
 let distances=Array.from({length:correct.length+1},(_,i)=>i);
 for(let i=1;i<=wrong.length;i++){
  const next=[i];
  for(let j=1;j<=correct.length;j++)
   next[j]=Math.min(next[j-1]+1,distances[j]+1,distances[j-1]+(wrong[i-1]===correct[j-1]?0:1));
  distances=next;
 }
 if(distances[correct.length]>2)return '';
 return 'Проверь написание слова «'+wrong+'»: правильно «'+correct+'». Исправь это слово и проверь перевод снова.';
}
function hint(task,misses){
 const modalNote=task?.lemma==='kunne'
  ?'Сравни формы: kan — могу (настоящее), kunne — мог/мог бы, har kunnet — имел возможность. После kan/kunne следующий глагол без å. '
  :'';
 const morphology=task?.requiredForm
   ?'Нужная форма: '+task.label+'. '+(
    task.type==='verb'?'Вспомни время и конструкцию.':
    task.type==='noun'?'Проверь артикль, число и определённость.':
    'Проверь род, число и степень сравнения.')
   :'Вспомни значение слова и составь другое осмысленное предложение.';
 if(misses>=3&&task?.requiredForm)return modalNote+morphology+
  (task.russianSentence&&task.modelAnswer
    ?' Подсказка к переводу: '+(task.type==='adjective'&&task.index===4&&task.modelAnswer.toLowerCase().includes(task.requiredForm+'e')
      ?'после определённого существительного используется форма «'+task.requiredForm+'e».'
      :'проверь слово и его форму; полный ответ пока не показывается.')
    :' Подсказка: подходящая форма — «'+task.requiredForm+'». Теперь употреби её в собственном предложении.');
 return modalNote+morphology+' Недостаточно написать одно слово: нужно полное предложение.';
}
window.NECardFormPractice=Object.freeze({
 taskList,choose,variants,hasRequiredForm,containsWord,hint,spellingHint,norm,authoredTranslation
});
})();
