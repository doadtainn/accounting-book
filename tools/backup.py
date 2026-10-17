"""備份記帳資料：用 SQLite 的線上備份（伺服器執行中也能安全備份），檔名含日期時間，只保留最新 N 份。

用法：
  python tools/backup.py                    # 備份到專案的 backups/，保留 30 份
  python tools/backup.py --dest D:\\備份 --keep 60
"""
import argparse
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def backup(db, dest, keep):
    if not db.exists():
        sys.exit(f"找不到資料庫：{db}")
    dest.mkdir(parents=True, exist_ok=True)
    target = dest / f"ledger-{datetime.now():%Y%m%d-%H%M%S}.db"
    tmp = target.with_suffix(".tmp")
    src = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)
    out = sqlite3.connect(tmp)
    with out:
        src.backup(out)  # 一致的快照，不會備份到寫到一半的資料
    out.close()
    src.close()
    tmp.replace(target)
    old = sorted(dest.glob("ledger-*.db"))[:-keep] if keep > 0 else []
    for f in old:
        f.unlink()
    return target, len(old)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="備份記帳本資料庫")
    ap.add_argument("--db", type=Path, default=ROOT / "data" / "ledger.db", help="資料庫位置")
    ap.add_argument("--dest", type=Path, default=ROOT / "backups", help="備份資料夾")
    ap.add_argument("--keep", type=int, default=30, help="保留最新幾份（0＝全部保留）")
    args = ap.parse_args()
    path, removed = backup(args.db, args.dest, args.keep)
    print(f"已備份：{path}（{path.stat().st_size / 1024:.0f} KB）" + (f"，刪除 {removed} 份舊備份" if removed else ""))
