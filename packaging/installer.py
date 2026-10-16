"""記帳本安裝程式：一鍵安裝到目前使用者（不需要系統管理員權限）。

做的事：關掉舊版 → 複製主程式與解除安裝程式 → 建立開始功能表／桌面／開機啟動捷徑
→ 登記到 Windows「應用程式」清單 → 開啟記帳本。記帳資料放在 %LOCALAPPDATA%\\記帳本，重裝不會清掉。
"""
import shutil
import subprocess
import sys
import time
import tkinter as tk
import winreg
from pathlib import Path
from tkinter import messagebox, ttk

from common import (APP_NAME, APP_VERSION, DATA_DIR, EXE_NAME, INSTALL_DIR, PORT, PUBLISHER, REG_KEY, SHORTCUT_FOLDERS,
                    STARTUP_SHORTCUT, UNINSTALLER_NAME, powershell, ps_quote, stop_running_app)

PAYLOAD = Path(getattr(sys, "_MEIPASS", Path(__file__).parent / "build" / "payload"))


def make_shortcuts(desktop, startup):
    exe = INSTALL_DIR / EXE_NAME
    uninstaller = INSTALL_DIR / UNINSTALLER_NAME
    script = SHORTCUT_FOLDERS + f"""
$shell = New-Object -ComObject WScript.Shell
function Make($path, $target, $arguments) {{
  $s = $shell.CreateShortcut($path)
  $s.TargetPath = $target
  $s.Arguments = $arguments
  $s.WorkingDirectory = {ps_quote(INSTALL_DIR)}
  $s.IconLocation = {ps_quote(exe)}
  $s.Save()
}}
New-Item -ItemType Directory -Force -Path $programs | Out-Null
Make (Join-Path $programs {ps_quote(APP_NAME + '.lnk')}) {ps_quote(exe)} ''
Make (Join-Path $programs {ps_quote('解除安裝' + APP_NAME + '.lnk')}) {ps_quote(uninstaller)} ''
$d = Join-Path $desktop {ps_quote(APP_NAME + '.lnk')}
$s = Join-Path $startup {ps_quote(STARTUP_SHORTCUT)}
if (${'true' if desktop else 'false'}) {{ Make $d {ps_quote(exe)} '' }} elseif (Test-Path $d) {{ Remove-Item $d }}
if (${'true' if startup else 'false'}) {{ Make $s {ps_quote(exe)} '--background' }} elseif (Test-Path $s) {{ Remove-Item $s }}
"""
    r = powershell(script)
    if r.returncode != 0:
        raise RuntimeError("建立捷徑失敗：" + (r.stderr or r.stdout).strip())


def register_uninstall():
    size_kb = sum(f.stat().st_size for f in INSTALL_DIR.glob("*") if f.is_file()) // 1024
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_KEY) as key:
        for name, value in {
            "DisplayName": APP_NAME, "DisplayVersion": APP_VERSION, "Publisher": PUBLISHER,
            "DisplayIcon": str(INSTALL_DIR / EXE_NAME), "InstallLocation": str(INSTALL_DIR),
            "UninstallString": f'"{INSTALL_DIR / UNINSTALLER_NAME}"',
        }.items():
            winreg.SetValueEx(key, name, 0, winreg.REG_SZ, value)
        for name, value in {"NoModify": 1, "NoRepair": 1, "EstimatedSize": size_kb}.items():
            winreg.SetValueEx(key, name, 0, winreg.REG_DWORD, value)


def install(desktop, startup):
    stop_running_app()
    time.sleep(1)  # 等舊版完全結束，檔案才能覆蓋
    INSTALL_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for name in (EXE_NAME, UNINSTALLER_NAME):
        shutil.copy2(PAYLOAD / name, INSTALL_DIR / name)
    make_shortcuts(desktop, startup)
    register_uninstall()


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(f"安裝{APP_NAME}")
        self.resizable(False, False)
        try:
            self.iconbitmap(PAYLOAD / "app.ico")
        except tk.TclError:
            pass
        pad = {"padx": 24}
        ttk.Label(self, text=f"{APP_NAME} {APP_VERSION}", font=("Microsoft JhengHei UI", 16, "bold")).pack(anchor="w", pady=(20, 4), **pad)
        ttk.Label(self, text="個人記帳：收支、帳戶、證券、貸款、保險。\n資料只存在這台電腦，用瀏覽器開啟使用。",
                  justify="left").pack(anchor="w", **pad)
        reinstall = (INSTALL_DIR / EXE_NAME).exists()
        if reinstall:
            ttk.Label(self, text="已經安裝過，按「安裝」會更新程式；記帳資料會保留。", foreground="#b35c00").pack(anchor="w", pady=(8, 0), **pad)
        self.desktop = tk.BooleanVar(value=True)
        self.startup = tk.BooleanVar(value=True)
        self.launch = tk.BooleanVar(value=True)
        box = ttk.Frame(self)
        box.pack(anchor="w", pady=12, **pad)
        ttk.Checkbutton(box, text="建立桌面捷徑", variable=self.desktop).pack(anchor="w")
        ttk.Checkbutton(box, text="開機時自動在背景啟動（手機等其他裝置隨時連得到）", variable=self.startup).pack(anchor="w")
        ttk.Checkbutton(box, text="安裝完成後開啟記帳本", variable=self.launch).pack(anchor="w")
        ttk.Label(self, text=f"程式：{INSTALL_DIR}\n資料：{DATA_DIR}", foreground="#666", justify="left").pack(anchor="w", **pad)
        self.status = ttk.Label(self, text="")
        self.status.pack(anchor="w", pady=(8, 0), **pad)
        buttons = ttk.Frame(self)
        buttons.pack(fill="x", pady=(12, 20), **pad)
        self.cancel_btn = ttk.Button(buttons, text="取消", command=self.destroy)
        self.cancel_btn.pack(side="right")
        self.install_btn = ttk.Button(buttons, text="安裝", command=self.run_install)
        self.install_btn.pack(side="right", padx=(0, 8))
        self.install_btn.focus_set()
        self.bind("<Return>", lambda e: self.run_install())

    def run_install(self):
        self.install_btn.state(["disabled"])
        self.cancel_btn.state(["disabled"])
        self.status.config(text="安裝中…")
        self.update()
        try:
            install(self.desktop.get(), self.startup.get())
        except Exception as err:
            messagebox.showerror(f"安裝{APP_NAME}", f"安裝失敗：{err}")
            self.install_btn.state(["!disabled"])
            self.cancel_btn.state(["!disabled"])
            self.status.config(text="")
            return
        if self.launch.get():
            subprocess.Popen([str(INSTALL_DIR / EXE_NAME)], cwd=INSTALL_DIR)
        messagebox.showinfo(f"安裝{APP_NAME}",
                            f"安裝完成！\n\n之後從開始功能表或桌面的「{APP_NAME}」開啟。\n"
                            f"網址：http://localhost:{PORT}（同一個區域網路的手機可用這台電腦的 IP:{PORT} 連線）\n\n"
                            f"要移除時，在開始功能表執行「解除安裝{APP_NAME}」，或到 Windows 設定 → 應用程式。")
        self.destroy()


if __name__ == "__main__":
    if "--silent" in sys.argv:  # 不顯示視窗，用預設選項安裝（桌面捷徑、開機啟動；加 --no-launch 不開啟）
        install(desktop=True, startup=True)
        if "--no-launch" not in sys.argv:
            subprocess.Popen([str(INSTALL_DIR / EXE_NAME)], cwd=INSTALL_DIR)
    else:
        App().mainloop()
