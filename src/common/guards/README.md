# Use base guard to create all kind of guard

**Here is an example of creating a guard with the base guad**

```ts
export const RoleGuard = createBaseGuard<Role>(ROLES_KEY);
```

## Submission rate limiting

`RateLimitGuard` limits how often a member can submit certain things, so nobody can flood the feed or race the Cap ladder. Put it **after** `JwtAuthGuard` (the limit is per member) and name the rule:

```ts
@Post()
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit("POST")
```

| Rule | Route | Default (placeholder) |
| --- | --- | --- |
| `POST` | `POST /posts` | 20 per hour |
| `COMMENT` | `POST /comments` | 60 per hour |
| `ENDORSEMENT` | `PATCH /volunteer/hours/:hourId/endorse` | 10 per day |
| `HOUR_LOG` | `PATCH /volunteer/log-hours/:applicationId` | 20 per day |

- Over the limit the API answers `429` with a `Retry-After` header and `retryAfterSeconds` in the body.
- Each rule is set by `RATE_LIMIT_<RULE>_MAX` and `RATE_LIMIT_<RULE>_WINDOW_SECONDS` (see `.env.example`). Invalid values stop the app at boot. `RATE_LIMIT_ENABLED=false` turns it off.
- Counters are fixed windows in Redis (`RedisService.checkRateLimit`), so a member can briefly burst up to twice the limit across a window boundary.
- If Redis is unavailable, submissions are allowed and a warning is logged. Set `RATE_LIMIT_FAIL_CLOSED=true` to reject them (503) instead.
- To protect another route, add a name to `RATE_LIMIT_NAMES` and its default in `src/common/utils/rate-limit.util.ts`.
