import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'node:http';
import {once} from 'node:events';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import stagingBuilder from '../tools/build-staging-server.cjs';
import {authCall, accessRpc, publicRpc} from '../api/_access.js';
import {createSession} from '../api/_guard.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ne-staging-'));
const originalFetch = globalThis.fetch;
try {
  const output = stagingBuilder.build(dir);
  const config = JSON.parse(fs.readFileSync(path.join(output, 'config.json')));
  assert.equal(config.version, 3);
  assert(config.routes.some(route => route.handle === 'filesystem'));
  assert(!config.routes.some(route => route.status === 404));
  const serverFunctions = path.join(output, 'functions', 'api');
  assert.equal(fs.readdirSync(serverFunctions).length, 12);
  assert(!fs.existsSync(path.join(output, 'static', 'preview-demo.js')));
  assert(!fs.existsSync(path.join(output, 'static', 'api')));
  const handlers = {};
  for (const entry of fs.readdirSync(serverFunctions)) {
    const folder = path.join(serverFunctions, entry);
    const meta = JSON.parse(fs.readFileSync(path.join(folder, '.vc-config.json')));
    assert.equal(meta.runtime, 'nodejs22.x');
    handlers[entry.replace('.func', '')] = (await import(pathToFileURL(path.join(folder, meta.handler)))).default;
    assert.equal(typeof handlers[entry.replace('.func', '')], 'function');
  }

  const server = createServer((req, res) => {
    const handler = req.url === '/api/health' ? handlers.health : handlers.session;
    handler(req, res).catch(() => { res.statusCode=500; res.end(); });
  });
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = 'http://127.0.0.1:' + server.address().port;
    assert.equal((await (await originalFetch(origin + '/api/health')).json()).ok, true);
    const logout = await originalFetch(origin + '/api/session', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:'{"action":"logout"}'
    });
    assert.equal(logout.status, 200);
    assert.equal(logout.headers.getSetCookie().length, 2);
    assert.equal((await originalFetch(origin + '/api/session', {method:'POST',body:'{'})).status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  const ref = 'synthetictestproject';
  const url = 'https://' + ref + '.supabase.co';
  const settings = {
    VERCEL:'1', VERCEL_ENV:'preview', VERCEL_TARGET_ENV:'preview', NE_SERVER_MODE:'isolated-staging',
    NE_STAGING_SUPABASE_REF:ref, NE_STAGING_SUPABASE_URL:url,
    NE_STAGING_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',
    NE_SESSION_SECRET:'synthetic-session-secret-for-tests-only',
    NE_STAGING_OPENAI_API_KEY:'synthetic-provider-key'
  };
  let quota = true, providerCalls = 0, databaseCalls = 0;
  const json = data => ({ok:true, json:async () => data});
  globalThis.fetch = async (target, options) => {
    if (target.startsWith(url + '/')) {
      databaseCalls++;
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.apikey, settings.NE_STAGING_SUPABASE_PUBLISHABLE_KEY);
      if (target.endsWith('/user')) return json({email_confirmed_at:'2026-01-01'});
      if (target.endsWith('/ne_access_status_v2')) return json({owner:true, access_granted:true});
      if (target.endsWith('/ne_staging_ai_quota_check')) {
        assert.match(JSON.parse(options.body).p_route, /^\/api\/(speech|transcribe|pronounce)$/);
        return json({allowed:quota, reason:'QUOTA'});
      }
      if (target.endsWith('/ne_sync_v2')) {
        assert.equal(options.headers.Authorization, 'Bearer synthetic');
        assert.equal(JSON.parse(options.body).p_action, 'pull');
        return json({ok:true,revision:1,state:{xp:9}});
      }
    }
    if (target.startsWith('https://api.openai.com/v1/')) {
      providerCalls++;
      if (target.endsWith('/speech')) return {ok:true,arrayBuffer:async () => Buffer.from('mock audio')};
      if (target.endsWith('/transcriptions')) return json({text:'God dag'});
      if (target.endsWith('/completions')) return json({choices:[{message:{content:'{"score":80}'}}]});
    }
    throw new Error('Unexpected destination');
  };
  for (const override of [
    {NE_SERVER_MODE:''},
    {VERCEL_ENV:'production'},
    {VERCEL_TARGET_ENV:'production'},
    {VERCEL_ENV:''},
    {NE_STAGING_SUPABASE_REF:''},
    {NE_STAGING_SUPABASE_REF:'rskgbkgtrigtznnksbyp',NE_STAGING_SUPABASE_URL:'https://rskgbkgtrigtznnksbyp.supabase.co'},
    {NE_STAGING_SUPABASE_URL:url + ':443'},
    {NE_STAGING_SUPABASE_URL:url + '@example.invalid'},
    {NE_STAGING_SUPABASE_URL:'https://rskgbkgtrigtznnksbyp.supabase.co'},
    {NE_STAGING_SUPABASE_PUBLISHABLE_KEY:'sb_secret_synthetic'}
  ]) {
    Object.assign(process.env, settings, override);
    await assert.rejects(authCall('user'), /STAGING_DATABASE_UNAVAILABLE/);
    await assert.rejects(accessRpc('synthetic','ne_access_status_v2'), /STAGING_DATABASE_UNAVAILABLE/);
    await assert.rejects(publicRpc('ne_feedback_public'), /STAGING_DATABASE_UNAVAILABLE/);
  }
  assert.equal(databaseCalls, 0);
  Object.assign(process.env, settings);
  let ip = 0;
  async function call(route, body) {
    // An alias/trailing slash must never bypass the handler's canonical quota.
    const req = {method:'POST',url:'/other-path/',body,headers:{
      host:'localhost',cookie:'ne_access=synthetic','x-forwarded-for':'mock-' + (++ip)
    }};
    req.headers['x-ne-session'] = createSession(req);
    const res = {status(code){this.code=code; return this;},json(data){this.data=data; return this;},
      send(data){this.data=data; return this;},setHeader(){}};
    await handlers[route](req,res);
    return res;
  }
  const cloud = await call('cloud', {name:'norsk_eventyr_sync_pull',params:{
    p_sync_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',p_secret:'s'.repeat(43)
  }});
  assert.equal(cloud.code, 200);
  assert.deepEqual(cloud.data.state, {xp:9});
  process.env.NE_STAGING_AI_ENABLED = '';
  assert.equal((await call('speech', {text:'God dag'})).code, 503);
  process.env.NE_STAGING_AI_ENABLED = '1';
  quota = false;
  assert.equal((await call('speech', {text:'God dag'})).code, 429);
  assert.equal(providerCalls, 0);
  quota = true;
  const wav = Buffer.alloc(256);
  wav.write('RIFF',0);
  wav.write('WAVE',8);
  assert.equal((await call('speech', {text:'God dag'})).code, 200);
  assert.equal((await call('transcribe', {audioBase64:wav.toString('base64'),mime:'audio/wav'})).data.text, 'God dag');
  assert.equal((await call('pronounce', {audioBase64:wav.toString('base64'),expected:'God dag'})).data.score, 80);
  assert.equal((await call('transcribe', {audioBase64:'a'.repeat(4000001)})).code, 413);
  assert.equal((await call('pronounce', {audioBase64:Buffer.alloc(2900001).toString('base64'),expected:'God dag'})).code, 400);
  assert.equal(providerCalls, 3);
  console.log('PASS staging build, fail-closed Supabase, no redirects, quota, bound sync and mocked audio routes');
} finally {
  globalThis.fetch = originalFetch;
  fs.rmSync(dir, {recursive:true,force:true});
}
