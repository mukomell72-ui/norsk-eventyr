// Distinct authored continuations of the same verified curriculum objectives.
// Each tuple is [scene, actor, opening, [learner action, natural reply] x3].
(function(){
'use strict';
const c=(scene,actor,opening,a,b,d)=>[scene,actor,opening,[a,b,d].map(([task,reply])=>[task,task,reply])];
const advanced={
'a1-foundation':[
 c('Нора знакомит тебя с соседкой в библиотеке.','Nora · знакомая','Hei! Jeg heter Nora. Hva heter du?',
 ['Поздоровайся и представься.','Hyggelig å møte deg!'],['Скажи, откуда ты и где живёшь сейчас.','Så fint! Snakker du norsk?'],['Ответь о языках и задай встречный вопрос.','Ja, jeg snakker norsk. Vi sees!']),
 c('Ингрид встречает тебя в кафе и интересуется твоим первым днём в городе.','Ingrid · соседка','Hei! Er du ny her?',
 ['Поздоровайся и скажи, как тебя зовут.','Jeg heter Ingrid. Hvor kommer du fra?'],['Назови страну и место жительства.','Velkommen! Jobber du her?'],['Ответь о работе или учёбе и попрощайся.','Takk for praten!'])
],
'a2-story':[
 c('Нора пропустила автобус в выходные и делится историей.','Nora · знакомая','Jeg mistet bussen i helgen!',
 ['Расскажи, что сам делал в выходные.','Hva gjorde du etterpå?'],['Расскажи, что произошло затем и почему.','Og hva skal du gjøre neste helg?'],['Назови планы на следующие выходные и спроси о её планах.','Jeg vil prøve en ny tur!']),
 c('Ида показывает фотографии со вчерашнего праздника.','Ida · коллега','Vi hadde en hyggelig kveld i går.',
 ['Опиши одно событие вчерашнего вечера.','Var det annerledes før?'],['Сравни, как проводил вечера раньше и сейчас.','Hva skal du gjøre i morgen?'],['Назови завтрашний план и объясни почему.','Lykke til!'])
],
'a2-work':[
 c('На собеседовании работодателю срочно нужен сотрудник на вечер.','Mari · руководитель','Fortell litt om erfaringen din.',
 ['Расскажи о рабочем опыте.','Vi trenger noen til kveldsvakt.'],['Спроси, какие часы у вечерней смены.','Fra fire til ti.'],['Скажи, подходит ли график и когда можешь начать.','Vi tar kontakt!']),
 c('Ида хочет поменяться рабочими сменами.','Ida · коллега','Kan du jobbe på fredag i stedet for torsdag?',
 ['Ответь, можешь ли помочь, и объясни почему.','Jeg må være ferdig før fem.'],['Уточни точное начало смены.','Vi starter klokka ni.'],['Подтверди договорённость или предложи компромисс.','Det høres bra ut.'])
],
'a2-services':[
 c('Арендодатель готов прислать специалиста, но нужно согласовать время.','Thomas · арендодатель','Hva er problemet i leiligheten?',
 ['Опиши неисправность и когда она возникла.','Jeg kan sende noen i morgen.'],['Уточни, во сколько специалист придёт.','Rundt klokka ti.'],['Подтверди визит и поблагодари.','Da sees vi i morgen.']),
 c('В квартире протекает раковина, но сервис предлагает неудобное время.','Sofie · диспетчер','Hei! Hva trenger du hjelp med?',
 ['Объясни проблему и попроси ремонт.','Vi kan komme fredag kveld.'],['Предложи другое время с объяснением причины.','Vi har tid torsdag morgen.'],['Подтверди новый план и попроси сообщение заранее.','Jeg sender en melding.'])
],
'a2-digital':[
 c('Нора помогает подать онлайн-заявление, но форму сложно найти.','Erik · консультант','Du kan sende søknaden på nettsiden vår.',
 ['Объясни, какой документ требуется отправить.','Du finner skjemaet under tjenester.'],['Уточни место формы и нужен ли вход.','Ja, du må logge inn først.'],['Перескажи порядок действий и поблагодари.','Lykke til!']),
 c('Регистрация на курс прошла без подтверждения.','Ingrid · консультант','Hei! Hva gjelder henvendelsen?',
 ['Объясни проблему отсутствующего подтверждения.','Jeg kan sjekke registreringen.'],['Спроси, нужны ли дополнительные сведения.','Nei, alt er registrert.'],['Попроси письменное подтверждение и поблагодари.','Det sender vi i dag.'])
],
'a2-health':[
 c('На учебном приёме врач уточняет время появления симптома.','Anna · врач','Hvordan har du hatt det de siste dagene?',
 ['Опиши самочувствие и как давно появился симптом.','Har du hatt det slik før?'],['Ответь о прошлом опыте и спроси рекомендацию.','Det er lurt å hvile.'],['Уточни, в каком случае обращаться повторно.','Ta kontakt hvis det blir verre.']),
 c('Ты переносишь запись, потому что не успеваешь к врачу.','Erik · регистратор','Du har time klokka ti i morgen.',
 ['Объясни, почему не можешь прийти вовремя.','Vi har ledig tid klokka tolv.'],['Уточни возможность переноса на двенадцать.','Ja, det kan vi.'],['Подтверди новое время и поблагодари.','Da sees vi i morgen.'])
],
'a2-opinion':[
 c('Нора предпочитает автобус, но ты думаешь иначе.','Nora · коллега','Jeg tar vanligvis bussen. Hva foretrekker du?',
 ['Назови предпочтительный транспорт и причину.','Bussen er ofte billigere.'],['Сравни два варианта с учётом цены.','Det er sant.'],['Предложи вариант для дождливого дня.','God idé!']),
 c('Ингрид хочет чаще гулять зимой, несмотря на гололёд.','Ingrid · соседка','Jeg vil gå mer til fots i vinter.',
 ['Выскажи мнение о зимних прогулках с причиной.','Men det kan være glatt.'],['Предложи безопасный вариант.','Vi kan gå når været er bra.'],['Согласись или предложи компромисс и объясни его.','Det passer bra!'])
],
'a2-media':[
 c('Нора услышала новость об изменении автобусного расписания.','Nora · знакомая','Bussene får visst nye tider neste uke.',
 ['Уточни, что именно меняется.','Det blir en ekstra avgang om morgenen.'],['Перескажи главное своими словами.','Ja, det stemmer.'],['Спроси, где проверить официальное расписание.','På transportselskapets nettside.']),
 c('Сосед показывает плакат без ясного времени мероприятия.','Nils · сосед','Har du sett plakaten om arrangementet?',
 ['Уточни день и время мероприятия.','Det står lørdag, men ikke tidspunktet.'],['Объясни, что известно точно, а что неизвестно.','Vi bør spørre arrangøren.'],['Предложи способ проверить информацию.','La oss gjøre det!'])
],
'a2-transfer':[
 c('Билет Норы потерялся перед поездкой.','Sara · сотрудница','Hei! Hva kan jeg hjelpe deg med?',
 ['Объясни проблему и спроси о вариантах.','Du kan finne billetten i appen.'],['Уточни, что делать, если приложение не работает.','Da hjelper vi deg i skranken.'],['Перескажи план действий и поблагодари.','God tur!']),
 c('На мероприятии закрыли основной вход.','Ingrid · организатор','Hovedinngangen er stengt i dag.',
 ['Спроси, где теперь вход.','Gå rundt bygningen.'],['Уточни, сколько займёт путь.','Det tar fem minutter.'],['Перескажи маршрут и поблагодари.','Velkommen inn!'])
],
'b1-narrative':[
 c('Ида спрашивает о неожиданной остановке работы.','Ida · коллега','Hva skjedde da strømmen gikk i går?',
 ['Связно расскажи о событиях и первой реакции людей.','Hvordan løste dere det?'],['Объясни решение и причины.','Hva lærte du av situasjonen?'],['Сформулируй вывод на будущее с примером.','Det er nyttig erfaring.']),
 c('Нора вспоминает помощь незнакомца во время поездки.','Nora · знакомая','Har noen hjulpet deg i en vanskelig situasjon?',
 ['Расскажи конкретный случай помощи.','Hva skjedde etterpå?'],['Опиши продолжение и результат истории.','Hva lærte du av dette?'],['Подведи итог и вырази отношение к событию.','Takk for historien!'])
],
'b1-work':[
 c('Срок выполнения заказа под угрозой.','Henrik · руководитель','Vi rekker ikke fristen. Hva er årsaken?',
 ['Объясни причины задержки, отделяя факты от предположений.','Hva foreslår du nå?'],['Предложи план и приоритеты.','Men vi trenger hjelp.'],['Согласуй распределение обязанностей и срок.','Jeg kontakter kunden.']),
 c('Нора не понимает, кто должен заказать материалы.','Nora · коллега','Vi må organisere oppgavene før fredag.',
 ['Предложи распределение работы с аргументом.','Men vi mangler materiell.'],['Предложи решение нехватки материалов.','Hvem bør bestille det?'],['Договорись, кто сделает заказ и когда.','Da har vi en plan.'])
],
'b1-formal':[
 c('Ты уточняешь срок рассмотрения зарегистрированного заявления.','Ingrid · консультант','Jeg ser at saken din er registrert.',
 ['Вежливо объясни причину повторного обращения.','Beklager ventetiden.'],['Спроси о новом сроке и письменном ответе.','Vi forventer svar neste uke.'],['Подведи итог договорённости официальным тоном.','Jeg sender en bekreftelse.']),
 c('Учреждение не видит уже отправленный документ.','Erik · консультант','Vi mangler ett vedlegg i søknaden.',
 ['Сообщи, когда отправлял документ и почему важна проверка.','Jeg skal sjekke arkivet.'],['Уточни, нужна ли повторная отправка.','Nei, jeg fant dokumentet.'],['Попроси подтвердить комплектность заявления письменно.','Det sender vi i dag.'])
],
'b1-problem':[
 c('Сосед делает ремонт рано утром.','Anders · сосед','Beklager at vi begynte så tidlig.',
 ['Вежливо объясни последствия шума.','Hvilket tidspunkt passer bedre?'],['Предложи компромисс по времени.','Vi kan begynne etter klokka ni.'],['Подтверди договорённость и поблагодари.','Takk for forståelsen.']),
 c('Служба поддержки выясняет, почему посылка пришла не туда.','Sofie · консультант','Hva har skjedd med leveringen?',
 ['Изложи проблему доставки по порядку.','Vi kan undersøke saken.'],['Запроси срок решения и следующий шаг.','Vi svarer deg i morgen.'],['Подтверди согласованный порядок и поблагодари.','Takk for tålmodigheten.'])
],
'b1-news':[
 c('Слух о закрытии маршрута распространился в местной группе.','Nora · знакомая','Noen skriver at bussruta skal legges ned.',
 ['Объясни, что пока не подтверждено.','Hvor kan vi sjekke det?'],['Предложи официальный источник для проверки.','Jeg fant en melding fra selskapet.'],['Перескажи, что изменилось после проверки.','Bra at vi undersøkte saken.']),
 c('Коллега делает вывод «все» из заголовка «многие».','Ida · коллега','Mange ønsker å jobbe hjemmefra, står det.',
 ['Передай фактический смысл сообщения.','Betyr det at alle vil jobbe hjemme?'],['Объясни различие между «многие» и «все».','Godt poeng. Hva mener du selv?'],['Отдели собственное мнение от утверждения газеты.','En nyansert vurdering.'])
],
'b1-argument':[
 c('На работе спорят о переходе всех совещаний в онлайн.','Maja · коллега','Alle møter burde være digitale.',
 ['Обоснуй свою позицию.','Digitale møter sparer mye tid.'],['Признай довод собеседницы и укажи ограничение.','Hva foreslår du i stedet?'],['Предложи аргументированный компромисс.','Det kan vi prøve.']),
 c('Нора спрашивает об увеличении часов библиотеки.','Nora · знакомая','Burde biblioteket være åpent lenger?',
 ['Выскажи мнение и объясни пользу жителям.','Men det kan koste mer.'],['Учти финансовое возражение.','Hva slags løsning ser du?'],['Предложи компромисс с обоснованием.','Det høres fornuftig ut.'])
],
'b1-presentation':[
 c('На собеседовании просят привести сложный рабочий пример.','Ola · интервьюер','Fortell om erfaringen din.',
 ['Представь свой опыт и сильную сторону.','Hvordan håndterer du problemer?'],['Приведи конкретный пример решения трудности.','Hva vil du lære videre?'],['Обоснуй цель профессионального развития.','Takk for gode svar.']),
 c('На собрании соседей Нора просит представить инициативу.','Nora · организатор','Kan du presentere forslaget ditt kort?',
 ['Обозначь проблему и свою идею.','Hva får beboerne ut av dette?'],['Объясни пользу на примере.','Hvem skal organisere arbeidet?'],['Назови ответственных и следующий шаг.','Da tar vi det videre.'])
],
'b1-transfer':[
 c('Поезд отменён, но предложенный автобус может быть переполнен.','Sara · сотрудница','Toget ditt er dessverre innstilt.',
 ['Выясни альтернативы и ограничения по времени.','Bussen går snart, men er ofte full.'],['Оцени вариант и уточни другие возможности.','Neste tog går om en time.'],['Выбери решение с аргументом и спроси место отправления.','Jeg viser deg plattformen.']),
 c('Комната для рабочего собрания занята.','Ida · коллега','Møterommet er opptatt i ettermiddag.',
 ['Спроси об альтернативном помещении или времени.','Det lille rommet er ledig etter tre.'],['Предложи план с учётом размера группы.','Ja, det passer for alle.'],['Сформулируй договорённость и следующий шаг.','Jeg sender invitasjonene.'])
],
'b2-argument':[
 c('Руководство обсуждает четырёхдневную рабочую неделю.','Henrik · руководитель','Kan en kortere arbeidsuke fungere hos oss?',
 ['Сформулируй позицию с условиями её применимости.','Men enkelte oppgaver kan ikke vente.'],['Признай риск и предложи компенсационную меру.','Hvordan skal vi måle effekten?'],['Предложи критерии оценки пилотного проекта.','Da har vi et utgangspunkt.']),
 c('Нора предлагает полностью цифровые общественные услуги.','Nora · коллега','Bør alle tjenester bli digitale?',
 ['Проанализируй выгоды и риски для разных групп.','Men digitale løsninger er billigere.'],['Ответь на экономический довод и назови ограничение.','Hva slags kompromiss foreslår du?'],['Дай нюансированную рекомендацию.','Det er verdt å undersøke.'])
],
'b2-formal':[
 c('В решении учреждения не указано основание отказа.','Ingrid · консультант','Hva ønsker du å få avklart?',
 ['Точно сформулируй предмет официального обращения.','Hvilke opplysninger mangler?'],['Укажи конкретные недостающие основания и документы.','Vi må undersøke saken nærmere.'],['Попроси письменное объяснение и срок ответа.','Jeg sender en bekreftelse.']),
 c('Организация просит уточнить слишком общий запрос.','Erik · rådgiver','Kan du presisere hva henvendelsen gjelder?',
 ['Переформулируй запрос в точном официальном стиле.','Har du relevant dokumentasjon?'],['Поясни, какие материалы подтверждают обращение.','Vi går gjennom dette.'],['Уточни дальнейший порядок рассмотрения.','Vi svarer skriftlig.'])
],
'b2-negotiation':[
 c('Новый график работы вызывает спор в коллективе.','Knut · руководитель','Vi vil endre arbeidstidene neste måned.',
 ['Выясни интересы сторон и цель изменений.','Vi trenger bedre bemanning på kvelden.'],['Предложи взаимовыгодную альтернативу.','Men det kan bli dyrere.'],['Ответь на возражение и согласуй эксперимент.','Vi kan prøve i fire uker.']),
 c('Поставщик переносит срок доставки.','Sofie · leverandør','Leveransen blir dessverre forsinket.',
 ['Выясни причину и последствия задержки.','Vi mangler en viktig del.'],['Предложи реалистичную временную альтернативу.','Vi kan sende halvparten nå.'],['Согласуй срок и письменное подтверждение.','Jeg bekrefter dette på e-post.'])
],
'b2-range':[
 c('Коллеги по-разному воспринимают прямую обратную связь.','Nora · коллега','Hvor direkte bør tilbakemeldinger være?',
 ['Сопоставь пользу и риски прямой критики.','Noen opplever det som ubehagelig.'],['Предложи подход без культурных стереотипов.','Hvordan ville du sagt det?'],['Приведи деликатную, но точную формулировку.','Det var respektfullt og tydelig.']),
 c('Новые сотрудники неверно поняли рабочую инструкцию.','Ida · коллега','De nye ansatte tolket beskjeden annerledes.',
 ['Предложи несколько объяснений без поспешных выводов.','Vi bruker kanskje for mye sjargong.'],['Объясни, как упростить сообщение без потери точности.','Hvordan vet vi at alle forstår?'],['Предложи проверку взаимопонимания.','Det bør vi prøve.'])
],
'b2-synthesis':[
 c('Два материала по-разному описывают одну транспортную инициативу.','Nora · знакомая','To artikler beskriver forslaget forskjellig.',
 ['Укажи, какие конкретные утверждения нужно проверить.','Den ene bygger på en pressemelding.'],['Оцени ограничение источника и недостающие данные.','Den andre viser til en undersøkelse.'],['Предложи порядок сопоставления и осторожный вывод.','Da kan vi konkludere bedre.']),
 c('Отчёт называет проект успешным, но изучено не всё.','Henrik · коллега','Rapporten beskriver prosjektet som en suksess.',
 ['Уточни, какие данные поддерживают этот вывод.','Vi har målt tilfredshet, men ikke kostnader.'],['Объясни недостаток вывода и предложи проверку.','Hvilke tall bør vi se på først?'],['Обозначь приоритетные данные и взвешенное заключение.','Det blir mer balansert.'])
],
'b2-capstone':[
 c('Клиент недоволен исправлением, которое породило новую проблему.','Ingrid · руководитель','Kunden er fortsatt misfornøyd.',
 ['Выясни ожидания клиента и ограничения компании.','Vi kan rette feilen, men det tar tid.'],['Сравни решения и обозначь риски.','Hvordan forklarer vi dette til kunden?'],['Предложи план коммуникации и критерии результата.','Da har vi en plan.']),
 c('Муниципальная инициатива должна экономить средства, оставаясь доступной.','Sofie · prosjektleder','Vi må redusere kostnadene uten å svekke tilbudet.',
 ['Определи конфликтующие интересы и критерии успеха.','Et digitalt alternativ kan spare tid.'],['Взвесь выгоды и ограничения цифрового варианта.','Hvordan kan vi teste forslaget?'],['Предложи пилот с измеримыми критериями.','Det er et godt grunnlag.'])
],
'b2-listening':[
 c('Нора просит сопоставить позиции участников сложной дискуссии.','Nora · коллега','De var enige om målet, men uenige om metoden.',
 ['Перескажи обе позиции и их общий мотив.','Den ene la vekt på tid, den andre på kvalitet.'],['Объясни, почему важен этот контраст.','Men hva mener de med kvalitet?'],['Сформулируй уточнение и осторожный вывод.','Da blir forskjellen tydeligere.']),
 c('Ида пересказывает лекцию с оговорками и косвенными намёками.','Ida · коллега','Foredragsholderen var positiv, men hadde forbehold.',
 ['Определи общий настрой и главные оговорки.','Det gjaldt særlig kostnader og effekt.'],['Свяжи детали с аргументом и назови позицию.','Hvordan ville du oppsummert det?'],['Передай доводы своими словами без потери оттенков.','Ja, det gjengir poenget godt.'])
],
'b2-presentation':[
 c('Нора просит представить рабочий процесс новым коллегам.','Nora · коллега','Kan du forklare rutinen til de nye ansatte?',
 ['Обозначь цель и основные этапы выступления.','Men hva betyr det i praksis?'],['Объясни сложный этап на простом примере.','Hva gjør vi hvis noe går galt?'],['Ответь на неожиданный вопрос и заверши выводом.','Takk, nå er det mye tydeligere.']),
 c('Нужно представить инициативу незнакомой аудитории.','Sofie · организатор','Du har tre minutter til å presentere forslaget.',
 ['Начни структурированно, обозначив главную мысль.','Noen lurer på hva dette vil koste.'],['Переформулируй пользу и ограничения понятным языком.','Hva bør vi huske?'],['Суммируй идею и ответь на вопрос аудитории.','Takk for en klar presentasjon.'])
],
};
window.NEStoryAdvanced=Object.freeze(advanced);
})();