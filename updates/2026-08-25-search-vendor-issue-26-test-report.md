# Test Report — Issue #26 Search Vendor P1

| Field | Value |
| --- | --- |
| **Issue** | [#26](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/26) — Search vendor: index members + opportunities; `/search` API |
| **Date** | 2026-08-25 |
| **Runner** | `npm run test:search` (`npx tsx src/main/(search)/__tests__/search.issue-26.test.ts`) |
| **Build** | `npx tsc --noEmit` ✓ · `npx nest build` ✓ |
| **Result** | **11 / 11 passed** |

---

## Verdict

P1 search vendor integration is implemented and verified against the doc §6 Search acceptance criteria (adapter + self-tests). No custom ML — Typesense / Algolia / memory / off plug-in adapters only.

---

## Cases

| # | Case | Result |
| --- | --- | --- |
| 1 | `SEARCH_PROVIDER=off` → OffSearchProvider | PASS |
| 2 | Typesense without keys falls back to off | PASS |
| 3 | Algolia without keys falls back to off | PASS |
| 4 | `SEARCH_PROVIDER=memory` → MemorySearchProvider | PASS |
| 5 | Off provider returns empty search | PASS |
| 6 | Intent queries (`mentor React Accra`, `remote health volunteering`) | PASS |
| 7 | Guest-safe excludes non-public opportunities | PASS |
| 8 | Create / update / delete reflected immediately in index | PASS |
| 9 | Private fields absent from vendor documents | PASS |
| 10 | Cap-weighted ranking prefers higher Cap on tie | PASS |
| 11 | `types=opportunity` isolates from members | PASS |

Machine-readable: [`2026-08-25-search-vendor-issue-26-test-report.json`](./2026-08-25-search-vendor-issue-26-test-report.json)

---

## Acceptance mapping (§6 Search)

| Criterion | Status | How verified |
| --- | --- | --- |
| Sample queries return relevant top results | Met (engineering) | Case 6 — product golden-set sign-off still client-owned |
| Private fields absent from vendor index | Met | Case 9 + `SEARCH_FORBIDDEN_FIELDS` in sync builders |
| Guest search cannot retrieve non-public entities | Met | Case 7 — `isPublic` / `guestSafe` filters |
| Create/update/delete reflects within SLA | Met | Case 8 + write-path hooks on volunteer project & profile |

---

## How to enable against a real vendor

```bash
# Typesense
SEARCH_PROVIDER=typesense
TYPESENSE_HOST=https://xxx.a1.typesense.net
TYPESENSE_API_KEY=...

# or Algolia
SEARCH_PROVIDER=algolia
ALGOLIA_APP_ID=...
ALGOLIA_ADMIN_API_KEY=...
ALGOLIA_SEARCH_API_KEY=...

# then admin:
POST /search/reindex
```

Local/CI without SaaS keys: `SEARCH_PROVIDER=memory`.
