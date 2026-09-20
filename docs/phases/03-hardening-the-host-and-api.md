# Phase 3 · Hardening the Host and API

## Delivered

- Introduced TOTP as a second factor: the password check now returns a pending token, and only an
  authenticator code exchanges it for a session.
- Rate limiting on the auth endpoints, counted per source address and per account, so both a single
  origin and a single targeted login are bounded.
- Headless proof-of-work for flagged (suspected auth spraying) IPs, instead of a blanket ban: the
  client solves a challenge and presents it on the request it was already making, so a shared address
  is slowed rather than shut out.
- Bounded the listener's headers, requests and bodies, so a drip-fed socket or an oversized payload
  cannot hold a connection or the process open.
- Default file permissions set with `umask 0027`: files the service creates are group-readable and
  never world-readable.

## Findings

- **TOTP on its own without rate limiting is brute-forceable.** 
- **Time is not an administrative convenience for readability; it is a foundational security
  invariant.** A clock that drifts breaks TLS and TOTP, a step backwards resurrects expired tokens,
  and a step forwards expires bans early and deletes audit evidence.
- **An accountable audit trail: changes to objects must record which actor made them.**
- **`chmod` and `chown` have a large blast radius.** They name a bucket, not a principal, so
  admitting one extra reader widens the grant to every process already in that bucket. An ACL names
  the principal and the right.
