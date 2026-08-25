# Live Search Test Report — Typesense (Issue #26)

| Field | Value |
| --- | --- |
| **Host** | `212.85.26.187` (Synqulan API `:5056`) |
| **Provider** | Typesense (`SEARCH_PROVIDER=typesense`) |
| **Ran at** | 2026-08-25T04:20:08Z |
| **Verdict** | **PASS — 15 / 15** |

---

## Summary

Search is working correctly on the live server. Typesense is healthy, collections are populated, Nest `/search` hydrates from Postgres, guest-safe responses omit private fields, and admin reindex succeeds.

| Index | Documents |
| --- | --- |
| `members` | **419** |
| `opportunities` | **2** |

---

## Cases

| # | Check | Result | Detail |
| --- | --- | --- | --- |
| 1 | Typesense container running | PASS | `running` |
| 2 | App container running | PASS | `running` |
| 3 | Typesense `/health` | PASS | `{"ok":true}` |
| 4 | Members index count | PASS | 419 docs |
| 5 | Opportunities index count | PASS | 2 docs |
| 6 | `GET /search/status` | PASS | `provider=typesense`, `enabled=true` |
| 7 | Query `q=volunteer` | PASS | found ≥ 1, guestSafe, no email/password/stripe in payload |
| 8 | Query `remote health` + `types=opportunity` | PASS | opportunity-only results |
| 9 | Query `mentor` + `types=member` | PASS | member-only; public profile shape |
| 10 | Query `Accra` (location/intent) | PASS | success + results list |
| 11 | `guest=true` | PASS | `guestSafe=true` |
| 12 | Empty `q` handled | PASS | success, results array present |
| 13 | Pagination `page=1&limit=2` | PASS | limit respected |
| 14 | `POST /search/reindex` (admin) | PASS | 419 members, 2 opportunities |
| 15 | HTTP search on `:5056` | PASS | reachable |

---

## Sample live responses

### Status
```json
{
  "success": true,
  "message": "Search status",
  "data": {
    "provider": "typesense",
    "enabled": true,
    "indexedTypes": ["member", "opportunity"],
    "note": "Postgres remains source of truth; vendor owns ranking."
  }
}
```

### `GET /search?q=volunteer&limit=3`
- Provider: `typesense`
- Guest-safe: `true`
- Returns mixed member/opportunity hits (e.g. remote clinic opportunity, volunteer-oriented members)
- Hydrated fields only (name/username/cap/skills — **no** email/password/Stripe)

### `GET /search?q=remote%20health&types=opportunity`
- Opportunity-filtered results (e.g. remote medical advice clinic)

---

## Acceptance mapping (§6 Search)

| Criterion | Live status |
| --- | --- |
| Relevant results for sample/intent queries | **Met** |
| Private fields absent from index/API hydrate | **Met** |
| Guest search public-safe | **Met** |
| Create/update/delete sync path + reindex | **Met** (reindex verified; write hooks in app) |

---

## How to re-check

```bash
curl -s http://212.85.26.187:5056/search/status | jq
curl -s "http://212.85.26.187:5056/search?q=volunteer&limit=5" | jq
```

Admin reindex:
```bash
# login → Bearer token →
curl -X POST http://212.85.26.187:5056/search/reindex -H "Authorization: Bearer <token>"
```
