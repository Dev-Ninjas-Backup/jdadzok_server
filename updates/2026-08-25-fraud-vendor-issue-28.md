# Update: Account Fraud Vendor — Sift / SEON / Castle (Issue #28)

| Field | Value |
| --- | --- |
| **Issue** | [#28 — Stronger fraud vendor when payout abuse appears](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/28) |
| **Priority** | P3 · AI/Abuse |
| **Spec** | [`docs/SYNQULAN_AI_SEARCH_AND_ABUSE_DETECTION.md`](../docs/SYNQULAN_AI_SEARCH_AND_ABUSE_DETECTION.md) §3 / §5 P3 / §6 Account fraud |
| **Date** | 2026-08-25 |
| **Status** | Implemented (feature-flagged; default off) |

---

## Summary

Plug-in account-fraud SaaS adapters (**Sift / SEON / Castle / off / memory**) score Stripe Express onboarding and withdraw requests. Scores persist as `FraudCheck` rows for admin review. No custom ML. Default `ABUSE_FRAUD_PROVIDER=off` until monetisation volume + client keys warrant enabling.

**Recommended commercial pick:** SEON (swap Sift or Castle if the client prefers).

---

## Feature flag

`ABUSE_FRAUD_PROVIDER=off|sift|seon|castle|memory`

| Value | Behaviour |
| --- | --- |
| `off` | Default; checks are no-ops (ALLOW) |
| `sift` | Sift Events API (`SIFT_API_KEY`) |
| `seon` | SEON Fraud API v2 (`SEON_API_KEY`) |
| `castle` | Castle Risk API (`CASTLE_API_SECRET`) |
| `memory` | In-process stand-in for local/CI |

Thresholds: `ABUSE_FRAUD_QUEUE_SCORE` (default 60), `ABUSE_FRAUD_REJECT_SCORE` (default 85).  
`ABUSE_FRAUD_AUTO_REJECT=true` blocks on REJECT; set `false` to queue-only.  
`ABUSE_FRAUD_FAIL_CLOSED=false` (default fail-open on vendor outage).

---

## APIs

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/abuse/fraud/status` | Public — provider + thresholds |
| `GET` | `/abuse/fraud/checks?decision=&page=&limit=` | Admin — review queue |
| `POST` | `/abuse/fraud/checks/:id/clear` | Admin — override / acknowledge |

---

## Hooks

| Event | Action |
| --- | --- |
| `POST /stripe/create-account` | Evaluate `STRIPE_ONBOARDING`; REJECT can block |
| Withdraw `requestWithdraw` | Evaluate `PAYOUT` with amount; REJECT can block |

---

## Key files

- `src/main/(abuse)/fraud/fraud.module.ts`
- `src/main/(abuse)/fraud/fraud.service.ts`
- `src/main/(abuse)/fraud/fraud.controller.ts`
- `src/main/(abuse)/fraud/providers/*`
- `prisma/schema/fraud-check.prisma`

---

## Tests

```bash
npm run test:fraud
```
