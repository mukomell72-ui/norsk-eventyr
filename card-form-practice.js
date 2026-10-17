// Every card: understand the translation, then independently USE the word in context.
// Verified Bokmål morphology controls a randomized target. Nora checks meaning,
// grammar and appropriateness of the complete Norwegian sentence.
(function(){
'use strict';
const forms={
 noun:['Единственное число с артиклем','Определённая форма единственного числа',
       'Множественное число, неопределённая форма','Множественное число, определённая форма'],
 verb:['Инфинитив с å','Настоящее время (presens)','Прошедшее время (preteritum)',
       'Перфект (har + причастие)','Будущее с skal'],
 adjective:['Общий род (en)','Средний род (et)','Множественное число / определённая форма',
            'Сравнительная степень','Превосходная степень']
};
const situations={
 noun:['Расскажи, что у тебя есть или что ты видишь.',
       'Расскажи о конкретном предмете, о котором собеседник уже знает.',
       'Опиши несколько таких предметов в жизни.',
       'Расскажи о нескольких определённых предметах, уже известных собеседнику.'],
 verb:['Скажи, что тебе нравится или важно делать.',
       'Расскажи, что ты делаешь сейчас или обычно.',
       'Расскажи, что произошло вчера или на прошлой неделе.',
       'Расскажи о том, что ты уже сделал.',
       'Расскажи, что собираешься сделать завтра или позже.'],
 adjective:['Опиши конкретного человека или предмет общего рода (en).',
       'Опиши предмет среднего рода (et).',
       'Расскажи о нескольких людях или предметах.',
       'Сравни двух людей, два предмета или ситуации.',
       'Скажи, кто или что обладает этим признаком в наибольшей степени.']
};
const contexts=[
 'Придумай осмысленную фразу из повседневной жизни с этим словом.',
 'Представь разговор с другом и напиши собственное предложение с этим словом.',
 'Расскажи о работе, доме или учёбе, используя это слово в подходящей форме.'
];
const norm=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('nb-NO')
 .replace(/[.,!?;:"“”«»()[\]{}]/g,' ').replace(/\s+/g,' ').trim();
function taskList(word){
 const g=window.NECardGrammar?.describe?.(word);
 if(g?.verified===true&&Array.isArray(g.forms)&&g.forms.length>1){
  return g.forms.map((f,i)=>({
   kind:'sentence',index:i,type:g.type,label:forms[g.type]?.[i]||String(f.label),
   prompt:(situations[g.type]?.[i]||'Составь собственное предложение.')+
    ' Используй «'+g.headword+'» в указанной форме: '+(forms[g.type]?.[i]||f.label)+'.',
   requiredForm:f.form,answer:f.form,word:g.headword,lemma:g.lemma,
   help:g.help||'',url:g.url||''
  }));
 }
 return contexts.map((context,i)=>({
  kind:'sentence',index:i,type:g?.type||'other',label:'Применение слова в речи',
  prompt:context+' Используй слово «'+(g?.headword||String(word.word||''))+'» так, чтобы смысл предложения был понятен.',
  requiredForm:null,answer:null,word:g?.headword||String(word.word||''),
  lemma:g?.lemma||String(word.word||''),help:'Напиши полноценное предложение; Нора оценит значение, контекст и грамматику.',
  url:g?.url||''
 }));
}
function choose(word,avoid=-1,rand=Math.random){
 const tasks=taskList(word),options=tasks.filter(t=>t.index!==avoid);
 const pool=options.length?options:tasks,roll=Number(rand())||0;
 return pool[Math.max(0,Math.min(pool.length-1,Math.floor(roll*pool.length)))];
}
function variants(task,word){
 if(!task?.requiredForm)return [];
 const v=[task.requiredForm],g=window.NECardGrammar?.describe?.(word);
 if(g?.type==='noun'){
  const lemma=g.lemma;
  const feminine=['bok','jente','klokke','uke','oppgave','pause','skole'];
  if(feminine.includes(lemma)){
   if(task.index===0&&/^(en|ei) /.test(task.requiredForm))
    v.push((task.requiredForm.startsWith('en ')?'ei ':'en ')+lemma);
   if(task.index===1){
    const a=String(task.requiredForm);
    if(a.endsWith('en'))v.push(a.slice(0,-2)+'a');
    if(a.endsWith('a'))v.push(a.slice(0,-1)+'en');
   }
  }
 }
 return v;
}
function includesSequence(sentence,form){
 const actual=' '+norm(sentence)+' ',expected=' '+norm(form)+' ';
 return !!norm(form)&&actual.includes(expected);
}
function hasRequiredForm(task,sentence,word){
 if(!task?.requiredForm)return false;
 if(variants(task,word).some(form=>includesSequence(sentence,form)))return true;
 const g=window.NECardGrammar?.describe?.(word);
 if(g?.type==='noun'&&task.index===0){
  // Indefinite noun may have adjectives between article and noun: "en gammel bil".
  const words=norm(sentence).split(' '),noun=norm(g.lemma);
  for(let i=0;i<words.length;i++){
   if(words[i]!==noun)continue;
   for(let back=1;back<=3&&i-back>=0;back++){
    if(['en','ei','et'].includes(words[i-back])){
     const acceptedArticle=variants(task,word).map(v=>norm(v).split(' ')[0]);
     if(acceptedArticle.includes(words[i-back]))return true;
    }
   }
  }
 }
 return false;
}
function containsWord(task,sentence,word){
 if(task?.requiredForm)return hasRequiredForm(task,sentence,word);
 const lemma=String(task?.lemma||window.NECardGrammar?.describe?.(word)?.lemma||word?.word||'');
 if(includesSequence(sentence,lemma))return true;
 const words=norm(lemma).replace(/^å /,'').split(' ').filter(Boolean);
 if(words.length>1)return includesSequence(sentence,words.join(' '));
 // Unknown regular conjugations: this is a preliminary check only, not grading.
 const base=words[0]||'',stem=base.slice(0,Math.max(3,base.length-2));
 return stem.length>=3&&norm(sentence).split(' ').some(token=>token.startsWith(stem));
}
function hint(task,misses){
 const morphology=task?.requiredForm
   ?'Нужная форма: '+task.label+'. '+(
    task.type==='verb'?'Вспомни время и конструкцию.':
    task.type==='noun'?'Проверь артикль, число и определённость.':
    'Проверь род, число и степень сравнения.')
   :'Вспомни значение слова и составь другое осмысленное предложение.';
 if(misses>=3&&task?.requiredForm)return morphology+' Подсказка: подходящая форма — «'+task.requiredForm+'». Теперь употреби её в собственном предложении.';
 return morphology+' Не достаточно написать одно слово: нужно полное предложение.';
}
window.NECardFormPractice=Object.freeze({
 taskList,choose,variants,hasRequiredForm,containsWord,hint,norm
});
})();
