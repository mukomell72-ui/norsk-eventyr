const assert = require('node:assert/strict');
const {PGlite} = require('@electric-sql/pglite');
const {schema} = require('../tools/build-staging-sql.cjs');

async function main() {
  const db = new PGlite();
  try {
    // PGlite lacks pgcrypto. Supply equivalent SHA-256 through core Postgres for this test.
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create schema extensions;
      create table auth.users (
        id uuid primary key, email text, email_confirmed_at timestamptz,
        created_at timestamptz default now(), raw_app_meta_data jsonb default '{}',
        raw_user_meta_data jsonb default '{}'
      );
      create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.sub',true),'')::uuid$$;
      create function extensions.digest(data bytea, algorithm text) returns bytea
      language sql immutable as $$select pg_catalog.sha256(data)$$;
    `);
    await db.exec(schema().replace('create extension if not exists pgcrypto with schema extensions;', ''));
    const user = '11111111-1111-4111-8111-111111111111';
    const other = '22222222-2222-4222-8222-222222222222';
    await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
      ($1,'learner@example.invalid',now(),'{"ne_app":"norsk_eventyr"}'),
      ($2,'another@example.invalid',now(),'{"ne_app":"norsk_eventyr"}')`, [user, other]);
    async function as(uid) {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.sub',$1,false)", [uid]);
      await db.exec('set role authenticated');
      await db.query("select public.ne_accept_terms_v2('2026-10-08-v2','2026-10-08-v4',null)");
    }
    await as(user);
    const sync = async (action, state = null, revision = null) => {
      const result = await db.query(
        "select public.ne_sync_v2($1,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',$2,$3,$4) as r",
        [action, 'a'.repeat(43), state, revision]);
      return result.rows[0].r;
    };
    assert.equal((await sync('create', {xp:1})).revision, 1);
    assert.equal((await sync('push', {xp:2}, 1)).revision, 2);
    assert.equal((await sync('push', {xp:3}, 1)).error, 'CONFLICT');
    assert.deepEqual((await sync('pull')).state, {xp:2});
    await assert.rejects(db.query('select * from public.norsk_eventyr_sync'), /permission denied/);
    await as(other);
    assert.equal((await sync('pull')).error, 'AUTH');
    await assert.rejects(db.query("select public.ne_ai_quota_check('/api/evaluate')"), /permission denied/);
    await db.exec('reset role; update public.ne_staging_ai_budget set reserved=117; set role authenticated');
    const quota = async () => (await db.query("select public.ne_staging_ai_quota_check('/api/evaluate') as r")).rows[0].r;
    assert.deepEqual(await quota(), {allowed:true});
    assert.deepEqual(await quota(), {allowed:false, reason:'QUOTA'});
    await db.exec('reset role');
    assert.equal((await db.query('select reserved from public.ne_staging_ai_budget')).rows[0].reserved, 119);
    await db.exec('set role anon');
    await assert.rejects(db.query("select public.ne_staging_ai_quota_check('/api/evaluate')"), /permission denied/);
    console.log('PASS staging SQL bootstrap, owner sync, conflicts, private tables and executable global quota');
  } finally {
    await db.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
