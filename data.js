const LEVELS=["A1","A2","B1","B2"];
const COURSE=[
{id:"a1-1",level:"A1",title:"Знакомство",icon:"👋",grammar:"Jeg heter … / Hva heter du?",phrase:"Hei! Jeg heter Erik. Hva heter du?",ru:"Привет! Меня зовут Эрик. Как тебя зовут?",vocab:[["hei","привет"],["heter","зовусь"],["navn","имя"],["hyggelig","приятно"]],read:"Sara sier: «Hei, jeg heter Sara. Jeg kommer fra Polen.»",q:"Откуда Сара?",opts:["Norge","Polen","Sverige","Danmark"],correct:1,writing:"Представься: имя, откуда ты и где живёшь. 2–3 предложения.",speaking:"Представься и скажи, откуда ты."},
{id:"a1-2",level:"A1",title:"Дом и семья",icon:"🏠",grammar:"en/ei/et",phrase:"Jeg bor sammen med familien min.",ru:"Я живу вместе со своей семьёй.",vocab:[["familie","семья"],["hus","дом"],["rom","комната"],["bor","живу"]],read:"Ola bor i en liten leilighet. Han har ett soverom, et kjøkken og en stue.",q:"Сколько спален у Олы?",opts:["Ingen","Ett","To","Tre"],correct:1,writing:"Опиши, где и с кем ты живёшь.",speaking:"Расскажи коротко о своём доме."},
{id:"a1-3",level:"A1",title:"Время и покупки",icon:"🛒",grammar:"klokka / Jeg vil ha …",phrase:"Jeg vil ha et brød og en liter melk.",ru:"Я хочу хлеб и литр молока.",vocab:[["brød","хлеб"],["melk","молоко"],["koster","стоит"],["butikk","магазин"]],read:"Butikken stenger klokka 18. Kari kommer klokka 17.30.",q:"Успеет ли Кари в магазин?",opts:["Ja","Nei","Bare søndag","Текста недостаточно"],correct:0,writing:"Напиши список покупок и спроси цену одного товара.",speaking:"Попроси товар и спроси его цену."},
{id:"a1-4",level:"A1",title:"Транспорт и здоровье",icon:"🚌",grammar:"til/fra/med · Jeg har vondt i …",phrase:"Jeg tar bussen til legen klokka ti.",ru:"Я еду к врачу на автобусе в десять.",vocab:[["buss","автобус"],["lege","врач"],["time","приём"],["holdeplass","остановка"]],read:"Lina har legetime tirsdag klokka 10. Bussen går 09.20.",q:"Когда приём у Лины?",opts:["Mandag 10","Tirsdag 10","Tirsdag 09.20","Onsdag 10"],correct:1,writing:"Напиши короткое сообщение врачу: что болит и что тебе нужно.",speaking:"Попроси запись к врачу и назови удобное время."},

{id:"a2-1",level:"A2",title:"Работа",icon:"💼",grammar:"presens / infinitiv / модальные глаголы",phrase:"Jeg jobber deltid og kan arbeide både morgen og kveld.",ru:"Я работаю неполный день и могу работать утром и вечером.",vocab:[["arbeidstid","рабочее время"],["stilling","должность"],["søknad","заявление"],["erfaring","опыт"]],read:"Nora søker jobb i en barnehage. Hun har erfaring fra renhold og kan begynne neste uke.",q:"Какой опыт есть у Норы?",opts:["Renhold","Butikk","Kjøkken","Kontor"],correct:0,writing:"Напиши 4–5 предложений о своём опыте работы.",speaking:"Расскажи работодателю о своём опыте и доступном времени."},
{id:"a2-2",level:"A2",title:"Жильё и услуги",icon:"🏛️",grammar:"må / bør / kan",phrase:"Jeg må sende dokumentene før fristen på fredag.",ru:"Я должен отправить документы до пятницы.",vocab:[["frist","срок"],["skjema","форма"],["vedtak","решение"],["dokument","документ"]],read:"Kommunen ber om dokumentasjon innen 15. oktober. Den kan lastes opp digitalt eller leveres på servicetorget.",q:"Как можно подать документы?",opts:["Bare post","Bare personlig","Digitalt eller på servicetorget","Kun telefon"],correct:2,writing:"Напиши короткий официальный запрос в kommunen о статусе дела.",speaking:"Спроси в kommunen, какие документы нужны."},
{id:"a2-3",level:"A2",title:"Планы и прошлое",icon:"📅",grammar:"skal · preteritum · perfektum",phrase:"I fjor begynte jeg på norskkurs, og i helgen skal jeg besøke venner.",ru:"В прошлом году я начал курс, а на выходных навещу друзей.",vocab:[["begynte","начал"],["har bodd","жил до настоящего"],["helg","выходные"],["reise","поездка"]],read:"Før jobbet Daniel på restaurant. Nå jobber han på lager.",q:"Где Даниэль работает сейчас?",opts:["Restaurant","Lager","Skole","Sykehus"],correct:1,writing:"Напиши, чем ты занимался раньше и что делаешь сейчас.",speaking:"Расскажи об изменении в своей жизни."},
{id:"a2-4",level:"A2",title:"Мнение и причины",icon:"💬",grammar:"fordi / derfor / men",phrase:"Jeg foretrekker bussen fordi det er billigere, men toget er raskere.",ru:"Я предпочитаю автобус, потому что он дешевле, но поезд быстрее.",vocab:[["fordi","потому что"],["derfor","поэтому"],["enig","согласен"],["foretrekker","предпочитаю"]],read:"Kari sykler til jobb fordi det er sunt. Mannen hennes tar bilen fordi han jobber langt unna.",q:"Почему Кари ездит на велосипеде?",opts:["Det er gratis","Det er sunt","Hun har ikke bil","Jobben er langt unna"],correct:1,writing:"Вырази мнение о транспорте и объясни его двумя причинами.",speaking:"Скажи, какой транспорт ты предпочитаешь и почему."},

{id:"b1-1",level:"B1",title:"Рабочая жизнь",icon:"🧰",grammar:"сложные предложения и порядок слов",phrase:"Selv om jobben kan være krevende, liker jeg at arbeidsdagen er variert.",ru:"Хотя работа может быть сложной, мне нравится разнообразный рабочий день.",vocab:[["arbeidsmiljø","рабочая среда"],["ansvar","ответственность"],["overtid","сверхурочные"],["opplæring","обучение"]],read:"Ansatte kan starte mellom klokka 7 og 9, men må være tilgjengelige mellom 9 og 14.",q:"Что обязательно?",opts:["Start kl. 7","Tilgjengelig 9–14","Hjemmekontor","Overtid"],correct:1,writing:"Напиши работодателю аргументированное сообщение о желаемом графике.",speaking:"Объясни, что важно для тебя в хорошем рабочем месте."},
{id:"b1-2",level:"B1",title:"Официальные обращения",icon:"✉️",grammar:"пассив и формальный стиль",phrase:"Søknaden blir behandlet så snart all dokumentasjon er mottatt.",ru:"Заявление рассмотрят после получения всех документов.",vocab:[["behandles","рассматривается"],["henvendelse","обращение"],["bekrefte","подтвердить"],["oppfølging","последующие действия"]],read:"Digitale tjenester skal være tilgjengelige hele døgnet, selv om servicetorget får kortere åpningstid.",q:"Что останется доступным круглосуточно?",opts:["Servicetorget","Digitale tjenester","Telefonen","Biblioteket"],correct:1,writing:"Напиши вежливое напоминание по ранее отправленному запросу.",speaking:"Спроси о статусе ранее поданного обращения."},
{id:"b1-3",level:"B1",title:"Аргументы",icon:"⚖️",grammar:"derimot / samtidig / etter min mening",phrase:"Etter min mening bør kollektivtransport være billigere, fordi flere da kan la bilen stå.",ru:"По моему мнению, общественный транспорт должен быть дешевле.",vocab:[["fordel","преимущество"],["ulempe","недостаток"],["påvirke","влиять"],["samtidig","одновременно"]],read:"Noen mener hjemmekontor gir bedre konsentrasjon. Andre mener samarbeid blir vanskeligere.",q:"Какой недостаток упомянут?",opts:["Lavere lønn","Mindre samarbeid","Lengre dag","Dyrere transport"],correct:1,writing:"Выскажи мнение о домашней работе и приведи два аргумента.",speaking:"Обсуди плюсы и минусы работы из дома."},
{id:"b1-4",level:"B1",title:"Новости и источники",icon:"📰",grammar:"Ifølge … / косвенная речь",phrase:"Ifølge kommunen vil den nye ordningen gjelde fra januar.",ru:"По данным коммуны, новый порядок действует с января.",vocab:[["ifølge","согласно"],["kilde","источник"],["opplyser","сообщает"],["endring","изменение"]],read:"Lokalavisen skriver at busstilbudet skal utvides. Fylkeskommunen bekrefter tre nye avganger på hverdager.",q:"Что подтверждено?",opts:["Tre nye avganger","Gratis buss","Nytt tog","Færre avganger"],correct:0,writing:"Кратко перескажи новость и укажи источник.",speaking:"Перескажи короткую новость своими словами."},

{id:"b2-1",level:"B2",title:"Нюансированная аргументация",icon:"🎯",grammar:"уступка, оговорки, контраргументы",phrase:"Selv om tiltaket kan ha positiv effekt på kort sikt, må vi vurdere konsekvensene over tid.",ru:"Хотя мера может дать краткосрочный эффект, нужно оценить долгосрочные последствия.",vocab:[["forutsetning","предпосылка"],["nyansere","уточнять нюансы"],["hensyn","соображение"],["konsekvens","последствие"]],read:"Et forslag kan være økonomisk lønnsomt, men samtidig skape problemer for personer med svake digitale ferdigheter.",q:"Какова основная мысль?",opts:["Økonomi er alltid viktigst","Digitalisering må forbys","Flere hensyn må veies","Alle har like ferdigheter"],correct:2,writing:"Напиши аргументированный текст о цифровизации общественных услуг.",speaking:"Обсуди цифровизацию: преимущества, риски и компромисс."},
{id:"b2-2",level:"B2",title:"Формальный язык",icon:"📑",grammar:"точность и официальный регистр",phrase:"Jeg ber om en skriftlig avklaring av hvilke vurderinger som ligger til grunn for beslutningen.",ru:"Прошу письменно разъяснить основания решения.",vocab:[["avklaring","разъяснение"],["grunnlag","основание"],["vurdering","оценка"],["henvise","ссылаться"]],read:"Avsenderen viser til et tidligere vedtak, beskriver nye opplysninger og ber om at saken vurderes på nytt.",q:"Что просит отправитель?",opts:["Avslutte saken","Vurdere saken på nytt","Slette dokumenter","Godta alt"],correct:1,writing:"Составь формальное обращение с контекстом, аргументом и просьбой.",speaking:"Объясни сложный вопрос официальному сотруднику ясно и структурированно."},
{id:"b2-3",level:"B2",title:"Презентация",icon:"🎤",grammar:"структура и связность",phrase:"Jeg vil først presentere bakgrunnen, deretter to argumenter og til slutt oppsummere.",ru:"Сначала контекст, затем два аргумента и итог.",vocab:[["innledning","введение"],["hovedpoeng","главная мысль"],["overgang","переход"],["oppsummere","подводить итог"]],read:"En god presentasjon har en tydelig rød tråd og viser hvordan poengene henger sammen.",q:"Что подчёркивается?",opts:["Lengde","Tydelig struktur","Ordrett lesing","Mange detaljer"],correct:1,writing:"Подготовь краткий план презентации «arbeidsliv i Norge».",speaking:"Сделай структурированное выступление «et godt arbeidsmiljø»."},
{id:"b2-4",level:"B2",title:"Тексты и выводы",icon:"🔎",grammar:"модальность и степень уверенности",phrase:"Tallene kan tyde på en forbedring, men grunnlaget er ikke sikkert nok til en klar konklusjon.",ru:"Данные могут указывать на улучшение, но основание недостаточно надёжно.",vocab:[["tyde på","указывать на"],["entydig","однозначный"],["forbehold","оговорка"],["konklusjon","вывод"]],read:"Undersøkelsen viser en moderat økning, men svarprosenten var lav. Resultatene må derfor tolkes med forsiktighet.",q:"Почему нужна осторожность?",opts:["Ingen tema","Lav svarprosent","Alle svarte likt","Hemmelig resultat"],correct:1,writing:"Суммируй текст с оговорками, избегая категоричных выводов.",speaking:"Объясни разницу между фактом, предположением и выводом."}
];

const GRAMMAR={
A1:[
["Выбери правильную фразу:","Jeg er bor i Norge.","Jeg bor i Norge.","Jeg bor Norge.","Jeg i Norge bor.",1,"Правильно: Jeg bor i Norge."],
["Как правильно спросить имя?","Hva du heter?","Hva heter du?","Heter hva du?","Du hva heter?",1,"В вопросе: Hva heter du?"],
["Артикль: ___ hus","en","ei","et","den",2,"hus — среднего рода: et hus."],
["Jeg ___ kaffe.","drikker","drikke","drakk nå","å drikker",0,"Настоящее время: jeg drikker."]
],
A2:[
["I går ___ jeg på jobb.","går","gikk","gått","gå",1,"Завершённое событие вчера: gikk."],
["Jeg har ___ i Norge i to år.","bo","bodde","bodd","bor",2,"После har: bodd."],
["Jeg tar bussen ___ det regner.","derfor","fordi","men","eller",1,"fordi вводит причину."],
["I morgen ___ jeg til Oslo.","skal","har","er","ble",0,"skal + infinitiv выражает план."]
],
B1:[
["Selv om det regner, ___ jeg på jobb.","jeg går","går jeg","jeg på jobb går","gå jeg",1,"После придаточного в начале: инверсия går jeg."],
["Самая формальная фраза:","Gi meg svar.","Jeg ønsker en skriftlig bekreftelse.","Svar nå.","Du må skrive.",1,"Вежливая официальная формулировка."],
["Связка противопоставления:","derfor","dessuten","derimot","fordi",2,"derimot выражает контраст."],
["Søknaden ___ behandlet i morgen.","blir","har","gjør","kommer",0,"blir + причастие — пассив."]
],
B2:[
["Самая нюансированная фраза:","Dette beviser at tiltaket virker.","Tallene kan tyde på en effekt, men grunnlaget er usikkert.","Tiltaket virker alltid.","Det er helt sikkert en effekt.",1,"Фраза показывает степень уверенности."],
["Связка уступки:","selv om","derfor","slik at","dessuten",0,"selv om выражает уступку."],
["Лучшее формальное уточнение:","Jeg skjønner ikke.","Presiser dette.","Jeg ber om en nærmere avklaring av hva som menes.","Hva mener du egentlig?",2,"Нейтральная формальная фраза."],
["Фраза, явно указывающая источник:","Alle vet at …","Ifølge rapporten …","Jeg føler at …","Det er åpenbart at …",1,"Ifølge указывает источник."]
]};

const EXAM_BANK={
"A1-A2":{
reading:[
["Butikken stenger klokka 18 på lørdag. Søndag er den stengt.","Når kan du handle?",["Lørdag 17","Lørdag 19","Søndag 12","Søndag 16"],0],
["Timen din er flyttet til tirsdag klokka 09.30.","Når er timen?",["Mandag 09.30","Tirsdag 09.30","Tirsdag 19.30","Onsdag 09.30"],1],
["Per tar toget til jobb. I dag er toget innstilt, så han tar buss.","Hvordan reiser Per i dag?",["Tog","Buss","Bil","Til fots"],1],
["Maja kjøper to brød og en liter melk.","Hva kjøper Maja?",["Brød og melk","Brød og ost","Melk og kaffe","Ost og kaffe"],0]],
listening:[
["Bussen går om ti minutter.",["Bussen har gått","Bussen går snart","Bussen går i morgen","Bussen er innstilt"],1],
["Jeg kan ikke komme i dag, men jeg kommer i morgen.",["I dag","I morgen","Aldri","Allerede"],1],
["Kan jeg få en kaffe uten melk?",["Kaffe med melk","Te","Kaffe uten melk","Vann"],2],
["Legetimen er klokka halv tre.",["13.30","14.30","15.30","16.30"],1]],
writing:["Напиши короткое сообщение другу и договорись о встрече: место и время.","Напиши 5–7 предложений о своей повседневной жизни.","Напиши сообщение в школу или на работу и объясни отсутствие."],
speaking:["Представься и расскажи о себе.","Расскажи о своём обычном дне.","Опиши место, где ты живёшь.","Что тебе нравится делать в свободное время и почему?"]},
"A2-B1":{
reading:[
["Søknader som mangler dokumentasjon, behandles ikke før dokumentene er levert.","Hva må skje først?",["Avgift betales","Dokumenter leveres","Daglig telefon","Saken trekkes"],1],
["Alle kan starte mellom 7 og 9, men må være tilgjengelige 9–14.","Hva er obligatorisk?",["Start 7","Tilgjengelig 9–14","Hjemmekontor","Overtid"],1],
["På grunn av veiarbeid går bussen en annen rute denne uka.","Hva er endret?",["Pris","Rute","Dag","Sjåfør"],1],
["Påmeldingsfristen er 20. oktober. Kurset starter 3. november.","Hva skjer først?",["Kursstart","Frist","Kursslutt","Eksamen"],1]],
listening:[
["Møtet er utsatt til torsdag fordi lederen er syk.",["Avlyst","Flyttet til torsdag","Tidligere","I dag"],1],
["Du trenger ikke bestille time, men må ta med legitimasjon.",["Time nødvendig","Legitimasjon nødvendig","Ingenting","Kontanter"],1],
["Jeg er enig i målet, men planen er for dyr.",["Uenig i målet","Enig i alt","Enig i mål, kritisk til pris","Snakker bare om tid"],2],
["Toget er forsinket med tjue minutter.",["Tidlig","Forsinket","Innstilt","Ingen feil"],1]],
writing:["Напиши работодателю о проблеме с графиком и предложи решение.","Выскажи мнение о плюсах и минусах общественного транспорта.","Напиши связный текст о важном изменении в своей жизни."],
speaking:["Расскажи о своём опыте работы или учёбы.","Обсуди плюсы и минусы жизни в большом городе.","Что важнее на работе — зарплата или рабочая среда? Обоснуй."]},
"B1-B2":{
reading:[
["Rapporten viser nedgang i utslipp, men måleperioden var kort.","Hvorfor er konklusjonen usikker?",["Utslipp økte","Kort måleperiode","Ingen tall","Feil tema"],1],
["Digitalisering kan effektivisere tjenesten, men noen kan få dårligere tilgang.","Hva er innvendingen?",["For rask tjeneste","Svakere tilgjengelighet for noen","Alt stenges","Høyere pris"],1],
["Partene er enige om problemet, men uenige om kostnader og gjennomføringstid.","Hva er de uenige om?",["Problemet","Løsning, kostnad og tid","Språk","Møtested"],1],
["Foreløpige tall kan endres når endelige data kommer.","Hva betyr det?",["Helt sikkert","Krever forbehold","Falskt","Uten tema"],1]],
listening:[
["Jeg støtter intensjonen, men virkemidlene bør vurderes på nytt.",["Avviser målet","Støtter hensikt, vurderer metode","Helt enig","Bare pris"],1],
["Tallene peker positivt, men usikkerheten er betydelig.",["Endelig resultat","Positiv tendens med usikkerhet","Nedgang","Ingen usikkerhet"],1],
["Det avgjørende er ikke bare kostnaden, men hvilken effekt tiltaket har.",["Bare kostnad","Effekt må også vurderes","Tiltaket stoppes","Pris irrelevant"],1],
["Jeg oppfattet avtalen annerledes, så la oss avklare hva vi ble enige om.",["Avslutte samarbeid","Avklare misforståelse","Ingen avtale","Bytte tema"],1]],
writing:["Напиши аргументированный текст о цифровизации общественных услуг: позиция, контраргумент, вывод.","Напиши формальное обращение, где просишь разъяснить основания решения."],
speaking:["Обсуди цифровизацию: преимущества, риски и поддержку.","Сделай выступление о хорошем рабочем месте.","Выскажи позицию и ответь на сильный контраргумент."]}
};

// ---- Norsk Eventyr 3.0: expanded curriculum, grammar, placement and exam metadata ----
const SKILL_NAMES={reading:"Чтение",listening:"Аудирование",writing:"Письмо",speaking:"Устная речь",grammar:"Грамматика",vocabulary:"Словарь"};

const TOPIC_CATALOG=[
{id:"a1-t01",level:"A1",title:"Знакомство и личные данные",goal:"представляться, задавать простые личные вопросы",grammar:"личные местоимения и presens"},
{id:"a1-t02",level:"A1",title:"Семья и дом",goal:"рассказывать о семье и жилье",grammar:"en/ei/et и притяжательные формы"},
{id:"a1-t03",level:"A1",title:"Еда и магазин",goal:"покупать продукты, спрашивать цену и количество",grammar:"vil ha, tall и måleenheter"},
{id:"a1-t04",level:"A1",title:"Время и распорядок дня",goal:"говорить о времени и ежедневных делах",grammar:"klokka, presens и наречия времени"},
{id:"a1-t05",level:"A1",title:"Транспорт и дорога",goal:"спрашивать маршрут и понимать простые сообщения",grammar:"til, fra, med и порядок слов"},
{id:"a1-t06",level:"A1",title:"Врач и здоровье",goal:"называть симптомы и договариваться о приёме",grammar:"har vondt i, må, kan"},
{id:"a1-t07",level:"A1",title:"Погода и одежда",goal:"описывать погоду и выбирать одежду",grammar:"det er, adjective"},
{id:"a1-t08",level:"A1",title:"Школа и курс",goal:"говорить об учёбе, расписании и заданиях",grammar:"skal, må, ikke"},
{id:"a1-t09",level:"A1",title:"Свободное время",goal:"говорить о хобби и предпочтениях",grammar:"liker å + infinitiv"},
{id:"a1-t10",level:"A1",title:"Телефон и сообщения",goal:"оставлять короткие сообщения и просить перезвонить",grammar:"kan du, jeg ringer"},
{id:"a1-t11",level:"A1",title:"Город и направления",goal:"спрашивать и объяснять, где находится место",grammar:"her, der, ved siden av, til venstre"},
{id:"a1-t12",level:"A1",title:"Встречи и договорённости",goal:"назначать простую встречу",grammar:"på, i, klokka, passer det"},

{id:"a2-t01",level:"A2",title:"Работа и график",goal:"рассказывать об опыте и обсуждать рабочее время",grammar:"modalverb + infinitiv"},
{id:"a2-t02",level:"A2",title:"Жильё и коммунальные услуги",goal:"сообщать о проблеме и просить помощь",grammar:"må, bør, kan"},
{id:"a2-t03",level:"A2",title:"Прошлое и планы",goal:"сравнивать прошлое, настоящее и планы",grammar:"preteritum, perfektum, skal"},
{id:"a2-t04",level:"A2",title:"Мнение и причины",goal:"выражать мнение и объяснять причины",grammar:"fordi, derfor, men"},
{id:"a2-t05",level:"A2",title:"Банк и счета",goal:"понимать счёт и задавать вопросы об оплате",grammar:"beløp, frist, har betalt"},
{id:"a2-t06",level:"A2",title:"Дети, школа и SFO",goal:"общаться со школой о расписании и ребёнке",grammar:"leddsetninger med at"},
{id:"a2-t07",level:"A2",title:"Здоровье и аптека",goal:"объяснять симптомы и понимать рекомендации",grammar:"bør, må, hvis"},
{id:"a2-t08",level:"A2",title:"Путешествия и гостиница",goal:"бронировать, менять и уточнять детали поездки",grammar:"ønsker å, vil gjerne"},
{id:"a2-t09",level:"A2",title:"Цифровые услуги",goal:"объяснять проблему с приложением, BankID или формой",grammar:"har prøvd å, får ikke"},
{id:"a2-t10",level:"A2",title:"Соседи и бытовые вопросы",goal:"вежливо просить и договариваться",grammar:"kunne du, hadde det vært mulig"},
{id:"a2-t11",level:"A2",title:"Праздники и традиции",goal:"рассказывать о событии и сравнивать традиции",grammar:"da, når, før, etter"},
{id:"a2-t12",level:"A2",title:"Собеседование",goal:"отвечать на типичные вопросы работодателя",grammar:"erfaring med, har jobbet, kan bidra"},

{id:"b1-t01",level:"B1",title:"Рабочая жизнь и права",goal:"обсуждать обязанности, график и рабочую среду",grammar:"сложные предложения и инверсия"},
{id:"b1-t02",level:"B1",title:"Официальные обращения",goal:"писать и говорить в нейтрально-формальном стиле",grammar:"пассив и формальные конструкции"},
{id:"b1-t03",level:"B1",title:"Аргументы и контраргументы",goal:"строить связную аргументацию",grammar:"derimot, samtidig, på den ene siden"},
{id:"b1-t04",level:"B1",title:"Новости и источники",goal:"пересказывать новости и указывать источник",grammar:"ifølge, indirekte tale"},
{id:"b1-t05",level:"B1",title:"Жалоба и решение проблемы",goal:"описывать проблему, последствия и желаемое решение",grammar:"dersom, selv om, derfor"},
{id:"b1-t06",level:"B1",title:"CV и заявление на работу",goal:"обосновывать соответствие вакансии",grammar:"relative setninger"},
{id:"b1-t07",level:"B1",title:"Договор аренды",goal:"понимать условия и уточнять обязанности сторон",grammar:"vilkår, dersom, skal"},
{id:"b1-t08",level:"B1",title:"Система здравоохранения",goal:"структурированно объяснять ситуацию и задавать уточняющие вопросы",grammar:"perfektum и временные связки"},
{id:"b1-t09",level:"B1",title:"Образование и обучение",goal:"сравнивать варианты и объяснять цели",grammar:"for å, slik at"},
{id:"b1-t10",level:"B1",title:"Культура и общество",goal:"описывать различия без категоричных обобщений",grammar:"ofte, vanligvis, kan"},
{id:"b1-t11",level:"B1",title:"Экология и транспорт",goal:"обсуждать последствия и решения",grammar:"bør, kunne, dersom"},
{id:"b1-t12",level:"B1",title:"Медиа и цифровая жизнь",goal:"рассуждать о плюсах, рисках и привычках",grammar:"mens, samtidig som, på grunn av"},

{id:"b2-t01",level:"B2",title:"Нюансированная аргументация",goal:"взвешивать несколько факторов и оговаривать неопределённость",grammar:"уступка и оговорки"},
{id:"b2-t02",level:"B2",title:"Формальный язык и решения",goal:"точно запрашивать основания и обоснование",grammar:"nominalisering и пассив"},
{id:"b2-t03",level:"B2",title:"Презентация и структура",goal:"строить логичное выступление с переходами",grammar:"текстовые связки"},
{id:"b2-t04",level:"B2",title:"Данные и выводы",goal:"различать факт, интерпретацию и вывод",grammar:"модальность и степень уверенности"},
{id:"b2-t05",level:"B2",title:"Дебаты",goal:"реагировать на аргумент и строить контраргумент",grammar:"selv om, riktignok, likevel"},
{id:"b2-t06",level:"B2",title:"Отчёты и рекомендации",goal:"резюмировать данные и формулировать рекомендации",grammar:"формальный регистр"},
{id:"b2-t07",level:"B2",title:"Профессиональная коммуникация",goal:"смягчать несогласие и уточнять ответственность",grammar:"høflig modalitet"},
{id:"b2-t08",level:"B2",title:"Общественная политика",goal:"обсуждать компромиссы и последствия решений",grammar:"årsaks- og konsekvensledd"},
{id:"b2-t09",level:"B2",title:"Критика источников",goal:"оценивать надёжность и ограничения источника",grammar:"forbehold og kildehenvisning"},
{id:"b2-t10",level:"B2",title:"Академический стиль",goal:"писать нейтрально, связно и точно",grammar:"nominalisering и связность"},
{id:"b2-t11",level:"B2",title:"Переговоры и конфликт",goal:"формулировать интересы, уступки и компромисс",grammar:"betingelser og høflig uenighet"},
{id:"b2-t12",level:"B2",title:"Абстрактные темы",goal:"развивать позицию на общественную или этическую тему",grammar:"nyansering og presisjon"}
];

const GRAMMAR_GUIDE={
A1:[
{title:"Настоящее время",rule:"В обычном утверждении сказуемое стоит на втором месте. У большинства глаголов в настоящем времени окончание -r.",examples:["Jeg bor i Norge.","Hun jobber i dag.","Vi snakker norsk."],q:"Выбери правильную фразу.",opts:["Jeg bor i Norge.","Jeg bo i Norge.","Jeg i Norge bor.","Jeg er bor i Norge."],correct:0},
{title:"Вопросы",rule:"В вопросе с вопросительным словом глагол обычно идёт перед подлежащим.",examples:["Hva heter du?","Hvor bor du?","Når kommer bussen?"],q:"Как правильно спросить «Где ты живёшь?»",opts:["Hvor du bor?","Hvor bor du?","Du bor hvor?","Bor hvor du?"],correct:1},
{title:"Артикли en/ei/et",rule:"Существительные учат вместе с родом: en bil, ei bok, et hus.",examples:["en jobb","ei dør","et barn"],q:"Какой артикль у слова barn?",opts:["en","ei","et","den"],correct:2},
{title:"Отрицание ikke",rule:"В простом главном предложении ikke обычно стоит после спрягаемого глагола.",examples:["Jeg jobber ikke i dag.","Hun kommer ikke.","Vi har ikke bil."],q:"Выбери правильный порядок слов.",opts:["Jeg ikke jobber i dag.","Jeg jobber ikke i dag.","Ikke jeg jobber i dag.","Jeg i dag ikke jobber."],correct:1},
{title:"Модальные глаголы",rule:"После kan, må, skal, vil используется инфинитив без å.",examples:["Jeg kan jobbe.","Du må vente.","Vi skal reise."],q:"Выбери правильную форму.",opts:["Jeg kan å jobbe.","Jeg kan jobber.","Jeg kan jobbe.","Jeg kan jobbet."],correct:2},
{title:"Притяжательные формы",rule:"Притяжательное слово часто ставится после существительного в определённой форме.",examples:["familien min","jobben min","huset vårt"],q:"Как естественно сказать «моя работа»?",opts:["min jobb","jobben min","jobben meg","mitt jobben"],correct:1},
{title:"Предлоги времени",rule:"Используются klokka для времени, på для дней, i для месяцев/лет.",examples:["klokka åtte","på mandag","i oktober"],q:"Выбери правильную фразу.",opts:["på klokka åtte","i mandag","på mandag","klokka mandag"],correct:2},
{title:"liker å + infinitiv",rule:"После liker å используется инфинитив.",examples:["Jeg liker å gå tur.","Hun liker å lese.","Vi liker å lage mat."],q:"Выбери правильный вариант.",opts:["Jeg liker går tur.","Jeg liker å gå tur.","Jeg liker å går tur.","Jeg å liker gå tur."],correct:1}
],
A2:[
{title:"Preteritum",rule:"Для завершённых событий в прошлом часто используется preteritum.",examples:["I går jobbet jeg.","Hun kom sent.","Vi kjøpte mat."],q:"I går ___ jeg på jobb.",opts:["går","gikk","gått","gå"],correct:1},
{title:"Perfektum",rule:"har + perfektum причастие связывает прошлое с настоящим.",examples:["Jeg har bodd her i to år.","Hun har jobbet mye.","Vi har sett filmen."],q:"Jeg har ___ i Norge lenge.",opts:["bo","bodde","bodd","bor"],correct:2},
{title:"fordi / derfor",rule:"fordi вводит причину; derfor обычно начинает следствие и вызывает инверсию.",examples:["Jeg går hjem fordi jeg er trøtt.","Jeg er trøtt. Derfor går jeg hjem."],q:"Jeg tar bussen ___ det regner.",opts:["derfor","fordi","mens","eller"],correct:1},
{title:"Придаточные с at",rule:"После at в придаточном подлежащее идёт перед глаголом; ikke обычно перед глаголом.",examples:["Jeg tror at han kommer.","Hun sier at hun ikke kan."],q:"Выбери правильный вариант.",opts:["Jeg tror at kommer han.","Jeg tror at han kommer.","Jeg tror han at kommer.","Jeg at tror han kommer."],correct:1},
{title:"Если — hvis",rule:"Hvis вводит условие; если придаточное стоит первым, в главном предложении появляется инверсия.",examples:["Hvis det regner, tar jeg bussen.","Jeg blir hjemme hvis jeg er syk."],q:"Если фраза начинается с «Hvis det regner», что естественно дальше?",opts:["jeg tar bussen","tar jeg bussen","jeg bussen tar","tar bussen jeg"],correct:1},
{title:"Сравнение",rule:"Прилагательные образуют сравнительную степень: billigere, bedre, større.",examples:["Bussen er billigere.","Denne er bedre.","Leiligheten er større."],q:"Поезд быстрее автобуса.",opts:["Toget er rask.","Toget er raskere enn bussen.","Toget raskere bussen.","Toget er mest rask."],correct:1},
{title:"Вежливые просьбы",rule:"vil gjerne, kunne du и kan jeg делают просьбу естественнее.",examples:["Jeg vil gjerne bestille en time.","Kunne du hjelpe meg?","Kan jeg få kvitteringen?"],q:"Выбери наиболее вежливую просьбу.",opts:["Hjelp meg.","Du hjelper.","Kunne du hjelpe meg?","Hjelpe nå."],correct:2},
{title:"Временные связки",rule:"før, etter at, da и når связывают события во времени.",examples:["Etter at jeg kom hjem, spiste jeg.","Da jeg var barn, bodde jeg i Ukraina."],q:"Что лучше для однократного события в прошлом?",opts:["da","når","derfor","fordi"],correct:0}
],
B1:[
{title:"Инверсия после придаточного",rule:"Если придаточное стоит первым, сказуемое главного предложения идёт перед подлежащим.",examples:["Selv om det regner, går jeg på jobb.","Hvis jeg har tid, ringer jeg."],q:"Selv om det regner, ___ jeg på jobb.",opts:["jeg går","går jeg","jeg på jobb går","gå jeg"],correct:1},
{title:"Пассив",rule:"Пассив часто образуется blir + perfektum partisipp или -s в формальном стиле.",examples:["Søknaden blir behandlet.","Skjemaet sendes digitalt."],q:"Søknaden ___ behandlet i morgen.",opts:["blir","har","gjør","kommer"],correct:0},
{title:"Relative setninger",rule:"som связывает существительное с уточняющим придаточным.",examples:["Jeg søker en jobb som passer erfaringen min.","Det er kurset som starter i august."],q:"Выбери правильную связь.",opts:["jobben hvem jeg søker","jobben som jeg søker","jobben hvor jeg søker den","jobben at jeg søker"],correct:1},
{title:"Цель: for å / slik at",rule:"for å + infinitiv — цель одного субъекта; slik at — придаточное с отдельным сказуемым.",examples:["Jeg øver for å bli bedre.","Jeg skriver tydelig slik at alle forstår."],q:"Jeg øver hver dag ___ bestå prøven.",opts:["for å","fordi","derfor","selv om"],correct:0},
{title:"Противопоставление",rule:"derimot, samtidig и på den andre siden помогают строить контраст.",examples:["Det er dyrt. Derimot er kvaliteten god.","På den andre siden tar det lang tid."],q:"Какая связка выражает контраст?",opts:["derfor","dessuten","derimot","fordi"],correct:2},
{title:"Косвенная речь",rule:"После sier at / mener at сохраняется порядок слов придаточного.",examples:["Hun sier at hun kommer senere.","Avisen skriver at tilbudet blir utvidet."],q:"Выбери правильный вариант.",opts:["Han sier at kommer han.","Han sier at han kommer.","Han at sier han kommer.","Han sier kommer at han."],correct:1},
{title:"Причина и следствие",rule:"på grunn av + существительное; fordi + предложение; derfor — следствие.",examples:["Bussen er sen på grunn av snø.","Jeg kom sent fordi bussen var forsinket."],q:"___ snøen var veien stengt.",opts:["På grunn av","Fordi","Derfor","Selv om"],correct:0},
{title:"Формальный регистр",rule:"В официальной переписке предпочтительны нейтральные просьбы и точные формулировки.",examples:["Jeg ber om en skriftlig bekreftelse.","Jeg viser til tidligere henvendelse."],q:"Выбери наиболее формальную фразу.",opts:["Svar meg nå.","Jeg ønsker en skriftlig bekreftelse.","Gi meg svar.","Du må skrive."],correct:1}
],
B2:[
{title:"Уступка и оговорка",rule:"selv om, riktignok и til tross for позволяют признать аргумент, не отказываясь от позиции.",examples:["Selv om tiltaket hjelper noen, kan det skape andre problemer.","Riktignok er løsningen billig, men den er ikke varig."],q:"Какая связка выражает уступку?",opts:["selv om","derfor","dessuten","slik at"],correct:0},
{title:"Модальность",rule:"kan tyde på, synes å и trolig снижают категоричность и отражают степень уверенности.",examples:["Tallene kan tyde på en bedring.","Det synes å være en sammenheng."],q:"Выбери наиболее осторожный вывод.",opts:["Dette beviser alt.","Tallene kan tyde på en sammenheng.","Det er helt sikkert.","Ingen annen forklaring finnes."],correct:1},
{title:"Nominalisering",rule:"В формальном стиле действие часто выражается существительным, но чрезмерная номинализация ухудшает ясность.",examples:["vurdering av saken","gjennomføring av tiltaket","behandling av søknaden"],q:"Какой вариант наиболее формальный?",opts:["vi ser på saken","vurdering av saken","vi kikker på saken","vi sjekker litt"],correct:1},
{title:"Kildehenvisning",rule:"Источник отделяется от собственной оценки с помощью ifølge, rapporten viser и forfatteren hevder.",examples:["Ifølge rapporten har kostnadene økt.","Forfatteren hevder at tiltaket virker."],q:"Что явно указывает источник?",opts:["Alle vet at","Ifølge rapporten","Jeg føler at","Det er åpenbart at"],correct:1},
{title:"Контраргумент",rule:"Сильный текст сначала точно передаёт противоположный аргумент, затем отвечает на него.",examples:["Et mulig motargument er at ordningen er dyr. Likevel kan gevinsten over tid være større."],q:"Какая связка подходит для ответа на контраргумент?",opts:["likevel","fordi","slik at","dessuten"],correct:0},
{title:"Причинность с оговоркой",rule:"Корреляция не всегда означает причинность; формулировка должна отражать ограничения данных.",examples:["Sammenhengen kan skyldes flere forhold.","Resultatet bør tolkes med forsiktighet."],q:"Выбери корректную осторожную формулировку.",opts:["A fører alltid til B.","A kan være en av flere forklaringer.","B beviser A.","Andre faktorer er umulige."],correct:1},
{title:"Связность текста",rule:"dermed, samtidig, imidlertid, på den annen side и avslutningsvis связывают части аргумента.",examples:["Imidlertid finnes det også ulemper.","Avslutningsvis vil jeg understreke …"],q:"Какая связка естественно вводит оговорку?",opts:["imidlertid","fordi","for å","da"],correct:0},
{title:"Точность формального запроса",rule:"Хороший официальный запрос содержит контекст, конкретный вопрос и желаемое действие.",examples:["Jeg viser til vedtaket av 3. mai og ber om en skriftlig avklaring av vurderingsgrunnlaget."],q:"Выбери наиболее точную формулировку.",opts:["Hva skjer?","Jeg ber om en nærmere avklaring av grunnlaget for beslutningen.","Svar.","Dette er feil."],correct:1}
]};

const PLACEMENT_BANK=[
{level:"A1",skill:"grammar",q:"Выбери правильную фразу.",opts:["Jeg bor i Norge.","Jeg bo i Norge.","Jeg i Norge bor.","Jeg er bor i Norge."],correct:0},
{level:"A1",skill:"vocabulary",q:"Что означает «arbeid»?",opts:["работа","семья","еда","дорога"],correct:0},
{level:"A1",skill:"reading",context:"Bussen går klokka 08.15. Anna kommer til holdeplassen klokka 08.05.",q:"Анна успевает на автобус?",opts:["Ja","Nei","Только вечером","Неизвестно"],correct:0},
{level:"A1",skill:"grammar",q:"Как правильно спросить имя?",opts:["Hva du heter?","Hva heter du?","Heter hva du?","Du hva heter?"],correct:1},
{level:"A1",skill:"listening",audio:"Jeg kommer fra Ukraina.",q:"Откуда человек?",opts:["Ukraina","Norge","Polen","Sverige"],correct:0},

{level:"A2",skill:"grammar",q:"I går ___ jeg på jobb.",opts:["går","gikk","gått","gå"],correct:1},
{level:"A2",skill:"grammar",q:"Jeg har ___ her i to år.",opts:["bo","bodde","bodd","bor"],correct:2},
{level:"A2",skill:"reading",context:"Fristen er fredag. Dokumentene kan leveres digitalt eller på servicetorget.",q:"Как можно подать документы?",opts:["Bare post","Digitalt eller på servicetorget","Kun telefon","Bare fredag"],correct:1},
{level:"A2",skill:"vocabulary",q:"Что означает «frist»?",opts:["решение","срок","счёт","договор"],correct:1},
{level:"A2",skill:"listening",audio:"Møtet er flyttet til torsdag fordi lederen er syk.",q:"Что изменилось?",opts:["Møtet er avlyst.","Møtet er flyttet.","Lederen kommer tidligere.","Ingenting."],correct:1},

{level:"B1",skill:"grammar",q:"Selv om det regner, ___ jeg på jobb.",opts:["jeg går","går jeg","jeg på jobb går","gå jeg"],correct:1},
{level:"B1",skill:"reading",context:"Ansatte kan starte mellom 7 og 9, men må være tilgjengelige mellom 9 og 14.",q:"Что обязательно?",opts:["Start kl. 7","Tilgjengelig 9–14","Overtid","Hjemmekontor"],correct:1},
{level:"B1",skill:"grammar",q:"Søknaden ___ behandlet når dokumentene er mottatt.",opts:["blir","har","gjør","får"],correct:0},
{level:"B1",skill:"vocabulary",q:"Что означает «ulempe»?",opts:["преимущество","недостаток","источник","решение"],correct:1},
{level:"B1",skill:"listening",audio:"Jeg er enig i målet, men mener at planen blir for dyr.",q:"Что выражает говорящий?",opts:["Полное согласие","Согласие с целью, но критика плана","Полный отказ","Только вопрос о времени"],correct:1},

{level:"B2",skill:"grammar",q:"Выбери наиболее нюансированный вывод.",opts:["Dette beviser at tiltaket virker.","Tallene kan tyde på en effekt, men grunnlaget er begrenset.","Tiltaket virker alltid.","Det finnes ingen annen forklaring."],correct:1},
{level:"B2",skill:"reading",context:"Undersøkelsen viser en moderat økning, men svarprosenten var lav. Resultatene bør derfor tolkes med forsiktighet.",q:"Почему вывод ограничен?",opts:["Ingen data","Lav svarprosent","For mange svar","Feil språk"],correct:1},
{level:"B2",skill:"vocabulary",q:"Что лучше соответствует «forbehold»?",opts:["оговорка","доказательство","запрет","итог"],correct:0},
{level:"B2",skill:"grammar",q:"Какая фраза явно отделяет источник от собственной оценки?",opts:["Alle vet at …","Ifølge rapporten …","Jeg føler at …","Det er åpenbart at …"],correct:1},
{level:"B2",skill:"listening",audio:"Riktignok kan ordningen redusere kostnader, men den kan samtidig gjøre tjenesten mindre tilgjengelig for enkelte grupper.",q:"Какова позиция?",opts:["Только преимущества","Только недостатки","Взвешиваются два последствия","Тема не связана с услугами"],correct:2}
];

const EXAM_CONFIG={
reading:{minutes:75,label:"Чтение",officialNote:"Официальная leseprøve длится до 75 минут и адаптируется по уровню."},
listening:{minutes:45,label:"Аудирование",officialNote:"Официальная lytteprøve длится примерно 30–60 минут и адаптируется по уровню."},
writing:{"A1-A2":90,"A2-B1":90,"B1-B2":120},
speaking:{minutes:25,label:"Устная речь",officialNote:"Официальная muntlig prøve обычно длится около 20–25 минут и включает индивидуальные и парные задания."}
};
