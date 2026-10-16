"""安裝版的主程式（LedgerBook.exe）：在背景啟動記帳本伺服器，並用瀏覽器打開。

- 沒有黑色視窗；訊息寫到 %LOCALAPPDATA%\\記帳本\\server.log
- 已經在執行時再點一次，只會打開瀏覽器
- 加 --background（開機自動啟動用）就不打開瀏覽器
"""
import ctypes
import sys
import threading
import urllib.request
import webbrowser
from pathlib import Path

from common import APP_NAME, DATA_DIR, PORT

URL = f"http://localhost:{PORT}"


def resource(name):
    """打包後的檔案在 PyInstaller 解開的暫存資料夾；開發時就在專案根目錄。"""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    return base / name


def message(text):
    ctypes.windll.user32.MessageBoxW(None, text, APP_NAME, 0x40)


def already_running():
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/settings", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def main():
    background = "--background" in sys.argv
    if already_running():
        if not background:
            webbrowser.open(URL)
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    # 沒有主控台：把訊息寫進記錄檔（每次啟動重寫，不會越來越大）
    log = open(DATA_DIR / "server.log", "w", encoding="utf-8", buffering=1)
    sys.stdout = sys.stderr = log

    sys.path.insert(0, str(resource(".")))
    import server

    server.DB_PATH = DATA_DIR / "ledger.db"
    server.STATIC = resource("static")

    try:
        httpd = server.start_server(PORT)
    except OSError:
        message(f"無法啟動{APP_NAME}：連接埠 {PORT} 已被其他程式使用。\n請關閉使用 {PORT} 的程式後再試一次。")
        return
    print(f"{APP_NAME}已啟動：{URL}（資料：{server.DB_PATH}）")
    if not background:
        threading.Timer(1.0, webbrowser.open, args=[URL]).start()
    httpd.serve_forever()


if __name__ == "__main__":
    main()
