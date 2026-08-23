# Update: Training / Course Marketplace (Issue #20)

| Field | Value |
| --- | --- |
| **Issue** | [#20 — Training / course marketplace](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/20) |
| **Priority** | D · Backlog #20 |
| **Spec** | June 26 — course buyers; cohorts / completion |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

New **`(training)`** module for courses/workshops with **cohorts** and **completion tracking** — separate from generic goods `Product`/`Order`.

---

## Schema

| Model | Purpose |
| --- | --- |
| `TrainingCourse` | Instructor-owned course listing (price, skills, publish status) |
| `TrainingCohort` | Scheduled cohort with capacity and dates |
| `TrainingEnrollment` | Student enrollment + completion |

Migration: `20260823195000_training_course_marketplace`

---

## APIs

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/training/courses` | Public discover (published) |
| `GET` | `/training/courses/:id` | Public detail + cohorts |
| `POST` | `/training/courses` | Create course |
| `PATCH` | `/training/courses/:id` | Update own course |
| `POST` | `/training/courses/:id/cohorts` | Add cohort |
| `POST` | `/training/cohorts/:id/enroll` | Enroll (purchase scaffold) |
| `PATCH` | `/training/enrollments/:id/complete` | Instructor marks completion |
| `GET` | `/training/courses/me` | Instructor dashboard |
| `GET` | `/training/enrollments/me` | Student enrollments |

Stripe checkout wiring remains a follow-up.

---

## Key files

- `prisma/schema/training.prisma`
- `src/main/(training)/training.service.ts`
- `src/main/(training)/training.controller.ts`
