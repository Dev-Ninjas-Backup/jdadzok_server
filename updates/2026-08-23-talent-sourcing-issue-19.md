# Update: Recruitment / Talent-Sourcing Employer APIs (Issue #19)

| Field | Value |
| --- | --- |
| **Issue** | [#19 — Recruitment / talent-sourcing employer APIs](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/19) |
| **Priority** | D · Backlog #19 |
| **Spec** | June 26 — employers pay for reputation-ranked candidates |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Corporate employers can **search and unlock** member profiles who opt into talent visibility. Results are ranked by reputation (Cap level, verified volunteer hours, activity score). Unlocking a candidate returns the full **reputation passport** and counts against the corporate tier quota.

---

## Schema

| Model / field | Purpose |
| --- | --- |
| `Profile.isTalentSearchOptIn` | Member opt-in to appear in searches |
| `CorporateMembership.talentUnlocksUsed` | Usage counter |
| `TalentCandidateUnlock` | Employer paid unlock of a candidate |

Migration: `20260823194000_talent_sourcing`

---

## Tier limits

| Tier | Search results | Unlocks |
| --- | --- | --- |
| Starter | 10 | 3 |
| Growth | 25 | 15 |
| Enterprise | 50 | 100 |

---

## APIs

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/corporate/talent/search` | Corporate contact — reputation-ranked preview |
| `POST` | `/corporate/talent/unlocks` | Unlock candidate → reputation passport |
| `GET` | `/corporate/talent/unlocks/me` | List org unlocks |
| `GET` | `/corporate/talent/quota` | Unlock quota |
| `GET/PATCH` | `/user-profile/talent-search-visibility` | Member opt-in toggle |

---

## Key files

- `prisma/schema/talent-sourcing.prisma`
- `src/common/utils/reputation-rank.util.ts`
- `src/main/(core)/corporate/talent-sourcing.service.ts`
- `src/main/(core)/corporate/talent.controller.ts`
