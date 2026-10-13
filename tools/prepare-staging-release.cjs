// Reproducible LOCAL source bundle for the reviewed 8.3.0 staging candidate.
// Does not deploy, touch cloud data, authenticate to any service or call AI.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),VERSION='8.3.0',EXPECTED_SCRIPTS=72;
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
function checkSource(){
 const app=read('app.js'),access=read('access.js'),sw=read('sw.js'),html=read('index.html'),ui=read('ui-v8.js'),health=read('api/health.js');
 const expected=[
  [app,'const APP_VERSION="'+VERSION+'"','app version'],
  [access,"ASSET_REV='"+VERSION+"'","bootstrap version"],
  [sw,'norsk-eventyr-v8-3-0','offline cache revision'],
  [html,'Norsk Eventyr '+VERSION,'page version'],
  [ui,"version.textContent='"+VERSION+"'","displayed version"],
  [health,'version:"'+VERSION+'"','health version']
 ];
 for(const [content,fragment,label] of expected)if(!content.includes(fragment))throw Error('Mismatched '+label+'; staging aborted');
 const pkg=JSON.parse(read('tests/package.json'));
 for(const name of ['release-regression-gates.cjs','deep-listening-adaptation-8.3.cjs','browser.cjs','updates.cjs','premium-preparation.cjs'])
  if(!pkg.scripts.test.includes(name))throw Error('Mandatory QA missing: '+name);
 const baseline=require('./learning-quality-baseline.cjs').inspect();
 if(baseline.totalModules!==32||baseline.authoredListeningClips!==EXPECTED_SCRIPTS)throw Error('Unexpected curriculum/listening corpus');
 if(baseline.issues.some(x=>x.severity==='error'))throw Error('Curriculum baseline contains blocking errors');
 if(!read('research/PREMIUM_LEARNING_PROGRAM_2026.md').includes('НЕ подтверждённый релиз'))throw Error('Missing research disclaimer');
 return {version:VERSION,modules:baseline.totalModules,authoredListeningScripts:baseline.authoredListeningClips,
  humanRecordingsVerifiedInMetadata:baseline.recordedNativeSpeakerClipsWithVerifiedMetadata,
  editorialApprovalsRecordedInMetadata:baseline.modulesWithRecordedEditorialApproval,
  scope:'staged source only; NOT expert-validated materials, CEFR certification or a public product release',
  productionPublishedByThisScript:false};
}
function git(args){return cp.execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024}).trim()}
function build({ref='HEAD',outputDir='release-out'}={}){
 const result=checkSource();
 if(ref!=='HEAD'&&!/^[0-9a-f]{40}$/.test(ref))throw Error('Ref must be HEAD or a complete Git commit SHA');
 const sha=git(['rev-parse',ref]);
 // Never include untracked files, local environment secrets or test recordings.
 const tracked=git(['ls-tree','-r','--name-only',ref]).split('\n');
 const risky=tracked.filter(f=>/(^|\/)\.env(?:\.|$)|\.(?:pem|p12|pfx|sqlite|db|key)$|(^|\/)(?:service-account|user-scores)(?:\.|\/)/i.test(f));
 if(risky.length)throw Error('Potentially sensitive committed paths: '+risky.join(', '));
 const resolved=path.resolve(root,outputDir);
 if(!resolved.startsWith(root+path.sep))throw Error('Output must stay within the checkout directory');
 fs.mkdirSync(resolved,{recursive:true});
 const zipFile=path.join(resolved,'norsk-eventyr-'+VERSION+'-source.zip');
 // git archive packages a pinned commit, not working-directory files.
 cp.execFileSync('git',['archive','--format=zip','--output='+zipFile,sha],{cwd:root,stdio:'pipe',maxBuffer:25*1024*1024});
 const checksum=crypto.createHash('sha256').update(fs.readFileSync(zipFile)).digest('hex');
 const manifest={...result,sourceCommit:sha,archive:path.basename(zipFile),sha256:checksum,gitTrackedFiles:tracked.length,
  privacy:'No personal learner scores, user recordings, credentials or .git directory are included. Inspect the archive before redistribution.',
  deploy:'none',status:'staging-not-approved-for-production'};
 const manifestFile=path.join(resolved,'RELEASE_MANIFEST_8.3.0.json');
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(resolved,'SHA256SUMS'),checksum+'  '+path.basename(zipFile)+'\n');
 return {zipFile,manifestFile,manifest};
}
if(require.main===module){
 try{
  let ref='HEAD',outputDir='release-out';
  for(let i=2;i<process.argv.length;i++){
   if(process.argv[i]==='--ref')ref=process.argv[++i];
   else if(process.argv[i]==='--output')outputDir=process.argv[++i];
   else throw Error('Unknown argument: '+process.argv[i]);
  }
  const output=build({ref,outputDir});
  console.log('STAGED only:',output.zipFile);
  console.log('Source commit:',output.manifest.sourceCommit);
  console.log('SHA256:',output.manifest.sha256);
 }catch(e){console.error('STAGING ABORTED:',e.message);process.exitCode=1}
}
module.exports={checkSource,build};
