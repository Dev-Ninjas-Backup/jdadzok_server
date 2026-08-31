# Synqulan Mobile App — API Integration Guide

**Audience:** Mobile developers (`jdadzok-app`)  
**Backend:** `jdadzok_server` (NestJS v1.6.0, default port **5056**)  
**Last updated:** 2026-08-23  

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Environment & configuration keys](#2-environment--configuration-keys)
3. [HTTP client architecture](#3-http-client-architecture)
4. [Authentication flows](#4-authentication-flows)
5. [Public vs authenticated routes](#5-public-vs-authenticated-routes)
6. [Screen-to-API mapping](#6-screen-to-api-mapping)
7. [WebSocket authentication](#7-websocket-authentication)
8. [Third-party integrations](#8-third-party-integrations)
9. [Security checklist](#9-security-checklist)
10. [CORS note](#10-cors-note)
11. [Implementation phases](#11-implementation-phases)
12. [Files to implement (mobile repo)](#12-files-to-implement-mobile-repo)
13. [Testing checklist](#13-testing-checklist)
14. [Known backend constraints](#14-known-backend-constraints)
15. [Quick reference — auth endpoints](#15-quick-reference--auth-endpoints)

---

## 1. Executive summary

### Mobile app today (`jdadzok-app`)

| Area | Status |
|------|--------|
| UI | Complete — 18 routes, 17 feature modules, ~148 Dart files |
| Data | **Static mock data** in GetX controllers |
| Networking | **Not wired** — `ApiEndpoints` and `AuthService` are empty stubs |
| Dependencies ready | `dio`, `http`, `socket_io_client`, `flutter_stripe`, `flutter_webrtc` |
| Auth UI | Sign-in/sign-up bypass navigation for demo; validation commented out |

The app is a **full static UI shell** waiting for backend integration.

### Backend auth model (important)

The Synqulan API does **not** use a static mobile “API key” header (e.g. `X-API-Key`). Access works like this:

| Layer | Mechanism |
|-------|-----------|
| **Public routes** | No auth (`@MakePublic()` or no guard) |
| **Member routes** | **JWT Bearer token** — `Authorization: Bearer <accessToken>` |
| **Admin routes** | JWT + role (`ADMIN`, `SUPER_ADMIN`, etc.) |
| **WebSockets** | Same JWT via `Authorization`, `auth.token`, or `?token=` |

After login, the mobile app stores the JWT and sends it on every protected request. Third-party **publishable** keys (Stripe, Google, Apple) are separate config values — not server API keys.

---

## 2. Environment & configuration keys

### 2.1 What mobile developers configure

These are **build-time / flavor** values (do not commit production secrets to git):

| Key | Purpose | Example | Secret? |
|-----|---------|---------|---------|
| `API_BASE_URL` | REST base URL | `https://api.synqulan.com` | No |
| `WS_BASE_URL` | Socket.IO origin | Same host as API | No |
| `STRIPE_PUBLISHABLE_KEY` | `flutter_stripe` | `pk_test_...` / `pk_live_...` | Publishable only |
| `GOOGLE_CLIENT_ID_IOS` | Google Sign-In | From Google Cloud Console | Client ID |
| `GOOGLE_CLIENT_ID_ANDROID` | Google Sign-In | From Google Cloud Console | Client ID |
| `APPLE_SERVICE_ID` | Sign in with Apple | From Apple Developer | Client ID |

**Never embed** server secrets in the app: `JWT_SECRET`, Stripe secret keys, AWS keys, DB credentials, etc.

### 2.2 Recommended Flutter setup

Use **`--dart-define-from-file`** per environment:

```json
// env/dev.json  (do not commit production secrets)
{
  "API_BASE_URL": "http://10.0.2.2:5056",
  "WS_BASE_URL": "http://10.0.2.2:5056",
  "STRIPE_PUBLISHABLE_KEY": "pk_test_..."
}
```

```bash
flutter run --dart-define-from-file=env/dev.json
flutter build apk --dart-define-from-file=env/staging.json
```

**Android emulator:** use `10.0.2.2` instead of `localhost` to reach the API on your host machine.

### 2.3 Backend environments

| Environment | Base URL (confirm with DevOps) | Swagger |
|-------------|--------------------------------|---------|
| Local | `http://localhost:5056` | `/docs` |
| Staging | TBD | `/docs` |
| Production | TBD (e.g. `https://api.synqulan.com`) | `/docs` |

**Health check:** `GET /api/health`  
**API version:** response field `version` (currently **1.6.0**)

---

## 3. HTTP client architecture

### 3.1 Recommended stack

```
lib/core/
├── config/app_config.dart          # dart-define readers
├── api/api_endpoints.dart          # path constants
├── api/api_client.dart             # Dio singleton + interceptors
├── auth/auth_service.dart          # login, logout, token storage
├── auth/token_storage.dart         # flutter_secure_storage (add package)
└── auth/auth_interceptor.dart      # inject Bearer, handle 401
```

**Suggested packages to add:**

- `flutter_secure_storage` — store JWT securely (Keychain / EncryptedSharedPreferences)
- Optional: `connectivity_plus` — offline detection

### 3.2 Standard request headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <accessToken>    # all protected routes
```

Mobile must **not** rely on HTTP cookies. The server sets cookies for web admin; mobile uses **Bearer only**.

The server’s `cookieHandler` also accepts `Authorization: Bearer …`, so Bearer works for both `JwtAuthGuard` and `@GetVerifiedUser()` routes.

### 3.3 Response envelope

All REST responses use this shape:

```json
{
  "success": true,
  "message": "Login successfull!",
  "data": { }
}
```

Paginated lists add `metadata`:

```json
{
  "success": true,
  "message": "Request Success",
  "data": [ ],
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPage": 5
  }
}
```

Parse `success` first; on `false`, show `message` to the user.

### 3.4 Error handling

| HTTP | Meaning | Mobile action |
|------|---------|---------------|
| `401` | Missing/invalid/expired JWT | Clear token → Sign In |
| `403` | Not allowed (e.g. no Connect for chat, volunteer opt-in off) | Show server `message` |
| `404` | Not found | Empty state |
| `422` / `400` | Validation | Field-level errors from `message` |
| `5xx` | Server error | Retry + support message |

---

## 4. Authentication flows

### 4.1 Registration

```
POST /users/register
```

**Body:**

```json
{
  "name": "Amara O.",
  "email": "user@gmail.com",
  "password": "secret12",
  "authProvider": "EMAIL"
}
```

**Backend constraint:** email must end with **`@gmail.com`** (current server validation).

**Response:** user id + OTP sent by email.

**Mobile screen:** `SignUpController.onContinue()` → call API → OTP screen (to be built) → `POST /users/verify-account`.

### 4.2 Verify account (OTP)

```
POST /users/verify-account
```

**Body:**

```json
{
  "userId": "<uuid>",
  "token": "<otp-from-email>"
}
```

Resend OTP:

```
POST /auth/resent-code
{ "email": "user@gmail.com" }
```

### 4.3 Login

```
POST /auth/login
```

**Body:**

```json
{
  "email": "user@gmail.com",
  "password": "secret12"
}
```

**Response `data`:**

```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "...",
    "email": "...",
    "role": "USER",
    "isVerified": true,
    "capLevel": "GREEN",
    "stripeAccountId": null,
    "stripeCustomerId": null
  }
}
```

**Mobile actions:**

1. Persist `accessToken` in secure storage
2. Persist minimal user snapshot for cold start
3. `Get.offAllNamed(AppRoute.navbarScreen)`

**JWT lifetime:** `JWT_EXPIRES_IN=90d` (no refresh-token endpoint today — on expiry, force re-login).

### 4.4 Logout

```
POST /auth/logout
Authorization: Bearer <token>
```

Clear local token and user cache regardless of response.

### 4.5 Forgot password

```
POST /auth/forget-password     → OTP email
POST /auth/verify-token        → { userId, token }
POST /auth/reset-password      → new password
```

Wire to `SignInController.onForgotPassword()`.

### 4.6 Change password (Settings)

```
POST /auth/change-password
Authorization: Bearer <token>
```

---

## 5. Public vs authenticated routes

### 5.1 No token required (guest + browse)

| Method | Path | Mobile screen |
|--------|------|---------------|
| GET | `/api/health` | Startup / debug |
| GET | `/explore/guest/contract` | Guest mode — locked actions list |
| GET | `/explore/guest` | Guest home |
| GET | `/explore/guest/opportunities` | Guest opportunities |
| GET | `/explore/guest/opportunities/:projectId` | Opportunity detail |
| GET | `/explore/guest/impact` | Guest stats banner |
| GET | `/leaderboard/contribution` | Recognition leaderboard |
| GET | `/bridge` | Explorer — Bridge listings |
| GET | `/bridge/fee-policy` | Paid gig fee info |
| GET | `/choices/all` | Areas of interest tag catalog |
| GET | `/contracts/soft-earnings` | Earnings display rules |
| GET | `/sponsored/opportunities` | Sponsored cards |
| GET | `/about-us`, `/terms-and-conditions`, `/privacy-policy` | Settings legal |

**Guest contract** documents actions that require sign-in:

```json
{
  "guestMode": true,
  "joinPrompt": "Sign in or create a free account to apply, connect, message, follow, or book opportunities.",
  "lockedActions": [
    { "action": "apply_volunteer", "route": "/volunteer/apply", "method": "POST" },
    { "action": "connect", "route": "/friend-request", "method": "POST" },
    { "action": "message", "route": "/chat/private", "method": "POST" }
  ]
}
```

Use this to disable buttons in `GuestModeScreen` and show the join CTA.

### 5.2 Token required (member)

All routes under: `auth` (logout), `users`, `user-profile`, `volunteer`, `friend-request`, `follows`, `chat`, `calls`, `notifications`, `cap-level`, `bridge` (book/create), etc.

Send: `Authorization: Bearer <accessToken>`

---

## 6. Screen-to-API mapping

### 6.1 Onboarding

| Screen | Controller | API |
|--------|------------|-----|
| Sign Up | `SignUpController` | `POST /users/register` |
| OTP verify | *(new screen)* | `POST /users/verify-account` |
| Sign In | `SignInController` | `POST /auth/login` |
| Areas of Interest | `AreasOfInterestController` | `GET /choices/all` → `POST /choices` |
| Guest Mode | `GuestModeController` | `GET /explore/guest/*` |

**`POST /choices` body:**

```json
{
  "ids": ["<choice-uuid>", "..."],
  "isVolunteerMentorOptIn": true,
  "interestOtherText": "Urban farming"
}
```

Requires JWT. Replace hardcoded tags in `AreasOfInterestController` with `GET /choices/all`.

### 6.2 Home (`HomeController`)

| UI section | Suggested API |
|------------|---------------|
| Profile header (cap, hours, impact) | `GET /user-profile/reputation-passport` or `GET /cap-level/status/me` |
| Opportunities carousel | `GET /explore/guest/opportunities` or member volunteer listing |
| Recognition this week | `GET /leaderboard/contribution?limit=5` |
| Community posts | `GET /posts` (feed — optional phase 2) |

**Soft earnings:** public views must use `earningLevel.headline` only — never show raw `%` or dollar totals except on personal dashboard (`GET /cap-level/earnings/me`).

### 6.3 Recognition leaderboard

| Screen | API |
|--------|-----|
| `RecognitionLeaderboardScreen` | `GET /leaderboard/contribution` |

Query params: category filters, pagination (see Swagger `/docs`).

Replace mock list in `RecognitionLeaderboardController`.

### 6.4 Log contribution

| Field | API |
|-------|-----|
| Contribution types | `GET /volunteer/contribution-types` |
| Submit hours | `PATCH /volunteer/log-hours/:applicationId` |

**Log hours body:**

```json
{
  "checkInTime": "2025-11-01T09:00:00Z",
  "checkOutTime": "2025-11-01T13:30:00Z",
  "contributionType": "MENTORING",
  "counterpartyUserId": "<mentee-uuid>"
}
```

**Notes:**

- User must have `isVolunteerMentorOptIn: true` or API returns **403**
- Self-reported hours start **PENDING** until endorsement
- Map UI types: Mentoring, Advice, Project, Teaching, Charity, Other → `ContributionType` enum

### 6.5 Explorer

| Section | API |
|---------|-----|
| Projects seeking help | `GET /bridge?type=PROJECT_HELP` |
| Paid gigs | `GET /bridge?type=GIG` |
| Expertise listings | `GET /bridge?type=EXPERTISE` |
| Volunteer tab | `GET /explore/guest/opportunities` |

Public discover is Cap-weighted; authenticated users get richer fields on member routes.

### 6.6 Profile

| UI | API |
|----|-----|
| Header + stats | `GET /user-profile/reputation-passport` |
| Cap art (worn/beside, style) | `GET/PATCH /user-profile/cap-art-preferences` |
| Mentor opt-in toggle | `PATCH /user-profile/volunteer-mentor-opt-in` |
| Hours progress | `GET /volunteer/hours-bank` |
| Edit profile | `PATCH /user-profile` |

**Cap levels:** `GREEN`, `YELLOW`, `RED`, `BLACK`, `SKY_BLUE` — map to assets in `IconPath.capGreen` etc.

### 6.7 Dashboard (`DashboardController`)

| Widget | API |
|--------|-----|
| Cap status + soft headline | `GET /cap-level/status/me` |
| Exact earnings / payouts | `GET /cap-level/earnings/me` |
| Withdraw | `POST /withdraw` (Stripe-connected) |

Use `privateEarnings` / `privateSummary` blocks from cap status for exact figures on this screen only.

### 6.8 Network

| Action | API |
|--------|-----|
| Send Connect | `POST /friend-request` `{ "receiverId": "..." }` |
| Accept/reject | `PATCH /friend-request` |
| Pending requests | `GET /friend-request/pending` |
| Connections list | `GET /friend-request/connections` |
| Follow toggle | `POST /follows` |
| Followers/following | `GET /follows/:userId/followers` |

**Rule:** General chat and general calls require **mutual Connect** (`FriendRequest` ACCEPTED).

### 6.9 Messages

**REST (bootstrap threads):**

| Action | API |
|--------|-----|
| Inbox | `GET /chat/my?context=GENERAL` or `MENTORSHIP` |
| Start general chat | `POST /chat/private` |
| Start mentorship chat | `POST /chat/mentorship/private` |
| Messages | `GET /chat/:chatId/messages?cursor=&limit=` (default `limit=50`, max 100; `cursor` = last message id) |
| Send (HTTP fallback) | `POST /chat/:chatId/messages` body may include `clientMessageId` for idempotent retries |

HTTP send also emits the same socket events as live send (`chat:message_receive`, `chat:message_sent`, and `chat:message_delivered` when the receiver is connected).

**WebSocket (real-time):**

```
Namespace: /chat
URL: {WS_BASE_URL}/chat
Auth: auth: { token: '<jwt>' }
      OR Authorization: Bearer <jwt>
```

**Event names use underscores after the namespace prefix** (`chat:message_send`), **not extra colons** (`chat:message:send`).

| Direction | Event | When |
|-----------|--------|------|
| Emit | `chat:message_send` | Send (payload: `receiverId`, optional `context`, `content` / media, optional `clientMessageId`) |
| Listen | `chat:message_receive` | Incoming message on the receiver device |
| Listen | `chat:message_sent` | Ack to sender (HTTP and socket paths) |
| Listen | `chat:message_delivered` | Receiver device was online and got the message |
| Emit / listen | `chat:message_read` | Mark / notify read |
| Emit / listen | `chat:typing_start` / `chat:typing_stop` | Typing indicators |
| Emit | `user:get_status` / `user:set_status` | Presence |
| Listen | `user:status` / `user:status_changed` | Presence |
| Emit | `chat:join` / `chat:leave` | Join/leave chat room (typing + read); also auto-joined on connect and on send |
| Listen | `error` | Send failures |

Uncomment `initServices()` / `SocketService` in `main.dart` when implementing.

### 6.10 Calls (WebRTC)

| Layer | Detail |
|-------|--------|
| REST | `POST /calls` — `callPurpose`: `GENERAL` \| `MENTORSHIP` |
| Socket | Calling gateway — JWT via same patterns as chat |
| Rule | `GENERAL` requires Connect; `MENTORSHIP` auto-logs verified hours on end |

Packages already in `pubspec.yaml`: `flutter_webrtc`, `socket_io_client`.

### 6.11 Notifications

```
GET   /notifications/user-notifications
PATCH /notifications/read
GET   /notifications/toggles
PATCH /notifications/toggles
```

Wire `NotificationController` filters to `NotificationType` from API.

### 6.12 Opportunity detail

```
GET /explore/guest/opportunities/:projectId   (guest)
POST /volunteer/apply                          (member — apply)
```

### 6.13 Settings

| Setting | API |
|---------|-----|
| Edit profile | `PATCH /user-profile` |
| Change password | `POST /auth/change-password` |
| Notification prefs | `/notifications/toggles` |
| Privacy | Profile visibility fields on `PATCH /user-profile` |
| Sign out | `POST /auth/logout` + clear storage |
| Terms / privacy | `GET /terms-and-conditions`, `GET /privacy-policy` |

---

## 7. WebSocket authentication

Server accepts JWT from (in order):

1. `Authorization: Bearer <token>` header
2. `auth: { token: '<token>' }` in Socket.IO handshake
3. Query `?token=<token>`
4. Cookie `token=` (web only — **do not use on mobile**)

**Recommended for Flutter:**

```dart
IO.io(
  '$wsBaseUrl/chat',
  IO.OptionBuilder()
    .setTransports(['websocket'])
    .setAuth({'token': accessToken})
    .build(),
);
```

**Namespaces:**

- `/chat` — messaging
- Calling / realtime-call — separate gateways (see `/docs`)

---

## 8. Third-party integrations

### 8.1 Stripe (`flutter_stripe`)

- Use **publishable key** only in the app
- Payment intents / Connect accounts are created server-side
- Server routes: `/stripe/*`
- Uncomment `StripeService.init()` in `main.dart` when ready

### 8.2 Google / Apple Sign-In (via Firebase Auth)

Mobile signs in with Google or Apple through the **Firebase Auth SDK**, then sends the resulting **Firebase ID token** to the backend:

```
POST /auth/firebase     (preferred — any Firebase provider)
POST /auth/google       (alias — same Firebase ID token)
POST /auth/apple        (alias — same Firebase ID token; optional name on first sign-in)
```

**Body:**

```json
{
  "idToken": "<firebase-id-token>",
  "name": "Amara O."
}
```

**Response:** same shape as `POST /auth/login` (`accessToken` + `user`).

**Server env:** `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.

**Mobile flow:**

1. `FirebaseAuth.instance.signInWithCredential(...)` (Google / Apple)
2. `await user.getIdToken()` → send to `/auth/firebase`
3. Store returned JWT for API calls

Do **not** send raw Google or Apple identity tokens — only the Firebase ID token.

### 8.3 Push notifications (FCM via Firebase)

Uses the **same Firebase project** as social auth (`firebase-admin` + your service account in `.env`).

**Register device token (after login):**

```
POST /notifications/device-token
Authorization: Bearer <token>
```

```json
{
  "token": "<fcm-device-token-from-firebase-messaging>",
  "platform": "IOS"
}
```

`platform`: `IOS` | `ANDROID`

**Unregister on logout:**

```
DELETE /notifications/device-token
{ "token": "<fcm-device-token>" }
```

**Mobile setup:**

1. Add `firebase_messaging` to Flutter
2. Request notification permission
3. `FirebaseMessaging.instance.getToken()` → register with backend
4. On token refresh, re-register

When the server creates an in-app notification (posts, comments, messages, etc.), it also sends an FCM push to all registered tokens for that user. Stale tokens are auto-removed.

### 8.4 Media uploads

```
POST /aws-uploads
Authorization: Bearer <token>
multipart/form-data
```

Use for profile avatars, chat attachments (when supported).

---

## 9. Security checklist

1. Store JWT in **`flutter_secure_storage`**, not `SharedPreferences`
2. Never log tokens in production (`logger` package — redact `Authorization`)
3. Never commit `env/prod.json` or keystores
4. Use certificate pinning in production (optional, recommended)
5. Clear all local data on sign-out and account deletion
6. Treat guest responses as **read-only** — enforce `lockedActions` client-side
7. Do not expose exact ad-share `%` outside Dashboard / personal earnings routes

---

## 10. CORS note

CORS applies to **web/browser** builds only. Native Android/iOS calls are not CORS-blocked. If you ship **Flutter Web**, ask backend to add your web origin to the CORS allowlist in `src/main.ts`.

---

## 11. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **1** | `AppConfig`, `ApiClient` (Dio), `ApiEndpoints`, envelope parsing |
| **2** | Register, verify OTP, login, logout, secure token storage, auth interceptor |
| **3** | Guest explore, leaderboard, replace home mock data |
| **4** | Profile, reputation passport, cap-level status, hours bank |
| **5** | Log contribution, contribution types, volunteer apply |
| **6** | Friend requests, follows, network screen |
| **7** | Chat REST + `/chat` socket |
| **8** | Calls, notifications, Stripe dashboard payouts |

---

## 12. Files to implement (mobile repo)

| File (current) | Action |
|----------------|--------|
| `lib/core/api_endpoints/api_endpoints.dart` | Add all path constants |
| `lib/core/auth_service/auth_service.dart` | Login, register, token CRUD |
| `lib/main.dart` | Init `ApiClient`, `AuthService`; later sockets/Stripe |
| `lib/core/binding/controller_binder.dart` | Register `AuthService` as `GetxService` |
| Feature controllers | Replace mock lists with API calls + loading/error states |

---

## 13. Testing checklist

- [ ] `GET /api/health` from device/emulator
- [ ] Register → verify OTP → login flow
- [ ] Bearer token attached on protected route
- [ ] 401 clears session and routes to Sign In
- [ ] Guest mode loads without token
- [ ] Guest locked action shows join prompt
- [ ] Leaderboard loads public data
- [ ] Log hours returns 403 when volunteer opt-in is false
- [ ] Chat socket connects with JWT
- [ ] Dashboard shows soft headline on profile, exact figures only on dashboard

**Swagger:** `{API_BASE_URL}/docs` — use “Authorize” with Bearer token for interactive testing.

---

## 14. Known backend constraints

| Constraint | Impact on mobile |
|------------|------------------|
| Email must be `@gmail.com` | Validate in sign-up UI or show clear error |
| No refresh token | Re-login after 90 days or on 401 |
| Cookie-first web admin | Mobile must use Bearer, not cookies |
| OAuth not implemented | Use Firebase Auth on mobile → `POST /auth/firebase` with Firebase ID token |
| Reputation passport `:userId` requires auth | Even “public” passport needs a logged-in viewer |

---

## 15. Quick reference — auth endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/users/register` | Public |
| POST | `/users/verify-account` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/logout` | Bearer |
| POST | `/auth/forget-password` | Public |
| POST | `/auth/verify-token` | Public |
| POST | `/auth/reset-password` | Public |
| POST | `/auth/resent-code` | Public |
| POST | `/auth/change-password` | Bearer |
| POST | `/auth/firebase` | Public — Firebase ID token (Google/Apple via Firebase SDK) |
| POST | `/auth/google` | Public — alias for Firebase Google sign-in |
| POST | `/auth/apple` | Public — alias for Firebase Apple sign-in |
| POST | `/choices` | Bearer |
| GET | `/choices/all` | Public |

---

## Related docs

- Backend spec status: [`SYNQULAN_JUNE26_SPEC_STATUS.md`](./SYNQULAN_JUNE26_SPEC_STATUS.md)
- Guest explore contract: `src/common/constants/guest-explore.contract.ts`
- Soft earnings contract: `src/common/constants/soft-earnings.contract.ts`
- Mobile app README: `jdadzok-app/README.md`

---

*There is no separate “mobile API key” to request from the server — integration is JWT session tokens + environment base URLs + third-party publishable keys.*
