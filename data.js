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