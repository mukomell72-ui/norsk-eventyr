// Guided oral tasks: short exchanges instead of one long monologue.
// A response is revealed only after the learner's current turn has been evaluated.
(function(){
'use strict';
const make=(scene,actor,opening,steps)=>({scene,actor,opening,steps:steps.map(([task,goal,reply])=>({task,goal,reply}))});
const SCENES={
 'a1-foundation':make('Ты подошёл к стойке сервисного центра. Познакомься с сотрудником.','Erik · сотрудник','Hei! Velkommen til servicekontoret.',[
  ['Поздоровайся и представься.','Поздороваться и назвать своё имя на простом норвежском.','Hei! Velkommen. Hvor kommer du fra?'],
  ['Скажи, откуда ты и где сейчас живёшь.','Сообщить, откуда ученик родом и где сейчас живёт.','Så hyggelig! Hvilke språk snakker du?'],
  ['Скажи, на каком языке ты говоришь.','Назвать хотя бы один язык, на котором говорит ученик.','Fint! Vi kan øve på norsk.'],
  ['Спроси сотрудника, как его зовут.','Задать прямой вопрос об имени собеседника (Hva heter du? или естественный эквивалент), а не просто назвать собственное имя.','Jeg heter Erik.'],
  ['Скажи Эрику, что тебе приятно познакомиться.','Ответить естественной вежливой фразой знакомства, например Hyggelig å møte deg (или Hyggelig å hilse på deg). Сейчас не требуется спрашивать о родном городе.','Hyggelig å møte deg også!'],
  ['Теперь спроси, откуда Эрик родом.','Спросить собеседника, откуда он родом (Hvor kommer du fra? или естественный эквивалент).','Jeg kommer fra Bergen.'],
  ['Спроси, на каких языках он говорит.','Спросить о языках, на которых говорит собеседник (Hvilke språk snakker du? или естественный эквивалент).','Jeg snakker norsk og engelsk.'],
  ['Поблагодари за разговор и попрощайся.','Естественно завершить беседу благодарностью и прощанием (например Takk for praten, ha det).','Bare hyggelig! Ha det bra!']
 ]),
 'a1-home':make('Ты в гостях. Хозяин помогает найти нужную вещь.','Ingrid · хозяйка','Velkommen hjem til meg!',[
  ['Поздоровайся и спроси, где находится ключ.','Задать простой вопрос о местонахождении ключа.','Nøkkelen ligger på bordet.'],
  ['Скажи, где ищешь ключ, и уточни, находится ли он у двери.','Сообщить, где ищешь ключ, и спросить, находится ли он у двери.','Nei, bordet står ved vinduet.'],
  ['Поблагодари хозяйку и скажи, что нашёл ключ.','Поблагодарить и сказать, что ключ найден.','Bare hyggelig!']
 ]),
 'a1-time':make('Ты договариваешься о встрече.','Ola · знакомый','Hei! Når passer det å møtes?',[
  ['Предложи день и время встречи.','Предложить конкретный день и время встречи.','Tirsdag klokka fire passer for meg.'],
  ['Переспроси, правильно ли ты понял время.','Уточнить, что встреча во вторник в четыре.','Ja, tirsdag klokka fire.'],
  ['Подтверди встречу и попрощайся.','Подтвердить договорённость и вежливо завершить беседу.','Vi sees på tirsdag!']
 ]),
 'a1-shopping':make('Ты в продуктовом магазине.','Kari · продавец','Hei! Hva kan jeg hjelpe deg med?',[
  ['Попроси хлеб и молоко.','Вежливо попросить хлеб и молоко.','Selvfølgelig! Her er varene.'],
  ['Спроси, сколько это стоит.','Задать вопрос о цене покупки.','Det blir 65 kroner.'],
  ['Поблагодари и попрощайся.','Поблагодарить продавца и завершить покупку.','Takk, ha en fin dag!']
 ]),
 'a1-mobility':make('Ты на автобусной остановке.','Lars · прохожий','Hei! Trenger du hjelp?',[
  ['Спроси, какой автобус едет в центр.','Спросить, какой автобус идёт в центр.','Buss nummer 2 går til sentrum.'],
  ['Спроси, когда он отправляется.','Спросить время отправления автобуса.','Den går klokka halv tre.'],
  ['Повтори нужный номер и поблагодари.','Подтвердить маршрут и поблагодарить.','Bare hyggelig, god tur!']
 ]),
 'a1-health':make('Ты звонишь в кабинет врача.','Anna · регистратор','Legekontoret, vær så god.',[
  ['Поздоровайся и скажи, что тебе нужен приём.','Попросить записать на приём к врачу.','Ja, hva gjelder det?'],
  ['Коротко скажи, что болит.','Описать один симптом простым норвежским.','Jeg skjønner. Vi har en ledig time i morgen.'],
  ['Спроси, во сколько приём.','Спросить время предложенного приёма.','Klokka ti.'],
  ['Подтверди время и поблагодари.','Подтвердить приём в десять и поблагодарить.','Da sees vi i morgen!']
 ]),
 'a1-work-school':make('Ты пришёл на новую работу или в школу.','Maja · коллега','Hei! Hva gjør du her?',[
  ['Представься и скажи, работаешь ты или учишься.','Представиться и сообщить о работе либо учёбе.','Så hyggelig!'],
  ['Спроси, во сколько начинается рабочий или учебный день.','Уточнить время начала рабочего либо учебного дня.','Vi begynner klokka åtte.'],
  ['Повтори время и поблагодари.','Подтвердить, что начало в восемь, и поблагодарить.','Vi sees i morgen!']
 ]),
 'a1-transfer':make('Новая бытовая ситуация: ты впервые в библиотеке.','Sofie · сотрудница','Hei! Hva trenger du?',[
  ['Скажи, что хочешь взять книгу.','Вежливо сказать, что нужна книга.','Det kan vi ordne.'],
  ['Спроси, где находятся книги на норвежском языке.','Спросить местоположение книг на норвежском.','De står i hylla til venstre.'],
  ['Спроси, когда библиотека закрывается.','Спросить о времени закрытия библиотеки.','Vi stenger klokka seks.'],
  ['Поблагодари и заверши разговор.','Поблагодарить за помощь и попрощаться.','Bare hyggelig!']
 ]),
 'a2-story':make('Ты встретился с другом после выходных.','Jonas · друг','Hei! Hva gjorde du i helgen?',[
  ['Расскажи, что делал в выходные.','Коротко описать прошедшее событие в прошедшем времени.','Det høres hyggelig ut.'],
  ['Спроси друга, что он делал в выходные.','Задать вопрос о прошедших выходных собеседника.','Jeg besøkte familien min.'],
  ['Расскажи, что собираешься делать в следующие выходные.','Выразить один конкретный план на будущее.','Da ønsker jeg deg en fin helg!']
 ]),
 'a2-work':make('Ты на коротком собеседовании.','Mari · работодатель','Hei! Fortell litt om erfaringen din.',[
  ['Кратко расскажи о своём опыте работы.','Сообщить о реальном либо учебном опыте работы.','Takk. Det er nyttig å vite.'],
  ['Спроси о рабочем графике.','Задать вопрос о рабочих часах или сменах.','Vi jobber vanligvis fra åtte til fire.'],
  ['Скажи, когда ты можешь начать работать.','Назвать время начала работы или свою доступность.','Takk for praten!']
 ]),
 'a2-services':make('Ты сообщаешь арендодателю о проблеме в квартире.','Thomas · арендодатель','Hei! Hva gjelder det?',[
  ['Опиши, что именно не работает в квартире.','Описать одну конкретную неисправность жилья.','Jeg skjønner. Det var leit.'],
  ['Спроси, когда проблему смогут исправить.','Вежливо спросить срок ремонта.','Jeg kan sende noen på torsdag.'],
  ['Уточни удобное время и подтверди договорённость.','Уточнить время визита и подтвердить договорённость.','Da avtaler vi torsdag ettermiddag.']
 ]),
 'a2-digital':make('Ты в муниципальном сервисном центре.','Erik · сотрудник','Hei! Hvordan kan jeg hjelpe deg?',[
  ['Скажи, что тебе нужно отправить документ онлайн.','Объяснить необходимость цифровой отправки документа.','Du kan bruke kommunens nettside.'],
  ['Спроси, где найти нужную форму.','Спросить, где найти цифровую форму.','Du finner skjemaet under «Søknader».'],
  ['Уточни, нужно ли входить через BankID.','Вежливо уточнить, требуется ли BankID.','Ja, du må logge inn med BankID.'],
  ['Повтори, что будешь делать, и поблагодари.','Кратко пересказать следующий шаг и поблагодарить.','Lykke til!']
 ]),
 'a2-health':make('Врач задаёт вопросы о твоём самочувствии.','Lege · врач','Hei! Hvordan føler du deg?',[
  ['Назови симптом и как давно он начался.','Описать симптом и продолжительность.','Jeg skjønner.'],
  ['Спроси, что врач рекомендует.','Спросить о рекомендации врача.','Prøv å hvile og drikke nok vann.'],
  ['Спроси, когда следует снова обратиться к врачу.','Уточнить условие повторного обращения.','Ta kontakt hvis du ikke blir bedre.']
 ]),
 'a2-opinion':make('Ты обсуждаешь дорогу на работу.','Emma · коллега','Jeg synes buss er best. Hva mener du?',[
  ['Скажи, какой транспорт предпочитаешь, и почему.','Выразить предпочтение и причину.','Det forstår jeg.'],
  ['Спроси коллегу, почему она предпочитает автобус.','Задать вопрос о причинах предпочтения собеседника.','Fordi jeg slipper å finne parkering.'],
  ['Сравни два варианта и сделай вывод.','Сделать простое сравнение транспорта с выводом.','Ja, begge har fordeler.']
 ]),
 'a2-media':make('Ты обсуждаешь новость с соседом.','Nils · сосед','Har du lest nyheten om den nye bussruta?',[
  ['Уточни, о чём именно эта новость.','Задать уточняющий вопрос о содержании новости.','Kommunen starter en ny bussrute mandag.'],
  ['Перескажи главное своими словами.','Передать основную информацию о новой автобусной линии.','Nettopp.'],
  ['Спроси, где можно узнать подробности.','Спросить об источнике дополнительной информации.','Det står på kommunens nettside.']
 ]),
 'a2-transfer':make('Ты обращаешься на вокзале из-за отмены поезда.','Sara · сотрудница','Beklager, toget ditt er innstilt.',[
  ['Уточни, почему поезд отменён.','Вежливо спросить причину отмены поезда.','Det er tekniske problemer.'],
  ['Спроси, как теперь добраться до места назначения.','Уточнить альтернативный способ поездки.','Det går en buss om tjue minutter.'],
  ['Уточни место отправления автобуса.','Спросить, где отправляется предложенный автобус.','Fra holdeplassen utenfor stasjonen.'],
  ['Повтори план и поблагодари.','Подтвердить новый маршрут и поблагодарить.','God tur videre!']
 ]),
 'b1-narrative':make('Ты делишься историей с коллегой.','Ida · коллега','Har du opplevd noe uventet på jobb?',[
  ['Расскажи о событии: что произошло и в какой последовательности.','Связно описать случай из прошлого и последовательность событий.','Det høres utfordrende ut.'],
  ['Спроси коллегу, случалось ли у неё нечто подобное.','Задать естественный вопрос о похожем опыте собеседника.','Ja, en gang måtte vi endre hele planen.'],
  ['Объясни, чему научила тебя ситуация.','Выразить вывод либо приобретённый опыт.','Det er en god erfaring å ta med seg.']
 ]),
 'b1-work':make('Ты обсуждаешь задержку рабочего задания.','Henrik · руководитель','Vi ligger litt etter planen. Hva skjedde?',[
  ['Объясни причину задержки.','Связно описать причину задержки выполнения задания.','Takk for forklaringen.'],
  ['Предложи конкретное решение.','Предложить реалистичный план решения проблемы.','Det kan fungere.'],
  ['Уточни распределение обязанностей.','Задать вопрос о том, кто за что отвечает.','Jeg tar kontakt med kunden, og du følger opp arbeidet.']
 ]),
 'b1-formal':make('Ты уточняешь статус заявления в организации.','Ingrid · консультант','Hei! Hva gjelder henvendelsen din?',[
  ['Вежливо опиши, какое заявление ты отправлял и зачем обращаешься.','Формально запросить статус ранее поданного заявления.','Jeg kan se at søknaden er registrert.'],
  ['Спроси о сроках рассмотрения.','Вежливо уточнить срок рассмотрения.','Vi forventer svar innen to uker.'],
  ['Уточни, нужны ли ещё документы.','Спросить о необходимости дополнительной документации.','Nei, alt ser komplett ut.']
 ]),
 'b1-problem':make('Ты обсуждаешь с соседом шумный ремонт.','Anders · сосед','Beklager at det bråker så mye.',[
  ['Вежливо объясни, почему шум создаёт проблему.','Конкретно описать проблему и её последствия без грубости.','Jeg skjønner at det er plagsomt.'],
  ['Предложи компромисс по времени ремонта.','Предложить реалистичное компромиссное решение.','Vi kan stoppe arbeidet etter klokka seks.'],
  ['Подтверди договорённость и поблагодари.','Вежливо подтвердить конкретную договорённость.','Takk for forståelsen.']
 ]),
 'b1-news':make('Ты обсуждаешь сообщение местной газеты.','Kari · знакомая','Hva stod det i saken om kollektivtransport?',[
  ['Кратко перескажи новость и укажи источник.','Передать сообщение о транспорте со ссылкой на источник.','Takk, da forstår jeg hovedpoenget.'],
  ['Спроси, как собеседница относится к новости.','Задать вопрос о мнении собеседницы по новости.','Jeg synes endringen kan være nyttig.'],
  ['Отдели факт от собственного мнения.','Сформулировать различие между сообщённым фактом и личной оценкой.','Det er en viktig forskjell.']
 ]),
 'b1-argument':make('Ты обсуждаешь работу из дома.','Maja · коллега','Jeg mener hjemmekontor er best.',[
  ['Вырази собственную позицию и обоснуй её.','Чётко выразить мнение с аргументом.','Jeg forstår synspunktet ditt.'],
  ['Спроси о главном доводе собеседницы.','Задать уточняющий вопрос об аргументе оппонента.','Jeg sparer mye tid på reise.'],
  ['Приведи контраргумент и предложи компромисс.','Сформулировать уважительное возражение и компромисс.','En kombinasjon kan være en god løsning.']
 ]),
 'b1-presentation':make('Ты проходишь собеседование на работу.','Ola · интервьюер','Kan du fortelle kort om deg selv?',[
  ['Представь свой профессиональный опыт и сильную сторону.','Структурированно рассказать об опыте и сильной стороне.','Takk, interessant.'],
  ['Спроси, какие качества нужны на этой работе.','Задать вопрос о требованиях вакансии.','Vi trenger noen som er pålitelig og selvstendig.'],
  ['Объясни, чем ты подходишь на эту должность.','Связать свой опыт с названными требованиями.','Takk for et godt svar.']
 ]),
 'b1-transfer':make('У тебя возникло недоразумение при бронировании услуги.','Nora · администратор','Jeg finner dessverre ikke bestillingen din.',[
  ['Объясни, когда и какую услугу бронировал.','Связно объяснить ситуацию с бронированием.','Jeg skal undersøke det.'],
  ['Попроси перепроверить по имени или дате.','Вежливо предложить альтернативный способ проверки.','Nå fant jeg bestillingen!'],
  ['Уточни время и условия бронирования.','Уточнить практические детали и проверить понимание.','Timen er klokka elleve på fredag.']
 ]),
 'b2-listening':make('Ты участвуешь в обсуждении городской политики.','Hanna · участница','Bør byen redusere biltrafikken i sentrum?',[
  ['Сформулируй позицию с аргументом и примером.','Аргументировать позицию по вопросу автотрафика.','Det er et relevant poeng.'],
  ['Спроси собеседницу о последствиях для жителей.','Критически уточнить социальные последствия решения.','Noen kan få lengre reisevei.'],
  ['Ответь на возражение и предложи сбалансированный подход.','Взвесить противоположные аргументы и предложить компромисс.','Det virker som et gjennomtenkt forslag.']
 ]),
 'b2-formal':make('Ты обсуждаешь официальное решение с консультантом.','Bjørn · консультант','Vi har sendt deg et skriftlig vedtak.',[
  ['Сформулируй, какую часть решения требуется разъяснить.','Точно запросить разъяснение формулировки решения.','Jeg kan forklare vurderingen.'],
  ['Спроси о правовом основании или процедуре.','Вежливо уточнить основание либо процедуру принятия решения.','Begrunnelsen står i vedlegget til vedtaket.'],
  ['Уточни порядок дальнейшего обжалования или обращения.','Корректно запросить сведения о дальнейших действиях.','Du finner klageinformasjon nederst i brevet.']
 ]),
 'b2-presentation':make('Ты даёшь интервью о своём опыте.','Liv · журналистка','Hvordan har arbeidserfaringen din formet deg?',[
  ['Дай развёрнутый пример из профессиональной жизни.','Структурированно объяснить, как опыт повлиял на навыки.','Det var et konkret eksempel.'],
  ['Спроси, какую сторону темы журналистке стоит раскрыть подробнее.','Задать уточняющий вопрос о фокусе интервью.','Jeg vil gjerne høre om utfordringene du møtte.'],
  ['Объясни трудность и то, как ты с ней справился.','Связать проблему, действия, последствия и вывод.','Takk for et nyansert svar.']
 ]),
 'b2-argument':make('Ты обсуждаешь общественную инициативу.','Eva · собеседница','Forslaget virker effektivt, synes du ikke?',[
  ['Выскажи взвешенную оценку с оговоркой.','Дать нюансированную оценку инициативы.','Jeg ser innvendingen din.'],
  ['Спроси, на каких данных основана позиция собеседницы.','Критически уточнить источник и надёжность доводов.','Jeg bygger på tallene fra kommunens rapport.'],
  ['Приведи контраргумент и сформулируй условный вывод.','Построить контраргумент, учитывая неопределённость.','Det var en god presisering.']
 ]),
 'b2-negotiation':make('Ты ведёшь совещание по изменению рабочего процесса.','Knut · коллега','Vi vurderer å endre rutinene neste måned.',[
  ['Уточни цель изменения и возможные последствия.','Выяснить цель изменений и влияние на команду.','Målet er å redusere ventetiden.'],
  ['Объясни риск и предложи способ его уменьшить.','Взвешенно назвать риск и меру снижения.','Det kan vi ta med i planen.'],
  ['Согласуй конкретный следующий шаг.','Добиться ясной договорённости о действии и сроках.','La oss teste løsningen neste uke.']
 ]),
 'b2-range':make('Ты обсуждаешь культурные различия.','Sigrid · знакомая','Hvordan opplever du forskjeller i arbeidskultur?',[
  ['Опиши наблюдение без стереотипных обобщений.','Нюансированно описать культурные различия с примером.','Det er en interessant observasjon.'],
  ['Спроси о точке зрения собеседницы.','Попросить собеседницу поделиться личным опытом.','Jeg opplever at kommunikasjon ofte er ganske direkte.'],
  ['Сопоставь два подхода и сделай взвешенный вывод.','Сравнить подходы с уважением к нюансам.','Ja, konteksten betyr mye.']
 ]),
 'b2-synthesis':make('Ты проверяешь достоверность спорной новости.','Erik · коллега','Denne overskriften virker ganske dramatisk.',[
  ['Объясни, какая информация требует проверки.','Выделить проверяемые фактические утверждения.','Enig, vi bør undersøke kilden.'],
  ['Спроси, какой источник и данные использованы.','Уточнить происхождение источника и доказательств.','Artikkelen viser til en ny undersøkelse.'],
  ['Предложи критерии проверки, прежде чем делать вывод.','Предложить разумную процедуру проверки информации.','Det høres fornuftig ut.']
 ]),
 'b2-capstone':make('Ты обсуждаешь сложную проблему обслуживания.','Ingrid · руководитель','Kunden er misfornøyd, og vi må finne en løsning.',[
  ['Кратко уточни приоритет и ограничения ситуации.','Выяснить приоритеты и конкретные ограничения.','Vi må svare i dag, men budsjettet er stramt.'],
  ['Предложи решение и признай его недостаток.','Предложить сбалансированный вариант с признанием риска.','Det virker gjennomførbart.'],
  ['Спроси, как оценить результат через неделю.','Согласовать критерии оценки результата.','Vi kan måle svartid og kundetilfredshet.'],
  ['Подведи итог договорённости.','Сформулировать согласованные действия и критерии.','Da har vi en plan.']
 ])
};
function normalizeModule(l){return String(l?._adaptive?.moduleId||l?.id||'').toLowerCase()}
function fallback(l){
 const what=String(l?.speaking||'').trim()||'Поговори по теме урока.';
 return make('Разговор по теме: '+String(l?.title||'повседневное общение'),'Nora · собеседница','Hei! Hva vil du snakke om?',[
  ['Выполни первую часть задачи: '+what,'Начать выполнение коммуникативного задания: '+what,'Takk, jeg forstår.'],
  ['Задай собеседнице уместный уточняющий вопрос по теме.','Задать осмысленный вопрос, связанный с темой '+String(l?.title||'урока')+'.','Det er et godt spørsmål. Jeg kan forklare nærmere.'],
  ['Ответь на уточнение и вежливо закончи беседу.','Завершить разговор связной уместной фразой по теме.','Takk for praten!']
 ]);
}
function definition(l){const original=SCENES[normalizeModule(l)]||fallback(l);return window.NEStoryJourney?.sceneFor?.(l,original,make)||original}
const nativeFree=window.freeEx,nativeCheck=window.checkFree;
function ensure(l){
 const s=window.neLessonSession;
 if(!s)return null;
 const scene=definition(l),saved=s.guidedSpeech;
 if(!saved||saved.lessonId!==l.id||!Number.isInteger(saved.index)||saved.index<0||saved.index>=scene.steps.length||!Array.isArray(saved.turns)){
  s.guidedSpeech={lessonId:l.id,index:0,turns:[],flowVersion:2};
 }else if(normalizeModule(l)==='a1-foundation'&&saved.flowVersion!==2){
  // Old seven-turn checkpoints need the added courtesy stage after "Jeg heter Erik".
  // Retain all earlier turns instead of resetting the learner's progress.
  if(saved.index>=4){saved.index=4;saved.turns=saved.turns.slice(0,4);saved.flowNotice=true;}
  saved.flowVersion=2;
 }
 return {session:s,scene,progress:s.guidedSpeech};
}
function actorMessage(scene,text,index){
 // A1 introduction: do not show the person's name before they actually say it.
 const actor=scene===SCENES['a1-foundation']&&index<3?'Сотрудник':scene.actor;
 return '<div class="guided-bubble guided-bubble-actor"><small>'+esc(actor)+'</small><p lang="nb">'+esc(text)+'</p><button class="guided-audio" type="button" onclick="neGuidedSpeak('+index+')">🔊 Прослушать ответ</button></div>';
}
function freeExGuided(l){
 const d=ensure(l);if(!d)return nativeFree(l,'speaking');
 const {scene,progress}=d,step=scene.steps[progress.index];
 const keyHome=normalizeModule(l)==='a1-home'&&(!Number.isInteger(l?._adaptive?.storyVariant)||l._adaptive.storyVariant===0),curated=keyHome?window.NECurated?.get?.('a1-home'):null;
 const support=keyHome?(curated?.speakingSupport||l.speakingSupport):null;
 const translation=support?'<div class="prompt" lang="nb">'+esc(curated?.speaking||'Spør hvor nøkkelen er. Si hvor du leter etter den.')+'</div>'+
  '<details class="grammar-fold a1-task-support" data-translation="on-request"><summary>Перевести задание</summary>'+
  '<div class="notice"><b>Перевод задания:</b> '+esc(support.ru)+'<br><small>'+esc(support.hint)+'</small></div></details>':'';
 const transcript=['<div class="guided-chat-history">',actorMessage(scene,scene.opening,-1)];
 for(let i=0;i<progress.turns.length;i++){
  const turn=progress.turns[i];
  transcript.push('<div class="guided-bubble guided-bubble-user"><small>Ты</small><p lang="nb">'+esc(turn.answer||'')+'</p></div>');
  transcript.push(actorMessage(scene,turn.reply||scene.steps[i].reply,i));
 }
 transcript.push('</div>');
 return '<article class="card guided-speaking"><div class="eyebrow">Устная речь · диалог с собеседником</div>'+
 '<div class="guided-scene">'+esc(scene.scene)+'</div>'+
 translation+
 '<div class="guided-progress">Реплика '+(progress.index+1)+' из '+scene.steps.length+'</div>'+
 transcript.join('')+
 (progress.flowNotice?'<div class="notice" role="status">Диалог обновлён: продолжим с вежливой фразы знакомства. Предыдущие реплики сохранены до этого шага.</div>':'')+
 '<div class="guided-task"><b>Твой ход</b><p>'+esc(step.task)+'</p></div>'+
 '<textarea id="freeAnswer" name="guided-answer-'+esc(l.id)+'-'+progress.index+'" data-guided-turn="'+progress.index+'" class="input" rows="2" autocomplete="off" placeholder="Твой ответ по-норвежски…" oninput="this.dataset.fromVoice=\'false\';neGuidedAnswerEdited(this)"></textarea>'+
 '<div class="row guided-controls speech-actions-v831"><button id="micBtn" class="btn secondary" onclick="toggleMic()">🎤 Говорить</button>'+
 '<button id="guidedSend" class="btn" onclick="checkFree(\'speaking\')">✓ Ответить</button></div>'+
 '<button class="btn ghost" type="button" onclick="neGuidedExplain()">Не понимаю: почему так и что делать?</button>'+
 '<small class="muted">Голосом — тренировка речи. Текстом — тренировка письма. Произношение по расшифровке не оценивается.</small>'+
 '<div id="freeFb" aria-live="polite"></div></article>';
}
window.freeEx=function(l,mode){
 if(mode==='speaking'&&l&&window.neLessonSession&&!window.neLessonSession.remediation&&!window.neLessonSession.speakingFollowup)return freeExGuided(l);
 return nativeFree(l,mode);
};
function neGuidedSpeak(index){
 const d=window.neLessonSession&&ensure(window.neLessonSession.lesson);
 if(!d)return;
 const text=index===-1?d.scene.opening:(d.progress.turns[index]?.reply||d.progress.pending?.reply||d.scene.steps[index]?.reply);
 if(text&&typeof window.speakText==='function')window.speakText(text,.86);
}

async function nextSceneReply(l,scene,progress,answer,spoken,index){
 // The scored answer has ALREADY passed /api/evaluate; a creative reply must
 // never change the score, course evidence or the fixed next learning objective.
 if(typeof window.neApiPost!=='function')return null;
 // A1 name-disclosure and courtesy turns remain authored and predictable.
 if(normalizeModule(l)==='a1-foundation'&&index<=4)return null;
 // Scripted twists have fixed facts (weekday, place, bus) used by later turns.
 // Keep them coherent instead of letting a language model quietly contradict
 // the next question. These are still open, assessed learner conversations.
 if(Number.isInteger(l?._adaptive?.storyVariant)&&l._adaptive.storyVariant>0)return null;
 const next=scene.steps[index+1];
 const history=[{role:'assistant',text:scene.opening}];
 for(const turn of progress.turns.slice(-5)){
  history.push({role:'user',text:String(turn.answer||'').slice(0,400)});
  history.push({role:'assistant',text:String(turn.reply||'').slice(0,400)});
 }
 const ac=typeof window.AbortController==='function'?new window.AbortController():null;
 const timer=ac&&typeof window.setTimeout==='function'?window.setTimeout(()=>ac.abort(),9000):null;
 try{
  const r=await window.neApiPost('/api/chat',{
   message:answer,level:l.level,mode:'roleplay',teacherMode:false,
   inputSource:spoken?'voice_transcript':'typed_text',
   topic:String(l.title||scene.scene).slice(0,150),
   scenario:scene.scene+'. Собеседник: '+scene.actor+'. Ты говоришь от имени собеседника. Ответь естественно на предыдущую реплику, сохраняя согласованную информацию. '+
    (next?'Одним коротким ответом подготовь следующее действие ученика: '+next.task+'. Не показывай его готовый ответ.':'Вежливо заверши разговор без новых заданий.'),
   history
  },ac?{signal:ac.signal}:{});
  if(!r?.ok||!r.data||r.data.accepted===false||r.data.feedback_status==='unverified')return null;
  const reply=String(r.data.reply_no||'').trim();
  // Only one plausible Bokmål turn. Untrusted model markup or Russian replies
  // fall back to the curated authored turn; no penalty for upstream failures.
  if(reply.length<8||reply.length>350||/[<>\u0400-\u04ff]/u.test(reply)||!/\p{Script=Latin}/u.test(reply))return null;
  return reply;
 }catch{return null}
 finally{if(timer!==null)window.clearTimeout(timer)}
}
function guidedGradeFeedback(e,score,ok,firstScore,answer){
 if(typeof window.neAttemptReviewHtml==='function')
  return window.neAttemptReviewHtml(e,{answer,ok,firstScore});
 const issues=Array.isArray(e.issues)?e.issues:[];
 const perfect=ok&&score===100&&issues.length===0;
 const title=perfect?'Ответ принят без ошибок':ok?'Ответ принят с замечаниями':'Ответ пока не принят';
 const parts=['<b>'+title+' · '+score+'/100</b>',
  '<p><small>Проверен текст: <span lang="nb">'+esc(String(answer||'').slice(0,700))+'</span></small></p>'];
 if(firstScore!==undefined){
  parts.push('<p><small>Первая оценка: '+firstScore+'/100 (для прогресса). '+
   (firstScore===score?'':'Текущая оценка исправления: '+score+'/100. ')+
   'За исправления XP повторно не начисляются.</small></p>');
 }
 if(perfect)parts.push('<p>Задание выполнено, подтверждённых ошибок нет.</p>');
 else{
  if(e.explanation_ru)parts.push('<p>'+esc(e.explanation_ru)+'</p>');
  if(e.score_reason_ru)parts.push('<p><small>'+esc(e.score_reason_ru)+'</small></p>');
  if(e.corrected&&String(e.corrected).trim()!==String(answer||'').trim())
   parts.push('<p><b>Естественный вариант:</b> <span lang="nb">'+esc(e.corrected)+'</span></p>');
 }
 return '<div class="feedback '+(ok?'good':'bad')+'" role="status">'+parts.join('')+'</div>';
}
// Once a reply has been accepted, allow unlimited formative corrections of
// THIS turn. Editing invalidates the accepted response and its outdated feedback,
// but never changes firstScores or credits progress a second time.
function neGuidedRevise(){
 const s=window.neLessonSession,p=s?.guidedSpeech,field=document.getElementById('freeAnswer');
 if(!s||!p?.pending||!field||p.lessonId!==s.lesson?.id)return;
 delete p.pending;
 delete p.lastCheckedAnswer;
 s.locked=false;
 const box=document.getElementById('freeFb');
 if(box)box.innerHTML='<div class="feedback" role="status">Ответ изменён. Нажми «Ответить», чтобы проверить текущий текст ещё раз. Первая оценка и XP сохраняются.</div>';
 field.focus?.();
}
function neGuidedAnswerEdited(field){
 const s=window.neLessonSession,p=s?.guidedSpeech;
 if(!s||!p||p.lessonId!==s.lesson?.id||!field||
    field!==document.getElementById('freeAnswer')||
    String(field.dataset?.guidedTurn)!==String(p.index))return;
 const value=field.value.trim();
 if(p.pending){if(value!==p.pending.answer)neGuidedRevise();return;}
 if(typeof p.lastCheckedAnswer==='string'&&value!==p.lastCheckedAnswer){
  delete p.lastCheckedAnswer;
  const box=document.getElementById('freeFb');
  if(box)box.innerHTML='<div class="feedback" role="status">Ответ изменён. Предыдущая оценка относится к старому тексту. Нажми «Ответить», чтобы проверить новый.</div>';
 }
}
async function guidedCheck(){
 const s=window.neLessonSession,l=s?.lesson,d=l&&ensure(l),input=document.getElementById('freeAnswer'),a=input?.value.trim(),box=document.getElementById('freeFb');
 if(!d||!input||!box||!a||s.locked)return;
 const {scene,progress}=d,step=scene.steps[progress.index],spoken=['true','recognition'].includes(String(input.dataset.fromVoice||'')),index=progress.index;
 s.locked=true;box.innerHTML='<div class="feedback">Нора проверяет реплику…</div>';
 const context=progress.index===0?scene.opening:(progress.turns[progress.index-1]?.reply||scene.steps[progress.index-1].reply);
 const history=progress.turns.slice(-5).map((t,n,arr)=>{
  const turnIndex=progress.turns.length-arr.length+n;
  return 'Ученик: '+String(t.answer||'').slice(0,350)+'; '+scene.actor+': '+String(t.reply||scene.steps[turnIndex].reply).slice(0,350);
 }).join(' | ');
 const question='Сцена: '+scene.scene+'. '+(history?'Предыдущие реплики: '+history+'. ':'')+
  'Собеседник '+scene.actor+' сказал: «'+context+'». Текущее действие ученика: '+step.task;
 const goal='Проверь только ЭТУ реплику ученика, не весь разговор. '+step.goal+
  ' Принимай естественные варианты с тем же смыслом, включая уместные формы вежливости. '+
  'Одно приветствие не заменяет требуемый вопрос или ответ по теме. '+
  'Не требуй дословного повторения и не оценивай будущие этапы.';
 const r=await window.aiEvaluate({answer:a,question,goal,level:l.level,mode:spoken?'speaking_dialogue':'writing_dialogue'});
 if(window.neLessonSession!==s||!box.isConnected||progress.index!==index){s.locked=false;return}
 if(input.value.trim()!==a){s.locked=false;box.innerHTML='<div class="feedback">Ответ изменён во время проверки. Нажми «Ответить» ещё раз.</div>';return}
 if(!r.ok){
  const detail=typeof window.evaluationErrorMessage==='function'?window.evaluationErrorMessage(r.error):
   'Нора не завершила проверку. Ответ сохранён, оценка и прогресс не изменены.';
  s.locked=false;box.innerHTML='<div class="feedback bad" role="status">'+esc(detail)+'</div>';
  return;
 }
 const e=r.data||{},score=Math.min(100,Math.max(0,Math.round(Number(e.score)||0))),
  ok=e.accepted===true&&score>=({A1:65,A2:68,B1:72,B2:75}[l.level]||65),skill=spoken?'speaking':'writing',evidence=e.accepted===true?score:Math.min(40,score);
 // Only the first verified attempt of each turn contributes to course evidence.
 // Revisions show an updated grade but cannot award XP repeatedly.
 progress.firstScores=progress.firstScores&&typeof progress.firstScores==='object'&&!Array.isArray(progress.firstScores)?progress.firstScores:{};
 const scoreKey=String(index),firstAttempt=!Object.prototype.hasOwnProperty.call(progress.firstScores,scoreKey);
 if(firstAttempt){
  progress.firstScores[scoreKey]=score;
  window.trackLessonScore(evidence,{label:spoken?'Реплика · речь':'Реплика · текст',strength:e.strengths_ru?.[0]||'',improvement:e.improvements_ru?.[0]||'',explanation:e.explanation_ru||'',corrected:e.corrected||'',rule:e.micro_rule_ru||'',scoreReason:e.score_reason_ru||''});
  if(window.NEAdaptive){
   window.NEAdaptive.recordAttempt(window.neLearnerState,{level:l.level,skill,score:evidence,moduleId:l?._adaptive?.moduleId||l.id,source:spoken?'lesson_free':'lesson_free_text',errorTag:e.error_tag||'',targetErrorTag:l?._adaptive?.errorTag||'',transfer:!!l?._adaptive?.transfer,reviewKey:l?._adaptive?.reviewKey||''});
   window.saveState();
  }
  window.persistLessonCheckpoint?.();
 }
 progress.lastCheckedAnswer=a;
 const feedback=guidedGradeFeedback(e,score,ok,progress.firstScores[scoreKey],a);
 if(!ok){
  s.locked=false;
  // The contextual help button already appears beside the answer field.
  box.innerHTML=feedback;
  input.focus();return;
 }
 const reply=await nextSceneReply(l,scene,progress,a,spoken,index)||step.reply;
 if(window.neLessonSession!==s||!box.isConnected||progress.index!==index){s.locked=false;return}
 // The learner can edit while the AI prepares the next character's reply.
 // Never attach a grade or a "next" button to a changed answer.
 if(input.value.trim()!==a){s.locked=false;box.innerHTML='<div class="feedback">Ответ изменён. Проверь новый текст ещё раз.</div>';return}
 progress.pending={answer:a,spoken,reply};
 box.innerHTML=feedback+'<div class="guided-reply">'+actorMessage(scene,reply,index)+'</div>'+ 
  '<button type="button" class="btn secondary" onclick="neGuidedRevise()">Исправить ещё</button>'+
  '<button class="btn lesson-next-v8" onclick="neGuidedNext()">'+(index===scene.steps.length-1?'Завершить разговор →':'Следующая реплика →')+'</button>';
 if(typeof window.speakText==='function'){try{window.speakText(reply,.86)}catch{}}
}
function neGuidedExplain(){
 const s=window.neLessonSession,d=s?.lesson&&ensure(s.lesson);
 const input=document.getElementById('helpQuestionV7');
 const panel=document.getElementById('helpPanelV7');
 if(typeof window.v7OpenHelp==='function'&&panel?.hidden)window.v7OpenHelp();
 const field=document.getElementById('helpQuestionV7')||input;
 if(!field)return;
 const task=d?.scene?.steps?.[d.progress.index]?.task||'текущий вопрос';
 field.value='Объясни по-русски простыми словами, почему в этом задании нужно именно так строить фразу: '+String(task).slice(0,350)+'. Что я должен сделать по шагам? Приведи ДРУГОЙ короткий пример и объясни его. Не давай готового ответа на моё текущее задание.';
 if(typeof window.v7AskHelp==='function'){
  panel?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
  window.v7AskHelp();
 }else field.focus();
}
function neGuidedNext(){
 const s=window.neLessonSession,d=s?.lesson&&ensure(s.lesson);
 if(!d||!s.locked||!d.progress.pending)return;
 const p=d.progress,answer=p.pending.answer,spoken=p.pending.spoken;
 if(document.getElementById('freeAnswer')?.value.trim()!==answer){neGuidedRevise();return;}
 // Discard the accepted turn BEFORE changing the active prompt. The original
 // answer remains in the dialogue history, not in the next editable field.
 window.neDiscardAcceptedGuidedDraft?.(s);
 p.turns.push({answer:String(answer).slice(0,700),spoken,reply:p.pending.reply||d.scene.steps[p.index].reply});
 p.index++;delete p.pending;delete p.lastCheckedAnswer;delete p.flowNotice;s.locked=false;
 if(p.index>=d.scene.steps.length){
  p.index=d.scene.steps.length-1;
  window.lessonNext(20);
  return;
 }
 window.persistLessonCheckpoint();window.renderLesson();
}
window.checkFree=function(mode){
 if(mode==='speaking'&&window.neLessonSession&&!window.neLessonSession.remediation&&!window.neLessonSession.speakingFollowup)return guidedCheck();
 return nativeCheck(mode);
};
window.neGuidedNext=neGuidedNext;
window.neGuidedRevise=neGuidedRevise;
window.neGuidedAnswerEdited=neGuidedAnswerEdited;
window.neGuidedExplain=neGuidedExplain;
window.neGuidedSpeak=neGuidedSpeak;
window.NEGuidedSpeaking=Object.freeze({definition,sceneIds:Object.keys(SCENES),normalizeModule});
})();