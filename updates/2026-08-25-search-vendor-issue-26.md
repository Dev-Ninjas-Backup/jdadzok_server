# Update: Search Vendor — Members + Opportunities /search API (Issue #26)

| Field | Value |
| --- | --- |
| **Issue** | [#26 — Search vendor: index members + opportunities; /search API](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/26) |
| **Priority** | P1 · AI/Abuse |
| **Spec** | [`docs/SYNQULAN_AI_SEARCH_AND_ABUSE_DETECTION.md`](../docs/SYNQULAN_AI_SEARCH_AND_ABUSE_DETECTION.md) §2 / §5 P1 / §6 Search |
| **Date** | 2026-08-25 |
| **Status** | Implemented |

---

## Summary

Plug-in search SaaS adapters (Typesense / Algolia / off / memory) sync **members** and **volunteer opportunities** on write, and expose NestJS **`GET /search`** that queries the vendor then hydrates IDs from Postgres. No custom ML.

---

## Feature flag

`SEARCH_PROVIDER=off|typesense|algolia|memory`

| Value | Behaviour |
| --- | --- |
| `off` | Default; `/search` returns 503 until configured |
| `typesense` | Typesense Cloud / self-hosted (`TYPESENSE_HOST`, `TYPESENSE_API_KEY`) |
| `algolia` | Algolia (`ALGOLIA_APP_ID`, `ALGOLIA_ADMIN_API_KEY`) |
| `memory` | In-process stand-in for local/CI (same adapter contract) |

---

## APIs

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/search/status` | Public — provider + enabled flag |
| `GET` | `/search?q=&types=member,opportunity&guest=&location=&capLevel=&page=&limit=` | Public (guest-safe by default) |
| `POST` | `/search/reindex` | Admin — full Postgres → vendor reindex |

---

## Sync hooks

| Event | Action |
| --- | --- |
| Volunteer project create | Upsert opportunity document |
| Volunteer project delete | Delete opportunity document |
| User profile update / mentor opt-in | Upsert member document |
| Admin reindex | Batch upsert all members + opportunities |

Indexed fields are public-safe only (no email, password, Stripe IDs, balance, DOB).

---

## Key files

- `src/main/(search)/search.module.ts`
- `src/main/(search)/search.controller.ts`
- `src/main/(search)/search.service.ts`
- `src/main/(search)/search-sync.service.ts`
- `src/main/(search)/providers/*`

---

## Tests

```bash
npx tsx src/main/\(search\)/__tests__/search.issue-26.test.ts
```

Report: `updates/2026-08-25-search-vendor-issue-26-test-report.json`
