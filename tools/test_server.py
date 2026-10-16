"""測試用伺服器：複製一份正式資料庫，在 127.0.0.1:5001 跑，不會動到正式資料。

用法：python tools/test_server.py
每次啟動都會重新複製 data/ledger.db，所以測試資料不會累積；停止後可直接刪除副本。
"""
import shutil
import sys
import tempfile
from http.server import ThreadingHTTPServer
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
TEST_DB = Path(tempfile.gettempdir()) / "accounting-book-test.db"
sys.path.insert(0, str(APP))
import server  # noqa: E402

shutil.copy(APP / "data" / "ledger.db", TEST_DB)
server.DB_PATH = TEST_DB
server.init_db()
print(f"test server on http://localhost:5001  (DB copy: {TEST_DB})", flush=True)
ThreadingHTTPServer(("127.0.0.1", 5001), server.Handler).serve_forever()
