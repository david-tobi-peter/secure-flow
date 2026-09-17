# Phase 1 · The Boring API

## Delivered

- Built the workload: **20 operations over 5 tables**, spec-first from OpenAPI
  (`api/spec/src/*.yaml` → `spec/openapi.json`), with the contract driving validation of
  **both** requests and responses.
- Layered it: routes → controllers → services → repositories, wired with TypeDI.
- Schema in 4 migrations: `users`, `organizations`, `memberships`, `projects`, `tasks`.
- Auth: bcrypt (cost 10), JWT carrying only `sub` + `jti`, `jti` stored in Redis, logout
  revokes, 3-day TTL.
- Put the tenant and validity rules in the database, not just the service:
  `UNIQUE(email)`, `UNIQUE(user_id, organization_id)`, role `CHECK`, task status `CHECK`,
  `ON DELETE CASCADE` on all three FKs.
- Scoped every object query by its full parent path — a task resolves through both project *and*
  organization — so a bare object ID is never sufficient. Object-level authorization (OWASP
  BOLA) is enforced by the query itself rather than by a separate check that could be forgotten.
- Error contract `{ error: { code, message, requestId } }`, with SQLSTATE codes mapped to
  HTTP status (unique → 409, check → 400, and so on).
- Reject unknown request fields (`additionalProperties: false` on every request schema) as a
  guard against mass assignment.
- Config fails fast in production if `DATABASE_URL`, `REDIS_URL` or `JWT_SECRET` is unset.
- `/health` probes Postgres and Redis in parallel with a 2 s timeout and reports
  `degraded` → 503.
- Process policy: exit rather than self-heal. `uncaughtException` and `unhandledRejection` log
  and exit non-zero, and `SIGTERM`/`SIGINT` shut down cleanly — bringing the process back is
  the supervisor's job (systemd, Phase 2), not the app's.
- Shutdown cleanups, in order: `server.close()` and `closeIdleConnections()` to stop accepting
  and drain in-flight requests, then destroy the TypeORM data source, then `redis.quit()`, then
  exit 0. A 10 s deadline calls `closeAllConnections()` and exits 1, so a drain that hangs
  fails loudly instead of hanging.
- `requestId` middleware tags each request with a correlation id, echoed in the `x-request-id`
  response header and carried into the response and error envelopes, so one request can be
  traced across its log lines.
- Logging: one winston instance shared with the TypeORM logger, daily rotation at
  `maxSize: 10m` / `maxFiles: 14d`, rotated files zipped.

## Findings

- **Bounded logs are a security control, not housekeeping.** Unbounded logs exhaust inodes
  as well as space, and anyone with write access to any directory can do it — so a log
  flood is a resource-exhaustion DoS, the same family as a fork bomb. Hence a cap on both
  axes: age (`14d`) *and* size (`10m`).
- **No hard file-count cap is deliberate.** Age alone bounds retention; a count cap would
  silently shorten retention on a loud day, which is the more dangerous failure.
- A service-level check is a **race** (TOCTOU). The database constraint is the real guard;
  the service check only produces the nicer error.
- `DUMMY_HASH`: an unknown email still runs `bcrypt.compare` against a dummy hash, so login
  takes the same time whether or not the account exists — closing the timing side channel
  used for **user enumeration**.
