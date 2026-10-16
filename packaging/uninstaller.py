"""記帳本解除安裝程式：一鍵移除程式、捷徑與「應用程式」清單的登記。

記帳資料（%LOCALAPPDATA%\\記帳本）預設保留，勾選後才一起刪除。
這個檔案可以從安裝資料夾執行，也可以單獨拿來執行（例如安裝包裡附的那一份）。
"""
import os
import shutil
import subprocess
import sys
import tempfile
import time
import tkinter as tk
import winreg
from pathlib import Path
from tkinter import messagebox, ttk

from common import (APP_NAME, CREATE_NO_WINDOW, DATA_DIR, INSTALL_DIR, REG_KEY, SHORTCUT_FOLDERS, STARTUP_SHORTCUT,
                    powershell, ps_quote, stop_running_app)


def remove_shortcuts():
    powershell(SHORTCUT_FOLDERS + f"""
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $programs
foreach ($p in @((Join-Path $desktop {ps_quote(APP_NAME + '.lnk')}), (Join-Path $startup {ps_quote(STARTUP_SHORTCUT)}))) {{
  if (Test-Path $p) {{ Remove-Item -Force $p }}
}}
""")


def remove_registry():
    try:
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, REG_KEY)
    except FileNotFoundError:
        pass


def remove_install_dir():
    me = Path(sys.executable).resolve()
    if INSTALL_DIR.resolve() in me.parents:
        # 正在執行的自己刪不掉：結束後等 3 秒再由 cmd 刪除整個資料夾
        subprocess.Popen(f'cmd /c ping -n 4 127.0.0.1 >nul & rmdir /s /q "{INSTALL_DIR}"',
                         creationflags=CREATE_NO_WINDOW, cwd=tempfile.gettempdir())
    else:
        shutil.rmtree(INSTALL_DIR, ignore_errors=True)


def uninstall(delete_data):
    stop_running_app()
    time.sleep(1)
    remove_shortcuts()
    remove_registry()
    remove_install_dir()
    if delete_data:
        shutil.rmtree(DATA_DIR, ignore_errors=True)


def installed():
    try:
        winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_KEY).Close()
        return True
    except FileNotFoundError:
        return INSTALL_DIR.exists()


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(f"解除安裝{APP_NAME}")
        self.resizable(False, False)
        pad = {"padx": 24}
        ttk.Label(self, text=f"解除安裝{APP_NAME}", font=("Microsoft JhengHei UI", 16, "bold")).pack(anchor="w", pady=(20, 4), **pad)
        ttk.Label(self, text="會關閉記帳本，並移除程式、開始功能表／桌面／開機啟動捷徑。", justify="left").pack(anchor="w", **pad)
        self.delete_data = tk.BooleanVar(value=False)
        has_data = (DATA_DIR / "ledger.db").exists()
        ttk.Checkbutton(self, text="同時刪除我的記帳資料（無法復原）", variable=self.delete_data,
                        state="normal" if has_data else "disabled").pack(anchor="w", pady=(12, 0), **pad)
        ttk.Label(self, text=f"資料位置：{DATA_DIR}\n不勾選的話資料會保留，之後重新安裝可以接著用。" if has_data else "這台電腦沒有記帳資料。",
                  foreground="#666", justify="left").pack(anchor="w", **pad)
        buttons = ttk.Frame(self)
        buttons.pack(fill="x", pady=(16, 20), **pad)
        ttk.Button(buttons, text="取消", command=self.destroy).pack(side="right")
        self.ok = ttk.Button(buttons, text="解除安裝", command=self.run)
        self.ok.pack(side="right", padx=(0, 8))

    def run(self):
        if self.delete_data.get() and not messagebox.askyesno(
                f"解除安裝{APP_NAME}", "確定要刪除所有記帳資料嗎？\n刪除後無法復原。", icon="warning"):
            return
        self.ok.state(["disabled"])
        self.update()
        try:
            uninstall(self.delete_data.get())
        except Exception as err:
            messagebox.showerror(f"解除安裝{APP_NAME}", f"解除安裝失敗：{err}")
            self.destroy()
            return
        messagebox.showinfo(f"解除安裝{APP_NAME}", "已解除安裝。" + ("" if self.delete_data.get() else f"\n記帳資料保留在：{DATA_DIR}"))
        self.destroy()


if __name__ == "__main__":
    if "--silent" in sys.argv:  # 不顯示視窗；加 --delete-data 連資料一起刪
        if installed():
            uninstall("--delete-data" in sys.argv)
    elif not installed():
        root = tk.Tk()
        root.withdraw()
        messagebox.showinfo(f"解除安裝{APP_NAME}", f"這台電腦沒有安裝{APP_NAME}。")
    else:
        App().mainloop()
