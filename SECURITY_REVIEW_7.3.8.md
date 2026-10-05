# Norsk Eventyr 7.3.8 — security and release review

Date: 2026-10-05

## Implemented hardening

- Public comments can be hidden/restored only by the owner.
- Hidden comments no longer appear publicly, while the user's star rating remains in the aggregate rating.
- Client-side JavaScript failures after authenticated login can be stored in a dedicated private table.
- Client error submission is rate-limited at the API layer.
- Owner analytics, error list, and backup export require owner authorization.
- Direct table access to Norsk Eventyr account, feedback, install, and error data remains blocked by RLS/revokes.
- Added covering indexes for Norsk Eventyr feedback user IDs and referral lookups.
- Added automated GitHub Actions QA for pull requests and main.

## Reviewed Supabase advisor warnings

The following SECURITY DEFINER functions are intentionally exposed because they implement constrained application RPC behavior:
- ne_feedback_public(): anonymous read of sanitized rating/comment/date only.
- authenticated Norsk Eventyr access functions: each performs auth/owner checks internally.

The existing norsk_eventyr_sync_* functions are still anonymously callable because the current cloud-sync design authenticates with its own sync secret. Revoking them would break existing sync and requires a separate migration/redesign.

## External setting still recommended

Supabase Auth leaked-password protection is currently disabled. This setting should be enabled in Supabase Auth settings when available for the current project/plan.

## Data recovery

7.3.8 adds an owner-only JSON backup export for Norsk Eventyr account/access/feedback/install/error metadata. It does not automatically restore production data and does not export learning-progress sync payloads, avoiding a silent destructive restore path or broader progress-data exposure.

## Release rule

Apply the 7.3.8 migration and deploy the matching application release together. Do not publish application code that calls the new RPC functions before the migration is active.
