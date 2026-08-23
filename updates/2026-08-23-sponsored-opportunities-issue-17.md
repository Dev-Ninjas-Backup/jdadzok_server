# Update: Sponsored Opportunities (Issue #17)

| Field | Value |
| --- | --- |
| **Issue** | [#17 — Sponsored opportunities for VolunteerProject / Bridge](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/17) |
| **Priority** | D · Backlog #17 |
| **Spec** | June 26 — corporate sponsorship of opportunities |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Corporate CSR can **sponsor volunteer projects and Bridge listings** via the new `SponsoredOpportunity` model — separate from legacy `DedicatedAd` (Product ↔ Post marketplace ads).

---

## Schema

| Model | Purpose |
| --- | --- |
| `SponsoredOpportunity` | Links `CorporateMembership` → `VolunteerProject` or `BridgeListing` |
| `SponsoredTargetType` | `VOLUNTEER_PROJECT` \| `BRIDGE_LISTING` |

Migration: `20260823192000_sponsored_opportunities`

---

## APIs

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/sponsored/opportunities` | Public discover (optional `targetType` filter) |
| `GET` | `/sponsored/opportunities/:id` | Public detail |
| `POST` | `/corporate/sponsorships` | Corporate contact — create sponsorship |
| `GET` | `/corporate/sponsorships/me` | List my org's sponsorships |
| `PATCH` | `/corporate/sponsorships/:id/deactivate` | End sponsorship |

Tier sponsorship limits enforced via `CorporateMembership` tier catalog.

---

## Key files

- `prisma/schema/sponsored-opportunity.prisma`
- `src/main/(core)/corporate/sponsored-opportunity.service.ts`
- `src/main/(core)/corporate/sponsored.controller.ts`
