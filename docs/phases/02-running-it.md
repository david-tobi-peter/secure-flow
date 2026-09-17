# Phase 2 · Running It

## Delivered

- Created a VM: `cyber-playground`: Ubuntu 24.04.4, 2 vCPU / 4 GB, NAT `127.0.0.1:2222 → 22`,
  headless, snapshot `base-24.04-patched`.
- Wrote two idempotent scripts: `infra/linux/provision.sh` (machine) and
  `infra/linux/deploy.sh` (code).
- The provisioner pins Node 22 from NodeSource with an explicit keyring (no `curl | bash`),
  installs Postgres + Redis, creates a `secureflow` system user with `nologin` and no home,
  makes `/opt/secureflow` `0750`, writes `.env` at `0600`, caps journald, and installs and
  enables the unit.
- The unit runs as `secureflow` with `UMask=0027`, `EnvironmentFile=/opt/secureflow/.env`,
  `Restart=on-failure`, `TimeoutStopSec=20`, `TasksMax=256`, `MemoryMax=1G`,
  `CPUQuota=85%`, `LimitNOFILE=1024`, `LimitCORE=0`, and logs to journald.
- Redis requires a password (`requirepass`).
- Adopted the distribution defaults for the database binds instead of writing them: Postgres leaves
  `listen_addresses` commented out (so it listens on `localhost`) and Redis ships loopback-only.
- Reached from the host laptop over SSH only: NAT forwards host port `2222` to the VM's `22`, so
  `ssh -p 2222 user@127.0.0.1` is the only way in. The API binds loopback only (`127.0.0.1:2230`),
  so talking to it means forwarding a local port over that same connection —
  `ssh -N -f -L 2231:127.0.0.1:2230 -p 2222 user@127.0.0.1`.

## Findings

- **`Wants=` over `Requires=`** for Postgres and Redis: with `Requires=`, restarting the
  database would stop the API and not bring it back.
- `LimitCORE=0` protects this service only — `kernel.core_pattern` is untouched
  system-wide, and core dumps are a memory snapshot of a process holding secrets.
