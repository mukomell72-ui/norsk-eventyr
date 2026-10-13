/* Supplementary, staged A1-A2 listening and reading for the 16 foundations.
 * Author-created drafts, not independent native-speaker validation.
 */
(()=>{
 const data=[{"id":"a1-foundation","audio":"Hei! Jeg heter Ingrid. Jeg bor i Oslo, men kommer fra Bergen. Jeg lærer norsk på skolen. Hva heter du, og hvor bor du?","q":"Hvor bor Ingrid nå?","opts":["I Oslo.","I Bergen.","I Tromsø.","I Stavanger."],"speakingFollowUp":"Hva heter du, og hvilken by bor du i?","readAdd":"Sara liker å lære nye språk. Hun spør ofte andre mennesker hva de heter. Når noen snakker fort, ber hun dem snakke saktere."},{"id":"a1-home","audio":"Hei! Jeg leter etter nøkkelen min. Den ligger ikke i gangen. Nå ser jeg den på kjøkkenbordet, ved siden av en kopp. Kan du hjelpe meg?","q":"Hvor ligger nøkkelen?","opts":["På kjøkkenbordet.","I gangen.","Under senga.","I jakka."],"speakingFollowUp":"Hvor har du lagt mobilen din?","readAdd":"Leiligheten har også et bad og en gang. Familien spiser middag på kjøkkenet hver dag. Om kvelden sitter de ofte i stua."},{"id":"a1-time","audio":"God morgen. Jeg begynner på jobb klokka åtte på mandag. På tirsdag begynner jeg klokka ni. I dag er det fredag, og jeg har fri etter klokka to.","q":"Når begynner personen på tirsdag?","opts":["Klokka ni.","Klokka åtte.","Klokka to.","Klokka sju."],"speakingFollowUp":"Når begynner du i morgen?","readAdd":"Hun ser på kalenderen hver kveld. Når hun har en avtale, skriver hun både dato og klokkeslett. Det hjelper henne å komme i tide."},{"id":"a1-shopping","audio":"Hei! Jeg vil gjerne kjøpe to epler, ett brød og en liter melk. Hva koster det? Jeg betaler med kort. Kan jeg få kvitteringen, takk?","q":"Hvordan vil kunden betale?","opts":["Med kort.","Med kontanter.","Med gavekort.","Med faktura."],"speakingFollowUp":"Hva vil du kjøpe, og hvordan vil du betale?","readAdd":"Før hun går inn, ser hun på åpningstidene. Hun har med en handleliste og en pose. I butikken finner hun først brød og deretter melk."},{"id":"a1-mobility","audio":"Unnskyld, er dette buss nummer tre? Jeg skal til sentrum. Jeg har en avtale klokka ti. Skal jeg gå av ved torget eller ved stasjonen?","q":"Hvor skal personen?","opts":["Til sentrum.","Til flyplassen.","Til sykehuset.","Til biblioteket."],"speakingFollowUp":"Hvor vil du reise, og hvilken buss trenger du?","readAdd":"På holdeplassen står det når neste buss går. Hvis den er forsinket, viser skjermen et nytt tidspunkt. Passasjeren leser skjermen før hun går på."},{"id":"a1-health","audio":"Hei, jeg heter Sara. Jeg har vondt i halsen, og jeg har feber i dag. Jeg vil gjerne snakke med legen. Har dere en ledig time i morgen?","q":"Hvorfor ringer Sara?","opts":["Hun trenger en legetime.","Hun vil kjøpe brød.","Hun spør om bussen.","Hun vil bestille hotell."],"speakingFollowUp":"Hvor har du vondt, og når ønsker du en time?","readAdd":"På legekontoret må pasienten først si navnet sitt. Hun venter i et rom med stoler. Når legen roper navnet hennes, går hun inn."},{"id":"a1-work-school","audio":"Hei! Først skal du vaske bordene i dette rommet. Deretter kan du rydde stolene. Hvis du ikke forstår, kan du spørre meg. Vi må være ferdige før klokka to.","q":"Hva skal personen gjøre først?","opts":["Vaske bordene.","Rydde stolene.","Gå hjem.","Åpne vinduene."],"speakingFollowUp":"Kan du be kollegaen gjenta en beskjed?","readAdd":"Etter jobben skriver hun en kort melding til lederen. Hun sier at alt er klart, og at hun trenger mer såpe neste gang."},{"id":"a1-transfer","audio":"Hei! Møtet er flyttet til torsdag klokka elleve. Vi møtes ikke på kontoret, men på biblioteket. Gi beskjed hvis du ikke kan komme. Takk for hjelpen.","q":"Hvor skal de møtes?","opts":["På biblioteket.","På kontoret.","På skolen.","På sykehuset."],"speakingFollowUp":"Spør hvor og når neste møte skal være.","readAdd":"Noen ganger endrer planer seg. Da er det viktig å høre på en ny beskjed og spørre hvis man ikke forstår. Du kan også skrive ned avtalen."},{"id":"a2-story","audio":"I går skulle jeg besøke en venn, men toget var forsinket. Jeg sendte en melding og forklarte at jeg kom senere. Da jeg endelig kom fram, gikk vi en tur og spiste middag sammen. Neste gang vil jeg sjekke togtidene tidligere. Vi planlegger allerede å møtes igjen neste måned.","q":"Hva gjorde personen fordi toget var forsinket?","opts":["Sendte en melding til vennen.","Avlyste vennskapet.","Tok et fly.","Dro direkte hjem."],"speakingFollowUp":"Hva skjedde i går, og hva vil du gjøre annerledes neste gang?","readAdd":"Han hadde planlagt å reise tidligere, men måtte arbeide litt lenger enn vanlig. Derfor gikk han raskt til stasjonen. Han fant likevel tid til å ringe vennen sin. Etter middagen snakket de om hva de ville gjøre i ferien. De hadde ikke bestemt hvor de skulle reise, men begge ønsket å se et nytt sted."},{"id":"a2-work","audio":"Hei, jeg har sett at det er en ledig vakt på lørdag. Jeg kan gjerne arbeide da, men trenger å vite når vakten begynner og hvilke oppgaver jeg får. Jeg har erfaring fra renhold og kan også hjelpe til med enkle praktiske oppgaver. Kan du gi meg beskjed innen fredag?","q":"Hva trenger personen å vite før vakten?","opts":["Tidspunkt og arbeidsoppgaver.","Prisen på lunsj.","Hvor lederen bor.","Når ferien begynner."],"speakingFollowUp":"Kan du be lederen om en ekstra vakt og forklare når du er ledig?","readAdd":"Arbeidsplassen har en tavle med oppgaver for hver dag. Noen ganger må planen endres hvis en kollega er syk. Da skriver lederen en melding slik at alle får vite hva de skal gjøre. Det er viktig å spørre om noe er uklart, slik at arbeidsoppgaver blir utført på riktig måte."},{"id":"a2-services","audio":"God dag. Jeg ringer fordi varmen i leiligheten ikke fungerer. Jeg meldte fra i går, men har ikke fått svar. Det er kaldt, og jeg ønsker å vite når noen kan komme for å undersøke problemet. Hvis reparasjonen tar lang tid, vil jeg gjerne spørre om en midlertidig løsning.","q":"Hva ber innringeren om?","opts":["Tidspunkt for hjelp og eventuelt midlertidig løsning.","Nytt telefonnummer.","Oppsigelse av jobben.","Gratis bussbillett."],"speakingFollowUp":"Hvordan kan du beskrive en feil og spørre om fristen for reparasjon?","readAdd":"Familien har tatt kontakt med utleieren flere ganger. Først sendte de en kort melding, deretter ringte de og forklarte hva som hadde skjedd. Utleieren svarte at han skulle bestille en tekniker, men kunne ikke love en bestemt dato. Familien ba derfor om en oppdatering når tidspunktet var klart. De ønsket også å vite hva de kunne gjøre i mellomtiden."},{"id":"a2-digital","audio":"For å bestille time må du først logge inn på nettsiden. Deretter velger du dato og fyller ut kontaktinformasjonen. Når du har sendt skjemaet, får du vanligvis en bekreftelse. Hvis du ikke mottar den, bør du sjekke at e-postadressen er riktig før du sender en ny bestilling.","q":"Что следует проверить, если подтверждение не пришло?","opts":["Om e-postadressen er riktig.","Om telefonen er slått av.","Om biblioteket er åpent.","Om bussen går."],"speakingFollowUp":"Как попросишь помочь с входом и проверить, дошёл ли документ?","readAdd":"På en nettside finner du informasjon om åpningstider og tjenester. Noen skjemaer kan fylles ut uten å logge inn, mens andre krever sikker innlogging. Det er lurt å lese instruksjonen før man begynner. Dersom et dokument mangler, kan systemet vise en beskjed om hva som må legges ved. Etter innsending bør du lagre bekreftelsen slik at du senere kan se hva du har sendt."},{"id":"a2-health","audio":"Jeg har hatt vondt i ryggen siden mandag, men i dag føles det litt bedre. Jeg vil gjerne spørre legen om jeg kan fortsette med vanlig arbeid. Jeg har også noen spørsmål om hvordan jeg skal følge rådene jeg fikk sist. Hvis smertene blir verre, skal jeg kontakte legekontoret igjen.","q":"Hva sier personen om tilstanden i dag?","opts":["Det føles litt bedre.","Den er helt borte.","Den har aldri eksistert.","Den gjelder bare halsen."],"speakingFollowUp":"Fortell hvor lenge et symptom har vart, og hva du trenger å spørre legen om.","readAdd":"Legen forklarte at pasienten burde ta det rolig en periode. Han anbefalte også å følge med på hvordan symptomene utviklet seg. Pasienten skrev ned rådene for å huske dem senere. Hun spurte hvilke endringer hun skulle være oppmerksom på, og når hun burde ta kontakt på nytt. Det var viktig for henne å forstå både hva hun kunne gjøre selv, og når hun skulle søke hjelp."},{"id":"a2-opinion","audio":"Jeg foretrekker å ta bussen til jobben fordi det er billigere enn å kjøre bil. Samtidig kan det være vanskelig når bussen er forsinket. En kollega mener at bil er mer praktisk. Jeg forstår argumentet hans, men for meg er prisen viktigere. Vi er enige om at begge løsningene har fordeler.","q":"Hvorfor velger personen buss?","opts":["Den koster mindre.","Den går alltid raskere.","Den er den eneste muligheten.","Kollegaen krever det."],"speakingFollowUp":"Forklar hva du foretrekker, hvorfor, og какой недостаток ты признаёшь.","readAdd":"To naboer diskuterer om de bør bruke en felles sykkelbod. Den ene mener at det vil bli enklere å holde orden, mens den andre er redd for at boden blir for full. De bestemmer seg for å prøve ordningen i en måned. Etterpå skal de diskutere om den fungerer. På den måten kan de teste ideen før de bestemmer seg for en permanent løsning."},{"id":"a2-media","audio":"Biblioteket melder at åpningstidene blir endret fra neste måned. På mandager vil det åpne én time senere, men på torsdager skal det holde åpent lenger enn før. Endringen er foreløpig en prøveordning. Besøkende kan sende tilbakemeldinger til biblioteket før ordningen blir vurdert på nytt til vinteren.","q":"Hva характеризует изменение расписания?","opts":["Det er en prøveordning.","Det gjelder bare én dag.","Biblioteket stenger permanent.","Ingen kan gi tilbakemelding."],"speakingFollowUp":"Перескажи сообщение и объясни, что уже решено, а что ещё может измениться.","readAdd":"Lokalavisen skriver at kommunen vurderer nye åpningstider for svømmehallen. Forslaget kommer etter at flere innbyggere har bedt om mulighet til å svømme om morgenen. Kommunen har ikke tatt en endelig beslutning. Først vil den undersøke hvor mange som ønsker tilbudet, og hva det vil koste. Avisen understreker at forslaget kan bli endret etter høringen."},{"id":"a2-transfer","audio":"Du får en melding fra skolen: Kurset starter ikke mandag som planlagt. Den nye datoen er onsdag, men rommet er det samme. Du må gi beskjed hvis du ikke kan komme. Hvis du trenger hjelp, kan du ringe skolens kontor før klokka tre i morgen.","q":"Hva har endret seg?","opts":["Startdagen for kurset.","Rommet og adressen.","Lærerens navn.","Hele innholdet i kurset."],"speakingFollowUp":"Объясни изменение другу и спроси у школы альтернативу, если новая дата не подходит.","readAdd":"En person har bestilt et møte på nettet. Senere får hun beskjed om at tidspunktet er flyttet. Hun kan enten bekrefte den nye tiden eller be om en annen avtale. Før hun svarer, kontrollerer hun kalenderen og arbeidsplanen. Deretter skriver hun en høflig melding med forslag til to mulige tidspunkter. Hun ber også om en kort bekreftelse for å unngå misforståelser."}];
 window.NEFoundationExtensions=window.NEFoundationExtensions||Object.create(null);
 for(const x of data){
  window.NEFoundationExtensions[x.id]={
   listeningFollowUp:{audio:x.audio,q:x.q,opts:x.opts,correct:0},
   speakingFollowUp:x.speakingFollowUp,readAdd:x.readAdd
  };
 }

 // Independent third listening contexts: authored practice scripts for TTS,
 // NOT licensed human recordings or externally reviewed CEFR material.
 const extraListening=[
  {
    "id": "a1-home",
    "audio": "Jeg bor i en liten leilighet sammen med søsteren min. På kjøkkenet står et bord ved vinduet. I dag finner jeg ikke nøkkelen min. Jeg ser først på bordet og så i gangen. Søsteren min spør om nøkkelen ligger i jakken min. Jeg sjekker lommen, og der er den. Nå kan vi gå til butikken.",
    "q": "Где в итоге нашёлся ключ?",
    "opts": [
      "В кармане куртки.",
      "На кухонном столе.",
      "В прихожей.",
      "В сумке сестры."
    ]
  },
  {
    "id": "a1-shopping",
    "audio": "Anna skal lage middag til to personer. Hun går til butikken etter jobb. Hun trenger poteter, gulrøtter og fisk. Først finner hun grønnsakene, men fisken er utsolgt. En ansatt sier at det kommer ny fisk i morgen. Anna kjøper egg i stedet. Hun betaler med kort og går hjem for å lage middag.",
    "q": "Что Анна купила вместо рыбы?",
    "opts": [
      "Яйца.",
      "Куриное мясо.",
      "Хлеб.",
      "Молоко."
    ]
  },
  {
    "id": "a2-work",
    "audio": "På mandag får Amir en melding fra lederen sin. Han skal egentlig begynne klokka åtte på tirsdag, men en kollega er syk. Lederen spør om Amir kan komme klokka sju og avslutte en time tidligere. Amir må levere barnet sitt i barnehagen, så han kan ikke starte før halv åtte. Han foreslår å jobbe til vanlig tid i stedet. Lederen svarer at det går fint, og ber ham gi beskjed til kollegaen som skal overta ved lunsj. Amir bekrefter den nye avtalen skriftlig.",
    "q": "На какое изменение договорился Амир?",
    "opts": [
      "Начать в половине восьмого и закончить в обычное время.",
      "Начать ровно в семь и закончить раньше.",
      "Взять весь вторник выходным.",
      "Прийти после обеда."
    ]
  },
  {
    "id": "a2-health",
    "audio": "Kari har bestilt time hos fastlegen på torsdag klokka ti. Onsdag kveld får hun en SMS om at legen er syk. Legekontoret tilbyr en ny time fredag klokka elleve eller en telefonsamtale med en annen lege torsdag ettermiddag. Kari trenger å snakke om medisinen sin, men hun har ingen akutte symptomer. Hun ringer kontoret neste morgen for å spørre om telefonsamtalen er tilstrekkelig. Sekretæren sier at legen først må vurdere saken. Kari velger derfor timen fredag og får en bekreftelse på SMS.",
    "q": "Почему Кари в итоге выбрала приём в пятницу?",
    "opts": [
      "Достаточность телефонной консультации не могли подтвердить заранее.",
      "Телефонные консультации были полностью отменены.",
      "У неё появились острые симптомы.",
      "В четверг кабинет был закрыт весь день."
    ]
  },
  {
    "id": "b1-work",
    "audio": "I verkstedet har de ansatte fått beskjed om at et nytt digitalt system skal tas i bruk neste uke. Lederen understreker at systemet skal gjøre det lettere å registrere oppgaver, men flere medarbeidere er bekymret fordi opplæringen bare er satt opp til én time. Samir foreslår at de prøver løsningen i én avdeling først, og at erfarne kolleger hjelper andre underveis. Lederen er positiv til forslaget, men minner om at rapporteringen må fungere fra første dag. Etter møtet sender Samir en kort oppsummering: Avdelingen skal teste systemet i tre dager, feil meldes til en kontaktperson, og alle får en ekstra gjennomgang før hele verkstedet går over. Det er ennå ikke bestemt om den opprinnelige fristen kan flyttes.",
    "q": "Что уже согласовано, а что ещё не решено?",
    "opts": [
      "Согласован пробный запуск, но перенос общей даты пока не решён.",
      "Все сотрудники переходят на систему немедленно без обучения.",
      "Отказались от новой системы после встречи.",
      "Срок окончательно перенесён на месяц."
    ]
  },
  {
    "id": "b1-news",
    "audio": "Lokalavisen skriver at kommunen vurderer å endre rutene til to busslinjer. Ifølge forslaget skal flere avganger gå forbi sykehuset, mens noen turer gjennom boligområdet kan bli færre. Kommunen mener dette vil hjelpe pasienter og ansatte som reiser tidlig, men en beboerforening er bekymret for eldre som bruker holdeplassen nær butikken. Journalisten viser til foreløpige beregninger, ikke til et endelig vedtak. Innbyggerne har fire uker på å sende inn synspunkter, og transportselskapet skal undersøke hvilke avganger som faktisk blir brukt. I et intervju presiserer prosjektlederen at antall busser totalt ikke nødvendigvis øker. Planen handler først og fremst om å fordele kapasiteten på en annen måte. Endringer kan tidligst tre i kraft etter vinteren.",
    "q": "Какой вывод подтверждается сообщением?",
    "opts": [
      "Речь идёт о предложении перераспределить рейсы, окончательное решение ещё не принято.",
      "Коммуна уже увеличила количество автобусов.",
      "Автобусы через жилой район отменят завтра.",
      "Жители больше не могут подать замечания."
    ]
  },
  {
    "id": "b2-listening",
    "audio": "Under et åpent møte om helsetjenestene legger kommunen fram et forslag om flere digitale konsultasjoner. Administrasjonen framhever at reisetid kan reduseres, og at leger får større fleksibilitet i timeplanen. Representanten for pasientutvalget er enig i at dette kan være en fordel, men etterlyser tall som viser hvem som faktisk vil benytte tilbudet. Hun mener at tilgangen til fysisk undersøkelse ikke må svekkes for personer med sammensatte behov. Kommunedirektøren svarer at digitale konsultasjoner er ment som et supplement, ikke en erstatning. Likevel erkjenner han at dagens budsjett ikke inkluderer opplæring av ansatte eller veiledning til innbyggere som sliter med digitale løsninger. Møtelederen ber derfor om en revidert kostnadsberegning før politikerne tar stilling. Begge parter ønsker bedre tilgjengelighet, men er uenige om hvorvidt gevinstene kan dokumenteres allerede nå.",
    "q": "Почему участники отложили решение?",
    "opts": [
      "Потому что не были подсчитаны некоторые затраты и не было достаточно данных об эффекте.",
      "Потому что все участники отказались от цифровых консультаций.",
      "Потому что физические приёмы уже запретили.",
      "Потому что решение было принято ранее без обсуждения."
    ]
  },
  {
    "id": "b2-argument",
    "audio": "I et radioprogram diskuterer to forskere om kommunene bør innføre gratis kollektivtransport for unge voksne. Den første viser til undersøkelser som antyder at lavere billettpris kan få flere til å velge buss framfor bil. Hun understreker imidlertid at effekten avhenger av hyppige avganger og gode forbindelser; et gratis, men sjeldent tilbud løser ikke transportbehovet. Den andre forskeren mener at en universell gratisordning kan bli kostbar og i noen områder først og fremst hjelpe dem som allerede reiser kollektivt. Han foretrekker målrettede rabatter kombinert med investeringer i rutetilbudet. Programlederen spør om forskerne egentlig er uenige om målet. Begge ønsker lavere utslipp og mer tilgjengelig mobilitet, men de trekker ulike konklusjoner om virkemidlene. Den første peker på langsiktige fordeler, mens den andre etterlyser flere lokale forsøk før en nasjonal modell anbefales.",
    "q": "В чём заключается основное расхождение позиций?",
    "opts": [
      "Оба поддерживают экологичные поездки, но расходятся в выборе универсальных или адресных мер.",
      "Один поддерживает транспорт, другой хочет полностью отменить автобусные маршруты.",
      "Оба считают, что стоимость билета не влияет на поведение.",
      "Исследования уже доказали одинаковый результат во всех коммунах."
    ]
  }
];
 for(const item of extraListening){
  const prior=window.NEFoundationExtensions[item.id]||{};
  window.NEFoundationExtensions[item.id]={
   ...prior,
   independentListening:{audio:item.audio,q:item.q,opts:item.opts,correct:0,sourceType:'synthetic_tts_script',editorStatus:'draft'}
  };
 }
})();
