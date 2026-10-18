// Norsk Eventyr: authored Bokmål-only listening sentences with Russian study support.
// These are text scripts for clearly labelled synthesized audio, NOT human recordings.
(function(){
'use strict';
const LESSONS=[
 {
  "id": "a1-intro",
  "level": "A1",
  "title": "Знакомство",
  "topic": "Поздороваться и представиться",
  "no": "Hei, jeg heter Mari. Hva heter du? Jeg heter Ola. Hyggelig å møte deg!",
  "ru": "Привет, меня зовут Мари. Как тебя зовут? Меня зовут Ула. Приятно познакомиться!",
  "questions": [
   {
    "q": "Как зовут девушку?",
    "opts": [
     "Ула",
     "Мари",
     "Анне"
    ],
    "correct": 1,
    "explain": "Девушка говорит: «Jeg heter Mari»."
   },
   {
    "q": "Как собеседники заканчивают знакомство?",
    "opts": [
     "Просят о помощи",
     "Прощаются навсегда",
     "Говорят, что рады знакомству"
    ],
    "correct": 2,
    "explain": "«Hyggelig å møte deg» означает «Приятно познакомиться»."
   }
  ]
 },
 {
  "id": "a1-bus",
  "level": "A1",
  "title": "Автобус и время",
  "topic": "Понять направление и время отправления",
  "no": "Unnskyld, når går bussen til sentrum? Den går klokka halv ni. Tusen takk!",
  "ru": "Извините, когда отправляется автобус до центра? Он отправляется в половине девятого (8:30). Большое спасибо!",
  "questions": [
   {
    "q": "Куда едет автобус?",
    "opts": [
     "В центр",
     "В больницу",
     "На вокзал"
    ],
    "correct": 0,
    "explain": "«Til sentrum» — в центр."
   },
   {
    "q": "Во сколько отправляется автобус?",
    "opts": [
     "9:30",
     "8:30",
     "8:15"
    ],
    "correct": 1,
    "explain": "По-норвежски «halv ni» — это 8:30, а не 9:30."
   }
  ]
 },
 {
  "id": "a2-doctor",
  "level": "A2",
  "title": "Изменение записи к врачу",
  "topic": "Перенести приём и уточнить время",
  "no": "Hei, jeg har time hos legen i morgen, men jeg må jobbe. Kan jeg flytte timen til torsdag? Ja, torsdag klokka ti passer fint.",
  "ru": "Здравствуйте, у меня завтра приём у врача, но я должен работать. Можно перенести приём на четверг? Да, четверг в десять подходит.",
  "questions": [
   {
    "q": "Почему человек переносит запись?",
    "opts": [
     "Уезжает в отпуск",
     "Должен работать",
     "Уже выздоровел"
    ],
    "correct": 1,
    "explain": "«Jeg må jobbe» — мне нужно работать."
   },
   {
    "q": "На какое время перенесли приём?",
    "opts": [
     "В четверг на 10:00",
     "В среду на 10:00",
     "В четверг на 12:00"
    ],
    "correct": 0,
    "explain": "«Torsdag klokka ti» — четверг, десять часов."
   }
  ]
 },
 {
  "id": "a2-shop",
  "level": "A2",
  "title": "Возврат в магазине",
  "topic": "Объяснить проблему и спросить о размере",
  "no": "Jeg kjøpte denne jakken i går, men den er for liten. Har dere en større størrelse? Ja, vi har en større jakke i blått.",
  "ru": "Я купил эту куртку вчера, но она слишком маленькая. Есть размер побольше? Да, у нас есть куртка побольше синего цвета.",
  "questions": [
   {
    "q": "Что не так с курткой?",
    "opts": [
     "Она слишком дорогая",
     "Она порвалась",
     "Она слишком маленькая"
    ],
    "correct": 2,
    "explain": "«For liten» — слишком маленькая."
   },
   {
    "q": "Какого цвета куртка большего размера?",
    "opts": [
     "Синего",
     "Красного",
     "Зелёного"
    ],
    "correct": 0,
    "explain": "«I blått» — синего цвета."
   }
  ]
 },
 {
  "id": "b1-work",
  "level": "B1",
  "title": "Смена на работе",
  "topic": "Понять условие договорённости",
  "no": "Jeg kan bytte vakt med deg på fredag, men da må du gi beskjed til lederen før onsdag. Det passer bra. Jeg sender en melding i dag, så alt er avklart.",
  "ru": "Я могу поменяться с тобой сменами в пятницу, но тогда тебе нужно сообщить руководителю до среды. Хорошо. Я отправлю сообщение сегодня, чтобы всё согласовать.",
  "questions": [
   {
    "q": "Какое условие нужно выполнить для обмена сменами?",
    "opts": [
     "Взять отпуск",
     "Сообщить руководителю до среды",
     "Обратиться в бухгалтерию"
    ],
    "correct": 1,
    "explain": "«Gi beskjed til lederen før onsdag» — сообщить руководителю до среды."
   },
   {
    "q": "Что обещает сделать второй человек?",
    "opts": [
     "Прийти в субботу",
     "Позвонить в пятницу",
     "Написать сообщение сегодня"
    ],
    "correct": 2,
    "explain": "«Jeg sender en melding i dag» — я отправлю сообщение сегодня."
   }
  ]
 },
 {
  "id": "b1-apartment",
  "level": "B1",
  "title": "Проблема в квартире",
  "topic": "Выделить проблему и предложенное решение",
  "no": "Varmen i leiligheten virker ikke som den skal, og det har vært kaldt siden helgen. Jeg har meldt fra til utleieren. Han sa at en tekniker kommer i morgen formiddag.",
  "ru": "Отопление в квартире работает неправильно, и с выходных было холодно. Я сообщил арендодателю. Он сказал, что специалист придёт завтра в первой половине дня.",
  "questions": [
   {
    "q": "В чём основная проблема?",
    "opts": [
     "Не работает отопление как следует",
     "Протекает крыша",
     "Нет электричества"
    ],
    "correct": 0,
    "explain": "«Varmen ... virker ikke som den skal» — отопление работает неправильно."
   },
   {
    "q": "Когда ожидается специалист?",
    "opts": [
     "Сегодня вечером",
     "Завтра до обеда",
     "В понедельник ночью"
    ],
    "correct": 1,
    "explain": "«I morgen formiddag» — завтра в первой половине дня."
   }
  ]
 },
 {
  "id": "b2-transport",
  "level": "B2",
  "title": "Общественный транспорт",
  "topic": "Различать преимущества и оговорки",
  "no": "Selv om flere bussavganger kan redusere biltrafikken i sentrum, krever tiltaket økte offentlige utgifter. Før vi bestemmer oss, bør vi undersøke hvor mange som faktisk vil bruke tilbudet.",
  "ru": "Хотя увеличение числа автобусных рейсов может уменьшить автомобильное движение в центре, эта мера потребует увеличения государственных расходов. Прежде чем принимать решение, следует выяснить, сколько людей действительно будут пользоваться услугой.",
  "questions": [
   {
    "q": "Какое потенциальное преимущество обсуждается?",
    "opts": [
     "Увеличение парковок",
     "Сокращение движения автомобилей в центре",
     "Снижение всех налогов"
    ],
    "correct": 1,
    "explain": "«Redusere biltrafikken i sentrum» — сократить автомобильное движение в центре."
   },
   {
    "q": "Что предлагается выяснить до решения?",
    "opts": [
     "Фактический потенциальный спрос",
     "Цвет новых автобусов",
     "Число водителей такси"
    ],
    "correct": 0,
    "explain": "Нужно изучить, сколько людей действительно будет пользоваться автобусами."
   }
  ]
 },
 {
  "id": "b2-meeting",
  "level": "B2",
  "title": "Решение на совещании",
  "topic": "Понимать аргументацию и ограничения",
  "no": "Forslaget virker gjennomførbart på kort sikt, men jeg er usikker på om det løser problemet varig. Vi bør derfor sammenligne kostnadene over flere år før vi forplikter oss til en avtale.",
  "ru": "Предложение выглядит осуществимым в краткосрочной перспективе, но я не уверен, что оно решит проблему надолго. Поэтому нам следует сравнить затраты за несколько лет, прежде чем брать на себя обязательства по договору.",
  "questions": [
   {
    "q": "В чём главное сомнение говорящего?",
    "opts": [
     "В отсутствии участников",
     "В необходимости перевода",
     "В долгосрочном эффекте решения"
    ],
    "correct": 2,
    "explain": "«Løser problemet varig» — решит ли проблему надолго."
   },
   {
    "q": "Что нужно сделать до заключения договора?",
    "opts": [
     "Сравнить расходы за несколько лет",
     "Увеличить штат немедленно",
     "Перенести встречу на месяц"
    ],
    "correct": 0,
    "explain": "«Sammenligne kostnadene over flere år» — сравнить затраты за несколько лет."
   }
  ]
 }
].map(x=>Object.freeze({...x,questions:Object.freeze(x.questions.map(q=>Object.freeze({...q,opts:Object.freeze(q.opts)})))}));
function byLevel(level){return LESSONS.filter(x=>x.level===level)}
function find(id){return LESSONS.find(x=>x.id===id)||null}
window.NENorwegianListening=Object.freeze({lessons:Object.freeze(LESSONS),byLevel,find,sourceType:'synthetic_norwegian',taskLanguage:'ru',audioLanguage:'nb-NO'});
})();
