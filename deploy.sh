#!/usr/bin/env bash
# 部署：把 git 中心（origin）最新的 main 更新到執行中的記帳本服務（systemd ledger.service）。
#   在伺服器上：~/accounting-book/deploy.sh
#   從開發機：  ssh <使用者>@<伺服器> '~/accounting-book/deploy.sh'
# 流程：備份資料 → git pull --ff-only（伺服器上的檔案被直接改過就會停下，不會蓋掉）→ 重開服務 → 檢查網頁有回應
set -euo pipefail
cd "$(dirname "$0")"

if [[ -f data/ledger.db ]]; then
  python3 tools/backup.py --dest backups/deploy --keep 10  # 部署前的備份另外放，不會擠掉每日備份
fi

before=$(git rev-parse HEAD)
git pull --ff-only origin main
after=$(git rev-parse HEAD)
if [[ "$before" == "$after" ]]; then
  echo "已經是最新版（${after:0:7}），照樣重開服務。"
else
  git log --oneline "$before..$after"
fi

sudo systemctl restart ledger
sleep 3
systemctl is-active ledger
port=$(systemctl show ledger -p Environment --value | tr ' ' '\n' | sed -n 's/^LEDGER_PORT=//p')
port=${port:-5000}
curl -s -o /dev/null -w "本機 http://127.0.0.1:$port/ → %{http_code}\n" "http://127.0.0.1:$port/"
