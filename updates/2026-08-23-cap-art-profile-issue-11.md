# Update: Cap Art Style & Placement on Profile (Issue #11)

| Field | Value |
| --- | --- |
| **Issue** | [#11 — Cap art style and placement on profile](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/11) |
| **Priority** | C · Backlog #11 |
| **Spec** | June 26 — Illustrated cap style & placement (inclusivity) |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Members can choose how their illustrated Cap appears on their profile: **style** (structured vs soft rendering) and **placement** (worn on avatar vs beside photo). Default placement is **beside** per the June 26 inclusivity requirement.

---

## Schema

| Field | Model | Default | Values |
| --- | --- | --- | --- |
| `capArtStyle` | `Profile` | `STRUCTURED` | `STRUCTURED`, `SOFT` |
| `capArtPlacement` | `Profile` | `BESIDE` | `WORN`, `BESIDE` |

Migration: `20260823184000_cap_art_profile_preferences`

---

## APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/user-profile/cap-art-preferences` | Current style/placement + user's `capLevel` |
| `PATCH` | `/user-profile/cap-art-preferences` | Update style and/or placement |
| `PATCH` | `/user-profile` | General profile update also accepts `capArtStyle` / `capArtPlacement` |

Profile responses (`GET /user-profile`, `GET /user-profile/:id`) include the new fields on `profile`.

---

## Key files

- `prisma/schema/profile.prisma`, `prisma/schema/enum.prisma`
- `src/main/(users)/user-profile/dto/cap-art-preferences.dto.ts`
- `src/main/(users)/user-profile/user.profile.controller.ts`
