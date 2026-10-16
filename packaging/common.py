"""安裝版共用設定：名稱、安裝位置、資料位置、捷徑。安裝程式、解除安裝程式、啟動程式都用這裡的值。"""
import base64
import os
import subprocess
from pathlib import Path

APP_NAME = "記帳本"
APP_VERSION = "1.0.1"
PUBLISHER = "記帳本"
EXE_NAME = "LedgerBook.exe"            # 主程式（檔名用英文，避免工作管理員、taskkill 編碼問題）
UNINSTALLER_NAME = "記帳本解除安裝.exe"
STARTUP_SHORTCUT = f"{APP_NAME}（背景啟動）.lnk"  # 和開發用的「記帳本.lnk」（start.bat）不同名，不會互相蓋掉
# 測試用：設定 LEDGER_INSTALL_TEST=資料夾 時，安裝位置、資料、捷徑、登錄機碼都改到測試用的地方，連接埠改 5002
TEST_ROOT = os.environ.get("LEDGER_INSTALL_TEST")
PORT = 5002 if TEST_ROOT else 5000
REG_KEY = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\LedgerBook" + ("_Test" if TEST_ROOT else "")

LOCAL = Path(TEST_ROOT) / "Local" if TEST_ROOT else Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
INSTALL_DIR = LOCAL / "Programs" / "LedgerBook"   # 程式（每個使用者自己的資料夾，不需要系統管理員權限）
DATA_DIR = LOCAL / APP_NAME                       # 記帳資料（和程式分開，重裝、解除安裝時可以保留）
CREATE_NO_WINDOW = 0x08000000


def powershell(script):
    """執行 PowerShell（用 EncodedCommand 傳，中文路徑不會亂碼），不跳出黑色視窗。"""
    encoded = base64.b64encode(script.encode("utf-16-le")).decode()
    return subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
        capture_output=True, text=True, creationflags=CREATE_NO_WINDOW,
    )


def ps_quote(s):
    return "'" + str(s).replace("'", "''") + "'"


# 捷徑位置：開始功能表資料夾、桌面、啟動（開機自動執行）
SHORTCUT_FOLDERS = f"""
$programs = Join-Path ([Environment]::GetFolderPath('Programs')) {ps_quote(APP_NAME)}
$desktop = [Environment]::GetFolderPath('Desktop')
$startup = [Environment]::GetFolderPath('Startup')
""" if not TEST_ROOT else f"""
$programs = {ps_quote(Path(TEST_ROOT) / 'Programs' / APP_NAME)}
$desktop = {ps_quote(Path(TEST_ROOT) / 'Desktop')}
$startup = {ps_quote(Path(TEST_ROOT) / 'Startup')}
New-Item -ItemType Directory -Force -Path $desktop, $startup | Out-Null
"""


def stop_running_app():
    """關掉執行中的記帳本（安裝新版、解除安裝前都要先關，不然檔案刪不掉）。"""
    subprocess.run(["taskkill", "/F", "/T", "/IM", EXE_NAME], capture_output=True, creationflags=CREATE_NO_WINDOW)
