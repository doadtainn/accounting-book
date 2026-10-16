"""打包：產生 release\\記帳本安裝程式.exe 與 release\\記帳本解除安裝.exe（給其他人安裝測試用）。

用法（在專案資料夾）：python packaging\\build.py
- 第一次會在 packaging\\.venv 建立獨立的 Python 環境並安裝 PyInstaller、Pillow，不會動到系統的 Python
- 只打包程式與 static\\，**不會**包含 data\\（使用者自己的記帳資料）；安裝後是全新的空帳本
"""
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
VENV = HERE / ".venv"
BUILD = HERE / "build"
RELEASE = ROOT / "release"
PY = VENV / "Scripts" / "python.exe"

sys.path.insert(0, str(HERE))
from common import APP_NAME, APP_VERSION, EXE_NAME, UNINSTALLER_NAME  # noqa: E402


def run(*args):
    print(">", " ".join(map(str, args)), flush=True)
    subprocess.run([str(a) for a in args], check=True)


def ensure_venv():
    if not PY.exists():
        run(sys.executable, "-m", "venv", VENV)
    run(PY, "-m", "pip", "install", "--quiet", "--upgrade", "pyinstaller", "pillow")


def make_icon():
    ico = BUILD / "app.ico"
    run(PY, "-c", (
        "from PIL import Image; im = Image.open(r'%s').convert('RGBA'); "
        "im.save(r'%s', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])"
    ) % (ROOT / "static" / "icons" / "icon-512.png", ico))
    return ico


def clean_static():
    """複製 static\\，略過測試用的暫存頁（_開頭）。"""
    dst = BUILD / "static"
    shutil.rmtree(dst, ignore_errors=True)
    shutil.copytree(ROOT / "static", dst, ignore=shutil.ignore_patterns("_*", "*.map"))
    return dst


def pyinstaller(script, name, ico, extra=()):
    run(PY, "-m", "PyInstaller", "--noconfirm", "--clean", "--onefile", "--noconsole",
        "--name", name, "--icon", ico,
        "--distpath", BUILD / "dist", "--workpath", BUILD / "work", "--specpath", BUILD,
        "--paths", HERE, "--paths", ROOT, *extra, HERE / script)
    return BUILD / "dist" / f"{name}.exe"


def main():
    BUILD.mkdir(exist_ok=True)
    ensure_venv()
    ico = make_icon()
    static = clean_static()

    # 1. 主程式：伺服器＋網頁檔案
    app = pyinstaller("app_main.py", "LedgerBook", ico, ["--hidden-import", "server", "--add-data", f"{static};static"])
    # 2. 解除安裝程式（檔名先用英文打包，最後再改成中文）
    uninst = pyinstaller("uninstaller.py", "uninstall", ico)
    # 3. 安裝程式：把主程式、解除安裝程式包在裡面
    payload = BUILD / "payload"
    shutil.rmtree(payload, ignore_errors=True)
    payload.mkdir()
    shutil.copy2(app, payload / EXE_NAME)
    shutil.copy2(uninst, payload / UNINSTALLER_NAME)
    shutil.copy2(ico, payload / "app.ico")
    setup = pyinstaller("installer.py", "setup", ico, ["--add-data", f"{payload};."])

    RELEASE.mkdir(exist_ok=True)
    shutil.copy2(setup, RELEASE / f"{APP_NAME}安裝程式.exe")
    shutil.copy2(uninst, RELEASE / UNINSTALLER_NAME)
    shutil.copy2(HERE / "使用說明.txt", RELEASE / "使用說明.txt")
    print(f"\n完成（版本 {APP_VERSION}）：{RELEASE}")
    for f in sorted(RELEASE.iterdir()):
        print(f"  {f.name}  {f.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
