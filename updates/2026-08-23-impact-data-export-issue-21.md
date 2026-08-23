# Update: Anonymised Impact-Data Export (Issue #21)

| Field | Value |
| --- | --- |
| **Issue** | [#21 — Anonymised impact-data export](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/21) |
| **Priority** | D · Backlog #21 |
| **Spec** | June 26 — sell aggregations to NGOs / development agencies |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

New **impact export layer** with **k-anonymity** (default k=5). Exports aggregated verified volunteer hours and SDG alignment counts — never individual identities, earnings, or private data.

---

## Access

| Role | Access |
| --- | --- |
| Admin | Full export |
| Verified NGO owner | Summary + breakdown |
| Corporate Growth / Enterprise | Summary + breakdown |
| Corporate Starter | Denied |

---

## APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/impact/export/summary` | Platform totals (hours, projects, mentoring) |
| `GET` | `/impact/export/breakdown` | Buckets by contribution type, Cap, region, month, SDG |

Query params: `fromDate`, `toDate`, `minBucketSize`

Each request is logged in `ImpactDataExportLog`.

---

## Anonymisation

- Buckets below **k** distinct subjects → `suppressed`
- Locations coarsened to region (last segment of location string)
- SDG org counts suppressed when below k

Utility: `src/common/utils/impact-anonymise.util.ts`

Migration: `20260823196000_impact_data_export`

---

## Key files

- `prisma/schema/impact-export.prisma`
- `src/main/(core)/impact/impact-export.service.ts`
- `src/main/(core)/impact/impact-export.controller.ts`
