# Update: Deduplicate Follow vs UserFollow (Issue #13)

| Field | Value |
| --- | --- |
| **Issue** | [#13 — Deduplicate Follow vs UserFollow](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/13) |
| **Priority** | C · Backlog #13 |
| **Spec** | June 26 — one-way Follow |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Removed the duplicate **`UserFollow`** model. All one-way follow relationships now use the canonical **`Follow`** model (`follows` table) via **`FollowService`**.

---

## Changes

| Area | Change |
| --- | --- |
| Schema | Dropped `UserFollow`; removed `users.follow.prisma` and User relations |
| Migration | Backfills `follows` from `UserFollow`, then drops legacy table |
| `FollowService` | Single source of truth: `followUser`, `unfollowUser`, `toggleFollow`; syncs `UserMetrics` + `Profile` counters |
| `UserService` | Delegates `followUser` / `unfollowUser` to `FollowService` |
| `UserController` | Fixed swapped follower/followed argument order on follow/unfollow routes |

---

## Canonical APIs

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/follows/toggle` | Toggle follow |
| `GET` | `/follows/followers/:userId` | Followers list |
| `GET` | `/follows/following/:userId` | Following list |
| `GET` | `/follows/is-following/:userId` | Check status |
| `POST` | `/users/follow-user/:id` | Legacy route — now writes to `follows` |
| `POST` | `/users/unfollow-user/:id` | Legacy route — now writes to `follows` |

---

## Key files

- `prisma/schema/follow.prisma` (canonical model)
- `src/main/(users)/follow/follow.service.ts`
- `prisma/migrations/20260823185000_deduplicate_user_follow/`
