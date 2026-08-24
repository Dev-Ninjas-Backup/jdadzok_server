# Update: Comprehensive demo dummy data seed

| Field | Value |
| --- | --- |
| **Date** | 2026-08-24 |
| **Status** | Seeded (production + local `.env` host) |
| **Script** | `npm run db:seed:demo` / included in `npm run db:seed` |

---

## Summary

Added an idempotent Synqulan demo dataset covering Cap ladder users, social graph, volunteering, Bridge, training, corporate sponsorships, chat, marketplace, and notifications.

Skip marker: if `amara.demo@gmail.com` exists, the seed does nothing.

---

## Demo logins (all password: `Pass123!`)

| Email | Cap | Role in demo |
| --- | --- | --- |
| `amara.demo@gmail.com` | RED | Primary member (mobile “Amara”) |
| `kwame.demo@gmail.com` | YELLOW | Community organiser |
| `fatima.demo@gmail.com` | GREEN | Health volunteer |
| `ngo.owner.demo@gmail.com` | RED | EduBridge Africa NGO owner |
| `mentor.demo@gmail.com` | BLACK | Senior mentor |
| `sky.invite.demo@gmail.com` | SKY_BLUE | Invitation-track member |
| `corporate.demo@gmail.com` | YELLOW | CSR contact |
| `student.demo@gmail.com` | GREEN | Mentee / student |

---

## Domains covered

- CapRequirements, ActivityScore, PostCategory, ProductCategory
- Users + Profile + About + UserMetrics + NotificationToggle + UserChoice
- Follow + FriendRequest (Connect)
- NGO + Community + memberships
- Posts + Likes + Comments + Endorsements
- VolunteerProject / Application / Hour (+ endorsement link)
- BridgeListing / BridgeBooking (incl. fee snapshot)
- TrainingCourse / Cohort / Enrollment
- CorporateMembership + SponsoredOpportunity
- LiveChat (GENERAL + MENTORSHIP) + messages
- Product (marketplace)
- Notification + AdRevenueShare

---

## Files

- `prisma/seeds/demo-dummy.seed.ts`
- `prisma/seed-demo.ts`
- `prisma/seed.ts` (calls demo seed after base seeds)
- `package.json` → `db:seed:demo`

```bash
npm run db:seed:demo
```
