# Update: Mutual-Connect Gating on Chat & General Calls (Issue #3)

| Field | Value |
| --- | --- |
| **Issue** | [#3 — Mutual-Connect gating on chat and general calls](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/3) |
| **Priority** | A · Backlog #3 |
| **Spec** | June 26 — Follow, Connect, chats & calls |
| **Date** | 2026-08-15 |
| **Status** | Implemented |

---

## Summary

**Mutual Connect** (`FriendRequest` with status `ACCEPTED`) is now enforced **server-side** before private messaging and general calls. Clients can no longer open general chat or start a general call without an accepted Connect.

Mentorship calls (`callPurpose=MENTORSHIP`) are **not** gated by Connect — they remain gated by volunteer/mentor opt-in (issue #1 / #2).

---

## What changed

### 1. Connect helpers

On `FriendRequestService`:

| Method | Behaviour |
| --- | --- |
| `areConnected(userA, userB)` | `true` if ACCEPTED request exists in either direction |
| `assertConnected(userA, userB)` | Throws `403 Forbidden` when not connected |

`FriendRequestModule` now **exports** `FriendRequestService` for chat/call modules.

**Files**

- `src/main/(users)/friend-request/friend-request.service.ts`
- `src/main/(users)/friend-request/friend-request.module.ts`

---

### 2. Private chat (general messaging)

Connect is required to:

| Action | Path |
| --- | --- |
| Start / get private chat | `POST /chat/private` |
| Get-or-create by user id | `GET /chat/chat/:otherUserId` |
| Send message (HTTP) | `POST /chat/:chatId/messages` |
| Send message (socket) | `chat:message_send` on `/chat` |

`ChatGateway` now routes through `ChatService.getOrCreatePrivateChat` (no bypass via raw Prisma create).

Individual chats re-check Connect on every send so revoked connections cannot keep messaging.

**Files**

- `src/main/(sockets)/chats/chat.service.ts`
- `src/main/(sockets)/chats/chat.gateway.ts`
- `src/main/(sockets)/chats/chats.module.ts`

---

### 3. General calls

| Purpose | Gate |
| --- | --- |
| `GENERAL` (default) | Mutual Connect required |
| `MENTORSHIP` | Volunteer/mentor opt-in (unchanged) |

Enforced in:

- `CallService.startCallToUser` (`POST /calls/start`, `/calling` socket)
- `RealTimeCallService.createCall` (`/realtime-call` socket)

**Files**

- `src/main/(shared)/calling/service/calling.service.ts`
- `src/main/(shared)/calling/calling.module.ts`
- `src/main/(shared)/realtime-call/realtime-call.service.ts`
- `src/main/(shared)/realtime-call/realtime-call.module.ts`

---

### 4. Error handling fix

`@HandleError` previously turned `ForbiddenException` into `500`. `simplifyError` now rethrows Nest `HttpException`s so Connect (and other) 403s reach the client correctly.

**File:** `src/common/error/handle-error.simplify.ts`

---

### 5. Spec status doc

Updated in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md`:

- §4 Connect + messaging gated → `[x]`
- Screen 8.15 → `[x]`; 8.18 / 8.19 notes refreshed
- Priority A backlog #3 → `[x]`
- Changelog row 2026-08-15

---

## Client integration notes

1. Before opening DM or a general call, ensure Connect is accepted (existing friend-request APIs).
2. Expect **403** with a clear message if Connect is missing.
3. Mentorship call UI should continue to use `callPurpose: "MENTORSHIP"` (no Connect requirement).
4. Listing existing chats (`GET /chat/my`) is still allowed; **sending** into an individual chat re-checks Connect.

---

## Done criteria (from issue #3)

| Criterion | Status |
| --- | --- |
| Behaviour matches June 26 brief for this item | Done |
| Checkbox flipped to `[x]` in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md` | Done |
| Changelog row added in that doc | Done |
