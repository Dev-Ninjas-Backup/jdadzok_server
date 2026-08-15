# Update: Volunteer / Mentor Opt-In (Issue #1)

| Field | Value |
| --- | --- |
| **Issue** | [#1 — Volunteer / mentor opt-in on User or Profile (+ onboarding / profile toggle APIs)](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/1) |
| **Priority** | A · Backlog #1 |
| **Spec** | June 26 — Volunteering & mentor opt-in |
| **Date** | 2026-08-15 |
| **Status** | Implemented |

---

## Summary

Members can now **opt in** to volunteering and mentoring. The flag lives on `Profile`, is **independent of Cap level**, and is required before applying to volunteer projects or logging verified hours. It can be set during onboarding (areas of interest) or toggled later from the profile.

---

## What changed

### 1. Schema

New boolean on `Profile`:

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `isVolunteerMentorOptIn` | `Boolean` | `false` | Opted in to mentoring tools and verified-hour logging |

**Files**

- `prisma/schema/profile.prisma`
- `prisma/migrations/20260815143000_volunteer_mentor_opt_in/migration.sql`

Apply with:

```bash
npx prisma migrate deploy
# or during local dev:
npx prisma migrate dev
```

---

### 2. APIs

#### Onboarding — set with areas of interest

`POST /choices`

Optional body field alongside choice IDs:

```json
{
  "ids": ["550e8400-e29b-41d4-a716-446655440000"],
  "isVolunteerMentorOptIn": true
}
```

When `isVolunteerMentorOptIn` is present, the user’s profile is updated in the same request. Response includes the saved choices and, if the flag was sent, the resulting `isVolunteerMentorOptIn` value.

**Files**

- `src/main/(started)/user-choice/dto/user-choice.dto.ts`
- `src/main/(started)/choices/choices.service.ts`

#### Profile update — include the flag

`PATCH /user-profile`

```json
{
  "isVolunteerMentorOptIn": true
}
```

Also available on the existing profile DTO with other profile fields.

**Files**

- `src/main/(users)/user-profile/dto/user.profile.dto.ts`
- `src/main/(users)/user-profile/user.profile.repository.ts`

#### Dedicated toggle

`PATCH /user-profile/volunteer-mentor-opt-in`

```json
{
  "isVolunteerMentorOptIn": true
}
```

Returns the updated opt-in state (`id`, `userId`, `isVolunteerMentorOptIn`, `updatedAt`).

**Files**

- `src/main/(users)/user-profile/dto/volunteer-mentor-opt-in.dto.ts` *(new)*
- `src/main/(users)/user-profile/user.profile.controller.ts`
- `src/main/(users)/user-profile/user.profile.service.ts`
- `src/main/(users)/user-profile/user.profile.repository.ts`

#### Read current value

`GET /user-profile` — response includes `isVolunteerMentorOptIn` on the profile object.

---

### 3. Behaviour gating

Opt-in is enforced **server-side** (not Cap-based):

| Action | Endpoint | If opt-in is `false` |
| --- | --- | --- |
| Apply to volunteer project | `POST /volunteer/apply` | `403 Forbidden` |
| Log verified hours | `PATCH /volunteer/log-hours/:applicationId` | `403 Forbidden` |

**File**

- `src/main/volunteer/volunteer.service.ts`

Future mentorship tools (chat / verified calls) should reuse the same `Profile.isVolunteerMentorOptIn` check.

---

### 4. Spec status doc

Updated in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md`:

- Section 2 — Volunteer / mentor opt-in → `[x]`
- Priority A backlog item #1 → `[x]`
- Screens 8.4 / 8.6 notes refreshed
- Summary counts adjusted (implemented **8**, missing **15**)
- Changelog row for 2026-08-15

---

## File checklist (issue #1 only)

| Path | Change |
| --- | --- |
| `prisma/schema/profile.prisma` | Added `isVolunteerMentorOptIn` |
| `prisma/migrations/20260815143000_volunteer_mentor_opt_in/` | Migration |
| `src/main/(started)/user-choice/dto/user-choice.dto.ts` | Onboarding field |
| `src/main/(started)/choices/choices.service.ts` | Persist opt-in during `POST /choices` |
| `src/main/(users)/user-profile/dto/user.profile.dto.ts` | Profile DTO field |
| `src/main/(users)/user-profile/dto/volunteer-mentor-opt-in.dto.ts` | Dedicated toggle DTO |
| `src/main/(users)/user-profile/user.profile.controller.ts` | Toggle route |
| `src/main/(users)/user-profile/user.profile.service.ts` | Toggle service method |
| `src/main/(users)/user-profile/user.profile.repository.ts` | Persist / update helpers |
| `src/main/volunteer/volunteer.service.ts` | Gate apply + log hours |
| `docs/SYNQULAN_JUNE26_SPEC_STATUS.md` | Checkboxes + changelog |

---

## Client integration notes

1. During **Areas of interest** (screen 8.4), send `isVolunteerMentorOptIn` with `POST /choices`.
2. On **Member profile** (screen 8.6), show a toggle bound to `PATCH /user-profile/volunteer-mentor-opt-in` (or include the field in `PATCH /user-profile`).
3. Before apply / log-hours UI actions, either check the profile flag or handle `403` and prompt the user to opt in.
4. Default is **opted out** (`false`) for existing and new profiles until they opt in.

---

## Done criteria (from issue #1)

| Criterion | Status |
| --- | --- |
| Behaviour matches June 26 brief for this item | Done |
| Checkbox flipped to `[x]` in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md` | Done |
| Changelog row added in that doc | Done |
