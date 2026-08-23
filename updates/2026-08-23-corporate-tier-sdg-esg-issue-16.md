# Update: Corporate Tiers + SDG/ESG Reporting (Issue #16)

| Field | Value |
| --- | --- |
| **Issue** | [#16 — Corporate tiers rename + SDG/ESG reporting fields](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/16) |
| **Priority** | D · Backlog #16 |
| **Spec** | June 26 — CSR subscriptions & corporate CSR dashboard |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Corporate membership tiers renamed to **Starter / Growth / Enterprise** (June 26 landing names), with legacy mapping from Silver / Gold / Platinum. SDG alignment and ESG reporting fields added for CSR dashboard submissions.

---

## Tier mapping

| June 26 (current) | Legacy |
| --- | --- |
| `STARTER` | Silver |
| `GROWTH` | Gold |
| `ENTERPRISE` | Platinum |

---

## New schema fields (`CorporateMembership`)

| Field | Purpose |
| --- | --- |
| `sdgAlignmentGoals` | UN SDG numbers (1–17) |
| `sdgImpactSummary` | Narrative impact text |
| `esgReportPeriod` | e.g. "FY2026 Q2" |
| `esgReportUrl` | Published report link |
| `reportedVolunteerHours` | CSR volunteer impact metric |
| `reportedCommunityInvestment` | CSR spend metric |
| `reportedCarbonOffsetTonnes` | Optional environmental metric |
| `lastEsgReportSubmittedAt` | Submission timestamp |

Migration: `20260823191000_corporate_tier_sdg_esg`

---

## APIs (`/corporate`)

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/corporate/tiers` | Public tier catalog + legacy labels |
| `GET` | `/corporate/memberships/me` | Corporate contact CSR dashboard |
| `GET` | `/corporate/memberships/:id` | Membership detail |
| `PATCH` | `/corporate/memberships/:id/esg-report` | Submit SDG/ESG report (Growth+ or admin) |
| `GET/POST/PATCH` | `/corporate/memberships` | Admin management |

---

## Key files

- `prisma/schema/corporate-membership.prisma`
- `src/common/utils/corporate-tier.util.ts`
- `src/main/(core)/corporate/`
