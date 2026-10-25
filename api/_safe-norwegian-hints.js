// These are strictly scoped, deterministic grammar hints shown ONLY when AI
// verification fails. They do not compute a score, award XP or certify CEFR.
export function safeNorwegianHints(answer,{mode=''}={}){
 const text=String(answer||'').slice(0,6000);
 const hints=[];
 const append=(regex,corrected,explanation)=>{
  const match=regex.exec(text);
  if(match)hints.push({
   source_fragment:match[1]||match[0],
   corrected_fragment:corrected,
   explanation_ru:explanation
  });
 };
 // Written adverbial "etterpå" is one word. Speech-to-text segmentation
 // is not evidence of the student's own spelling.
 if(!String(mode).includes('speaking'))
  append(/(?:^|[.!?]\s+)(etter\s+på)(?=\s+(?:kommer|går|skal|vil|må|har|er|jobber|begynner|slutter|drar|reiser|kan|kjører)\b)/imu,
   'etterpå','Наречие «etterpå» («после этого») пишется слитно. Например: «Etterpå går jeg hjem».');
 // "hjem" expresses movement towards home; "hjemme" describes being at home.
 append(/\b(kommer\s+jeg\s+hjemme)\b/imu,
  'kommer jeg hjem','С глаголом движения «kommer» нужно «hjem» (куда?), а не «hjemme» (где?). «Jeg kommer hjem» — «Я прихожу домой».');
 return hints.slice(0,3);
}
