// Short adaptive exercises after EVERY vocabulary card.
// Verified paradigms use exact grammatical-form recall; unknown words get a
// contextual sentence assessed by the existing teacher (no invented forms).
(function(){
'use strict';
const prompts={
 noun:['Неопределённая форма, единственное число (с артиклем)','Определённая форма, единственное число',
       'Неопределённая форма, множественное число','Определённая форма, множественное число'],
 verb:['Инфинитив с å','Настоящее время (presens)','Прошедшее время (preteritum)',
       'Перфект (har + причастие)','Будущее (конструкция с skal)'],
 adjective:['Общий род (en)','Средний род (et)','Множественное число / определённая форма',
            'Сравнительная степень','Превосходная степень']
};
const contexts=[
 'Напиши короткое предложение на норвежском, употребив это слово в подходящей форме.',
 'Придумай новое предложение на норвежском с этим словом в подходящем контексте.',
 'Напиши другое осмысленное предложение по-норвежски, используя изучаемое слово.'
];
const norm=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('nb-NO')
 .trim().replace(/[.,!?;:"“”«»]+$/g,'').replace(/\s+/g,' ');
function taskList(word){
 const g=window.NECardGrammar?.describe?.(word);
 if(g?.verified===true&&Array.isArray(g.forms)&&g.forms.length>1){
  return g.forms.map((f,i)=>({
   kind:'form',index:i,type:g.type,label:prompts[g.type]?.[i]||String(f.label),
   prompt:'Поставь слово «'+g.headword+'» в форму: '+(prompts[g.type]?.[i]||f.label)+'.',
   answer:f.form,word:g.headword,help:g.help||'',url:g.url||''
  }));
 }
 return contexts.map((prompt,i)=>({
  kind:'sentence',index:i,type:g?.type||'other',label:'Предложение с изучаемым словом',
  prompt,word:g?.headword||String(word.word||''),answer:null,
  help:'Используй слово в осмысленном предложении. Нора проверит уместность и грамматику.',
  url:g?.url||''
 }));
}
function choose(word,avoid=-1,rand=Math.random){
 const tasks=taskList(word);
 const pool=tasks.filter(x=>x.index!==avoid);
 const list=pool.length?pool:tasks;
 const raw=Number(rand())||0,selection=Math.max(0,Math.min(list.length-1,Math.floor(raw*list.length)));
 return list[selection];
}
function variants(task,word){
 const v=[task.answer];
 const g=window.NECardGrammar?.describe?.(word);
 if(g?.type==='noun'){
  const lemma=g.lemma;
  // Bokmål accepts common alternative feminine forms in these entries.
  const feminine=['bok','jente','klokke','uke','oppgave','pause','skole'];
  if(feminine.includes(lemma)){
   if(task.index===0)v.push((task.answer||'').startsWith('en ')?'ei '+lemma:'en '+lemma);
   if(task.index===1){
    const a=String(task.answer||'');
    if(a.endsWith('en'))v.push(a.slice(0,-2)+'a');
    if(a.endsWith('a'))v.push(a.slice(0,-1)+'en');
   }
  }
 }
 return v;
}
function correct(task,raw,word){
 if(!task||task.kind!=='form')return false;
 const value=norm(raw);
 return !!value&&variants(task,word).some(v=>norm(v)===value);
}
function hint(task,misses){
 if(task.kind!=='form')return 'Попробуй другой контекст. Составь целое норвежское предложение, а не отдельное слово.';
 const base='Форма: '+task.label+'. '+(task.type==='noun'?'Проверь артикль, число и определённость.':
  task.type==='verb'?'Проверь время и правильность спряжения.':'Проверь род, число или степень сравнения.');
 if(misses>=3)return base+' Правильный вариант: '+task.answer+'. Напиши его самостоятельно, затем будет другое задание.';
 if(misses>=2)return base+' Подсказка: начинается с «'+String(task.answer).slice(0,Math.min(3,String(task.answer).length))+'».';
 return base;
}
window.NECardFormPractice=Object.freeze({taskList,choose,correct,hint,norm});
})();