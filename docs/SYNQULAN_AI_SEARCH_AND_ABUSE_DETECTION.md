# Synqulan — AI-Powered Search & Spam / Fake-Account Detection

**Audience:** Client / product owners  
**Scope:** Only two capabilities — (1) AI-powered search, (2) spam & fake-account detection — delivered via **off-the-shelf / plug-in services**, not custom ML R&D.  
**Related:** Cap system, Bridge, volunteering, and Connect gating are covered separately in [`SYNQULAN_JUNE26_SPEC_STATUS.md`](./SYNQULAN_JUNE26_SPEC_STATUS.md).

| Field | Value |
| --- | --- |
| **Codebase** | `jdadzok_server` (Synqulan API) |
| **Last updated** | 2026-08-25 |
| **Approach** | Buy + integrate vendor APIs / SDKs; thin NestJS adapters only |

---

## 1. Why this document exists

Synqulan’s June 26 brief assumes members can **find people, opportunities, and expertise** quickly, and that the reputation economy fails if **spam and fake accounts** flood Connect, endorsements, or volunteer hours.

This doc defines **what the client needs to procure and approve** so engineering can plug services into the existing backend — without building an in-house search engine or fraud model.

### In scope

- Semantic / AI search over members, opportunities, Bridge listings, posts, NGOs/communities
- Signup, login, and post-signup signals for spam bots and fake / disposable accounts
- Content spam signals on posts, messages, and applications (vendor-scored)
- Vendor evaluation criteria, integration ownership, and acceptance criteria

### Out of scope (not in this doc)

- Building custom embeddings, ranking models, or fraud neural nets in-house
- Cap ladder, mentorship verification, Bridge product design (see June 26 status doc)
- Full KYC for Sky Blue (identity vendor may overlap; Sky Blue workflow is separate)

---

## 2. Capability A — AI-powered search

### 2.1 What the product needs

| Need | Description |
| --- | --- |
| Unified search | One search box that finds people, opportunities, projects, expertise, NGOs/communities, and relevant posts |
| Intent understanding | Queries like “mentor React Accra” or “remote health volunteering” return ranked, relevant results — not only exact keyword matches |
| Filters | Cap level, location, skills/interests, opportunity type, “Other” free-text categories |
| Ranking hints | Prefer higher Caps / verified partners where the brief asks for Cap-weighted visibility (Bridge) |
| Guest-safe results | Public-safe subset for Explore-as-guest; private fields never leak |
| Latency | Interactive UX: typically under ~300–500 ms for typed search |

### 2.2 Current backend reality

| Status | Notes |
| --- | --- |
| P1 adapter shipped | Feature-flagged NestJS search module: Typesense / Algolia / off / memory |
| Sync + `/search` | Members + volunteer opportunities indexed; `GET /search` hydrates from Postgres |
| Vendor keys still client-owned | Set `SEARCH_PROVIDER` + vendor credentials in staging/production |

### 2.3 Recommended approach (plug-in only)

Use a **hosted search-as-a-service** product. The NestJS API syncs documents on create/update/delete; the client (or API) queries the vendor.

| Option | Role | Fit for Synqulan |
| --- | --- | --- |
| **Algolia** (or Algolia + Neural / AI ranking add-on) | Managed search + optional AI re-ranking | Strong DX, filters, typo tolerance; AI add-ons for semantic relevance |
| **Typesense Cloud** or **Meilisearch Cloud** | Fast typo-tolerant search; some vector/hybrid features | Lower cost; good if budget-sensitive |
| **Elastic Cloud / OpenSearch** + vendor ML | Heavier; full control | Only if client already standardises on Elastic |

**Client decision needed:** pick **one** primary search vendor (recommended default: **Algolia** or **Typesense Cloud**).

### 2.4 What gets indexed (minimum)

| Index / collection | Example fields |
| --- | --- |
| `members` | display name, username, skills/interests, Cap level, location, volunteer opt-in (boolean), bio snippet |
| `opportunities` | title, org, skills needed, location/remote, verified partner flag |
| `bridge_listings` *(when Bridge exists)* | expertise, gig title, Cap of lister, skills |
| `orgs` | NGO / community name, about, tags |
| `posts` *(optional phase 2)* | text snippet, tags, author Cap — exclude private / blocked |

Sensitive fields (email, exact payouts, private chat) **must never** be indexed.

### 2.5 Integration shape (engineering — thin adapter)

```
App write (User/Project/…) → NestJS hook → Search vendor upsert/delete
App search request → NestJS SearchController → Vendor search API → ranked hits → hydrate IDs from Postgres
```

- Vendor owns ranking / AI relevance  
- Postgres remains source of truth  
- Feature flag: `SEARCH_PROVIDER=algolia|typesense|off`

### 2.6 What the client must provide / approve

- [ ] Vendor choice + commercial plan (quota, AI ranking SKU if any)
- [ ] API keys / admin keys (staging + production) via secrets manager
- [ ] Confirmation of which entity types are searchable at launch
- [ ] Privacy review: fields allowed in the index (GDPR / regional rules)
- [ ] Acceptance: sample query set + expected “good enough” results signed off by product

---

## 3. Capability B — Spam & fake-account detection

### 3.1 What the product needs

| Need | Description |
| --- | --- |
| Signup / login abuse | Block or challenge disposable emails, known bots, credential stuffing, burst signups |
| Fake profiles | Flag accounts that look automated or identity-suspicious before they earn Cap / payout trust |
| Content spam | Score posts, DMs, volunteer applications for spam / scam / harassment language |
| Soft vs hard actions | Score + recommend: allow / CAPTCHA / hold-for-review / block — human admin remains for edge cases |
| Synqulan-specific risk | Protect Connect inbox, endorsement integrity, and hour-logging from fake or ring accounts |

June 26 already requires **mutual Connect** as a cultural anti-spam gate; that is **product logic** (see June 26 status). This doc covers **vendor signals** that sit *alongside* Connect — not a replacement for it.

### 3.2 Current backend reality

| Status | Notes |
| --- | --- |
| Partial product controls | Reports, bans, FriendRequest / Connect (Connect not yet enforced on chat) |
| No plug-in abuse stack | No third-party device fingerprint, bot score, or content moderation API wired in |

### 3.3 Recommended plug-in stack (buy, don’t build)

Use **composed off-the-shelf services** — typically 2–3 vendors, not one mega-custom model:

| Layer | Purpose | Example plug-in services (pick one per layer) |
| --- | --- | --- |
| **Bot / device / signup risk** | Fingerprint, bot score, velocity | **Fingerprint** (formerly FingerprintJS Pro), **Cloudflare Turnstile** / Bot Management, **Arkose**, **hCaptcha Enterprise** |
| **Email / phone / identity quality** | Disposable email, breach, fake phone | **AbstractAPI** / **Kickbox** / **ZeroBounce** (email); optional phone validation vendor |
| **Content moderation** | Toxic / spam / scam text (and optional image) | **OpenAI Moderation API**, **Perspective API**, **Hive**, **AWS Comprehend** / Rekognition (if already on AWS) |
| **Optional: account fraud** | Multi-accounting, payment fraud later | **Sift**, **SEON**, **Castle** — add when payouts / Bridge money scale |

**Recommended MVP combo (client can swap brands):**

1. **Cloudflare Turnstile** (or equivalent) on signup / sensitive actions  
2. **Email validation** API on register  
3. **OpenAI Moderation** or **Perspective** on posts + message send + volunteer applications  
4. Store vendor scores on the user / content row; admin dashboard lists “high risk”

### 3.4 Where scores attach in Synqulan

| Event | Action |
| --- | --- |
| Register / social signup | Email quality + bot challenge → block or soft-flag `User` |
| Profile update / first posts | Content moderation on bio / posts |
| FriendRequest / Connect send | Optional velocity + risk score (rate-limit + vendor) |
| Message send | Moderated text; quarantine or drop if over threshold |
| Volunteer hour / application | Moderated notes; flag rings for admin (vendor + internal rules later) |
| Payout / Stripe onboarding | Stronger checks (can reuse fraud vendor when monetisation scales) |

### 3.5 Integration shape

```
Request → NestJS guard/interceptor → Vendor API (score)
       → persist riskScore / moderation labels
       → policy: allow | challenge | queue | reject
Admin dashboard → list flagged users/content → ban / clear
```

Feature flags: `ABUSE_BOT_PROVIDER`, `ABUSE_EMAIL_PROVIDER`, `ABUSE_CONTENT_PROVIDER`.

### 3.6 What the client must provide / approve

- [ ] Chosen vendors per layer + contracts / DPA
- [ ] Staging + production API keys
- [ ] Policy thresholds (e.g. auto-block vs admin queue) — product signs off
- [ ] Regional compliance (data residency, whether content text may leave region)
- [ ] Acceptance: scripted spam signup + spam post cases are blocked or queued as agreed
- [ ] Confirm Connect gating remains mandatory (vendor scores do **not** replace mutual Connect)

---

## 4. Cost & ownership (client-facing)

| Item | Client owns | Engineering owns |
| --- | --- | --- |
| Vendor selection & billing | Yes | Advises shortlist |
| Legal / DPA / privacy | Yes | Implements retention as agreed |
| API keys & plan limits | Yes | Wires env vars / secrets |
| Threshold policy | Product / client | Implements rules engine thin layer |
| Index schema & sync jobs | — | Yes |
| Admin UI to review flags | — | Yes (can extend existing dashboard) |

Expect **monthly SaaS fees** that scale with search operations and moderation API calls — not a one-off licence only. Client should budget for **staging + production** environments.

---

## 5. Phased delivery (plug-in first)

| Phase | Deliverable | Depends on client |
| --- | --- | --- |
| **P0** | Email validation + Turnstile/CAPTCHA on signup; content moderation on post create | Vendor accounts + keys |
| **P1** | Search vendor: index members + opportunities; `/search` API; app search UI | Search vendor plan |
| **P2** | Index Bridge / orgs; AI ranking SKU if purchased; guest-safe search | Bridge data model; privacy sign-off |
| **P3** | Stronger fraud vendor if payout abuse appears | Monetisation volume |

No phase requires training a custom Synqulan ML model.

---

## 6. Acceptance criteria (sign-off checklist)

### Search

- [x] Sample queries (product-provided list) return relevant top results in agreed index types — adapter + self-tests for intent-style queries (`mentor React Accra`, `remote health volunteering`); product sign-off of golden set still client-owned  
- [x] Private fields absent from vendor index — sync builders omit email/password/Stripe/balance/DOB; guarded by `SEARCH_FORBIDDEN_FIELDS`  
- [x] Guest search cannot retrieve non-public entities — `guestSafe` / `isPublic` filters on vendor query + hydrate  
- [x] Create/update/delete of a member or opportunity reflects in search within agreed SLA (e.g. &lt; 1 minute) — write-path upsert/delete hooks (immediate) + admin `POST /search/reindex`  

Engineering notes (2026-08-25): see `updates/2026-08-25-search-vendor-issue-26.md`. Client still must pick commercial plan + keys (Open decisions §8 item 1).

### Spam / fake accounts

- [ ] Disposable / known-bad emails rejected or challenged at signup  
- [ ] Bot/automated signup fails challenge or is flagged  
- [ ] Spam-like post/message is blocked or queued per policy  
- [ ] Admin can see risk score / moderation labels and ban  
- [ ] Mutual Connect requirement unchanged (still enforced server-side when that backlog item ships)

---

## 7. Explicit non-goals

- Training proprietary Synqulan ranking or fraud models  
- Replacing Cap / volunteer verification with “AI trust scores”  
- Using AI search vendor as system of record (Postgres remains canonical)  
- Fully automated bans without an admin override path (unless client later insists)

---

## 8. Open client decisions (blockers)

1. **Search vendor:** Algolia vs Typesense/Meilisearch vs other?  
2. **Bot layer:** Cloudflare Turnstile vs hCaptcha/Arkose vs Fingerprint?  
3. **Content moderation:** OpenAI Moderation vs Perspective vs Hive?  
4. **Launch scope:** Search members+opportunities only, or include posts at P1?  
5. **Auto-block vs queue:** What score triggers hard block without human review?

Until (1)–(3) are chosen, engineering can only stub feature-flagged adapters.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-08-25 | P1 engineering: Typesense/Algolia/memory/off adapters; member + opportunity sync; `GET /search` + admin reindex (Issue #26) |
| 2026-07-27 | Initial client doc: AI search + spam/fake-account detection via plug-in services only |
