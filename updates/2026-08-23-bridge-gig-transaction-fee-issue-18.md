# Update: Bridge Paid Gigs + Transaction Fee (Issue #18)

| Field | Value |
| --- | --- |
| **Issue** | [#18 — Paid gigs + Bridge transaction fee](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/18) |
| **Priority** | D · Backlog #18 |
| **Spec** | June 26 — small cut of money flowing to gig workers |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Paid Bridge gigs (`GIG` and budgeted `PROJECT_HELP`) now compute a **platform fee snapshot** at booking time. Responses include a `feeBreakdown` (gross, fee %, fee amount, worker payout). Completing an accepted booking marks the payout **READY** for settlement (Stripe wiring remains separate).

---

## Fee model

- Default fee: **5%** (`DEFAULT_BRIDGE_GIG_FEE_PERCENT`)
- Per-listing override via `BridgeListing.platformFeePercent`
- Utility: `src/common/utils/bridge-gig-fee.util.ts`

---

## Schema

New on `BridgeBooking`:

| Field | Purpose |
| --- | --- |
| `platformFeePercent` | Snapshot from listing at booking |
| `platformFeeAmount` | Platform cut |
| `providerPayoutAmount` | Amount to worker |
| `currency` | Listing currency |
| `settlementStatus` | `NONE` \| `PENDING` \| `READY` \| `SETTLED` |
| `completedAt` | When gig marked complete |

Migration: `20260823193000_bridge_gig_transaction_fee`

---

## APIs

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/bridge/fee-policy` | Public — default fee + copy |
| `GET` | `/bridge/bookings/:id` | Client or provider — includes `feeBreakdown` |
| `PATCH` | `/bridge/bookings/:id/complete` | Mark accepted booking completed → `READY` |

Existing book/respond/list endpoints now return `feeBreakdown` for paid gigs.

---

## Key files

- `src/common/utils/bridge-gig-fee.util.ts`
- `src/main/(bridge)/bridge.service.ts`
- `prisma/schema/bridge.prisma`
