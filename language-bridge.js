// Språkbro 2.6 — activate CEFR-level word prompts in the actual v7 lesson shell.
// Scored test questions/answers remain untouched; introduced words never count as mastered.
(() => {
 'use strict';
 // High-confidence invariant translations; every term is activated ONLY if its
 // Norwegian lemma is actually mastered in this learner's own dictionary/SRS.
 const FIXED=Object.freeze([
  ['сегодня','i dag'],['завтра','i morgen'],['вчера','i går'],
  ['сейчас','nå'],['потом','etterpå'],['позже','senere'],['раньше','før'],
  ['часто','ofte'],['всегда','alltid'],['иногда','noen ganger'],['никогда','aldri'],
  ['уже','allerede'],['скоро','snart'],['вместе','sammen'],['тоже','også'],
  ['здесь','her'],['там','der'],['дома','hjemme'],['домой','hjem'],
  ['спасибо','takk'],['привет','hei'],['извините','unnskyld'],
  ['утром','om morgenen'],['вечером','om kvelden'],['ночью','om natten'],
  ['сегодня вечером','i kveld'],['вчера вечером','i går kveld'],
  ['следующая неделя','neste uke'],['в понедельник','på mandag'],
  ['семья','familie'],['дом','hus'],['работа','jobb'],['друг','venn'],
  ['школа','skole'],['хлеб','brød'],['молоко','melk'],['слово','ord'],
  ['врач','lege'],['магазин','butikk'],['время','tid'],['книга','bok'],
  ['автобус','buss'],['город','by'],['машина','bil'],['квартира','leilighet'],
  ['документ','dokument'],['заявление','søknad'],['срок','frist'],
  ['письмо','brev'],['встреча','møte'],['курс','kurs'],['учитель','lærer'],
  ['неделя','uke'],['день','dag'],['час','time'],['язык','språk'],
  ['кофе','kaffe'],['вода','vann'],['еда','mat'],['ребёнок','barn'],
  ['завтрак','frokost'],['вечер','kveld'],['ночь','natt'],['утро','morgen'],
  ['зима','vinter'],['лето','sommer'],['осень','høst'],['весна','vår'],
  // Vetted conjugated forms: only activate if the learner knows the base verb.
  // This deliberately avoids guessing arbitrary conjugations from a dictionary.
  ['начать','å begynne','begynne'],['начинать','å begynne','begynne'],
  ['начинаю','begynner','begynne'],['начинает','begynner','begynne'],
  ['закончить','å slutte','slutte'],['заканчивать','å slutte','slutte'],
  ['заканчиваю','slutter','slutte'],['заканчивает','slutter','slutte'],
  ['работать','å jobbe','jobbe'],['работаю','jobber','jobbe'],['работает','jobber','jobbe'],
  ['учить','å lære','lære'],['изучать','å lære','lære'],
  ['учу','lærer','lære'],['изучаю','lærer','lære'],['изучает','lærer','lære'],
  ['говорить','å snakke','snakke'],['говорю','snakker','snakke'],['говорит','snakker','snakke'],
  ['говори','snakk','snakke'],['ответь','svar','svare'],['скажи','si','si'],
  ['напиши','skriv','skrive'],['расскажи','fortell','fortelle'],['используй','bruk','bruke'],
  ['план','plan','plan'],['предложение','setning','setning'],['предложения','setninger','setning'],
  ['вопрос','spørsmål','spørsmål'],['слова','ord','ord'],['действия','handlinger','handling'],
  ['ещё','mer','mer'],['начинаешь','begynner','begynne'],['заканчиваешь','slutter','slutte'],
  ['работаешь','jobber','jobbe'],['работаете','jobber','jobbe'],
  ['спрашивает','spør','spørre'],['спроси','spør','spørre'],
  ['коллега','kollega','kollega'],['когда','når','når'],
  ['вторник','tirsdag','tirsdag'],['понедельник','mandag','mandag'],
  ['встречу','møte','møte'],['встрече','møte','møte'],
  ['договориться','å avtale','avtale'],['затем','etterpå','etterpå'],
  ['назови','si','si'],['повтори','gjenta','gjenta'],['измени','endre','endre'],
  ['можешь','kan','kunne'],
  ['встретиться','møtes','møtes'],['вслух','høyt','høyt'],
  ['читать','å lese','lese'],['читаю','leser','lese'],['читает','leser','lese'],
  ['писать','å skrive','skrive'],['пишу','skriver','skrive'],['пишет','skriver','skrive'],
  ['жить','å bo','bo'],['живу','bor','bo'],['живёт','bor','bo'],
  ['понимать','å forstå','forstå'],['понимаю','forstår','forstå'],
  ['могу','kan','kunne'],['может','kan','kunne'],
  ['хочу','vil','ville'],['хочет','vil','ville'],
  ['собираюсь','skal','skulle']
 ]);
 const TERMS=FIXED.map(([ru,no,lemma])=>({ru,no,lemma:lemma||no,translation:ru}));
 // Switch the whole clause only when every Norwegian component is mastered.
 // Distinct buttons preserve individual translation and review for each word.
 const PHRASES=Object.freeze([
  {ru:'сегодня ты работаешь',pieces:[['i dag','i dag','сегодня'],['jobber','jobbe','работаешь'],['du','du','ты']]},
  {ru:'завтра ты работаешь',pieces:[['i morgen','i morgen','завтра'],['jobber','jobbe','работаешь'],['du','du','ты']]},
  {ru:'ты работаешь',pieces:[['du','du','ты'],['jobber','jobbe','работаешь']]},
  {ru:'можешь встретиться',pieces:[['kan','kunne','можешь'],['møtes','møtes','встретиться']]}
 ]);
 // Classroom instruction vocabulary appropriate for the current course level.
 // This is an editorially verified pedagogical starter list, not a claim that
 // each individual word has an official CEFR classification. Include earlier
 // levels at higher levels, never introduce B1/B2 words into A1 instructions.
 // [Russian surface, Norwegian surface, lemma, priority, dictionary meaning]
 const LEVEL_WORDS=Object.freeze({
  A1:[
   ['напиши','skriv','å skrive',88,'писать'],
   ['назови','si','å si',83,'сказать'],
   ['день','dag','en dag',77,'день'],
   ['план','plan','en plan',62,'план'],
   ['используй','bruk','å bruke',60,'использовать'],
   ['скажи','si','å si',67,'сказать'],
   ['ответь','svar','å svare',65,'отвечать'],
   ['прочитай','les','å lese',65,'читать'],
   ['вопрос','spørsmål','et spørsmål',58,'вопрос'],
   ['слово','ord','et ord',53,'слово'],
   ['сегодня','i dag','i dag',51,'сегодня'],
   ['завтра','i morgen','i morgen',50,'завтра'],
   ['дома','hjemme','hjemme',49,'дома'],
   ['дом','hus','et hus',47,'дом'],
   ['работа','jobb','en jobb',48,'работа'],
   ['неделя','uke','en uke',42,'неделя'],
   ['снова','igjen','igjen',45,'снова'],
   ['вслух','høyt','høyt',48,'вслух'],
   ['коллега','kollega','en kollega',45,'коллега'],
   // Imperatives that appear in real graded-lesson directions, not answers.
   ['сначала','først','først',74,'сначала'],
   ['потом','etterpå','etterpå',62,'потом'],
   ['послушай','lytt','å lytte',82,'слушать'],
   ['выбери','velg','å velge',79,'выбирать'],
   ['вспомни','husk','å huske',77,'помнить'],
   ['проверь','sjekk','å sjekke',65,'проверять'],
   ['попробуй','prøv','å prøve',72,'пробовать'],
   ['говори','snakk','å snakke',72,'говорить'],
   ['текст','tekst','en tekst',64,'текст'],
   ['перевод','oversettelse','en oversettelse',58,'перевод'],
   ['вариант','alternativ','et alternativ',59,'вариант'],
   ['ответ','svar','et svar',63,'ответ'],
   ['слушай','lytt','å lytte',67,'слушать']
  ],
  A2:[
   ['объясни','forklar','å forklare',75,'объяснять'],
   ['опиши','beskriv','å beskrive',75,'описывать'],
   ['сравни','sammenlign','å sammenligne',72,'сравнивать'],
   ['почему','hvorfor','hvorfor',64,'почему'],
   ['пример','eksempel','et eksempel',65,'пример'],
   ['сначала','først','først',60,'сначала'],
   ['затем','etterpå','etterpå',59,'затем'],
   ['причина','grunn','en grunn',55,'причина']
  ],
  B1:[
   ['обоснуй','begrunn','å begrunne',77,'обосновывать'],
   ['обсуди','diskuter','å diskutere',73,'обсуждать'],
   ['аргумент','argument','et argument',64,'аргумент'],
   ['мнение','mening','en mening',62,'мнение'],
   ['отличие','forskjell','en forskjell',61,'отличие']
  ],
  B2:[
   ['оцени','vurder','å vurdere',78,'оценивать'],
   ['проанализируй','analyser','å analysere',77,'анализировать'],
   ['вывод','konklusjon','en konklusjon',65,'вывод'],
   ['последствие','konsekvens','en konsekvens',65,'последствие'],
   ['предположение','antakelse','en antakelse',60,'предположение']
  ]
 });
 const getState=()=>window.neLearnerState||null;
 const normNo=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('nb-NO').trim()
  .replace(/^(?:å|en|ei|et)\s+/,'').replace(/[.,!?;:"'()[\]{}]/g,'').replace(/\s+/g,' ');
 const normRu=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('ru-RU').trim().replace(/\s+/g,' ');
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cap=(x,min,max)=>Math.max(min,Math.min(max,Number(x)||0));
 const enabled=()=>getState()?.learningV8?.languageBridgeEnabled!==false;
 const lessonLevel=()=>{
  const current=window.neLessonSession?.lesson?.level;
  return ['A1','A2','B1','B2'].includes(current)?current:
   (['A1','A2','B1','B2'].includes(getState()?.level)?getState().level:'A1');
 };
 // A learner who remembers more words sees more Bokmål, but difficult recent
 // lookups automatically reduce substitutions without adding any new exercises.
 function recentPeeks(){
  const cutoff=Date.now()-7*86400000,events=getState()?.learningV8?.bridgeLookupEvents;
  return Array.isArray(events)?events.filter(t=>Number.isFinite(t)&&t>=cutoff&&t<=Date.now()).length:0;
 }
 function density(text=''){
  const count=knownWords().length,cap=({A1:6,A2:9,B1:12,B2:18})[getState()?.level]||6;
  const pressure=recentPeeks()>=6?2:recentPeeks()>=3?1:0;
  const numberOfWords=String(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1,Math.min(cap,1+Math.floor(count/5)-pressure,Math.max(1,Math.ceil(numberOfWords*.75))));
 }
 let root=null,observer=null,busy=false;
 const processed=new WeakMap();

 function isMastered(dictionary,srs){
  const goodDict=dictionary&&Number(dictionary.correct)>=2&&Number(dictionary.exposures)>=2&&
   Number(dictionary.correct)>Number(dictionary.wrong||0);
  const strongDict=dictionary&&Number(dictionary.correct)>=1&&Number(dictionary.exposures)>=2&&
   Number(dictionary.strength)>=65&&Number(dictionary.correct)>=Number(dictionary.wrong||0);
  const goodSrs=srs&&Number(srs.stage)>=2&&Number(srs.correct)>=2;
  // Previously practised vocabulary is eligible at low density as well; a
  // merely introduced word (one exposure, no correct recall) remains excluded.
  const familiarDict=dictionary&&Number(dictionary.exposures)>=2&&Number(dictionary.correct)>=1&&
    Number(dictionary.correct)>=Number(dictionary.wrong||0);
  const familiarSrs=srs&&Number(srs.seen)>=2&&Number(srs.correct)>=1;
  return !!(goodDict||strongDict||goodSrs||familiarDict||familiarSrs);
 }
 function knownWords(){
  const s=getState(),dict=s?.dailyDictionary||{},reps=s?.srs||{},map=new Map();
  for(const item of Object.values(dict)){
   if(!item||typeof item!=='object')continue;
   const key=normNo(item.lemma||item.word);if(!key)continue;
   map.set(key,{...map.get(key),dictionary:item});
  }
  for(const item of Object.values(reps)){
   if(!item||typeof item!=='object')continue;
   const key=normNo(item.word);if(!key)continue;
   map.set(key,{...map.get(key),srs:item});
  }
  return [...map.entries()].filter(([_,value])=>isMastered(value.dictionary,value.srs))
   .map(([key,value])=>({key,...value}));
 }
 function extractTranslation(record){
  const translation=String(record.translation_ru||record.translation||'').trim().toLocaleLowerCase('ru-RU');
  // Never guess conjugated Russian/Norwegian forms from a translation with disjunctions.
  const first=translation.split(/\s*[,;/|]\s*/)[0].replace(/\s*\([^)]*\)\s*$/,'').trim();
  return /^[а-яё]+(?:\s+[а-яё]+){0,2}$/u.test(first)?first:'';
 }
 function dynamicTerm(item){
  const d=item.dictionary||{},s=item.srs||{};
  const raw=String(d.lemma||d.word||s.word||'').trim();
  const no=item.key,translation=extractTranslation(Object.keys(d).length?d:s);
  if(!translation||!no||!raw)return null;
  // Only words for which the Russian citation form does not require a
  // grammatical transformation. Avoid infinitives, adjectives, pronouns,
  // ambiguous prepositions, and Russian words with inflected endings.
  const pos=String(d.pos||d.part_of_speech||'').toLowerCase();
  const noun=/^(?:en|ei|et)\s+\S+/i.test(raw)||/\b(?:noun|substantiv|subst|существ)\b/i.test(pos);
  const invariant=/\b(?:adverb|adv|interjection|interj|нареч|междомет)\b/i.test(pos);
  if(!noun&&!invariant)return null;
  if(noun&&(!/^[а-яё]+$/u.test(translation)||!/^[a-zæøå]+$/iu.test(no)))return null;
  if(invariant&&(!/^[a-zæøå]+(?:\s+[a-zæøå]+){0,2}$/iu.test(no)))return null;
  // RU noun endings in obvious declined forms aren't safe to map by lemmas.
  if(noun&&/(?:а|я|ы|и|е|у|ю|ом|ем|ами|ями|ах|ях)$/u.test(translation)&&
     !/^(?:семья|работа|школа|книга|машина|вода|еда|неделя|улица|квартира)$/u.test(translation)){
   // Nominative words ending in these letters can of course be valid; use only
   // the fixed vetted set for them.
   return null;
  }
  return {ru:translation,no,translation,lemma:raw,source:'dictionary'};
 }
 // An individual word's difficulty comes from this account's own scored
 // recalls and lookups. Passive appearances never increase mastery.
 function difficulty(item){
  const d=item?.dictionary||{},r=item?.srs||{},state=getState(),key=item?.key||'';
  const wrong=Math.max(0,Number(d.wrong)||0),right=Math.max(0,Number(d.correct)||0);
  const peeks=Math.max(0,Number(d.bridgeLookups)||0),strength=Number(d.strength);
  const due=(Number(d.nextDue)||Number(r.due)||Infinity)<=Date.now()||!!state?.wordPracticeQueue?.[key];
  const stage=Math.max(0,Number(r.stage)||0);
  return Math.min(115,Math.round(
   Math.min(45,wrong*12)+Math.min(30,peeks*9)+(due?17:0)+
   (Number.isFinite(strength)?Math.max(0,65-strength)*.22:0)+
   Math.max(0,3-stage)*3+Math.max(0,wrong-right)*4));
 }
 // Even a learner with no mastered vocabulary receives a few level-matched
 // Norwegian words DIRECTLY in the lesson instructions. Never grant mastery
 // from their appearance or from a translation peek.
 function levelEntries(level=lessonLevel()){
  const levels=['A1','A2','B1','B2'];
  const max=levels.indexOf(level);
  const map=new Map();
  for(const band of levels.slice(0,max>=0?max+1:1)){
   for(const [ru,no,lemma,priority,study] of LEVEL_WORDS[band]){
    const key=normRu(ru);
    if(!map.has(key))map.set(key,{
     ru,no,lemma,translation:ru,study,priority,source:'level',level:band
    });
   }
  }
  return [...map.values()];
 }
 // Separate learned words eligible for language mixing from the weaker words
 // included in Norwegian practice. Never mislabel an unseen lookup as learned.
 function personalFocus(limit=12){
  const state=getState(),map=new Map();
  for(const [source,items] of [['dictionary',Object.values(state?.dailyDictionary||{})],['srs',Object.values(state?.srs||{})]]){
   for(const item of items){
    const key=normNo(item?.lemma||item?.word);if(!key)continue;
    map.set(key,{key,...map.get(key),[source]:item});
   }
  }
  const rows=[...map.values()].filter(x=>
   (Number(x.dictionary?.exposures)>=2||Number(x.srs?.seen)>=2||
    Number(x.dictionary?.bridgeLookups)>0||Number(x.dictionary?.wrong)>0)
   &&/^[a-zæøå]+(?:[\s'-][a-zæøå]+)*$/iu.test(String(x.dictionary?.lemma||x.srs?.word||'')))
   .map(x=>({lemma:String(x.dictionary?.lemma||x.srs?.word||'').slice(0,55),
      translation:String(x.dictionary?.translation_ru||x.srs?.translation||'').slice(0,75),
      difficulty:difficulty(x),mastered:isMastered(x.dictionary,x.srs)}))
   .filter(x=>x.translation&&x.lemma)
   .sort((a,b)=>b.difficulty-a.difficulty||a.lemma.localeCompare(b.lemma,'nb'));
  const size=Math.max(0,Math.min(18,Number(limit)||12));
  // A backlog of newly forgotten words must not crowd all mastered words out
  // of the language bridge. Reserve most slots for genuinely learned words.
  const familiar=rows.filter(x=>x.mastered),struggling=rows.filter(x=>!x.mastered);
  const selected=[...familiar.slice(0,Math.max(0,size-4)),...struggling.slice(0,Math.min(4,size))];
  const keys=new Set(selected.map(x=>normNo(x.lemma)));
  for(const x of rows){
   if(selected.length>=size)break;
   const key=normNo(x.lemma);
   if(!keys.has(key)){selected.push(x);keys.add(key)}
  }
  return selected.sort((a,b)=>b.difficulty-a.difficulty||a.lemma.localeCompare(b.lemma,'nb'));
 }
 function entries(){
  const known=knownWords(),allowed=new Set(known.map(x=>x.key)),byKey=new Map(known.map(x=>[x.key,x]));
  const list=TERMS.filter(x=>allowed.has(normNo(x.lemma))).map(x=>({...x,
   lemma:String(byKey.get(normNo(x.lemma))?.dictionary?.lemma||byKey.get(normNo(x.lemma))?.srs?.word||x.lemma),
   source:'fixed',priority:95+difficulty(byKey.get(normNo(x.lemma)))}));
  for(const phrase of PHRASES){
   if(phrase.pieces.every(p=>allowed.has(normNo(p[1])))){
    list.push({ru:phrase.ru,no:phrase.pieces.map(p=>p[0]).join(' '),pieces:phrase.pieces,
     translation:phrase.ru,lemma:phrase.pieces[0][1],source:'phrase',
     priority:95+Math.max(...phrase.pieces.map(p=>difficulty(byKey.get(normNo(p[1])))))});
   }
  }
  const russian=new Set(list.map(x=>normRu(x.ru)));
  for(const w of known){
   const term=dynamicTerm(w);
   if(term&&!russian.has(normRu(term.ru))){
    list.push({...term,priority:95+difficulty(w)});russian.add(normRu(term.ru));
   }
  }
  // Longest-first: "сегодня вечером" wins over "сегодня".
  return list.sort((a,b)=>b.ru.length-a.ru.length||a.ru.localeCompare(b.ru,'ru'));
 }
 const letter=c=>!!c&&/[\p{L}\p{M}]/u.test(c);
 function findNext(text,start,terms){
  const folded=text.toLocaleLowerCase('ru-RU');let best=null;
  for(const term of terms){
   let i=folded.indexOf(normRu(term.ru),start);
   while(i>=0){
    const end=i+term.ru.length;
    if(!letter(text[i-1])&&!letter(text[end])){
     if(!best||i<best.start||(i===best.start&&end>best.end))best={term,start:i,end};
     break;
    }
    i=folded.indexOf(normRu(term.ru),i+1);
   }
  }
  return best;
 }
 function segments(text,terms,limit){
  const max=Math.max(0,Math.min(18,Math.floor(Number(limit)||0))),out=[];
  if(!max||!terms.length)return[{text}];
  const lower=String(text).toLocaleLowerCase('ru-RU'),hits=[];
  for(const term of terms){
   const cost=term.pieces?.length||1;if(cost>max)continue;
   const token=normRu(term.ru);if(!token)continue;
   let from=0,seen=0;
   while(seen<7&&from<lower.length){
    const start=lower.indexOf(token,from);if(start<0)break;
    const end=start+term.ru.length;
    if(!letter(text[start-1])&&!letter(text[end])){
     hits.push({start,end,cost,term,score:Number(term.priority)||0});
     seen++;
    }
    from=start+Math.max(1,token.length);
   }
  }
  const selected=[],usage=new Map();let slots=max;
  // Prefer a weak, due, or repeatedly peeked word wherever it appears in the
  // sentence, not simply the first easy word. A complete phrase is atomic.
  hits.sort((a,b)=>(b.score+(b.cost>1?30:0))-(a.score+(a.cost>1?30:0))||
   a.start-b.start||b.cost-a.cost);
  for(const hit of hits){
   if(hit.cost>slots||selected.some(x=>hit.start<x.end&&hit.end>x.start))continue;
   const lemmas=hit.term.pieces?hit.term.pieces.map(x=>normNo(x[1])):[normNo(hit.term.lemma)];
   if(lemmas.some(k=>(usage.get(k)||0)>=2))continue;
   selected.push(hit);slots-=hit.cost;
   for(const k of lemmas)usage.set(k,(usage.get(k)||0)+1);
   if(!slots)break;
  }
  selected.sort((a,b)=>a.start-b.start);
  let from=0;
  for(const hit of selected){
   if(hit.start>from)out.push({text:text.slice(from,hit.start)});
   if(hit.term.pieces){
    hit.term.pieces.forEach(([no,lemma,ru],i)=>{
     if(i)out.push({text:' '});
     const upper=i===0&&/^[А-ЯЁ]/u.test(text[hit.start]);
     out.push({no:upper?no[0].toLocaleUpperCase('nb-NO')+no.slice(1):no,lemma,ru,source:ru,sourceType:hit.term.source});
    });
   }else{
    const upper=/^[А-ЯЁ]/u.test(text[hit.start]),no=hit.term.no;
    out.push({no:upper?no[0].toLocaleUpperCase('nb-NO')+no.slice(1):no,
     ru:hit.term.translation,lemma:hit.term.lemma||no,source:text.slice(hit.start,hit.end),sourceType:hit.term.source});
   }
   from=hit.end;
  }
  if(from<text.length)out.push({text:text.slice(from)});
  return out.length?out:[{text}];
 }
 function knownNorwegian(word){
  const key=normNo(word),state=getState();
  if(!key||!state)return null;
  const d=Object.values(state.dailyDictionary||{}).find(x=>normNo(x?.lemma||x?.word)===key);
  const r=Object.values(state.srs||{}).find(x=>normNo(x?.word)===key);
  if(!d&&!r)return null;
  const translation=String(d?.translation_ru||r?.translation||'').trim();
  return {lemma:d?.lemma||d?.word||r?.word||word,translation};
 }
 // A word tapped in source Norwegian text is a genuine study lookup. If it
 // was not previously in the dictionary, add an *unmastered* review entry.
 // Never award correctness, XP, stage or a level on a translation lookup.
 function tapGloss(detail){
  const clean=String(detail||'').replace(/\s+/g,' ').trim().slice(0,240);
  if(!clean)return '';
  const matched=clean.match(/(?:перевод(?:ится как)?|означает|значит|—|:)\s*[«"“]?([а-яё]+(?:[ -][а-яё]+){0,3})/iu);
  if(matched)return matched[1].trim().slice(0,85);
  if(/^[а-яё]+(?:[ -][а-яё]+){0,3}[.!?]?$/iu.test(clean))return clean.replace(/[.!?]$/,'');
  return '';
 }
 function queueNorwegianLookup(word,explanation=''){
  const state=getState(),source=String(word||'').trim();
  if(!state||!source||source.length>55||!/^[a-zæøå]+(?:[-’'][a-zæøå]+)*$/iu.test(source))return false;
  const known=knownNorwegian(source);
  if(known)return queueForgotten(known.lemma);
  const translation=tapGloss(explanation);
  if(!translation)return false; // Do not save a speculative or malformed gloss.
  const key=normNo(source),now=Date.now();
  state.dailyDictionary=state.dailyDictionary||{};
  state.srs=state.srs||{};
  const level=['A1','A2','B1','B2'].includes(state.level)?state.level:'A1';
  state.dailyDictionary[key]={lemma:source.toLocaleLowerCase('nb-NO'),translation_ru:translation,
   level,correct:0,wrong:0,exposures:1,strength:0,firstDate:new Date(now).toISOString().slice(0,10),
   nextDue:now,source:'bridge_lookup'};
  state.srs[key]={word:source.toLocaleLowerCase('nb-NO'),translation,level,stage:0,seen:1,correct:0,due:now};
  return queueForgotten(source);
 }
 // Record a CEFR-level word only when the learner actually taps it.
 // It enters SRS stage 0 but is NEVER marked correct or mastered.
 function queueLevelWord(no,ru){
  const row=levelEntries().find(x=>normNo(x.lemma)===normNo(no)&&normRu(x.translation)===normRu(ru));
  if(!row)return false;
  const state=getState(),key=normNo(row.lemma);
  if(!state||!key)return false;
  const already=Object.values(state.dailyDictionary||{}).some(x=>normNo(x?.lemma||x?.word)===key)
   ||Object.values(state.srs||{}).some(x=>normNo(x?.word)===key);
  if(!already){
   const now=Date.now();
   state.dailyDictionary=state.dailyDictionary||{};
   state.srs=state.srs||{};
   state.dailyDictionary[key]={
    lemma:row.lemma,translation_ru:row.study,level:lessonLevel(),
    correct:0,wrong:0,exposures:1,strength:0,
    firstDate:new Date(now).toISOString().slice(0,10),nextDue:now,
    source:'bridge_level_lookup'
   };
   state.srs[key]={word:row.lemma,translation:row.study,level:lessonLevel(),
    stage:0,seen:1,correct:0,due:now};
  }
  return queueForgotten(row.lemma);
 }
 function queueForgotten(no){
  const state=getState(),key=normNo(no),now=Date.now();
  if(!state||!key)return false;
  const dict=Object.values(state.dailyDictionary||{}).find(x=>normNo(x?.lemma||x?.word)===key);
  const review=Object.values(state.srs||{}).find(x=>normNo(x?.word)===key);
  if(!dict&&!review)return false;
  state.wordPracticeQueue=state.wordPracticeQueue||{};
  state.wordPracticeQueue[key]=now;
  if(dict){dict.nextDue=now;dict.lastBridgeLookup=new Date(now).toISOString();
   dict.bridgeLookups=(Number(dict.bridgeLookups)||0)+1;}
  if(review)review.due=now;
  state.learningV8=state.learningV8||{};
  const cutoff=now-7*86400000,prior=Array.isArray(state.learningV8.bridgeLookupEvents)?state.learningV8.bridgeLookupEvents:[];
  state.learningV8.bridgeLookupEvents=[...prior.filter(t=>Number.isFinite(t)&&t>=cutoff),now].slice(-30);
  window.saveState?.();return true;
 }
 const skipContext='form,details,button,a,input,textarea,select,[contenteditable],'+
  '.feedback,.prompt,.question,.quiz,.test,.exam,.applied-sheet,.applied-prompt,'+
  '.choice-list,.translation,.lesson-question,'+
  '.nq-decision-scene,.nq-choice,.lesson-choices,.daily-word-card,'+
  '[data-no-bridge],[lang="nb"],[lang="no"],[role="alert"]';
 function levelInstruction(block){
  return block.matches('[data-bridge-instruction],.dialogue-task-v83 p,.dialogue-scene-v83 p,.ne-coach-hint,.nq-nora-note');
 }
 function eligibleBlock(block){
  if(!block.closest('.shell,.shell-v7'))return false;
  const instruction=block.matches('[data-bridge-instruction],.dialogue-task-v83 p,.dialogue-scene-v83 p,.dialogue-task-v83 b,.dialogue-scene-v83 b,.dialogue-scene-v83 small');
  if(instruction){
   if(block.closest('form,details,button,a,[data-no-bridge],[data-bridge-exclude],.test,.exam,.quiz,.translation,.feedback,[lang="nb"],[lang="no"]'))return false;
  }else if(block.closest(skipContext))return false;
  if(block.closest('.lesson-exercise-v6,.exercise')&&!instruction&&!block.closest('.ne-lesson-coach'))return false;
  // Inline Norwegian translations have already been wrapped as word buttons.
  // They are not answer controls: keep converting surrounding Russian text.
  if(block.querySelector('button:not(.word-translate-v7),a,input,textarea,select,[contenteditable]'))return false;
  // Do not rewrite text already tagged as Norwegian or Russian translations of
  // graded Norwegian examples. Keep study directions stable.
  if(block.closest('[data-bridge-exclude]'))return false;
  if(block.closest('.ne-lesson-coach')&&block.closest('.ne-coach-result,.ne-coach-feedback'))return false;
  return true;
 }
 function apply(block,terms){
  if(processed.has(block)||!eligibleBlock(block))return;
  const text=block.textContent||'',level=lessonLevel();
  const floor=levelInstruction(block)?Math.min(
   ({A1:3,A2:4,B1:5,B2:6})[level]||3,
   Math.max(1,Math.ceil(text.trim().split(/\s+/).length/8))):0;
  const limit=Math.max(density(text),floor),nodes=[],walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const n=walker.currentNode,p=n.parentElement;
   if(p&&!p.closest('button,a,code,pre,kbd,[data-no-bridge],[lang="nb"],.ne-bridge-word'))nodes.push(n);
  }
  let used=0;
  for(const n of nodes){
   if(used>=limit)break;
   const parts=segments(n.nodeValue||'',terms,limit-used);
   if(!parts.some(x=>x.no))continue;
   const replacement=document.createDocumentFragment();
   // Store each original text node, preserving listeners on the already
   // installed Norwegian translation buttons when Språkbro is switched off.
   if(!processed.has(block))processed.set(block,[]);
   const host=document.createElement('span');host.className='ne-bridge-fragment';
   for(const part of parts){
    if(!part.no){replacement.appendChild(document.createTextNode(part.text));continue}
    const btn=document.createElement('button');btn.type='button';btn.className='ne-bridge-word';
    btn.lang='nb';btn.textContent=part.no;btn.dataset.neWord=part.lemma||part.no;
    btn.dataset.neTranslation=part.ru;
    if(part.sourceType==='level')btn.dataset.neIntro='true';
    btn.setAttribute('aria-label',part.no+' — показать перевод и повторить');
    btn.setAttribute('aria-expanded','false');replacement.appendChild(btn);used++;
   }
   host.appendChild(replacement);
   n.parentNode.replaceChild(host,n);
   processed.get(block).push([host,n]);
  }
 }
 const selectors='.shell p,.shell li,.shell-v7 p,.shell-v7 li,.shell-v7 .ne-coach-hint,.shell-v7 .nq-nora-note,.shell-v7 .nq-nora-reaction p,.dialogue-task-v83 b,.dialogue-scene-v83 b,.dialogue-scene-v83 small,[data-bridge-instruction]';
 function process(){
  if(busy||!root||!enabled())return;
  const mastered=entries(),starters=levelEntries();
  if(!mastered.length&&!starters.length)return;
  const seen=new Set(mastered.map(x=>normRu(x.ru)));
  const instructionTerms=[...mastered,...starters.filter(x=>!seen.has(normRu(x.ru)))];
  busy=true;try{
   for(const block of root.querySelectorAll(selectors)){
    apply(block,levelInstruction(block)?instructionTerms:mastered);
   }
  }
  finally{busy=false}
 }
 function restore(){
  if(!root)return;
  for(const block of root.querySelectorAll(selectors)){
   const originals=processed.get(block);
   if(originals){
    for(const [wrapper,textNode] of originals){
     if(wrapper.parentNode)wrapper.parentNode.replaceChild(textNode,wrapper);
    }
    processed.delete(block);
   }
  }
 }
 function toggle(){
  const s=getState();if(!s)return;
  s.learningV8=s.learningV8||{};s.learningV8.languageBridgeEnabled=!enabled();
  window.saveState?.();
  if(enabled())process();else restore();
  const button=document.getElementById('neLanguageBridgeToggle');
  if(button){
   button.textContent=enabled()?'Выключить языковой мост':'Включить языковой мост';
   button.setAttribute('aria-pressed',String(enabled()));
  }
 }
 // Entire natural Bokmål classroom directions, not a grammatically broken
 // sentence assembled from independent substitutions.
 const DIRECTIONS=Object.freeze({
  dialogue:['Les situasjonen. Svar på norsk.','Прочитай ситуацию. Ответь по-норвежски.'],
  vocabulary:['Husk ordet. Skriv svaret på norsk.','Вспомни слово. Напиши ответ по-норвежски.'],
  grammar:['Les oppgaven. Velg riktig svar.','Прочитай задание. Выбери правильный ответ.'],
  listening:['Lytt til opptaket. Velg riktig svar.','Послушай запись. Выбери правильный ответ.'],
  reading:['Les teksten. Velg riktig svar.','Прочитай текст. Выбери правильный ответ.'],
  writing:['Skriv et svar med egne ord.','Напиши ответ своими словами.'],
  speaking:['Svar høyt på norsk.','Ответь вслух по-норвежски.']
 });
 function taskDirection(kind,level=lessonLevel()){
  const row=DIRECTIONS[kind];if(!row)return '';
  const a1=level==='A1';
  // Russian assistance is immediate for A1 and on-demand thereafter.
  // Tapping an unfamiliar Norwegian word is handled by word-translate-v7,
  // which schedules unmastered lookups through queueNorwegianLookup().
  return '<div class="ne-task-direction">'+
   '<p lang="nb" class="ne-task-direction-no">'+esc(row[0])+'</p>'+
   (a1?'<p lang="ru" class="ne-task-direction-ru">'+esc(row[1])+'</p>':
    '<details><summary>Русское пояснение</summary><p lang="ru">'+esc(row[1])+'</p></details>')+
   '</div>';
 }



 // A word's confidence is based on independent recall, never a self-declared level.
 // Private word checks belong to this learner state and do not grant XP or CEFR mastery.
 const DAY_MS=86400000;
 function selfChecks(create=false){
  const s=getState();
  if(!s)return {};
  if(create){
   s.learningV8=s.learningV8&&typeof s.learningV8==='object'?s.learningV8:{};
   if(!s.learningV8.wordSelfChecks||typeof s.learningV8.wordSelfChecks!=='object'||
      Array.isArray(s.learningV8.wordSelfChecks))s.learningV8.wordSelfChecks={};
  }
  return s.learningV8?.wordSelfChecks||{};
 }
 function wordKnowledge(raw){
  const s=getState()||{},lemma=normNo(raw),self=selfChecks()[lemma];
  const dict=Object.values(s.dailyDictionary||{}).find(x=>normNo(x?.lemma||x?.word)===lemma);
  const review=Object.values(s.srs||{}).find(x=>normNo(x?.word)===lemma);
  const right=Math.max(0,Number(dict?.correct)||0,Number(review?.correct)||0);
  const wrong=Math.max(0,Number(dict?.wrong)||0);
  const due=!!s.wordPracticeQueue?.[lemma]||
   (Number.isFinite(Number(dict?.nextDue))&&Number(dict.nextDue)>0&&Number(dict.nextDue)<=Date.now())||
   (Number.isFinite(Number(review?.due))&&Number(review.due)>0&&Number(review.due)<=Date.now())||
   (Number.isFinite(Number(self?.nextDue))&&Number(self.nextDue)>0&&Number(self.nextDue)<=Date.now());
  if(due||wrong>right)return {kind:'review',label:'Нужно повторить',lemma};
  if(right>=2&&Number(dict?.exposures)>=2&&wrong<right)return {kind:'familiar',label:'Знакомое слово',lemma};
  if(self?.status==='recall_ok')return {kind:'learning',label:'Проверим позже',lemma};
  if(right>0||wrong>0||dict||review||self)return {kind:'learning',label:'Ещё изучаем',lemma};
  return {kind:'new',label:'Новое слово',lemma};
 }
 function studyWord(word,translation){
  const lemma=normNo(word);
  if(!lemma||!/^[a-zæøå]+(?:[\s'-][a-zæøå]+)*$/iu.test(lemma)||
     !translation||!/[\u0400-\u04FF]/u.test(translation))return false;
  return true;
 }
 function pendingLessonWord(word,translation){
  const lemma=normNo(word),session=window.neLessonSession?.lesson;
  const inLesson=(Array.isArray(session?.vocab)?session.vocab:[])
   .some(x=>Array.isArray(x)&&normNo(x[0])===lemma&&String(x[1]||'').trim()===translation);
  const previous=selfChecks()[lemma];
  const delayed=previous&&normNo(previous.word)===lemma&&previous.translation===translation&&
   Number(previous.nextDue)>0&&Number(previous.nextDue)<=Date.now();
  return studyWord(word,translation)&&!!(inLesson||delayed);
 }
 function schedulePersonalWord(word,translation,dueAt,immediately=false){
  const state=getState(),key=normNo(word);
  if(!state||!studyWord(word,translation)||!Number.isFinite(dueAt))return false;
  state.dailyDictionary=state.dailyDictionary||{};
  state.srs=state.srs||{};
  const now=Date.now();
  let dictionary=Object.values(state.dailyDictionary)
   .find(x=>normNo(x?.lemma||x?.word)===key);
  if(!dictionary){
   dictionary=state.dailyDictionary[key]={lemma:word,translation_ru:translation,
    level:lessonLevel(),correct:0,wrong:0,exposures:1,strength:0,
    firstDate:new Date(now).toISOString().slice(0,10),source:'personal_word_check'};
  }
  const prevDue=Number(dictionary.nextDue);
  dictionary.nextDue=prevDue>Date.now() ? Math.min(prevDue,dueAt) : dueAt;
  let srs=Object.values(state.srs).find(x=>normNo(x?.word)===key);
  if(!srs)srs=state.srs[key]={word,translation,level:lessonLevel(),stage:0,seen:1,correct:0};
  const oldDue=Number(srs.due);
  srs.due=oldDue>Date.now() ? Math.min(oldDue,dueAt) : dueAt;
  if(immediately){
   state.wordPracticeQueue=state.wordPracticeQueue||{};
   state.wordPracticeQueue[key]=now;
  }
  return true;
 }
 function lessonWordReminder(lesson){
  if(!lesson||!enabled())return '';
  const vocab=Array.isArray(lesson.vocab)?lesson.vocab:[],words=[],seen=new Set();
  const add=(wordRaw,translationRaw)=>{
   const word=String(wordRaw||'').trim().slice(0,65),translation=String(translationRaw||'').trim().slice(0,100);
   const lemma=normNo(word);
   if(!studyWord(word,translation)||seen.has(lemma))return;
   seen.add(lemma);words.push({word,translation,...wordKnowledge(word)});
  };
  for(const pair of vocab)if(Array.isArray(pair)&&pair.length>=2)add(pair[0],pair[1]);
  const today=Date.now();
  const overdue=Object.values(selfChecks()).filter(x=>x&&x.word&&x.translation&&
   Number(x.nextDue)>0&&Number(x.nextDue)<=today)
   .sort((a,b)=>Number(a.nextDue)-Number(b.nextDue));
  // The first reminder can revisit a previously checked word even on another topic.
  if(overdue.length)add(overdue[0].word,overdue[0].translation);
  if(!words.length)return '';
  const weight={review:0,learning:1,new:2,familiar:3};
  words.sort((a,b)=>weight[a.kind]-weight[b.kind]);
  const choice=words.slice(0,3),dueWord=overdue[0];
  if(dueWord&&!choice.some(x=>normNo(x.word)===normNo(dueWord.word))){
   const due=words.find(x=>normNo(x.word)===normNo(dueWord.word));
   if(due&&choice.length===3)choice[2]=due;
  }else if(!choice.some(x=>x.kind==='familiar')){
   const familiar=words.find(x=>x.kind==='familiar');
   if(familiar&&choice.length===3)choice[2]=familiar;
  }
  const unique=[...new Map(choice.map(x=>[normNo(x.word),x])).values()];
  return '<div class="notice ne-task-vocabulary" data-no-bridge style="margin-top:12px">'+
   '<small class="muted">Слова для этой ситуации и повторения. Нажми слово, чтобы проверить, знаешь ли его.</small>'+
   '<div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap">'+
   unique.map(x=>'<button type="button" class="btn secondary" style="font-size:.89rem;padding:7px 10px" '+
    'data-ne-lesson-word="'+esc(x.word)+'" data-ne-lesson-ru="'+esc(x.translation)+'" '+
    'onclick="NELanguageBridge.explainLessonWord(this)"><span lang="nb">'+esc(x.word)+
    '</span> <small>· '+esc(x.label)+'</small></button>').join('')+
   '</div><div class="ne-task-word-explanation" role="status" aria-live="polite"></div></div>';
 }
 function explainLessonWord(button){
  if(!button||!button.closest)return false;
  const box=button.closest('.ne-task-vocabulary'),lesson=window.neLessonSession?.lesson;
  const word=String(button.dataset.neLessonWord||''),ru=String(button.dataset.neLessonRu||'');
  if(!box||!lesson||!pendingLessonWord(word,ru))return false;
  const target=box.querySelector('.ne-task-word-explanation');
  if(!target)return false;
  target.dataset.word=word;target.dataset.translation=ru;
  target.innerHTML='<p style="margin:12px 0 8px"><b lang="nb">'+esc(word)+
   '</b> — насколько хорошо ты помнишь это слово?</p>'+
   '<div class="row" style="gap:6px;flex-wrap:wrap">'+
   '<button class="btn secondary" type="button" onclick="NELanguageBridge.chooseWordKnowledge(this,\'known\')">Знаю</button>'+
   '<button class="btn secondary" type="button" onclick="NELanguageBridge.chooseWordKnowledge(this,\'unsure\')">Не уверен</button>'+
   '<button class="btn secondary" type="button" onclick="NELanguageBridge.chooseWordKnowledge(this,\'unknown\')">Не знаю</button></div>';
  return true;
 }
 function wordFeedback(word,ru,level){
  const forms=window.NECardGrammar?.describe?.({word,translation:ru});
  const details=forms?.verified&&Array.isArray(forms.forms)?forms.forms.slice(0,4)
   .filter(x=>x&&x.form&&x.label).map(x=>esc(x.label)+': '+esc(x.form)).join(' · '):'';
  const example=forms?.verified&&forms.example?.no?
   '<p><span lang="nb">'+esc(forms.example.no)+'</span>'+
    (forms.example.ru?' — '+esc(forms.example.ru):'')+'</p>':'';
  return '<p><b lang="nb">'+esc(word)+'</b> — '+esc(ru)+'</p>'+
   (details?'<p><small>Формы: '+details+'</small></p>':'')+example+
   '<p class="muted">'+(level==='unknown'?
    'Это слово ещё не проверено. Сначала запомни значение, затем используй его в собственном предложении.':
    level==='unsure'?'Это нормально: проверь значение и потренируй слово в другой ситуации.':
    'Слово вернётся в задания после паузы. Сам просмотр перевода не считается освоением.')+'</p>';
 }
 function chooseWordKnowledge(button,choice){
  const target=button?.closest?.('.ne-task-word-explanation');
  const word=String(target?.dataset.word||''),ru=String(target?.dataset.translation||'');
  if(!target||!['known','unsure','unknown'].includes(choice)||!pendingLessonWord(word,ru))return false;
  const now=Date.now(),key=normNo(word),checks=selfChecks(true);
  const p=checks[key]&&typeof checks[key]==='object'?checks[key]:{};
  Object.assign(p,{word,translation:ru,choice,choiceAt:now});
  checks[key]=p;
  if(choice==='known'){
   p.status='awaiting_recall';
   window.saveState?.();
   target.innerHTML='<p><b lang="nb">'+esc(word)+'</b></p>'+
    '<label class="field-label" for="neWordRecall">Напиши значение по-русски без подсказки:</label>'+
    '<input id="neWordRecall" class="input" maxlength="120" lang="ru" autocomplete="off" placeholder="Твой ответ">'+
    '<button type="button" class="btn" style="margin-top:8px" onclick="NELanguageBridge.checkWordRecall(this)">Проверить перевод</button>'+
    '<p class="muted">Этот ответ проверяет только значение. Для полного освоения Нора ещё проверит употребление и повторение.</p>';
   target.querySelector('input')?.focus?.();
   return true;
  }
  p.status='needs_practice';p.nextDue=now;
  schedulePersonalWord(word,ru,now,true);
  window.saveState?.();
  target.innerHTML=wordFeedback(word,ru,choice)+
   '<p><small>Добавлено в повторение. Баллы и уровень не изменены.</small></p>';
  return true;
 }
 function checkWordRecall(button){
  const target=button?.closest?.('.ne-task-word-explanation');
  const word=String(target?.dataset.word||''),ru=String(target?.dataset.translation||'');
  const input=target?.querySelector('input'),answer=String(input?.value||'').trim();
  if(!target||!input||!answer||!pendingLessonWord(word,ru))return false;
  const checker=window.NELivingWords?.acceptedTranslation;
  // Offline fallback accepts only explicit meanings, not guessed semantic synonyms.
  const norm=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('ru-RU')
   .replace(/ё/g,'е').replace(/[«»“”"'.!?]/g,' ').replace(/\s+/g,' ').trim();
  const accepted=typeof checker==='function'?checker(answer,ru,word):
   ru.split(/\s*(?:\/|;|\||,|\s+или\s+)\s*/i).some(x=>norm(x)===norm(answer));
  const now=Date.now(),key=normNo(word),checks=selfChecks(true);
  const p=checks[key];
  if(!p||p.status!=='awaiting_recall')return false;
  if(accepted){
   const delayed=Number(p.nextDue)>0&&p.nextDue<=now&&
    Number(p.lastRecallAt)>0&&now-Number(p.lastRecallAt)>=DAY_MS*.75;
   p.recallPasses=(Number(p.recallPasses)||0)+1;
   if(delayed)p.delayedPasses=Math.min(12,(Number(p.delayedPasses)||0)+1);
   p.lastRecallAt=now;p.status='recall_ok';
   const delay=[1,3,7,14,30][Math.min(4,Number(p.delayedPasses)||0)];
   p.nextDue=now+delay*DAY_MS;
   schedulePersonalWord(word,ru,p.nextDue,false);
   window.saveState?.();
   target.innerHTML='<p><b>Перевод вспомнил правильно.</b> '+esc(word)+
    ' — '+esc(ru)+'</p><p class="muted">'+
    (delayed?'Слово подтверждено после паузы.':'Это первая проверка, а не доказательство полного знания.')+
    ' Следующая проверка перевода запланирована через '+delay+' дн. '+
    'Поупражняйся также в составлении предложений с этим словом.</p>';
   return true;
  }
  p.status='needs_practice';p.recallMisses=(Number(p.recallMisses)||0)+1;
  p.nextDue=now;
  schedulePersonalWord(word,ru,now,true);
  window.saveState?.();
  target.innerHTML='<p><b>Пока не вспомнил перевод.</b> Правильный вариант:</p>'+
   wordFeedback(word,ru,'review')+
   '<p class="muted">Ответ не засчитан. Слово добавлено в повторение.</p>';
  return false;
 }

 function controlHtml(){
  const known=knownWords().length,covered=entries().length,on=enabled();
  return '<section class="card ne-bridge-settings" data-no-bridge>'+
   '<h3>Språkbro 2.6 · Языковой мост</h3>'+
   '<p>Слова соответствующего уровня A1–B2 появляются прямо в инструкциях, даже если ещё не выучены. Нажми слово для русского перевода и добавления в повторение; личные трудные слова возвращаются чаще. Контрольные тесты не изменяются.</p>'+
   '<p class="muted">Подтверждено слов: <b>'+known+'</b>. Освоенных замен: <b>'+covered+'</b>. Слов для текущего уровня: <b>'+levelEntries().length+'</b>. Уровень: <b>'+esc(getState()?.level||'A1')+'</b>. '+
   (covered?'Замены появляются там, где встречается подходящее русское слово.':'По мере закрепления слов доступные замены появятся автоматически.')+'</p>'+
   '<button id="neLanguageBridgeToggle" type="button" class="btn secondary" aria-pressed="'+on+'" onclick="NELanguageBridge.toggle()">'+
   (on?'Выключить языковой мост':'Включить языковой мост')+'</button></section>';
 }
 function onClick(event){
  const button=event.target?.closest?.('.ne-bridge-word');
  if(!button||!root?.contains(button))return;
  const wasOpen=button.getAttribute('aria-expanded')==='true';
  for(const current of root.querySelectorAll('.ne-bridge-word[aria-expanded="true"]')){
   current.setAttribute('aria-expanded','false');
   if(current.nextElementSibling?.classList.contains('ne-bridge-gloss'))current.nextElementSibling.remove();
  }
  if(wasOpen)return;
  const queued=button.dataset.neIntro==='true'?
   queueLevelWord(button.dataset.neWord,button.dataset.neTranslation):queueForgotten(button.dataset.neWord);
  const gloss=document.createElement('span');gloss.className='ne-bridge-gloss';
  gloss.setAttribute('role','status');gloss.lang='ru';
  gloss.textContent=(button.dataset.neWord!==button.textContent?button.dataset.neWord+' — ':'')+
   button.dataset.neTranslation+(queued?' · добавлено в повторение':'');
  button.insertAdjacentElement('afterend',gloss);
  button.setAttribute('aria-expanded','true');
 }
 function mount(){
  root=document.getElementById('app');
  if(!root||typeof MutationObserver!=='function')return;
  root.addEventListener('click',onClick);
  observer=new MutationObserver(()=>process());observer.observe(root,{subtree:true,childList:true});
  process();
 }
 window.NELanguageBridge=Object.freeze({controlHtml,toggle,process,segments,queueForgotten,
  entries,knownWords,extractTranslation,dynamicTerm,isMastered,density,recentPeeks,eligibleBlock,
  knownNorwegian,queueNorwegianLookup,tapGloss,personalFocus,difficulty,levelEntries,queueLevelWord,taskDirection,wordKnowledge,lessonWordReminder,explainLessonWord,chooseWordKnowledge,checkWordRecall});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();