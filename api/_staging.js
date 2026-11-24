// Only the separately provisioned staging project may be contacted by this branch.
const PRODUCTION_REF = 'rskgbkgtrigtznnksbyp';

export function stagingDatabase(env = process.env) {
  const ref = env.NE_STAGING_SUPABASE_REF;
  const url = env.NE_STAGING_SUPABASE_URL;
  const key = env.NE_STAGING_SUPABASE_PUBLISHABLE_KEY;
  if (env.NE_SERVER_MODE !== 'isolated-staging' ||
      (env.VERCEL === '1' && env.VERCEL_ENV !== 'preview') ||
      (env.VERCEL_ENV && env.VERCEL_ENV !== 'preview') ||
      (env.VERCEL_TARGET_ENV && env.VERCEL_TARGET_ENV !== 'preview') ||
      typeof ref !== 'string' || !/^[a-z0-9]{20}$/.test(ref) || ref === PRODUCTION_REF ||
      url !== 'https://' + ref + '.supabase.co' ||
      typeof key !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('STAGING_DATABASE_UNAVAILABLE');
  }
  return {url, key};
}

export const STAGING_AUDIO_BYTES = 2_900_000;
