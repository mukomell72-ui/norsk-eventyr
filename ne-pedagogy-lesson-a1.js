/* Norsk Eventyr: pedagogical exemplar, A1, 60 planned minutes. Authoring data only. */
(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;root.NEPedagogyLesson=value})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const T=(id,speaker,to,spoken,goal,skill,criteria,extras={})=>({id,speaker,to,spoken,goal,skill,criteria,...extras});
const C=(name,patterns,explain,reject=[])=>({name,patterns,explain,reject});
const greeting=C('приветствие',['\\b(?:hei|heisann|hallo|god dag|god morgen|god kveld)\\b'],'Начни с «Hei!» или другого подходящего приветствия.');
const person="[\\p{L}][\\p{L}'’-]*";
const name=C('имя',['\\bmitt navn er\\s+(?!(?:ikke|en|ei|et)(?:\\s|$))'+person,'\\bjeg (?:heter|er)\\s+(?!(?:ikke|fra|en|ei|et|her|der|ny|glad|trøtt|lærer|student|lege|arbeidsledig|norsk|på|i)(?:\\s|$))'+person],
 'После «jeg heter» назови своё имя. Например: «Jeg heter Maria.»',['\\bjeg (?:heter|er) ikke\\b','\\bmitt navn er ikke\\b']);
const residence=C('город проживания',['\\bjeg bor (?:nå |for tiden )?(?:i|på)\\s+'+person,'\\bnå bor jeg (?:i|på)\\s+'+person],
 '«Jeg bor i ...» означает «Я живу в ...». Назови место проживания.',['\\bjeg bor (?:ikke|aldri)\\b','\\bjeg bor (?:i|på) (?:ikke|en|ei|et|og|men)(?:\\s|$)']);
const origin=C('откуда ты',['\\bjeg (?:kommer|er) fra\\s+'+person],
 '«Jeg kommer fra ...» — «Я из ...». Назови страну или город.',['\\bjeg (?:kommer|er) ikke\\b','\\bfra (?:ikke|en|ei|et|og|men)(?:\\s|$)']);
const questionName=C('вопрос об имени',['\\b(?:hva heter du|hva er navnet ditt)\\b'],'Спроси «Hva heter du?» — «Как тебя зовут?»',['\\bikke\\b']);
const questionPlace=C('вопрос о ключе',['\\bhvor (?:er|ligger|står) (?:nøkkelen|min nøkkel|nøkkelen min)(?:\\s|$)'],
 'Спроси именно о ключе: «Hvor er nøkkelen?»',['\\bikke\\b']);
const coffee=C('вежливый ответ',['\\b(?:ja|nei)(?: ellers)? takk\\b','\\b(?:ja )?gjerne\\b','\\b(?:jeg vil|jeg vil ikke) (?:gjerne )?ha kaffe\\b'],
 'Согласись или откажись вежливо: «Ja, takk.» или «Nei, takk.»');
const thanks=C('благодарность',['\\b(?:takk|tusen takk)\\b'],'Поблагодари: «Takk!» или «Tusen takk!»',['\\bikke takk\\b']);
const farewell=C('прощание',['\\b(?:ha det|vi sees|vi ses|vi snakkes|på gjensyn|ha det bra)\\b'],'Попрощайся: «Ha det!» или «Vi sees!»',['\\bikke\\b']);
const location=C('местонахождение ключа',['(?:^|\\s)(?:nøkkelen|min nøkkel|nøkkelen min|den) (?:er|ligger) på bordet(?:\\s|$)','(?:^|\\s)på bordet (?:er|ligger) (?:nøkkelen|min nøkkel|nøkkelen min|den)(?:\\s|$)'],
 'Назови ключ и указанное место: «Nøkkelen ligger på bordet.»',['\\bikke\\b']);
const stages=[
 {id:'warmup',title:'Разогреваем речь',minutes:5,goal:'Вспомнить знакомые фразы и уверенно вступить в общение.',tasks:[
  T('w1','anna','self','Hei! Hva heter du?','Поздоровайся и представься.','speaking',[greeting,name],{words:['hei','heter'],teach:'«Hei!» — привет. «Jeg heter ...» — меня зовут ... . Сначала попробуй ответить без подсказки.',alternative:'Hei! Jeg heter Maria.'}),
  T('w2','nora','self','Hvor bor du?','Скажи, в каком городе живёшь.','speaking',[residence],{words:['bor','i'],teach:'Глагол «bor» обозначает проживание: «Jeg bor i Oslo.»',alternative:'Jeg bor i Bergen.'})
 ]},
 {id:'meet',title:'Знакомимся с людьми',minutes:10,goal:'Представиться и поддержать короткий диалог.',tasks:[
  T('m1','anna','self','God morgen! Jeg heter Anna. Hva heter du?','Поздоровайся и назови своё имя.','speaking',[greeting,name],{words:['god morgen','heter'],teach:'При знакомстве достаточно двух коротких фраз. Используй «Jeg heter ...».',alternative:'God morgen! Jeg heter Ola.'}),
  T('m2','anna','self','Hyggelig å møte deg! Hvor kommer du fra?','Скажи, откуда ты.','speaking',[origin],{words:['kommer fra','hyggelig'],teach:'«Hvor kommer du fra?» — «Откуда ты?» В ответе «jeg kommer fra ...».',alternative:'Jeg kommer fra Sverige.'}),
  T('m3','erik','self','Hvor bor du nå?','Скажи, где живёшь сейчас.','speaking',[residence],{words:['nå','bor'],teach:'«Nå» означает «сейчас»: «Jeg bor i Tromsø nå.»',alternative:'Jeg bor i Drammen nå.'}),
  T('m4','anna','self','Nå er det din tur. Still meg et spørsmål!','Спроси, как зовут собеседницу.','speaking',[questionName],{words:['spørsmål','heter'],teach:'Вопрос «Hva heter du?» показывает интерес к собеседнику.',alternative:'Hva heter du?'})
 ]},
 {id:'words',title:'Слова в живом разговоре',minutes:8,goal:'Узнавать ключевые слова на слух и по смыслу.',tasks:[
  T('v1','nora','self','Jeg bor i Norge.','Что означает «Jeg bor i Norge»?','reading',[],{kind:'choice',choices:[['Я живу в Норвегии',true],['Я родом из Норвегии',false],['Я работаю в Норвегии',false]],words:['bor','i'],teach:'«Bor» = живу. «I Norge» = в Норвегии.'}),
  T('v2','erik','self','Hvor kommer du fra?','О чём спрашивает Эрик?','listening',[],{kind:'choice',choices:[['Откуда ты?',true],['Где ты работаешь?',false],['Как тебя зовут?',false]],hideSpeech:true,words:['hvor','kommer fra'],teach:'«Hvor kommer du fra?» = «Откуда ты?»'}),
  T('v3','ingrid','self','Hyggelig å møte deg!','Как лучше ответить на вежливое знакомство?','reading',[],{kind:'choice',choices:[['Hyggelig å møte deg også!',true],['Hvor er bussen?',false],['Jeg har en katt.',false]],words:['hyggelig','også'],teach:'«Også» значит «тоже». Можно ответить «Hyggelig å møte deg også!».'})
 ]},
 {id:'grammar',title:'Грамматика без зубрёжки',minutes:8,goal:'Строить собственные фразы и прямые вопросы.',tasks:[
  T('g1','nora','self','Du bor i Norge. Hvordan sier du dette om deg selv?','Скажи от первого лица: «Я живу в Норвегии» (можно назвать другой город).','writing',[residence],{words:['du','jeg','bor'],teach:'«Du bor» — «ты живёшь». Когда говоришь о себе: «Jeg bor».',alternative:'Jeg bor i Norge.'}),
  T('g2','erik','self','Jeg heter Erik. Hva vil du spørre meg?','Задай вопрос об имени.','writing',[questionName],{words:['hva','heter'],teach:'В прямом вопросе «Hva» стоит первым: «Hva heter du?»',alternative:'Hva heter du?'}),
  T('g3','ingrid','self','Jeg ser etter nøkkelen.','Спроси, где ключ.','writing',[questionPlace],{words:['hvor','nøkkelen'],teach:'«Hvor» — где; после него в прямом вопросе ставим глагол: «Hvor er ...?»',alternative:'Hvor er mobilen?'})
 ]},
 {id:'visit',title:'В гостях у Ингрид',minutes:12,goal:'Понять групповой разговор и самостоятельно отвечать собеседнику.',tasks:[
  T('h1','ingrid','self','Velkommen! Vil du ha kaffe?','Вежливо согласись или откажись от кофе.','speaking',[coffee],{words:['kaffe','takk'],teach:'«Vil du ha ...?» — «Хочешь ...?» Ответ: «Ja, takk.» или «Nei, takk.»',alternative:'Ja, gjerne!',group:[{speaker:'erik',to:'ingrid',text:'Jeg vil gjerne ha kaffe.'}]}),
  T('h2','erik','ingrid','Ingrid, hvor er melken?','Кому Эрик адресует вопрос?','listening',[],{kind:'choice',choices:[['Ингрид',true],['Мне',false],['Норе',false]],hideSpeech:true,words:['hvor','melken'],teach:'Сначала слушай имя в начале вопроса. Эрик спрашивает Ингрид, а не тебя.'}),
  T('h3','ingrid','self','Jeg tror nøkkelen ligger på bordet. Kan du se etter?','Спроси, где лежит ключ.','speaking',[questionPlace],{words:['nøkkelen','bordet'],teach:'«Nøkkelen» = ключ (определённая форма). «Hvor er nøkkelen?» = Где ключ?',alternative:'Hvor er telefonen?',group:[{speaker:'erik',to:'ingrid',text:'Jeg ser ved vinduet.'}]}),
  T('h4','ingrid','self','Der er nøkkelen. På bordet!','Скажи, где находится ключ.','speaking',[location],{words:['på','bordet'],teach:'«På bordet» — на столе. Чтобы назвать местоположение, добавь глагол «er», «ligger» или «står».',alternative:'Nøkkelen er på bordet.'}),
  T('h5','ingrid','self','Så hyggelig at du kom!','Поблагодари и попрощайся.','speaking',[thanks,farewell],{words:['takk','ha det'],teach:'Можно соединить благодарность и прощание: «Takk for i dag. Ha det!»',alternative:'Tusen takk. Vi sees!'})
 ]},
 {id:'reading',title:'Читаем сообщение',minutes:6,goal:'Понять небольшое бытовое сообщение.',tasks:[
  T('r1','ingrid','self','Hei! Kom gjerne på besøk klokka fem. Hilsen Ingrid.','Во сколько Ингрид приглашает в гости?','reading',[],{kind:'choice',choices:[['В пять часов',true],['В семь часов',false],['Завтра утром',false]],words:['klokka','besøk'],teach:'«Klokka fem» — в пять часов. «På besøk» — в гости.'}),
  T('r2','ingrid','self','Kan du ta med brød? Takk!','О чём просит Ингрид?','reading',[],{kind:'choice',choices:[['Принести хлеб',true],['Купить кофе',false],['Прийти раньше',false]],words:['brød','ta med'],teach:'«Ta med» — взять с собой / принести. «Brød» — хлеб.'})
 ]},
 {id:'writing',title:'Напишем ответ',minutes:6,goal:'Составить небольшое самостоятельное сообщение.',tasks:[
  T('p1','ingrid','self','Hei! Kan du komme på besøk?','Напиши сообщение: поздоровайся, представься и скажи, где живёшь.','writing',[greeting,name,residence],{words:['hei','heter','bor'],teach:'В коротком сообщении сначала приветствие, затем основная информация. Порядок слов: «Jeg heter ... Jeg bor i ...».',alternative:'Hei! Jeg heter Anna. Jeg bor i Oslo.'})
 ]},
 {id:'transfer',title:'Проверим самостоятельность',minutes:5,goal:'Использовать изученное в новой ситуации без готового шаблона.',tasks:[
  T('t1','erik','self','Hei! Jeg er ny her. Hva heter du, og hvor bor du?','Поздоровайся, представься и скажи, где живёшь.','speaking',[greeting,name,residence],{words:['heter','bor'],teach:'Эрик спрашивает две вещи: имя и место проживания. Ответь на обе.',alternative:'Hei, jeg heter Maria. Jeg bor i Lillehammer.',transfer:true}),
  T('t2','anna','self','Takk for praten! Ha en fin dag!','Вежливо закончи разговор.','speaking',[farewell],{words:['ha det','takk'],teach:'Уместное прощание может быть коротким: «Ha det!»',alternative:'Vi sees!',transfer:true})
 ]}
];
return Object.freeze({id:'ne-a1-lived-dialogue-01',revision:1,title:'Знакомство и в гостях',level:'A1',plannedMinutes:60,stages:Object.freeze(stages),wordGlossary:Object.freeze({hei:'привет',heter:'зовут',bor:'живу / живёшь',i:'в',nøkkelen:'ключ (определённая форма)',på:'на',bordet:'стол (определённая форма)',takk:'спасибо',hyggelig:'приятно',også:'тоже',kaffe:'кофе',kommer:'прихожу / приезжаю',fra:'из',
 'god morgen':'доброе утро','kommer fra':'родом из','nå':'сейчас','spørsmål':'вопрос','hvor':'где / откуда','du':'ты','jeg':'я','hva':'что / какой','melken':'молоко (определённая форма)','ha det':'пока / до свидания','klokka':'часы / время','besøk':'гости / визит','brød':'хлеб','ta med':'взять с собой / принести'})});
});
