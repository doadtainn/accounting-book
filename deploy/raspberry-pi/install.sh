#!/usr/bin/env bash
# 在樹莓派（Raspberry Pi OS）或其他 Debian／Ubuntu 上，把記帳本裝成系統服務：
#   - 開機自動啟動、當掉 5 秒後自動重啟（ledger.service）
#   - 每天 03:30 自動備份到 backups/，保留 30 份；錯過時間（關機）開機後補做（ledger-backup.timer）
# 用法：在專案資料夾執行  bash deploy/raspberry-pi/install.sh   （會用 sudo 寫入 systemd 設定）
# 改連接埠：LEDGER_PORT=5050 bash deploy/raspberry-pi/install.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_USER="${SUDO_USER:-$(id -un)}"
PY="$(command -v python3 || true)"
PORT="${LEDGER_PORT:-5000}"

if [[ -z "$PY" ]]; then
  echo "找不到 python3，請先執行：sudo apt install -y python3" >&2
  exit 1
fi
"$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else "需要 Python 3.11 以上，目前是 " + sys.version.split()[0])'

mkdir -p "$APP_DIR/data" "$APP_DIR/backups"

sudo tee /etc/systemd/system/ledger.service >/dev/null <<EOF
[Unit]
Description=Ledger (記帳本)
After=network-online.target
Wants=network-online.target

[Service]
User=$RUN_USER
WorkingDirectory=$APP_DIR
Environment=PYTHONUNBUFFERED=1
Environment=LEDGER_PORT=$PORT
ExecStart=$PY $APP_DIR/server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/ledger-backup.service >/dev/null <<EOF
[Unit]
Description=Ledger daily backup (記帳本備份)

[Service]
Type=oneshot
User=$RUN_USER
WorkingDirectory=$APP_DIR
ExecStart=$PY $APP_DIR/tools/backup.py --keep 30
EOF

sudo tee /etc/systemd/system/ledger-backup.timer >/dev/null <<EOF
[Unit]
Description=Run Ledger backup every day

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ledger.service ledger-backup.timer
sleep 2

echo
echo "記帳本已安裝為系統服務（使用者 $RUN_USER，資料在 $APP_DIR/data）"
systemctl --no-pager --lines=3 status ledger.service || true
echo
echo "網址："
echo "  本機      http://localhost:$PORT"
for ip in $(hostname -I 2>/dev/null); do
  case "$ip" in
    100.*) echo "  Tailscale http://$ip:$PORT" ;;
    *:*) ;;
    *) echo "  區域網路  http://$ip:$PORT" ;;
  esac
done
echo
echo "常用指令：看記錄 journalctl -u ledger -f ／ 重開 sudo systemctl restart ledger ／ 更新 bash deploy/raspberry-pi/update.sh"
