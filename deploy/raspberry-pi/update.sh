#!/usr/bin/env bash
# 更新記帳本：先備份資料 → 從 GitHub 拉新版 → 重開服務。
# 用法：在專案資料夾執行  bash deploy/raspberry-pi/update.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$APP_DIR"

if [[ -f data/ledger.db ]]; then
  python3 tools/backup.py --keep 30
fi
git pull --ff-only
sudo systemctl restart ledger.service
sleep 2
systemctl --no-pager --lines=5 status ledger.service
