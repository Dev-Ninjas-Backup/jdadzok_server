---
title: "Synqulan — Client Credential Request"
---

# Synqulan — Vendor Credentials Request

**Document purpose:** Request API keys and account access so engineering can enable **spam / fake-account protection (P0)** and related plug-in services.  
**Product:** Synqulan  
**Prepared for:** Client / Product owner  
**Date:** 25 August 2026  
**Related:** `docs/SYNQULAN_AI_SEARCH_AND_ABUSE_DETECTION.md` · Issue #25 (P0)

---

## 1. Why we need these credentials

Synqulan does **not** build custom fraud or moderation ML models. We plug in off-the-shelf vendors. Without your accounts and keys, these protections stay **off** in staging and production.

| Priority | Capability | What it protects |
| --- | --- | --- |
| **P0 (required now)** | Email quality + bot challenge on **signup** | Disposable emails, bots, scripted registration |
| **P0 (required now)** | Content moderation on **post create** | Spam, scam, toxic / abusive posts |
| Optional later | Search vendor (already engineered) | AI search ranking |
| Optional later | Account fraud vendor (already engineered) | Payout / Stripe abuse when volume grows |

Please create **staging** and **production** keys where the vendor supports separate environments.

---

## 2. Required now — Abuse P0 (Issue #25)

Please provision the three services below (recommended brands). Equivalent vendors are acceptable if you prefer another brand from the shortlist.

### 2.1 Bot / CAPTCHA — Cloudflare Turnstile *(recommended)*

| Item | Detail |
| --- | --- |
| **Why** | Challenge bots on signup without heavy CAPTCHA UX |
| **Vendor** | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) |
| **Alternatives** | hCaptcha, Arkose Labs, Fingerprint (Pro) |
| **Who creates account** | Client |
| **Billing** | Client |

**Please send us:**

| Credential | Staging | Production | Notes |
| --- | --- | --- | --- |
| Cloudflare account email / Team | ☐ | ☐ | Access or invite engineering if preferred |
| Turnstile **Site Key** (public) | ☐ | ☐ | Used by mobile / web app |
| Turnstile **Secret Key** | ☐ | ☐ | Server-side verify only — do not put in the app |
| Allowed hostnames / app package names | ☐ | ☐ | Domains + Android / iOS identifiers |

**Env names (for our side):** `ABUSE_BOT_PROVIDER=turnstile`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`

---

### 2.2 Email validation — AbstractAPI *(recommended)* or Kickbox

| Item | Detail |
| --- | --- |
| **Why** | Reject disposable / invalid emails at register |
| **Vendor (preferred)** | [AbstractAPI — Email Validation](https://www.abstractapi.com/api/email-verification-validation-api) |
| **Alternatives** | Kickbox, ZeroBounce |
| **Who creates account** | Client |
| **Billing** | Client |

**Please send us:**

| Credential | Staging | Production | Notes |
| --- | --- | --- | --- |
| Provider chosen (AbstractAPI / Kickbox / other) | ☐ | ☐ | |
| API key | ☐ | ☐ | Server-side only |
| Plan / monthly quota | ☐ | ☐ | So we can set rate limits |

**Env names:** `ABUSE_EMAIL_PROVIDER=abstract` *(or `kickbox`)*, `ABSTRACT_EMAIL_API_KEY` *(or `KICKBOX_API_KEY`)*

---

### 2.3 Content moderation — OpenAI Moderation API *(recommended)*

| Item | Detail |
| --- | --- |
| **Why** | Score posts for hate, harassment, self-harm, sexual, spam-like abuse on create |
| **Vendor (preferred)** | [OpenAI Moderation API](https://platform.openai.com/docs/guides/moderation) |
| **Alternatives** | Google Perspective API, Hive |
| **Who creates account** | Client |
| **Billing** | Client |

**Please send us:**

| Credential | Staging | Production | Notes |
| --- | --- | --- | --- |
| Provider chosen (OpenAI / Perspective / Hive) | ☐ | ☐ | |
| API key | ☐ | ☐ | Server-side only; restrict by IP if possible |
| Organisation / project name | ☐ | ☐ | |
| Region / data residency constraints | ☐ | ☐ | Confirm if post text may leave your region |

**Env names:** `ABUSE_CONTENT_PROVIDER=openai`, `OPENAI_API_KEY`  
*(If Perspective: `PERSPECTIVE_API_KEY`)*

---

## 3. Product decisions we need signed off

Until these are decided, we can only ship **feature-flagged adapters** (default off).

| # | Decision | Options | Your choice |
| --- | --- | --- | --- |
| 1 | Bot layer | Cloudflare Turnstile *(rec.)* / hCaptcha / Arkose / Fingerprint | |
| 2 | Email vendor | AbstractAPI *(rec.)* / Kickbox / ZeroBounce | |
| 3 | Content moderation | OpenAI Moderation *(rec.)* / Perspective / Hive | |
| 4 | Auto-block vs admin queue | What score triggers hard block without human review? | |
| 5 | Staging + production keys | Separate keys required? | Yes / No |

---

## 4. How to deliver credentials securely

**Do not** paste secret keys into email, Slack, or GitHub issues.

Preferred options (pick one):

1. Password manager shared vault (1Password / Bitwarden) — invite Synqulan engineering  
2. Encrypted note / secure link with expiry  
3. Cloud secret store (AWS Secrets Manager / Doppler / Vault) with read access for deploy role  

In the share, please label clearly:

- Environment: `staging` or `production`  
- Service: `turnstile` / `email` / `moderation`  
- Key type: `site` vs `secret` / `api`

---

## 5. What happens after you send keys

1. Engineering stores secrets in staging / production env (never in source code).  
2. Enable flags: `ABUSE_BOT_PROVIDER`, `ABUSE_EMAIL_PROVIDER`, `ABUSE_CONTENT_PROVIDER`.  
3. Wire hooks: **register / signup** and **post create**.  
4. Joint acceptance test: disposable email blocked; bot signup fails; spam-like post blocked or queued.  
5. Admin path remains for review / ban (no fully automated bans without override, unless you insist later).

---

## 6. Optional — already engineered; enable when you are ready

These are **not** blocking Issue #25, but you may provision them in the same pass.

### 6.1 AI search (P1 / P2 — live Typesense path available)

| Item | Staging | Production |
| --- | --- | --- |
| Search provider choice | Typesense *(current recommendation / live)* / Algolia | |
| Typesense host URL | | |
| Typesense API key | | |
| *Or* Algolia App ID + Admin + Search keys | | |

`SEARCH_PROVIDER=typesense|algolia|off`

### 6.2 Account fraud (P3 — when payout abuse appears)

| Item | Staging | Production |
| --- | --- | --- |
| Fraud vendor choice | Castle *(cheap start)* / SEON *(payout fit)* / Sift *(enterprise)* | |
| API key / secret | | |

`ABUSE_FRAUD_PROVIDER=off|castle|seon|sift` — keep **off** until monetisation volume warrants it.

---

## 7. Checklist for the client

- [ ] Cloudflare Turnstile site key + secret (staging + production)  
- [ ] Email validation API key (AbstractAPI or Kickbox)  
- [ ] OpenAI (or Perspective / Hive) API key for moderation  
- [ ] Confirm auto-block vs queue policy  
- [ ] Confirm data-residency / DPA notes for content leaving region  
- [ ] Deliver secrets via secure channel (not plain email)  
- [ ] *(Optional)* Search vendor keys  
- [ ] *(Optional)* Fraud vendor keys  

---

## 8. Contact

Please return this form (or an equivalent secure share) to the Synqulan engineering contact with:

- Company / project name: _______________________  
- Technical contact name: _______________________  
- Email: _______________________  
- Target go-live for P0 protections: _______________________  

---

*This document requests credentials only. Synqulan engineering will implement feature-flagged vendor adapters; Postgres remains the system of record. Vendor scores do not replace mutual Connect or Cap verification.*
