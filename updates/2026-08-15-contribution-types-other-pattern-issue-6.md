# Update: Contribution Types + Other Pattern (Issue #6)

| Field | Value |
| --- | --- |
| **Issue** | [#6 — Contribution types + Other pattern](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/6) |
| **Priority** | B · Backlog #6 |
| **Spec** | June 26 — Volunteering contribution types; Other escape hatch app-wide |
| **Date** | 2026-08-15 |
| **Status** | Implemented |

---

## Summary

Contributions can be tagged as **mentoring, advice, project, teaching, charity**, or **Other** (free-text required). The same Other pattern is reused on **areas of interest** and **Bridge filters**.

---

## Contribution types

Enum `ContributionType`:

`MENTORING` | `ADVICE` | `PROJECT` | `TEACHING` | `CHARITY` | `OTHER`

Shared helper: `src/common/utils/other-option.util.ts` (`resolveOtherText`, `OTHER_CHOICE_SLUG`).

---

## Where it applies

### 1. Volunteer hour logging

`VolunteerHour.contributionType` + `contributionOther`

`PATCH /volunteer/log-hours/:applicationId` now requires `contributionType`. When `OTHER`, send `contributionOther`.

`GET /volunteer/contribution-types` lists values + which need free-text.

Mentorship call auto-hours default to `MENTORING`.

### 2. Interests (onboarding)

- Seeded choice **Other** (`slug: other`)
- `POST /choices` accepts `interestOtherText` (required if Other is selected)
- Stored on `Profile.interestOtherText`
- `GET /choices/user-choices` returns `{ choices, interestOtherText }`

### 3. Bridge

- `BridgeListing.contributionType` + `contributionOther` on create/update
- Discover filters: `contributionType`, `otherText` (matches free-text / skills / title)

---

## Migration

`prisma/migrations/20260815180000_contribution_types_other_pattern/`

```bash
npx prisma migrate deploy
# re-seed choices to pick up Other (skipDuplicates-safe)
npm run db:seed
```

---

## Spec status

Updated in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md` (checkbox + changelog).

---

## Done criteria (from issue #6)

| Criterion | Status |
| --- | --- |
| Behaviour matches June 26 brief for this item | Done |
| Checkbox flipped to `[x]` in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md` | Done |
| Changelog row added in that doc | Done |
