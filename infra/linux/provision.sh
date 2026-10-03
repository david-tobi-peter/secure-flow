#!/usr/bin/env bash

set -euo pipefail

trap 'printf "\nERROR: failed at line %s\n" "$LINENO" >&2' ERR

[[ "$EUID" -eq 0 ]] || { printf 'must run as root: sudo bash provision.sh\n' >&2; exit 1; }

# Override inline, e.g. sudo APP_DIR=/srv/app bash provision.sh
APP_USER="${APP_USER:-secureflow}"
APP_DIR="${APP_DIR:-/opt/secureflow}"
NODE_MAJOR="${NODE_MAJOR:-22}"
DB_NAME="${DB_NAME:-secureflow}"
DB_USER="${DB_USER:-secureflow}"
JOURNAL_MAX_USE="${JOURNAL_MAX_USE:-200M}"
JOURNAL_MAX_FILE="${JOURNAL_MAX_FILE:-50M}"
JOURNAL_RETENTION="${JOURNAL_RETENTION:-14day}"
UNIT_NAME="secureflow-api"
UNIT_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/${UNIT_NAME}.service"
SSHD_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/sshd-hardening.conf"
SSHD_DROPIN="/etc/ssh/sshd_config.d/10-secureflow.conf"
SSH_USER="${SSH_USER:-david}"
ENV_FILE="${APP_DIR}/.env"

DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD must be set}"
REDIS_PASSWORD="${REDIS_PASSWORD:?REDIS_PASSWORD must be set}"

echo "==> Base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl gnupg rsync

echo "==> Node ${NODE_MAJOR}.x"
if command -v node >/dev/null 2>&1 && [[ "$(node -v)" == "v${NODE_MAJOR}."* ]]; then
  echo "    already installed: $(node -v)"
else
  # Repo and signing key added explicitly — deliberately not `curl | bash`
  install -d -m 0755 /usr/share/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --batch --yes --dearmor -o /usr/share/keyrings/nodesource.gpg
  cat > /etc/apt/sources.list.d/nodesource.list <<EOF
deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main
EOF
  apt-get update -q
  apt-get install -y -q nodejs
  echo "    installed: $(node -v)"
fi

echo "==> PostgreSQL + Redis"
apt-get install -y -q postgresql redis-server
systemctl enable --now postgresql
systemctl enable --now redis-server
pg_isready -q || echo "    ! postgres is not accepting connections yet"

echo "==> Redis auth"
install -d -o root -g redis -m 0750 /etc/redis/redis.conf.d
(
  umask 077
  cat > /etc/redis/redis.conf.d/10-secureflow.conf <<EOF
requirepass ${REDIS_PASSWORD}
EOF
)
chown redis:redis /etc/redis/redis.conf.d/10-secureflow.conf
chmod 0640 /etc/redis/redis.conf.d/10-secureflow.conf
grep -q '^include /etc/redis/redis.conf.d/10-secureflow.conf' /etc/redis/redis.conf || \
  printf '\ninclude /etc/redis/redis.conf.d/10-secureflow.conf\n' >> /etc/redis/redis.conf
systemctl restart redis-server
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping | grep -q PONG || \
  echo "    ! authenticated PING failed"
redis-cli ping 2>&1 | grep -q NOAUTH || \
  echo "    ! redis answered without a password"

echo "==> Service user"
if id -u "$APP_USER" >/dev/null 2>&1; then
  echo "    user ${APP_USER} already exists"
else
  useradd --system --no-create-home --shell /usr/sbin/nologin "$APP_USER"
  echo "    created user ${APP_USER}"
fi

echo "==> Application directory"
install -d -o "$APP_USER" -g "$APP_USER" -m 0750 "$APP_DIR"
install -d -o "$APP_USER" -g "$APP_USER" -m 0750 "${APP_DIR}/logs"

echo "==> Database"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD must be set}"

if [[ "$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'")" == "1" ]]; then
  echo "    role ${DB_USER} already exists"
  sudo -u postgres psql -q -v ON_ERROR_STOP=1 >/dev/null <<SQL
ALTER ROLE "${DB_USER}" WITH LOGIN PASSWORD '${DB_PASSWORD}';
SQL
  echo "    password set for ${DB_USER}"
else
  sudo -u postgres psql -q -v ON_ERROR_STOP=1 >/dev/null <<SQL
CREATE ROLE "${DB_USER}" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${DB_PASSWORD}';
SQL
  echo "    created role ${DB_USER}"
fi

if [[ "$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")" == "1" ]]; then
  echo "    database ${DB_NAME} already exists"
else
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  echo "    created database ${DB_NAME}"
fi

echo "==> Secrets file"
if [[ -f "$ENV_FILE" ]]; then
  tmp="${ENV_FILE}.new"
  ( umask 077; grep -v '^REDIS_URL=' "$ENV_FILE" > "$tmp" || true )
  printf 'REDIS_URL=redis://:%s@127.0.0.1:6379\n' "$REDIS_PASSWORD" >> "$tmp"
  for secret in JWT_SECRET POW_SECRET TOTP_SECRET; do
    grep -q "^${secret}=" "$tmp" || printf '%s=%s\n' "$secret" "$(openssl rand -hex 32)" >> "$tmp"
  done
  chown "${APP_USER}:${APP_USER}" "$tmp"
  chmod 0600 "$tmp"
  mv "$tmp" "$ENV_FILE"
  echo "    ${ENV_FILE} exists — REDIS_URL and secrets reconciled"
else
  (
    umask 077
    cat > "$ENV_FILE" <<EOF
JWT_SECRET=$(openssl rand -hex 32)
POW_SECRET=$(openssl rand -hex 32)
TOTP_SECRET=$(openssl rand -hex 32)
DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}
REDIS_URL=redis://:${REDIS_PASSWORD}@127.0.0.1:6379
EOF
  )
  chown "${APP_USER}:${APP_USER}" "$ENV_FILE"
  chmod 0600 "$ENV_FILE"
  echo "    wrote ${ENV_FILE} (0600, ${APP_USER})"
fi

echo "==> Journald log bounds"
install -d -m 0755 /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/10-secureflow.conf <<EOF
[Journal]
Storage=persistent
SystemMaxUse=${JOURNAL_MAX_USE}
SystemMaxFileSize=${JOURNAL_MAX_FILE}
MaxRetentionSec=${JOURNAL_RETENTION}
EOF
install -d -m 0755 /var/log/journal
systemd-tmpfiles --create --prefix /var/log/journal
systemctl restart systemd-journald

echo "==> systemd unit"
[[ -f "$UNIT_SRC" ]] || { printf 'unit file not found: %s\n' "$UNIT_SRC" >&2; exit 1; }
install -m 0644 "$UNIT_SRC" "/etc/systemd/system/${UNIT_NAME}.service"
systemctl daemon-reload
systemctl enable "$UNIT_NAME"

echo "==> Firewall"
apt-get install -y -q ufw
# allow 22 first: default-deny inbound would otherwise cut the connection provisioning runs over
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw --force enable
ufw status verbose

echo "==> SSH ingress"
if [[ ! -s "/home/${SSH_USER}/.authorized_keys" ]]; then
  echo "    ! ${SSH_USER} has no authorized_keys — skipping, key-only would remove the way in"
elif [[ ! -f "$SSHD_SRC" ]]; then
  echo "    ! template not found: $SSHD_SRC"
else
  install -d -m 0755 /etc/ssh/sshd_config.d
  ( umask 022; sed "s|\${SSH_USER}|${SSH_USER}|g" "$SSHD_SRC" > "$SSHD_DROPIN" )
  chmod 0644 "$SSHD_DROPIN"
  if sshd -t 2>/dev/null; then
    systemctl reload ssh 2>/dev/null || \
      echo "    ssh.service is not running; the drop-in applies on the next connection"
    printf '    installed %s\n' "$SSHD_DROPIN"
    sshd -T | grep -E '^(passwordauthentication|permitrootlogin|allowusers|allowtcpforwarding)' | sed 's/^/    /'
  else
    rm -f "$SSHD_DROPIN"
    printf '    ! sshd config test failed, drop-in removed, ssh not reloaded\n' >&2
  fi
fi

echo "==> Summary"
printf '    user      %s\n' "$APP_USER"
printf '    app dir   %s\n' "$APP_DIR"
printf '    env file  %s (0600)\n' "$ENV_FILE"
printf '    database  %s at 127.0.0.1:5432 (password auth)\n' "$DB_NAME"
printf '    redis     127.0.0.1:6379 (password auth)\n'
printf '    unit      %s.service (enabled, not started)\n' "$UNIT_NAME"
printf '    logs      journald, persistent, max %s / %s\n' "$JOURNAL_MAX_USE" "$JOURNAL_RETENTION"

echo "==> Verification"
systemctl is-enabled "$UNIT_NAME" || true
systemctl is-active postgresql redis-server || true
journalctl --disk-usage || true
ss -tlnp 2>/dev/null | grep -E ':(5432|6379)\b' || \
  echo "    ! expected postgres and redis listening on 127.0.0.1"
