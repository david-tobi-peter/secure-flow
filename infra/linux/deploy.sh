#!/usr/bin/env bash
set -euo pipefail

trap 'printf "\nERROR: failed at line %s\n" "$LINENO" >&2' ERR

[[ "$EUID" -eq 0 ]] || { printf 'must run as root: sudo bash deploy.sh\n' >&2; exit 1; }

APP_USER="${APP_USER:-secureflow}"
APP_DIR="${APP_DIR:-/opt/secureflow}"
UNIT_NAME="${UNIT_NAME:-secureflow-api}"
SOURCE="${SOURCE:-/tmp/secureflow-api}"
PORT="${PORT:-2230}"
ENV_FILE="${APP_DIR}/.env"

[[ -d "$SOURCE" && -f "$SOURCE/package.json" ]] || {
  printf 'no app source at %s (expected package.json there)\n' "$SOURCE" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { printf '%s missing — run provision.sh first\n' "$ENV_FILE" >&2; exit 1; }

as_app() {
  cd "$APP_DIR"
  sudo -u "$APP_USER" env HOME="$APP_DIR" bash -c "set -e; umask 0027; $*"
}

echo "==> Copy code to ${APP_DIR}"
rsync -a --delete \
  --exclude node_modules --exclude dist --exclude .env --exclude logs --exclude .git \
  "${SOURCE}/" "${APP_DIR}/"
chown -R "${APP_USER}:${APP_USER}" "$APP_DIR"

echo "==> Install dependencies"
as_app "npm ci"

echo "==> Bundle spec and build"
as_app "npm run bundle:spec && npm run build"

echo "==> Migrate"
as_app "set -a; . '${ENV_FILE}'; set +a; npm run migrate"

echo "==> Restart ${UNIT_NAME}"
systemctl restart "$UNIT_NAME"

echo "==> Verify"
code=""
for _ in 1 2 3 4 5; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/health" || true)"
  [[ "$code" == "200" ]] && break
  sleep 1
done
printf '    systemd  %s\n' "$(systemctl is-active "$UNIT_NAME" || true)"
printf '    /health  %s\n' "${code:-no response}"
systemctl show "$UNIT_NAME" -p MainPID -p MemoryMax -p CPUQuota -p LimitNOFILE
journalctl -u "$UNIT_NAME" -n 15 --no-pager
