# Community challenge publication and moderation

## Current behaviour

- Curated challenges use synthetic Chart Dojo scenarios only.
- A challenge entry must reference a saved attempt owned by the submitting learner. The database derives its outcome and process-rubric result from that server-scored attempt; clients cannot submit a score or P/L.
- Private reflections are visible only to their author. Public submissions require the learner's profile to be explicitly public and are hidden until a moderator approves them.
- Public entries are shown only while the author's profile is opted in, the entry is marked public, and moderation status is `approved`.
- Reports are private to the moderation workflow. A learner can report a public approved entry once; self-reporting, reporting pending entries, and cross-account access are denied.
- Moderation actions (`approve`, `hide`, `remove`) require a reason and are written to `community_moderation_actions`. Report status is resolved or dismissed as part of the same database function.
- Disabling profile visibility withdraws previously public entries. Deleting the profile also withdraws public entries. Turning visibility back on does not republish entries automatically.
- There are no direct messages, profit-based rankings, public account balances, journal exposure, or user-editable rubric scores.

## Provision the first moderator

The migration deliberately does **not** assign a moderator automatically. Provision a trusted staff account manually after confirming its Supabase Auth user ID in the dashboard. Never use an email supplied by a learner or an unverified account ID.

Run the following in the Supabase SQL editor, replacing the placeholder with the verified UUID of the trusted staff account:

```sql
insert into public.community_moderators (user_id, role)
values ('REPLACE_WITH_VERIFIED_AUTH_USER_UUID'::uuid, 'admin')
on conflict (user_id) do update set role = excluded.role;
```

To grant a non-administrative moderator, use role `moderator`. Only database administrators should change this table. It has RLS enabled and no client grants; moderators cannot promote themselves through the application.

To revoke a moderator:

```sql
delete from public.community_moderators
where user_id = 'REPLACE_WITH_VERIFIED_AUTH_USER_UUID'::uuid;
```

## Review workflow

1. Review the complete reflection and the linked curated challenge/rubric in the moderator queue.
2. Check for personal information, harassment, spam, unsafe financial claims, copyright concerns, or attempts to solicit money/contact.
3. Choose **Approve**, **Hide**, or **Remove** and record a concise, factual reason.
4. Check open reports after the action. Approving dismisses open reports; hiding/removing resolves them. The action and reason remain in the audit table.
5. If a learner disputes a moderation action, review the audit trail and follow the product's support process; do not expose report authors publicly.

## Release checks

- Apply `20261012270000_community_challenge_lifecycle.sql` after the community profile migration.
- Run the opt-in two-account integration suite with dedicated test accounts. The suite deletes all saved learning data for Account A.
- Provision a moderator in the connected Supabase project and test the moderator queue and actions manually with that account. Ordinary learner accounts must receive HTTP 403 from moderation endpoints.
- Do not enable broad public access until at least one trusted moderator is provisioned and the reporting/appeal process is operational.
