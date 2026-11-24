// Emit an ordered bootstrap for a fresh, explicitly selected staging database.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function schema() {
  const files = [
    'migrations/20261003_access_approval.sql',
    'migrations/20261004_user_feedback.sql',
    'migrations/20261005_trial_referral_terms.sql',
    'migrations/20261005_public_ratings_installs.sql',
    'migrations/20261005_professional_hardening.sql',
    'migrations/20261005_growth_funnel.sql',
    'migrations/20261005_admin_lifecycle.sql',
    'migrations/20261006_internal_trigger_rpc_hardening.sql',
    'deferred/20261005_privacy_v3_finalize.sql',
    'migrations/20261008_access_billing_controls.sql',
    'deferred/NAME_ON_REGISTRATION_2026-10-15.sql',
    'deferred/OWNER_STUDY_ACTIVITY_2026-10-15.sql',
    'staging/sync-table.sql',
    'deferred/SECURITY_8_2_SYNC_PREPARE.sql',
    'deferred/SECURITY_8_2_DISTRIBUTED_QUOTA.sql',
    'staging/quota-budget.sql'
  ];
  return 'begin;\ncreate schema if not exists extensions;\n' +
    'create extension if not exists pgcrypto with schema extensions;\n' +
    "do $$ begin if to_regprocedure('extensions.digest(bytea,text)') is null then " +
    "raise exception 'pgcrypto must be in the extensions schema'; end if; end $$;\n" +
    files.map(file => '\n-- ' + file + '\n' +
      fs.readFileSync(path.join(root, file), 'utf8').replace(/^(?:begin|commit);\s*$/gim, '')
    ).join('\n') + '\ncommit;\n';
}

if (require.main === module) process.stdout.write(schema());
module.exports = {schema};
