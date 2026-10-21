/* Norsk Eventyr · carefully authored Bokmål paradigms for introductory cards.
   No general suffix guessing: irregular nouns/verbs require explicit paradigms.
   For unknown lexical entries link to the normative dictionary rather than invent forms.
   Bokmålsordboka: Universitetet i Bergen / Språkrådet, ordbøkene.no.
*/
(function(){
'use strict';
const noun={
 'bil':['en','bilen','biler','bilene','Jeg har en bil.','У меня есть машина.'],
 'hus':['et','huset','hus','husene','Jeg bor i et hus.','Я живу в доме.'],
 'bok':['en','boken','bøker','bøkene','Jeg leser en bok.','Я читаю книгу.'],
 'jobb':['en','jobben','jobber','jobbene','Jeg har en jobb.','У меня есть работа.'],
 'nøkkel':['en','nøkkelen','nøkler','nøklene','Hvor er nøkkelen?','Где ключ?'],
 'time':['en','timen','timer','timene','Vi har en time.','У нас есть один час.'],
 'oppgave':['en','oppgaven','oppgaver','oppgavene','Jeg gjør en oppgave.','Я выполняю задание.'],
 'pause':['en','pausen','pauser','pausene','Vi tar en pause.','Мы делаем перерыв.'],
 'faktura':['en','fakturaen','fakturaer','fakturaene','Jeg har fått en faktura.','Я получил счёт.'],
 'brød':['et','brødet','brød','brødene','Jeg kjøper et brød.','Я покупаю хлеб.'],
 'møte':['et','møtet','møter','møtene','Jeg skal på et møte.','Я иду на встречу.'],
 'avtale':['en','avtalen','avtaler','avtalene','Vi har en avtale.','У нас есть договорённость.'],
 'beskjed':['en','beskjeden','beskjeder','beskjedene','Jeg fikk en beskjed.','Я получил сообщение.'],
 'erfaring':['en','erfaringen','erfaringer','erfaringene','Jeg har erfaring.','У меня есть опыт.'],
 'misforståelse':['en','misforståelsen','misforståelser','misforståelsene','Det var en misforståelse.','Это было недоразумение.'],
 'søknad':['en','søknaden','søknader','søknadene','Jeg skriver en søknad.','Я пишу заявление.'],
 'vedtak':['et','vedtaket','vedtak','vedtakene','Jeg har fått et vedtak.','Я получил решение.'],
 'spørsmål':['et','spørsmålet','spørsmål','spørsmålene','Jeg har et spørsmål.','У меня есть вопрос.'],
 'målgruppe':['en','målgruppen','målgrupper','målgruppene','Dette er målgruppen.','Это целевая группа.'],
 'avveining':['en','avveiningen','avveininger','avveiningene','Vi må gjøre en avveining.','Нам нужно взвесить варианты.'],
 'forbehold':['et','forbeholdet','forbehold','forbeholdene','Det er et forbehold.','Есть оговорка.'],
 'rapport':['en','rapporten','rapporter','rapportene','Hun skriver en rapport.','Она пишет отчёт.'],
 'eple':['et','eplet','epler','eplene','Jeg spiser et eple.','Я ем яблоко.'],
 'dag':['en','dagen','dager','dagene','Ha en fin dag!','Хорошего дня!'],
 'uke':['en','uken','uker','ukene','Jeg jobber denne uken.','Я работаю на этой неделе.'],
 'år':['et','året','år','årene','Jeg har bodd her i et år.','Я живу здесь один год.'],
 'butikk':['en','butikken','butikker','butikkene','Jeg går i butikken.','Я иду в магазин.'],
 'rom':['et','rommet','rom','rommene','Rommet er stort.','Комната большая.'],
 'ord':['et','ordet','ord','ordene','Jeg lærer et nytt ord.','Я учу новое слово.'],
 'barn':['et','barnet','barn','barna','Barnet er hjemme.','Ребёнок дома.'],
 'jente':['ei','jenta','jenter','jentene','Jenta går på skolen.','Девочка ходит в школу.'],
 'skole':['en','skolen','skoler','skolene','Jeg går på skolen.','Я хожу в школу.'],
 'venn':['en','vennen','venner','vennene','Han er en venn.','Он друг.'],
 'klokke':['ei','klokka','klokker','klokkene','Klokka er tre.','Сейчас три часа.']
};
// Manually reviewed noun glosses. Russian demonstratives explain definiteness
// but are NOT obligatory literal translations of Norwegian definite forms.
const nounRussianTranslations=Object.freeze({
 'bil':["машина","эта машина","машины","эти машины"],
 'hus':["дом","этот дом","дома","эти дома"],
 'bok':["книга","эта книга","книги","эти книги"],
 'jobb':["работа","эта работа","работы","эти работы"],
 'nøkkel':["ключ","этот ключ","ключи","эти ключи"],
 'time':["час / урок","этот час / этот урок","часы / уроки","эти часы / эти уроки"],
 'oppgave':["задание","это задание","задания","эти задания"],
 'pause':["перерыв","этот перерыв","перерывы","эти перерывы"],
 'faktura':["счёт на оплату","этот счёт на оплату","счета на оплату","эти счета на оплату"],
 'brød':["хлеб / буханка хлеба","этот хлеб / эта буханка","буханки хлеба","эти буханки хлеба"],
 'møte':["встреча / собрание","эта встреча / это собрание","встречи / собрания","эти встречи / эти собрания"],
 'avtale':["договорённость / встреча","эта договорённость / встреча","договорённости / встречи","эти договорённости / встречи"],
 'beskjed':["сообщение","это сообщение","сообщения","эти сообщения"],
 'erfaring':["опыт / случай","этот опыт / случай","случаи из опыта","эти случаи из опыта"],
 'misforståelse':["недоразумение","это недоразумение","недоразумения","эти недоразумения"],
 'søknad':["заявление / заявка","это заявление / эта заявка","заявления / заявки","эти заявления / заявки"],
 'vedtak':["официальное решение","это официальное решение","официальные решения","эти официальные решения"],
 'spørsmål':["вопрос","этот вопрос","вопросы","эти вопросы"],
 'målgruppe':["целевая группа","эта целевая группа","целевые группы","эти целевые группы"],
 'avveining':["сопоставление вариантов","это сопоставление вариантов","сопоставления вариантов","эти сопоставления вариантов"],
 'forbehold':["оговорка / условие","эта оговорка / это условие","оговорки / условия","эти оговорки / условия"],
 'rapport':["отчёт","этот отчёт","отчёты","эти отчёты"],
 'eple':["яблоко","это яблоко","яблоки","эти яблоки"],
 'dag':["день","этот день","дни","эти дни"],
 'uke':["неделя","эта неделя","недели","эти недели"],
 'år':["год","этот год","годы","эти годы"],
 'butikk':["магазин","этот магазин","магазины","эти магазины"],
 'rom':["комната / помещение","эта комната / это помещение","комнаты / помещения","эти комнаты / помещения"],
 'ord':["слово","это слово","слова","эти слова"],
 'barn':["ребёнок","этот ребёнок","дети","эти дети"],
 'jente':["девочка","эта девочка","девочки","эти девочки"],
 'skole':["школа","эта школа","школы","эти школы"],
 'venn':["друг","этот друг","друзья","эти друзья"],
 'klokke':["часы (одни)","эти часы (одни, конкретные)","часы (несколько)","эти часы (несколько конкретных)"],
});
const verb={
 'være':['er','var','vært','Jeg er hjemme.','Я дома.'],
 'kunne':['kan','kunne','kunnet','Jeg kan hjelpe deg.','Я могу тебе помочь.'],
 'skulle':['skal','skulle','skullet','Jeg skulle ringe deg.','Я собирался тебе позвонить.'],
 'ha':['har','hadde','hatt','Jeg har en bok.','У меня есть книга.'],
 'gjøre':['gjør','gjorde','gjort','Jeg gjør en oppgave.','Я выполняю задание.'],
 'gå':['går','gikk','gått','Jeg går på jobb.','Я иду на работу.'],
 'komme':['kommer','kom','kommet','Jeg kommer i morgen.','Я приду завтра.'],
 'bo':['bor','bodde','bodd','Jeg bor i Norge.','Я живу в Норвегии.'],
 'lære':['lærer','lærte','lært','Jeg lærer norsk.','Я учу норвежский.'],
 'jobbe':['jobber','jobbet','jobbet','Jeg jobber i dag.','Сегодня я работаю.'],
 'snakke':['snakker','snakket','snakket','Jeg snakker norsk.','Я говорю по-норвежски.'],
 'spørre':['spør','spurte','spurt','Jeg spør læreren.','Я спрашиваю учителя.'],
 'svare':['svarer','svarte','svart','Jeg svarer på spørsmålet.','Я отвечаю на вопрос.'],
 'skrive':['skriver','skrev','skrevet','Jeg skriver en melding.','Я пишу сообщение.'],
 'lese':['leser','leste','lest','Jeg leser teksten.','Я читаю текст.'],
 'se':['ser','så','sett','Jeg ser en bil.','Я вижу машину.'],
 'ta':['tar','tok','tatt','Jeg tar en pause.','Я делаю перерыв.'],
 'få':['får','fikk','fått','Jeg får en beskjed.','Я получаю сообщение.'],
 'spise':['spiser','spiste','spist','Jeg spiser et eple.','Я ем яблоко.'],
 'drikke':['drikker','drakk','drukket','Jeg drikker vann.','Я пью воду.'],
 'kjøpe':['kjøper','kjøpte','kjøpt','Jeg kjøper mat.','Я покупаю еду.'],
 'velge':['velger','valgte','valgt','Jeg velger dette.','Я выбираю это.'],
 'legge':['legger','la','lagt','Jeg legger nøkkelen her.','Я кладу ключ сюда.'],
 'ligge':['ligger','lå','ligget','Nøkkelen ligger her.','Ключ лежит здесь.'],
 'forstå':['forstår','forstod','forstått','Jeg forstår deg.','Я тебя понимаю.'],
 'finne':['finner','fant','funnet','Jeg finner nøkkelen.','Я нахожу ключ.'],
 'sende':['sender','sendte','sendt','Jeg sender en e-post.','Я отправляю письмо.'],
 'besøke':['besøker','besøkte','besøkt','Jeg besøker en venn.','Я навещаю друга.'],
 'vente':['venter','ventet','ventet','Jeg venter på bussen.','Я жду автобус.'],
 'begynne':['begynner','begynte','begynt','Jeg begynner på jobb.','Я приступаю к работе.'],
 'slutte':['slutter','sluttet','sluttet','Jeg slutter klokka fire.','Я заканчиваю в четыре.'],
 'logge inn':['logger inn','logget inn','logget inn','Jeg logger inn nå.','Сейчас я вхожу в систему.'],
 'ordne opp':['ordner opp','ordnet opp','ordnet opp','Vi ordner opp i dette.','Мы разберёмся с этим.'],
 'rekke':['rekker','rakk','rukket','Jeg rekker bussen.','Я успеваю на автобус.'],
 'oppdage':['oppdager','oppdaget','oppdaget','Jeg oppdager en feil.','Я обнаруживаю ошибку.'],
 'beklage':['beklager','beklaget','beklaget','Jeg beklager feilen.','Я извиняюсь за ошибку.'],
 'foretrekke':['foretrekker','foretrakk','foretrukket','Jeg foretrekker te.','Я предпочитаю чай.'],
 'vaske':['vasker','vasket','vasket','Jeg vasker gulvet.','Я мою пол.'],
 'rengjøre':['rengjør','rengjorde','rengjort','Jeg rengjør rommet.','Я убираю комнату.'],
 'hente':['henter','hentet','hentet','Jeg henter barna.','Я забираю детей.'],
 'åpne':['åpner','åpnet','åpnet','Jeg åpner døren.','Я открываю дверь.']
};
const adjective={
 'stor':['stort','store','større','størst','Et stort hus.','Большой дом.'],
 'liten':['lite','små','mindre','minst','Et lite hus.','Маленький дом.'],
 'god':['godt','gode','bedre','best','God mat.','Хорошая еда.'],
 'ny':['nytt','nye','nyere','nyest','En ny jobb.','Новая работа.'],
 'viktig':['viktig','viktige','viktigere','viktigst','Et viktig spørsmål.','Важный вопрос.'],
 'lang':['langt','lange','lengre','lengst','En lang dag.','Долгий день.'],
 'kort':['kort','korte','kortere','kortest','Et kort svar.','Короткий ответ.'],
 'gammel':['gammelt','gamle','eldre','eldst','Et gammelt hus.','Старый дом.'],
 'fin':['fint','fine','finere','finest','En fin dag.','Хороший день.'],
 'dyr':['dyrt','dyre','dyrere','dyrest','Et dyrt hus.','Дорогой дом.'],
 'billig':['billig','billige','billigere','billigst','En billig bil.','Дешёвая машина.'],
 'rask':['raskt','raske','raskere','raskest','Et raskt svar.','Быстрый ответ.'],
 'forsinket':['forsinket','forsinkede','mer forsinket','mest forsinket','Bussen er forsinket.','Автобус опаздывает.']
};
const verbRussianTranslations=Object.freeze({
 "være": [
  "быть",
  "есть / являюсь / нахожусь",
  "был / была",
  "был / была (к настоящему)",
  "буду / буду находиться"
 ],
 "kunne": [
  "мочь / уметь",
  "могу / умею",
  "мог / могла; мог(ла) бы",
  "смог / смогла; имел(а) возможность",
  "смогу / буду в состоянии"
 ],
 "skulle": [
  "собираться / быть должным",
  "собираюсь / должен",
  "собирался / должен был",
  "собирался / должен был (редкая форма)"
 ],
 "ha": [
  "иметь",
  "имею / у меня есть",
  "имел / у меня было",
  "имел / у меня было (к настоящему)",
  "буду иметь / у меня будет"
 ],
 "gjøre": [
  "делать / сделать",
  "делаю",
  "делал / сделал",
  "сделал / уже сделал",
  "буду делать / сделаю"
 ],
 "gå": [
  "идти / ходить",
  "иду / хожу",
  "шёл / ходил / пошёл",
  "ходил / сходил",
  "пойду / буду ходить"
 ],
 "komme": [
  "приходить / приезжать",
  "прихожу / приезжаю",
  "пришёл / приехал",
  "пришёл / приехал (к настоящему)",
  "приду / приеду"
 ],
 "bo": [
  "жить / проживать",
  "живу",
  "жил / жила",
  "жил / прожил",
  "буду жить"
 ],
 "lære": [
  "учить / изучать",
  "учу / изучаю",
  "учил / изучал",
  "выучил / научился",
  "буду учить / изучать"
 ],
 "jobbe": [
  "работать",
  "работаю",
  "работал / работала",
  "работал / поработал",
  "буду работать"
 ],
 "snakke": [
  "говорить / разговаривать",
  "говорю / разговариваю",
  "говорил / разговаривал",
  "говорил / поговорил",
  "буду говорить / разговаривать"
 ],
 "spørre": [
  "спрашивать / спросить",
  "спрашиваю",
  "спрашивал / спросил",
  "спросил / уже спрашивал",
  "спрошу / буду спрашивать"
 ],
 "svare": [
  "отвечать / ответить",
  "отвечаю",
  "отвечал / ответил",
  "ответил / уже отвечал",
  "отвечу / буду отвечать"
 ],
 "skrive": [
  "писать / написать",
  "пишу",
  "писал / написал",
  "написал / уже писал",
  "напишу / буду писать"
 ],
 "lese": [
  "читать / прочитать",
  "читаю",
  "читал / прочитал",
  "прочитал / уже читал",
  "прочитаю / буду читать"
 ],
 "se": [
  "смотреть / видеть",
  "смотрю / вижу",
  "смотрел / увидел",
  "видел / посмотрел",
  "посмотрю / увижу"
 ],
 "ta": [
  "брать / взять",
  "беру",
  "брал / взял",
  "взял / уже брал",
  "возьму / буду брать"
 ],
 "få": [
  "получать / получить",
  "получаю",
  "получал / получил",
  "получил / уже получал",
  "получу / буду получать"
 ],
 "spise": [
  "есть / кушать",
  "ем",
  "ел / поел",
  "поел / уже ел",
  "буду есть / поем"
 ],
 "drikke": [
  "пить",
  "пью",
  "пил / выпил",
  "выпил / уже пил",
  "буду пить / выпью"
 ],
 "kjøpe": [
  "покупать / купить",
  "покупаю",
  "покупал / купил",
  "купил / уже покупал",
  "куплю / буду покупать"
 ],
 "velge": [
  "выбирать / выбрать",
  "выбираю",
  "выбирал / выбрал",
  "выбрал / уже выбирал",
  "выберу / буду выбирать"
 ],
 "legge": [
  "класть / положить",
  "кладу",
  "клал / положил",
  "положил / уже клал",
  "положу / буду класть"
 ],
 "ligge": [
  "лежать / находиться",
  "лежит / нахожусь",
  "лежал / находился",
  "лежал / находился (до сих пор)",
  "буду лежать / находиться"
 ],
 "forstå": [
  "понимать / понять",
  "понимаю",
  "понимал / понял",
  "понял / уже понимал",
  "пойму / буду понимать"
 ],
 "finne": [
  "находить / найти",
  "нахожу",
  "находил / нашёл",
  "нашёл / уже находил",
  "найду / буду находить"
 ],
 "sende": [
  "отправлять / послать",
  "отправляю",
  "отправлял / отправил",
  "отправил / уже отправлял",
  "отправлю / буду отправлять"
 ],
 "besøke": [
  "навещать / посещать",
  "навещаю / посещаю",
  "навещал / посетил",
  "навестил / уже посещал",
  "навещу / посещу"
 ],
 "vente": [
  "ждать / подождать",
  "жду",
  "ждал / подождал",
  "ждал / уже подождал",
  "буду ждать / подожду"
 ],
 "begynne": [
  "начинать / начать",
  "начинаю",
  "начинал / начал",
  "начал / уже начинал",
  "начну / буду начинать"
 ],
 "slutte": [
  "заканчивать / прекращать",
  "заканчиваю / прекращаю",
  "закончил / прекратил",
  "закончил / уже прекращал",
  "закончу / прекращу"
 ],
 "logge inn": [
  "входить в систему",
  "вхожу в систему",
  "входил в систему",
  "вошёл / уже входил",
  "войду в систему"
 ],
 "ordne opp": [
  "разбираться / улаживать",
  "разбираюсь / улаживаю",
  "разобрался / уладил",
  "разобрался / уже уладил",
  "разберусь / улажу"
 ],
 "rekke": [
  "успевать",
  "успеваю",
  "успел / успевал",
  "успел / уже успевал",
  "успею"
 ],
 "oppdage": [
  "обнаруживать / замечать",
  "обнаруживаю / замечаю",
  "обнаружил / заметил",
  "обнаружил / уже замечал",
  "обнаружу / замечу"
 ],
 "beklage": [
  "сожалеть / извиняться",
  "сожалею / извиняюсь",
  "сожалел / извинился",
  "извинился / уже сожалел",
  "извинюсь / буду сожалеть"
 ],
 "foretrekke": [
  "предпочитать",
  "предпочитаю",
  "предпочитал",
  "предпочитал (и раньше)",
  "буду предпочитать"
 ],
 "vaske": [
  "мыть / стирать",
  "мою / стираю",
  "мыл / стирал",
  "помыл / постирал",
  "помою / постираю"
 ],
 "rengjøre": [
  "чистить / убирать",
  "чищу / убираю",
  "чистил / убирал",
  "почистил / убрал",
  "почищу / уберу"
 ],
 "hente": [
  "забирать / приносить",
  "забираю / приношу",
  "забрал / принёс",
  "забрал / уже принёс",
  "заберу / принесу"
 ],
 "åpne": [
  "открывать / открыть",
  "открываю",
  "открывал / открыл",
  "открыл / уже открывал",
  "открою / буду открывать"
 ]
});
const verbAliases={begynner:'begynne',begynte:'begynne',begynt:'begynne',kan:'kunne',kunnet:'kunne',skal:'skulle',skullet:'skulle'};
const nounAliases={nøkkelen:'nøkkel',klokka:'klokke',boka:'bok',boken:'bok',huset:'hus',jobben:'jobb',
 skolen:'skole',rommet:'rom',spørsmålet:'spørsmål',eplet:'eple',brødet:'brød',barnet:'barn'};
const normalize=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('nb-NO').trim().replace(/\s+/g,' ');
function cleanLemma(raw){
 const s=normalize(raw).replace(/^[.,!?]+|[.,!?]+$/g,'');
 return s.replace(/^(?:en|ei|et|å)\s+/,'');
}
function form(label,form,translationRu){return translationRu?{label,form,translationRu}:{label,form}}
function describe(entry){
 const original=String(entry?.word||entry?.lemma||'').trim();
 const raw=normalize(original);
 const lemma=cleanLemma(original);
 const mapped=nounAliases[lemma]||lemma;
 const verbLemma=Object.hasOwn(verbAliases,lemma)?verbAliases[lemma]:lemma;
 const pos=String(entry?.pos||'').toLowerCase();
 const gender=String(entry?.gender||'').toLowerCase();
 const article=/^(en|ei|et)\s/.exec(raw)?.[1];
 const url='https://ordbokene.no/bm/'+encodeURIComponent(verbLemma!==lemma?verbLemma:mapped);
 if(Object.hasOwn(noun,mapped)&&(article||pos==='noun'||!pos)){
  const [art,sgDef,pl,plDef,no,ru]=noun[mapped];
  const gloss=nounRussianTranslations[mapped];
  return {type:'noun',typeRu:'Существительное',headword:art+' '+mapped,lemma:mapped,
    forms:[form('Ед. число · неопределённая',art+' '+mapped,gloss?.[0]),form('Ед. число · определённая',sgDef,gloss?.[1]),
     form('Мн. число · неопределённая',pl,gloss?.[2]),form('Мн. число · определённая',plDef,gloss?.[3])],
    example:{no,ru},verified:true,url,
    help:'Учи существительное с артиклем. Определённость часто передаётся по-русски контекстом: «этот/эта/эти» — смысловая подсказка, а не обязательный дословный перевод.'+
     (mapped==='klokke'?' В выражении «Klokka er tre» klokka сообщает время («сейчас три часа»).':'')};
 }
 if(Object.hasOwn(verb,verbLemma)&&(raw.startsWith('å ')||pos==='verb'||pos==='modal'||!pos||verbLemma==='skulle')){
  const [pres,past,perfect,no,ru]=verb[verbLemma];
  const tr=verbRussianTranslations[verbLemma];
  const paradigm=[form('Инфинитив','å '+verbLemma,tr?.[0]),form('Настоящее · presens',pres,tr?.[1]),
    form('Прошедшее · preteritum',past,tr?.[2]),
    form(verbLemma==='skulle'?'Перфект · редко':'Перфект · perfektum','har '+perfect,tr?.[3])];
  // "skal" expresses plans and obligations; do not make up the "skal skulle" future.
  if(verbLemma!=='skulle')paradigm.push(form('Будущее · конструкция','skal '+verbLemma,tr?.[4]));
  return {type:'verb',typeRu:'Глагол',headword:'å '+verbLemma,lemma:verbLemma,
    forms:paradigm,
    example:{no,ru},verified:true,url,help:verbLemma==='skulle'
      ?'Модальный глагол: skal — собираюсь / должен, skulle — собирался / должен был или вежливая условная форма. После skal/skulle идёт инфинитив без å: Jeg skulle ringe deg. Форма har skullet встречается редко; её не нужно отрабатывать на уровне A1.'
      :verbLemma==='kunne'?'Модальный глагол: kan — могу сейчас, kunne — мог раньше или мог бы (вежливая просьба), har kunnet — мог до настоящего момента. После kan/kunne следующий глагол употребляется без å: Jeg kan hjelpe deg.':'Запомни три разные формы: presens, preteritum и причастие после har. Будущее с skal — конструкция.'};
 }
 if(Object.hasOwn(adjective,lemma)&&(pos==='adjective'||!pos)){
  const [neuter,plural,comparative,superlative,no,ru]=adjective[lemma];
  return {type:'adjective',typeRu:'Прилагательное',headword:lemma,lemma,
    forms:[form('Общий род · en',lemma),form('Средний род · et',neuter),form('Мн. число / определённая форма',plural),
      form('Сравнительная степень',comparative),form('Превосходная степень',superlative)],
    example:{no,ru},verified:true,url,help:'Прилагательные меняются по роду, числу и степени сравнения — не по временам.'};
 }
 if(article||pos==='noun'){
  const articleFromGender=/^(?:m|masculine|hankj)/.test(gender)?'en':/^(?:f|feminine|hunkj)/.test(gender)?'ei':/^(?:n|neuter|intetk)/.test(gender)?'et':'';
  const prefix=article||articleFromGender;
  return {type:'noun',typeRu:'Существительное',headword:(prefix?prefix+' ':'')+lemma,lemma,
    forms:[],verified:false,url,help:'Род указан, если он есть в словарной записи. Остальные формы нужно сверить в Bokmålsordboka.'};
 }
 if(raw.startsWith('å ')||pos==='verb'||pos==='modal'){
  return {type:'verb',typeRu:'Глагол',headword:'å '+lemma,lemma,
    forms:[form('Инфинитив','å '+lemma)],verified:false,url,
    help:'Точные формы прошедшего времени и причастия не установлены — проверь в Bokmålsordboka.'};
 }
 return {type:'other',typeRu:pos==='phrase'?'Выражение':pos==='adverb'?'Наречие':'Слово / выражение',
    headword:original,lemma,forms:[],verified:false,url,
    help:'Для неизменяемых слов нет артикля и времён. Для других слов проверяй формы по словарю.'};
}
window.NECardGrammar=Object.freeze({describe,cleanLemma,knownCount:Object.freeze({
 nouns:Object.keys(noun).length,verbs:Object.keys(verb).length,adjectives:Object.keys(adjective).length,
  translatedNouns:Object.keys(nounRussianTranslations).length,
 translatedVerbs:Object.keys(verbRussianTranslations).length
})});
})();
