#!/usr/bin/env bash
# Update the habit tracker inside the container. Run as root:   /opt/habits/deploy/update.sh
#   --no-pull   skip "git pull" (used by deploy-rsync.sh, which has already copied the new code in)
#
# Your data lives outside the code folder, so an update can't touch it; it is backed up first anyway.
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"   # the code
DATA_DIR="${DATA_DIR:-/var/lib/habits}"                   # your habit files
BACKUP_DIR="${BACKUP_DIR:-/var/backups/habits}"
SERVICE="${SERVICE:-habits}"
KEEP="${KEEP:-14}"                                        # how many backups to keep

# 1. back up the data first
mkdir -p "$BACKUP_DIR"
backup="$BACKUP_DIR/data-$(date +%F-%H%M%S).tar.gz"
tar -czf "$backup" -C "$DATA_DIR" .
echo "Backed up data to $backup"
ls -t "$BACKUP_DIR"/data-*.tar.gz | tail -n +"$((KEEP + 1))" | xargs -r rm --

# 2. get and build the new version while the old one keeps running
cd "$APP_DIR"
if [ "${1:-}" != "--no-pull" ]; then
  git pull --ff-only
fi
npm ci
npm run build

# 3. restart on the new build and check it came up
systemctl restart "$SERVICE"
sleep 2
if systemctl is-active --quiet "$SERVICE"; then
  echo "Updated and running."
else
  echo "Service failed to start. Recent log:" >&2
  journalctl -u "$SERVICE" -n 20 --no-pager >&2
  exit 1
fi
