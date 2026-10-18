// Northern Compass: original interactive mission mechanics and optional audio cues.
// Side quests practise recognition, word order and choices; they NEVER certify a CEFR level.
(function(){
'use strict';
const MODES=Object.freeze(['dialogue','assemble','listen','decision']);
const BRANCHES={
 A1:[
  {id:'help',no:'Jeg kan hjelpe deg.',ru:'Я могу тебе помочь.',title:'Огонёк на пристани',story:'Ты помог новому знакомому сориентироваться. В окне домика у пристани зажёгся свет — теперь здесь знают, что к тебе можно обратиться.'},
  {id:'explore',no:'Kan du vise meg veien?',ru:'Можешь показать мне дорогу?',title:'Тропа к городу',story:'Ты попросил подсказать дорогу и нашёл тропу к городку. У тебя появился новый маршрут для следующего приключения.'}
 ],
 A2:[
  {id:'help',no:'Jeg kan forklare hva som skjedde.',ru:'Я могу объяснить, что произошло.',title:'Местные новости',story:'Ты спокойно рассказал о ситуации. Соседи стали лучше понимать, что случилось, и предложили помощь.'},
  {id:'explore',no:'Kan vi finne en annen løsning?',ru:'Можем ли мы найти другое решение?',title:'Обходной путь',story:'Ты предложил поискать альтернативу. Вместе удалось наметить новый маршрут без лишней спешки.'}
 ],
 B1:[
  {id:'help',no:'Jeg vil gjerne høre hva du mener.',ru:'Мне хотелось бы услышать твоё мнение.',title:'Совет у маяка',story:'Ты пригласил собеседника к обсуждению. Встреча превратилась в совместное обсуждение возможных решений.'},
  {id:'explore',no:'La oss undersøke saken litt nærmere.',ru:'Давайте изучим вопрос немного подробнее.',title:'Новые сведения',story:'Ты предложил сначала уточнить факты. Участники встречи договорились собрать недостающую информацию.'}
 ],
 B2:[
  {id:'help',no:'Vi bør ta hensyn til begge perspektivene.',ru:'Нам следует учесть обе точки зрения.',title:'Мост двух берегов',story:'Ты признал важность двух позиций. Дискуссия продолжилась спокойнее, и стороны нашли основу для сотрудничества.'},
  {id:'explore',no:'Jeg foreslår at vi vurderer konsekvensene først.',ru:'Я предлагаю сначала оценить последствия.',title:'Дальний горизонт',story:'Ты настоял на анализе последствий. Команда согласилась рассмотреть риски прежде, чем принимать решение.'}
 ]
};
const NOTES={
 dialogue:{correct:'Ты выбрал реплику, которая подходит к ситуации. Продолжай — впереди новое испытание.',wrong:'Вспомни, какую мысль ты хочешь передать собеседнику.'},
 assemble:{correct:'Получилось правильное предложение. Обрати внимание на порядок слов.',wrong:'Предложение пока не совпадает с образцом. Проверь порядок слов и попробуй снова.'},
 listen:{correct:'Ты сопоставил услышанное с верным значением.',wrong:'Прослушай фразу ещё раз. Обрати внимание на главное слово.'},
 decision:{correct:'Выбор сделан. Продолжение истории изменилось по твоему решению.',wrong:'Оба пути открыты: выбери, как поступит твой персонаж.'}
};
function norm(x){return String(x||'').normalize('NFKC').toLocaleLowerCase('nb-NO')
 .replace(/[.,!?;:"“”«»()[\]{}]/g,' ').replace(/\s+/g,' ').trim()}
function modes(){return [...MODES]}
function mode(index){return MODES[Math.max(0,Math.min(MODES.length-1,Number(index)||0))]}
function branches(level){return BRANCHES[level]||BRANCHES.A1}
function phraseTokens(text){return String(text||'').trim().split(/\s+/).filter(Boolean)}
function shuffledTiles(text){
 const tokens=phraseTokens(text);
 // Deterministic reordering: avoid a random tile shuffle that might require
 // server state. The correct reading order is kept as each tile's original ID.
 const ordered=tokens.map((value,id)=>({id,value}));
 return ordered.length<3?ordered.reverse():[...ordered.slice(1).reverse(),ordered[0]];
}
function assembled(phrase,selected){
 const tiles=shuffledTiles(phrase);
 const keys=Array.isArray(selected)?selected:[];
 if(keys.some(k=>!Number.isInteger(k)||k<0||k>=tiles.length))return '';
 if(new Set(keys).size!==keys.length)return '';
 return keys.map(i=>tiles[i].value).join(' ');
}
function validAssembly(phrase,selected){
 return phraseTokens(phrase).length>=2&&
   Array.isArray(selected)&&selected.length===phraseTokens(phrase).length&&
   norm(assembled(phrase,selected))===norm(phrase);
}
function feedback(stage,correct){return NOTES[stage]?.[correct?'correct':'wrong']||''}
function cue(enabled,kind){
 if(!enabled)return false;
 try{
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return false;
  const ctx=new C(),wave=ctx.createOscillator(),volume=ctx.createGain();
  wave.type='sine';
  wave.frequency.setValueAtTime(kind==='wrong'?230:kind==='finish'?520:460,ctx.currentTime);
  if(kind==='finish')wave.frequency.exponentialRampToValueAtTime(780,ctx.currentTime+.19);
  else if(kind!=='wrong')wave.frequency.exponentialRampToValueAtTime(600,ctx.currentTime+.13);
  volume.gain.setValueAtTime(.0001,ctx.currentTime);
  volume.gain.exponentialRampToValueAtTime(.055,ctx.currentTime+.012);
  volume.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.25);
  wave.connect(volume);volume.connect(ctx.destination);wave.start();wave.stop(ctx.currentTime+.27);
  wave.onended=()=>{ctx.close?.().catch?.(()=>{})};
  return true;
 }catch{return false}
}
window.NQQuestPlay=Object.freeze({
 MODES,modes,mode,branches,phraseTokens,shuffledTiles,assembled,validAssembly,feedback,norm,cue
});
})();
