# Update: Soft-Language Cap Earnings API (Issue #23)

| Field | Value |
| --- | --- |
| **Issue** | [#23 — Soft-language Cap earnings API for public payloads](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/23) |
| **Priority** | E · Backlog #23 |
| **Spec** | June 26 — no hard revenue % on consumer public views; exact figures on personal dashboard |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Public and third-party member payloads now use **soft-language earning headlines** only. Raw ad-share percentages and dollar totals are confined to **`privateEarnings`** / **`privateSummary`** blocks and personal-dashboard routes.

---

## Contract

`GET /contracts/soft-earnings` — machine-readable contract  
Defined in `src/common/constants/soft-earnings.contract.ts`

---

## Behaviour changes

| Route | Change |
| --- | --- |
| `GET /cap-level/status/me` | Soft `earningLevel` headline; exact % in `privateEarnings` |
| `GET /cap-level/earnings/me` | Personal ad-revenue summary (exact amounts) |
| `GET /user-metrics/:userId` | Strips earnings when viewer ≠ subject; adds soft `earningLevel` |
| `GET /user-profile/reputation-passport/:userId` | Already omitted exact figures (unchanged) |

Forbidden on public views: `adSharePercentage`, `effectiveSharePercentage`, `totalEarnings`, etc.

---

## Key files

- `src/common/constants/soft-earnings.contract.ts`
- `src/common/utils/soft-earnings.util.ts`
- `src/main/(core)/contracts/contracts.controller.ts`
- `src/main/(core)/cap-level/cap-level.controller.ts`
