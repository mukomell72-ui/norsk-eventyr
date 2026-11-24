// Import only in tests that replace fetch before running a handler.
Object.assign(process.env, {
  NE_SERVER_MODE: 'isolated-staging',
  NE_STAGING_SUPABASE_REF: 'synthetictestproject',
  NE_STAGING_SUPABASE_URL: 'https://synthetictestproject.supabase.co',
  NE_STAGING_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic',
  NE_STAGING_AI_ENABLED: '1'
});
