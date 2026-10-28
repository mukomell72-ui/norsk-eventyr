// Norsk Eventyr scene course: authored teaching, recipient-aware turns and group context.
// No scoring, checkpoint mutation or automatic passage of a CEFR level happens here.
(()=>{
 'use strict';
 const CHARACTERS=Object.freeze({
  nora:{name:'Нора',role:'преподаватель',face:'nora'},
  erik:{name:'Эрик',role:'сотрудник и знакомый',face:'erik'},
  ingrid:{name:'Ингрид',role:'хозяйка',face:'ingrid'},
  self:{name:'Ты',role:'ученик',face:'self'}
 });
 const step=(focus,explain,example,words=[],lead=[])=>Object.freeze({
  focus,explain,example,words,lead:lead.map(x=>Object.freeze(x))
 });
 // An example must differ from the answer being assessed. All teaching is
 // optional; the current communicative goal remains in guided-speaking.js.
 const PLANS=Object.freeze({
  'a1-foundation':{
   title:'Первое знакомство',
   introduction:'Ты впервые приходишь в сервисный центр. Нора рядом, но разговаривать предстоит тебе.',
   participants:['nora','erik','self'],
   turns:[
    step('Приветствие и имя','Hei — это «привет». После приветствия можно сообщить, как тебя зовут. Сначала попробуй самостоятельно.', 'Hei! Hvordan går det?',[['hei','привет'],['heter','зовут']]),
    step('Откуда ты','Hvor — вопросительное слово «откуда/где» зависит от сочетания. Hvor kommer du fra? спрашивает о происхождении.', 'Bussen kommer fra sentrum.',[['kommer','происхожу / приезжаю'],['fra','из']]),
    step('Языки','Snakker означает «говорю / говоришь». Названия языков обычно пишутся со строчной буквы.', 'Hun snakker engelsk.',[['snakker','говорит'],['norsk','норвежский']]),
    step('Вежливый вопрос','Чтобы узнать имя другого человека, нужен вопрос. В норвежском вопрос часто начинается с вопросительного слова.', 'Hvor bor du?', [['hva','что / какой'],['heter','зовут']]),
    step('Реакция на знакомство','После знакомства принято отвечать короткой вежливой репликой. Не обязательно повторять собеседника слово в слово.', 'Det er hyggelig å se deg.',[['hyggelig','приятно'],['møte','встречать']]),
    step('Спроси собеседника','Не только отвечай: ты можешь первым задавать вопросы. Обрати внимание на порядок слов в вопросе.', 'Hvor jobber du?', [['hvor','где / откуда'],['kommer','происходит / приходит']],
      [{speaker:'ingrid',to:'erik',text:'Hei! Er du ny her?'}]),
    step('Узнай больше','Слово hvilke используется, когда спрашивают, какие из нескольких вариантов подходят.', 'Hvilke dager jobber du?', [['hvilke','какие'],['språk','языки']],
      [{speaker:'ingrid',to:'erik',text:'Jeg snakker også engelsk.'}]),
    step('Завершение разговора','Разговор можно закончить благодарностью и прощанием. Это две разные речевые задачи.', 'Takk for hjelpen. Vi sees!',[['takk','спасибо'],['ha det','пока']])
   ]
  },
  'a1-home':{
   title:'В гостях у Ингрид',
   introduction:'Ингрид приглашает тебя домой. Эрик тоже в гостях. Слушай разговор и отвечай, когда обращаются к тебе.',
   participants:['nora','ingrid','erik','self'],
   turns:[
    step('Приветствие и вопрос','Норвежское hvor часто означает «где». Используй вопросительное слово, чтобы уточнить место вещи.', 'Hvor er jakken min?', [['hvor','где'],['nøkkel','ключ']]),
    step('Расположение предметов','På означает «на», ved — «у / рядом с». Leter etter — «ищу». Попробуй назвать место самостоятельно.', 'Jeg leter etter mobilen.',[['leter etter','ищу'],['ved','возле']],
      [{speaker:'erik',to:'ingrid',text:'Jeg leter også etter nøkkelen.'}]),
    step('Благодарность и находка','В норвежском речь о найденном предмете можно строить с глаголом fant — «нашёл / нашла». Формулировку ответа составь самостоятельно.', 'Jeg fant mobilen.',[['fant','нашёл / нашла'],['takk','спасибо']],
      [{speaker:'erik',to:'ingrid',text:'Skal jeg se ved vinduet?'}])
   ]
  }
 });
 function moduleId(lesson){return String(lesson?._adaptive?.moduleId||lesson?.id||'').toLowerCase()}
 function forTurn(lesson,scene,index){
  const key=moduleId(lesson),variant=lesson?._adaptive?.storyVariant;
  // Do not attach base-scene scripted facts to other saved story variants.
  if(Number.isInteger(variant)&&variant!==0)return null;
  const plan=PLANS[key],turn=plan?.turns?.[index];
  if(!plan||!turn||!scene?.steps?.[index]||scene.steps.length!==plan.turns.length)return null;
  const revealed=key!=='a1-foundation'||index>=4;
  const names={...CHARACTERS,erik:revealed?CHARACTERS.erik:{...CHARACTERS.erik,name:'Сотрудник'}};
  const cast=key==='a1-foundation'&&index>=5?[...plan.participants,'ingrid']:plan.participants;
  const participants=cast.map(id=>({...names[id],id}));
  const speaker=key==='a1-home'?'ingrid':'erik';
  return Object.freeze({
   module:key,title:plan.title,
   introduction:index===0?plan.introduction:'',
   participants,
   speaker:{...names[speaker],id:speaker},
   to:'self',recipient:'Ты',
   lead:turn.lead.map(x=>({speaker:{...names[x.speaker],id:x.speaker},recipient:names[x.to].name,to:x.to,text:x.text})),
   teacher:{focus:turn.focus,explain:turn.explain,example:turn.example,words:turn.words.slice(0,3)}
  });
 }
 function validLesson(lesson){return !!PLANS[moduleId(lesson)]}
 window.NESceneCourse=Object.freeze({forTurn,validLesson,modules:Object.freeze(Object.keys(PLANS))});
})();