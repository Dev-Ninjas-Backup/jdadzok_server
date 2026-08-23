# Update: Mentorship vs General Chat Types (Issue #14)

| Field | Value |
| --- | --- |
| **Issue** | [#14 — Mentorship vs general chat types + auto-open on accept](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/14) |
| **Priority** | C · Backlog #14 |
| **Spec** | June 26 — distinct inbox contexts |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Live chats now have a **`context`**: `GENERAL` (mutual Connect required) or `MENTORSHIP` (accepted volunteer application or Bridge mentorship booking). Mentorship threads **auto-open** when those acceptances occur.

---

## Schema

| Field | Model | Purpose |
| --- | --- | --- |
| `LiveChatContext` | enum | `GENERAL` \| `MENTORSHIP` |
| `context` | `LiveChat` | Inbox separation |
| `volunteerApplicationId` | `LiveChat` | Link to volunteer accept |
| `bridgeBookingId` | `LiveChat` | Link to Bridge booking accept |

Migration: `20260823190000_live_chat_mentorship_context`

---

## APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/chat/private` | General chat (Connect required) |
| `POST` | `/chat/mentorship/private` | Mentorship chat (active pairing required) |
| `GET` | `/chat/my?context=GENERAL\|MENTORSHIP` | Filtered inbox lists |

Socket `chat:message_send` accepts optional `context: MENTORSHIP`.

---

## Auto-open triggers

1. **Volunteer application accepted** — `PATCH /volunteer/status/:id` with `ACCEPTED` → chat between volunteer and project NGO owner
2. **Bridge booking accepted** — expertise / mentoring / advice listings → chat between client and provider

---

## Key files

- `prisma/schema/livechat.prisma`
- `src/main/(sockets)/chats/chat.service.ts`
- `src/main/volunteer/volunteer.service.ts`
- `src/main/(bridge)/bridge.service.ts`
