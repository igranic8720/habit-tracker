#!/usr/bin/env bash
# Push the code from your computer to the container, then update it there. Run on your computer:
#   ./deploy/deploy-rsync.sh root@192.168.1.50
# Use this if the container has no git remote to pull from.
# Your computer's data/ folder is never copied, and the container's data (in /var/lib/habits) is never touched.
set -euo pipefail

TARGET="${1:?usage: $0 user@host   (for example root@192.168.1.50)}"
APP_DIR="${APP_DIR:-/opt/habits}"

cd "$(dirname "$0")/.."
rsync -az --delete \
  --exclude node_modules --exclude dist --exclude data --exclude .git \
  ./ "$TARGET:$APP_DIR/"
ssh "$TARGET" "$APP_DIR/deploy/update.sh --no-pull"
