// Staging preflight is an offline structural check, not a license, GDPR or CEFR certification.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {checkSource}=require('../tools/prepare-staging-release.cjs');
const check=checkSource();
assert.equal(check.version,'8.3.0');
assert.equal(check.modules,32);
assert.equal(check.authoredListeningScripts,72);
assert.equal(check.productionPublishedByThisScript,false);
assert.equal(typeof check.humanRecordingsVerifiedInMetadata,'number');
assert.equal(typeof check.editorialApprovalsRecordedInMetadata,'number');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'tests/package.json'),'utf8'));
assert(pkg.scripts.test.includes('staging-preflight-8.3.cjs'),'Staging gate not mandatory');
const note=fs.readFileSync(path.join(root,'RELEASE_8_3_0_STAGING.md'),'utf8');
assert(note.includes('NO-GO'),'Missing honest go/no-go risks');
assert(note.includes('PR #33'),'Divergent old draft must be reviewed rather than merged blindly');
assert(note.includes('PR #41'),'Unrelated app must remain outside the bundle');
assert(note.includes('72'),'Prepared material count missing');
assert(note.includes('НЕ ОПУБЛИКОВАНА'),'Must not describe staging as production');
const android=fs.readFileSync(path.join(root,'ANDROID_8_3_0_ACCEPTANCE.md'),'utf8');
const actualSecurity=fs.readFileSync(path.join(root,'LIVE_RELEASE_READINESS_2026-10-13.md'),'utf8');
for(const phrase of ['НЕ ПРОВЕРЕНО','8.3.0','микрофон','B2'])
 assert(android.includes(phrase),'Android manual test plan missing requirement: '+phrase);
for(const phrase of ['NO-GO','norsk_eventyr_sync_create','auth_leaked_password_protection','Firewall','GDPR'])
 assert(actualSecurity.includes(phrase),'Live security audit missing blocker: '+phrase);
assert(note.includes('LIVE_RELEASE_READINESS_2026-10-13.md')&&note.includes('ANDROID_8_3_0_ACCEPTANCE.md'),
 'Staging release plan must link real-device and security-readiness checks');
console.log('PASS 8.3 release staging: synced version, 32 modules, 72 authored scripts, documented scope and publication blockers');
