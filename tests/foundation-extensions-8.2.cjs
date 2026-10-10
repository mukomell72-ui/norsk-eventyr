const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(dir,p),'utf8');
const env={window:{},Date,Number,Math,String,JSON,Array,Object,Set};vm.createContext(env);
for(const file of ['curriculum-v8.js','practice-foundations.js','foundation-extensions.js','advanced-b1.js','advanced-b2.js'])vm.runInContext(read(file),env);
const c=env.window.NECurriculum,b=env.window.NECurated;
const count=t=>String(t||'').trim().split(/\s+/).filter(Boolean).length;
for(const level of ['A1','A2','B1','B2']){
 const modules=c.modules(level);
 assert.equal(modules.length,8,level+' should have 8 independent goals');
 for(const m of modules){
  const lesson=b.get(m.id);assert(lesson,'Missing lesson '+m.id);
  assert.equal(lesson.listeningSets?.length,2,m.id+' has to contain progressive listening');
  assert(count(lesson.speakingFollowUp)>=4,m.id+' needs a second open oral question');
  assert(count(lesson.read)>=(level==='A1'?29:level==='A2'?60:90),m.id+' reading text too short');
  for(let round=0;round<5;round++){
   const rotated=b.variant(m.id,round);
   for(let p=0;p<2;p++){
    const e=lesson.listeningSets[p],r=rotated.listeningSets[p];
    assert.equal(r.opts[r.correct],e.opts[e.correct],m.id+': lost listening correct key at '+p);
   }
  }
 }
}
const src=read('app.js');
assert(src.includes('listeningIndex:session.listeningIndex||0')&&src.includes('speakingFollowup:session.speakingFollowup===true'),'Both multi-turn stages must survive restart');
assert(src.includes('continueListeningStep()')&&src.includes('Ответить на уточнение'),'Learning exercises must support multiple turns');
const access=read('access.js'),cache=read('sw.js');
for(const file of ['foundation-extensions.js','advanced-b1.js','advanced-b2.js']){
 assert(access.includes("'"+file+"'"),file+' must be loaded');
 assert(cache.includes('/'+file+'?v='),file+' must be cached for installed preview');
}
console.log('PASS 32-level curriculum staged listening, longer reading, oral follow-up and answer-key integrity');
