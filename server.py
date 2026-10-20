"""記帳本伺服器：資料存在本機 SQLite。

允許連線的來源：本機、區域網路（192.168.x.x 等私有 IP）、Tailscale（外地）。
其他來源（公網 IP）一律拒絕。
"""
import calendar
import ipaddress
import json
import os
import re
import socket
import sqlite3
import ssl
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

PORT = int(os.environ.get("LEDGER_PORT", "5000"))  # 同一台機器放多個專案時可用環境變數換連接埠
BASE = Path(__file__).parent
DB_PATH = BASE / "data" / "ledger.db"
STATIC = BASE / "static"

# Tailscale 網段（100.64.0.0/10 與其 IPv6 網段）
TAILSCALE_NETS = [
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("fd7a:115c:a1e0::/48"),
]

TYPES = ("expense", "income", "transfer")
CATEGORY_TYPES = ("expense", "income")  # 轉帳不用分類
ACCOUNT_KINDS = ("bank", "securities", "credit", "loan", "insurance")  # 一般帳戶、證券戶、信用卡、貸款、保險
BASE_CURRENCY = "TWD"  # 本位幣：統計一律換算成台幣
CURRENCY_CODE_RE = re.compile(r"^[A-Z0-9]{2,6}$")

# 股價來源：Yahoo Finance（非官方公開 API，免金鑰；若哪天失效需換來源）
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{}?range=1d&interval=1d"
# 台股中文名稱：Yahoo 只有英文，改用證交所（上市）與櫃買中心（上櫃）的每日收盤資料：(網址, 代號欄, 名稱欄)
TW_NAME_SOURCES = [
    ("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", "Code", "Name"),
    ("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes", "SecuritiesCompanyCode", "CompanyName"),
    ("https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics", "SecuritiesCompanyCode", "CompanyName"),  # 興櫃
]
TW_NAME_CACHE_SECONDS = 12 * 3600
_tw_names = {"time": 0, "names": {}}

# 第一次建立帳戶資料表時寫入的預設帳戶，之後請在網頁的「帳戶管理」管理
DEFAULT_ACCOUNTS = [("郵局", "bank")]
# 第一次啟用信用卡時寫入的預設信用卡
DEFAULT_CREDIT_CARDS = []
# 第一次啟用貸款時寫入的預設貸款
DEFAULT_LOANS = []
# 第一次啟用幣別時寫入的預設幣別：(代碼, 名稱, 符號, 1 單位等於多少台幣)，匯率請在「幣別設定」更新
DEFAULT_CURRENCIES = [
    ("TWD", "台幣", "NT$", 1),
    ("USD", "美金", "US$", 32),
    ("JPY", "日幣", "¥", 0.21),
    ("HKD", "港元", "HK$", 4.1),
]

# 第一次啟動時寫入的預設分類，之後請在網頁的「分類設定」管理
DEFAULT_CATEGORIES = {
    "expense": {
        "食品酒水": ["早午晚餐", "飲料咖啡", "水果零食", "菸酒茶", "生鮮食材"],
        "居家物業": ["日常用品", "房租", "水電瓦斯", "管理費", "維修保養"],
        "行車交通": ["大眾運輸", "計程車", "加油", "停車費", "汽機車保養"],
        "交流通訊": ["手機費", "網路費", "郵寄費"],
        "休閒娛樂": ["運動健身", "聚會", "休閒玩樂", "旅遊度假", "寵物"],
        "進修學習": ["書報雜誌", "課程進修", "數位設備"],
        "醫療保健": ["掛號看診", "藥品", "保健食品", "美容美髮"],
        "金融保險": ["保險費", "手續費", "貸款還款", "利息支出", "稅金"],
        "其他雜項": ["送禮請客", "捐款", "遺失", "其他支出"],
    },
    "income": {
        "職業收入": ["薪資", "獎金", "加班費", "兼職"],
        "其他收入": ["利息", "投資收益", "禮金", "中獎", "其他"],
    },
}

ENTRIES_SQL = """CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    category TEXT NOT NULL DEFAULT '',
    subcategory TEXT NOT NULL DEFAULT '',
    from_account TEXT NOT NULL DEFAULT '',
    to_account TEXT NOT NULL DEFAULT '',
    account_id INTEGER,
    from_account_id INTEGER,
    to_account_id INTEGER,
    amount REAL NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'TWD',
    to_currency TEXT,
    to_amount REAL,
    loan_kind TEXT NOT NULL DEFAULT '',
    loan_id INTEGER,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)"""

CATEGORIES_SQL = """CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES categories(id),
    sort INTEGER NOT NULL DEFAULT 0
)"""

# initial_balance 是舊版欄位，現在初始餘額改存在 account_currencies（每個幣別各一筆）
ACCOUNTS_SQL = """CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL CHECK (kind IN ('bank', 'securities', 'credit', 'loan', 'insurance')),
    initial_balance REAL NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    settlement_for INTEGER
)"""

CURRENCIES_SQL = """CREATE TABLE IF NOT EXISTS currencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL DEFAULT '',
    rate REAL NOT NULL CHECK (rate > 0),
    sort INTEGER NOT NULL DEFAULT 0
)"""

# 帳戶裡有哪些幣別，以及各幣別的初始餘額
ACCOUNT_CURRENCIES_SQL = """CREATE TABLE IF NOT EXISTS account_currencies (
    account_id INTEGER NOT NULL,
    currency TEXT NOT NULL,
    initial_balance REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (account_id, currency)
)"""

# 證券戶的持股：成本與價格手動輸入，市值與損益由前端計算
HOLDINGS_SQL = """CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    shares REAL NOT NULL DEFAULT 0,
    cost REAL NOT NULL DEFAULT 0,
    price REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'TWD',
    price_time TEXT NOT NULL DEFAULT '',
    sort INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)"""

# 股票交易：買進／賣出，錢從證券戶綁定的交割戶（bank_id，交易當時記下）進出，不算收入支出。
# amount = 交割金額（買進：股數×價格＋手續費；賣出：股數×價格－手續費－證交稅）
# cost_basis／realized 由 recalc_holding() 依日期重播計算（移動平均成本），不要手動改
TRADES_SQL = """CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    holding_id INTEGER NOT NULL,
    bank_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    shares REAL NOT NULL CHECK (shares > 0),
    price REAL NOT NULL CHECK (price >= 0),
    fee REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    cost_basis REAL NOT NULL DEFAULT 0,
    realized REAL NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)"""

# 手續費折讓：券商成交時先收足手續費，之後把折扣退回交割戶（bank_id）；不算收入，和股票交易一樣直接影響交割戶餘額
REBATES_SQL = """CREATE TABLE IF NOT EXISTS rebates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    bank_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)"""

# 貸款設定：每筆貸款一列（account_id 就是貸款帳戶的 id）
LOANS_SQL = """CREATE TABLE IF NOT EXISTS loans (
    account_id INTEGER PRIMARY KEY,
    principal REAL NOT NULL DEFAULT 0,
    annual_rate REAL NOT NULL DEFAULT 0,
    monthly_payment REAL NOT NULL DEFAULT 0,
    term_months INTEGER NOT NULL DEFAULT 0,
    start_date TEXT NOT NULL DEFAULT '',
    pay_account_id INTEGER,
    bank_balance REAL,
    bank_date TEXT NOT NULL DEFAULT ''
)"""

# 從貸款頁記的還款，利息那筆支出用這個分類
LOAN_INTEREST_CATEGORY = ("金融保險", "利息支出")

# 保單設定：每張保單一列（account_id 就是保險帳戶的 id）
# policy_type：protection 保障型（保費記為支出）／savings 儲蓄型（保費轉入保單，累積為資產）
POLICIES_SQL = """CREATE TABLE IF NOT EXISTS policies (
    account_id INTEGER PRIMARY KEY,
    insurer TEXT NOT NULL DEFAULT '',
    policy_type TEXT NOT NULL DEFAULT 'protection',
    premium REAL NOT NULL DEFAULT 0,
    frequency INTEGER NOT NULL DEFAULT 12,
    pay_years INTEGER NOT NULL DEFAULT 0,
    start_date TEXT NOT NULL DEFAULT '',
    sum_insured REAL NOT NULL DEFAULT 0,
    cash_value REAL,
    cash_value_date TEXT NOT NULL DEFAULT '',
    pay_account_id INTEGER,
    note TEXT NOT NULL DEFAULT ''
)"""
# 自動扣款：每月固定日期從信用卡（或銀行）扣的項目，例如手機費
# auto_post = 1 到期自動記帳；0 只提醒，由使用者確認金額後記帳
# last_posted 記到哪一天，自動記的帳被刪掉也不會再產生
AUTOPAYS_SQL = """CREATE TABLE IF NOT EXISTS autopays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
    amount REAL NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL DEFAULT '',
    subcategory TEXT NOT NULL DEFAULT '',
    auto_post INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    start_date TEXT NOT NULL,
    last_posted TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    sort INTEGER NOT NULL DEFAULT 0
)"""
AUTOPAY_KINDS = ("credit", "bank")
# 資產變化：每天設定的時間（settings.snapshot_time，預設 17:00）先更新股價，再記錄一次資產（台幣）。auto = 1 排程記的，0 手動記的（17:00 會覆蓋）
SNAPSHOTS_SQL = """CREATE TABLE IF NOT EXISTS asset_snapshots (
    date TEXT PRIMARY KEY,
    cash REAL NOT NULL,
    securities REAL NOT NULL,
    insurance REAL NOT NULL DEFAULT 0,
    debt REAL NOT NULL,
    net REAL NOT NULL,
    auto INTEGER NOT NULL DEFAULT 1,
    taken_at TEXT NOT NULL
)"""
# 系統設定（所有裝置共用）：每日更新時間、是否啟用、時區（與 UTC 相差幾分鐘；這台電腦沒有 IANA 時區資料，用固定時差）
SETTINGS_SQL = """CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
)"""
DEFAULT_SETTINGS = {"snapshot_time": "17:00", "snapshot_enabled": "1", "tz_offset": "480"}
# 固定開銷：手動加的固定支出（房租、訂閱…），只用來統計，不會自動記帳
# frequency 幾個月一次（1 月、3 季、6 半年、12 年）；account_id 可不填
FIXED_COSTS_SQL = """CREATE TABLE IF NOT EXISTS fixed_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'TWD',
    frequency INTEGER NOT NULL DEFAULT 1 CHECK (frequency IN (1, 3, 6, 12)),
    category TEXT NOT NULL DEFAULT '',
    subcategory TEXT NOT NULL DEFAULT '',
    account_id INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    note TEXT NOT NULL DEFAULT '',
    sort INTEGER NOT NULL DEFAULT 0
)"""
_autopay_lock = threading.Lock()  # 同時多個請求時避免重複自動記帳

# 保障型保單的保費支出分類
PREMIUM_CATEGORY = ("金融保險", "保險費")


def own_ips():
    try:
        return set(socket.gethostbyname_ex(socket.gethostname())[2])
    except OSError:
        return set()


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    with db() as conn:
        # ----- 交易 -----
        old = conn.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'entries'").fetchone()
        if old and "transfer" not in old["sql"]:
            # 舊版資料表不支援轉帳與子分類：重建並搬移資料
            conn.execute("ALTER TABLE entries RENAME TO entries_old")
            conn.execute(ENTRIES_SQL)
            conn.execute(
                "INSERT INTO entries (id, date, type, category, amount, note, created_at) "
                "SELECT id, date, type, category, amount, note, created_at FROM entries_old"
            )
            conn.execute("DROP TABLE entries_old")
        conn.execute(ENTRIES_SQL)
        columns = {r["name"] for r in conn.execute("PRAGMA table_info(entries)")}
        for col, ddl in (
            ("account_id", "INTEGER"),
            ("from_account_id", "INTEGER"),
            ("to_account_id", "INTEGER"),
            ("currency", "TEXT NOT NULL DEFAULT 'TWD'"),
            ("to_currency", "TEXT"),
            ("to_amount", "REAL"),
            # 貸款相關：loan_kind = extra（額外還款）／interest（還款的利息支出）；loan_id 指向貸款帳戶
            ("loan_kind", "TEXT NOT NULL DEFAULT ''"),
            ("loan_id", "INTEGER"),
            ("autopay_id", "INTEGER"),  # 由哪一筆自動扣款產生
        ):
            if col not in columns:
                conn.execute(f"ALTER TABLE entries ADD COLUMN {col} {ddl}")
        # 轉帳一律記錄轉入幣別與金額（舊資料視為同幣別）
        conn.execute(
            "UPDATE entries SET to_currency = currency, to_amount = amount "
            "WHERE type = 'transfer' AND to_currency IS NULL"
        )

        # ----- 分類 -----
        # 預設資料只在資料表第一次建立時寫入，之後就算全部刪光也不會再冒出來
        new_categories = not table_exists(conn, "categories")
        conn.execute(CATEGORIES_SQL)
        if new_categories:
            sort = 0
            for type_, mains in DEFAULT_CATEGORIES.items():
                for main, subs in mains.items():
                    sort += 1
                    parent = conn.execute(
                        "INSERT INTO categories (type, name, sort) VALUES (?, ?, ?)", (type_, main, sort)
                    ).lastrowid
                    for sub in subs:
                        sort += 1
                        conn.execute(
                            "INSERT INTO categories (type, name, parent_id, sort) VALUES (?, ?, ?, ?)",
                            (type_, sub, parent, sort),
                        )

        # ----- 帳戶 -----
        old = conn.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'accounts'").fetchone()
        new_accounts = old is None
        add_credit = new_accounts or "credit" not in old["sql"]
        add_loan = new_accounts or "loan" not in old["sql"]
        add_insurance = new_accounts or "insurance" not in old["sql"]
        if not new_accounts and (add_credit or add_loan or add_insurance):
            # 舊版帳戶資料表不支援信用卡／貸款：重建並搬移資料（id 不變，交易不受影響）
            conn.execute("ALTER TABLE accounts RENAME TO accounts_old")
            conn.execute(ACCOUNTS_SQL)
            old_cols = {r["name"] for r in conn.execute("PRAGMA table_info(accounts_old)")}
            new_cols = [r["name"] for r in conn.execute("PRAGMA table_info(accounts)")]
            cols = ", ".join(c for c in new_cols if c in old_cols)
            conn.execute(f"INSERT INTO accounts ({cols}) SELECT {cols} FROM accounts_old")
            conn.execute("DROP TABLE accounts_old")
        conn.execute(ACCOUNTS_SQL)
        if "settlement_for" not in {r["name"] for r in conn.execute("PRAGMA table_info(accounts)")}:
            conn.execute("ALTER TABLE accounts ADD COLUMN settlement_for INTEGER")
        if new_accounts:
            for sort, (name, kind) in enumerate(DEFAULT_ACCOUNTS, 1):
                conn.execute("INSERT INTO accounts (name, kind, sort) VALUES (?, ?, ?)", (name, kind, sort))
        defaults = (DEFAULT_CREDIT_CARDS, "credit", add_credit), (DEFAULT_LOANS, "loan", add_loan)
        for names, kind, needed in defaults:
            if not needed:
                continue
            for name in names:
                if not conn.execute("SELECT 1 FROM accounts WHERE name = ?", (name,)).fetchone():
                    sort = conn.execute("SELECT COALESCE(MAX(sort), 0) + 1 FROM accounts").fetchone()[0]
                    conn.execute("INSERT INTO accounts (name, kind, sort) VALUES (?, ?, ?)", (name, kind, sort))

        # ----- 幣別 -----
        new_currencies = not table_exists(conn, "currencies")
        conn.execute(CURRENCIES_SQL)
        if new_currencies:
            for sort, (code, name, symbol, rate) in enumerate(DEFAULT_CURRENCIES, 1):
                conn.execute(
                    "INSERT INTO currencies (code, name, symbol, rate, sort) VALUES (?, ?, ?, ?, ?)",
                    (code, name, symbol, rate, sort),
                )
        conn.execute(HOLDINGS_SQL)
        conn.execute(LOANS_SQL)
        conn.execute(POLICIES_SQL)
        conn.execute(AUTOPAYS_SQL)
        conn.execute(FIXED_COSTS_SQL)
        conn.execute(SNAPSHOTS_SQL)
        conn.execute(TRADES_SQL)
        conn.execute(REBATES_SQL)
        account_cols = {r["name"] for r in conn.execute("PRAGMA table_info(accounts)")}
        if "fee_rate" not in account_cols:  # 證券戶的手續費率（%）、最低手續費、賣出稅費率（%）；NULL＝依幣別預設
            for col in ("fee_rate", "fee_min", "tax_rate"):
                conn.execute(f"ALTER TABLE accounts ADD COLUMN {col} REAL")
        holding_cols = {r["name"] for r in conn.execute("PRAGMA table_info(holdings)")}
        if "base_shares" not in holding_cols:  # 期初持股（交易紀錄之前的部位），現有持股全部當期初
            conn.execute("ALTER TABLE holdings ADD COLUMN base_shares REAL NOT NULL DEFAULT 0")
            conn.execute("ALTER TABLE holdings ADD COLUMN base_cost REAL NOT NULL DEFAULT 0")
            conn.execute("UPDATE holdings SET base_shares = shares, base_cost = cost")
        currency_columns = {r["name"] for r in conn.execute("PRAGMA table_info(currencies)")}
        if "rate_time" not in currency_columns:  # 匯率從 Yahoo 更新的時間；空白代表手動輸入
            conn.execute("ALTER TABLE currencies ADD COLUMN rate_time TEXT NOT NULL DEFAULT ''")
        conn.execute(SETTINGS_SQL)
        for key, value in DEFAULT_SETTINGS.items():  # 只補沒有的，不覆蓋使用者改過的
            conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value))
        loan_columns = {r["name"] for r in conn.execute("PRAGMA table_info(loans)")}
        if "bank_balance" not in loan_columns:  # 與銀行核對的剩餘本金與日期
            conn.execute("ALTER TABLE loans ADD COLUMN bank_balance REAL")
            conn.execute("ALTER TABLE loans ADD COLUMN bank_date TEXT NOT NULL DEFAULT ''")
        holding_columns = {r["name"] for r in conn.execute("PRAGMA table_info(holdings)")}
        if "price_time" not in holding_columns:
            conn.execute("ALTER TABLE holdings ADD COLUMN price_time TEXT NOT NULL DEFAULT ''")
        if "delisted" not in holding_columns:  # 已下市：更新股價時略過
            conn.execute("ALTER TABLE holdings ADD COLUMN delisted INTEGER NOT NULL DEFAULT 0")
        new_account_currencies = not table_exists(conn, "account_currencies")
        conn.execute(ACCOUNT_CURRENCIES_SQL)
        if new_account_currencies:
            # 既有帳戶：原本的初始餘額變成台幣的初始餘額
            conn.execute(
                "INSERT INTO account_currencies (account_id, currency, initial_balance) "
                "SELECT id, 'TWD', initial_balance FROM accounts"
            )
        # 還沒有任何幣別的帳戶（例如剛建立的預設帳戶）一律先給台幣
        conn.execute(
            "INSERT INTO account_currencies (account_id, currency) "
            "SELECT id, 'TWD' FROM accounts WHERE id NOT IN (SELECT account_id FROM account_currencies)"
        )

        # 舊版轉帳的帳戶是文字：對應到帳戶（沒有就建立）
        legacy = conn.execute(
            "SELECT id, from_account, to_account FROM entries WHERE type = 'transfer' AND from_account_id IS NULL"
        ).fetchall()
        for row in legacy:
            conn.execute(
                "UPDATE entries SET from_account_id = ?, to_account_id = ? WHERE id = ?",
                (account_by_name(conn, row["from_account"]), account_by_name(conn, row["to_account"]), row["id"]),
            )


def table_exists(conn, name):
    return conn.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (name,)).fetchone() is not None


def account_by_name(conn, name):
    name = name.strip() or "未命名帳戶"
    row = conn.execute("SELECT id FROM accounts WHERE name = ?", (name,)).fetchone()
    if row:
        return row["id"]
    id_ = conn.execute("INSERT INTO accounts (name, kind) VALUES (?, 'bank')", (name,)).lastrowid
    if table_exists(conn, "account_currencies"):
        conn.execute("INSERT OR IGNORE INTO account_currencies (account_id, currency) VALUES (?, 'TWD')", (id_,))
    return id_


def account_balance(conn, id_, code):
    """帳戶某幣別的目前餘額（和前端 balance() 同一套算法）。"""
    row = conn.execute(
        "SELECT initial_balance FROM account_currencies WHERE account_id = ? AND currency = ?", (id_, code)
    ).fetchone()
    total = row[0] if row else 0
    total += conn.execute(
        "SELECT COALESCE(SUM(CASE type WHEN 'income' THEN amount ELSE -amount END), 0) FROM entries "
        "WHERE type IN ('income', 'expense') AND account_id = ? AND currency = ?", (id_, code)
    ).fetchone()[0]
    total -= conn.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM entries WHERE type = 'transfer' AND from_account_id = ? AND currency = ?",
        (id_, code),
    ).fetchone()[0]
    total += conn.execute(
        "SELECT COALESCE(SUM(to_amount), 0) FROM entries WHERE type = 'transfer' AND to_account_id = ? AND to_currency = ?",
        (id_, code),
    ).fetchone()[0]
    # 股票交割：買進扣款、賣出入帳；手續費折讓入帳
    total += conn.execute(
        "SELECT COALESCE(SUM(CASE side WHEN 'sell' THEN amount ELSE -amount END), 0) FROM trades "
        "WHERE bank_id = ? AND currency = ?", (id_, code),
    ).fetchone()[0]
    total += conn.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM rebates WHERE bank_id = ? AND currency = ?", (id_, code),
    ).fetchone()[0]
    return total


def annuity_payment(principal, annual_rate, months):
    """本息平均攤還的每月還款金額。"""
    if months <= 0:
        return 0
    r = annual_rate / 100 / 12
    if r == 0:
        return principal / months
    return principal * r / (1 - (1 + r) ** -months)


def yahoo_symbols(symbol, currency):
    """把使用者填的代號轉成 Yahoo 的代號（依幣別判斷市場），回傳要依序嘗試的清單。"""
    s = symbol.strip().upper()
    if "." in s:
        return [s]  # 已經是 Yahoo 格式，例如 0700.HK
    if currency == "TWD" and re.fullmatch(r"\d{4,6}[A-Z]?", s):
        return [f"{s}.TW", f"{s}.TWO"]  # 先試上市，再試上櫃
    if currency == "HKD" and s.isdigit():
        return [f"{s.zfill(4)}.HK"]
    if currency == "JPY" and s.isdigit():
        return [f"{s}.T"]
    return [s]  # 美股等直接用代號


def fetch_quote(symbol, currency):
    """向 Yahoo Finance 查最新價格（收盤後即收盤價）與名稱，查不到回傳 None。"""
    for yahoo in yahoo_symbols(symbol, currency):
        url = YAHOO_CHART_URL.format(urllib.parse.quote(yahoo))
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(request, timeout=10) as res:
                meta = json.load(res)["chart"]["result"][0]["meta"]
        except (OSError, ValueError, KeyError, IndexError, TypeError):
            continue
        price = meta.get("regularMarketPrice")
        if price is None:
            continue
        ts = meta.get("regularMarketTime")
        return {
            "price": float(price),
            "name": meta.get("longName") or meta.get("shortName") or "",
            "time": datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M") if ts else "",
        }
    return None


def replay_holding(conn, holding_id, base_shares, base_cost, write=False):
    """從期初持股依日期重播買賣，算出目前股數、成本，以及每筆賣出的成本與已實現損益（移動平均成本）。"""
    shares, cost = base_shares, base_cost
    for t in conn.execute("SELECT * FROM trades WHERE holding_id = ? ORDER BY date, id", (holding_id,)).fetchall():
        if t["side"] == "buy":
            shares += t["shares"]
            cost += t["amount"]
            continue
        if t["shares"] > shares + 1e-9:
            raise ValueError(f"{t['date']} 賣出 {t['shares']:g} 股，超過當時持有的 {shares:g} 股")
        basis = cost * t["shares"] / shares if shares else 0
        shares -= t["shares"]
        cost -= basis
        if write:
            conn.execute("UPDATE trades SET cost_basis = ?, realized = ? WHERE id = ?",
                         (round(basis, 4), round(t["amount"] - basis, 4), t["id"]))
    if abs(shares) < 1e-9:
        shares, cost = 0, 0
    return shares, cost


def recalc_holding(conn, holding_id):
    """交易有變動後重算持股的股數、成本與每筆賣出的損益。"""
    h = conn.execute("SELECT * FROM holdings WHERE id = ?", (holding_id,)).fetchone()
    shares, cost = replay_holding(conn, holding_id, h["base_shares"], h["base_cost"], write=True)
    conn.execute("UPDATE holdings SET shares = ?, cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                 (round(shares, 6), round(cost, 4), holding_id))


def fetch_rate(code):
    """向 Yahoo Finance 查「1 單位外幣 = 幾台幣」（代號例如 USDTWD=X），查不到回傳 None。"""
    quote = fetch_quote(f"{code}{BASE_CURRENCY}=X", "")
    return quote if quote and quote["price"] > 0 else None


def refresh_rates():
    """更新所有外幣匯率（台幣固定 1），回傳 (成功數, 查不到的代碼)。"""
    with db() as conn:
        codes = [r["code"] for r in conn.execute("SELECT code FROM currencies WHERE code <> ?", (BASE_CURRENCY,))]
    with ThreadPoolExecutor(max_workers=6) as pool:
        quotes = list(pool.map(fetch_rate, codes))
    failed = []
    with db() as conn:
        for code, quote in zip(codes, quotes):
            if not quote:
                failed.append(code)
                continue
            conn.execute("UPDATE currencies SET rate = ?, rate_time = ? WHERE code = ?",
                         (round(quote["price"], 6), quote["time"] or local_now().strftime("%Y-%m-%d %H:%M"), code))
    return len(codes) - len(failed), failed


def autopay_due_dates(ap, until):
    """從 start_date 起到 until（含），每月 day 號（小月取月底）、且晚於 last_posted 的扣款日。"""
    start = date.fromisoformat(ap["start_date"])
    after = date.fromisoformat(ap["last_posted"]) if ap["last_posted"] else None
    y, m, out = start.year, start.month, []
    while True:
        d = date(y, m, min(ap["day"], calendar.monthrange(y, m)[1]))
        if d > until:
            return out
        if d >= start and (after is None or d > after):
            out.append(d)
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def account_currency(conn, account_id):
    return conn.execute(
        "SELECT currency FROM account_currencies WHERE account_id = ? ORDER BY rowid LIMIT 1", (account_id,)
    ).fetchone()["currency"]


def insert_autopay_entry(conn, ap, when, amount):
    conn.execute(
        "INSERT INTO entries (date, type, category, subcategory, account_id, amount, currency, autopay_id, note) "
        "VALUES (?, 'expense', ?, ?, ?, ?, ?, ?, ?)",
        (when, ap["category"] or "其他雜項", ap["subcategory"], ap["account_id"], amount,
         account_currency(conn, ap["account_id"]), ap["id"], f"自動扣款：{ap['name']}"),
    )
    if not ap["last_posted"] or when > ap["last_posted"]:
        conn.execute("UPDATE autopays SET last_posted = ? WHERE id = ?", (when, ap["id"]))


def process_autopays():
    """把「自動入帳」模式中已到期、還沒記的扣款記成支出。"""
    with _autopay_lock, db() as conn:
        for ap in conn.execute("SELECT * FROM autopays WHERE active = 1 AND auto_post = 1").fetchall():
            for d in autopay_due_dates(ap, local_today()):
                insert_autopay_entry(conn, dict(ap, last_posted=""), d.isoformat(), ap["amount"])


def tw_stock_names():
    """台股代號 → 中文名稱（上市＋上櫃），快取 12 小時；抓不到就回傳上次的結果。"""
    if _tw_names["names"] and time.time() - _tw_names["time"] < TW_NAME_CACHE_SECONDS:
        return _tw_names["names"]
    # 新版 Python 預設嚴格檢查憑證格式，證交所憑證缺少 Subject Key Identifier 會被拒；只關掉嚴格模式，憑證仍照常驗證
    ctx = ssl.create_default_context()
    ctx.verify_flags &= ~ssl.VERIFY_X509_STRICT
    names = {}
    for url, code_key, name_key in TW_NAME_SOURCES:
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(request, timeout=30, context=ctx) as res:
                for row in json.load(res):
                    code, name = str(row.get(code_key, "")).strip(), str(row.get(name_key, "")).strip()
                    if code and name:
                        names.setdefault(code, name)
        except (OSError, ValueError):
            continue
    if names:
        _tw_names.update(time=time.time(), names=names)
    return _tw_names["names"]


def has_chinese(s):
    return bool(re.search(r"[一-鿿]", s or ""))


def holding_name(current, symbol, currency, quote_name=""):
    """台股：名稱不是中文就換成中文名稱（使用者自己填的中文不動）；其他：空白才用 Yahoo 名稱。"""
    if currency == BASE_CURRENCY and not has_chinese(current):
        chinese = tw_stock_names().get(symbol.strip().upper())
        if chinese:
            return chinese
    return current or quote_name


def refresh_prices(account_id=None):
    """更新股價（已下市的略過），回傳 (成功檔數, 查不到的代號)。順便補名稱：台股換成中文，其他空白才填。"""
    with db() as conn:
        if account_id:
            rows = conn.execute("SELECT * FROM holdings WHERE account_id = ? AND delisted = 0", (int(account_id),)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM holdings WHERE delisted = 0").fetchall()
    with ThreadPoolExecutor(max_workers=6) as pool:
        quotes = list(pool.map(lambda r: fetch_quote(r["symbol"], r["currency"]), rows))
    if any(r["currency"] == BASE_CURRENCY for r in rows):
        tw_stock_names()  # 先在交易外下載中文股名（有快取），避免寫入資料庫時卡住
    failed = []
    with db() as conn:
        for row, quote in zip(rows, quotes):
            name = holding_name(row["name"], row["symbol"], row["currency"], quote["name"] if quote else "")
            if not quote:
                failed.append(row["symbol"])
                conn.execute("UPDATE holdings SET name = ? WHERE id = ?", (name, row["id"]))
                continue
            conn.execute(
                "UPDATE holdings SET price = ?, price_time = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (quote["price"], quote["time"], name, row["id"]),
            )
    return len(rows) - len(failed), failed


def asset_totals(conn):
    """目前的資產與負債（台幣），和前端 assetTotals() 同一套算法：
    現金 = 一般帳戶各幣別正餘額；證券 = 證券戶現金＋持股市值；保險 = 儲蓄型保單價值；
    債務 = 信用卡、貸款欠款＋一般帳戶／證券戶的負餘額。"""
    rates = {r["code"]: r["rate"] for r in conn.execute("SELECT code, rate FROM currencies")}
    rate = lambda code: rates.get(code, 1)
    codes_of = {}
    for r in conn.execute(
        "SELECT ac.account_id, ac.currency FROM account_currencies ac LEFT JOIN currencies c ON c.code = ac.currency "
        "ORDER BY c.sort, c.id"
    ):
        codes_of.setdefault(r["account_id"], []).append(r["currency"])
    policies = {r["account_id"]: r for r in conn.execute("SELECT account_id, policy_type, cash_value FROM policies")}
    cash = securities = insurance = debt = 0.0
    for a in conn.execute("SELECT id, kind FROM accounts"):
        codes = codes_of.get(a["id"], [])
        if a["kind"] == "insurance":
            p = policies.get(a["id"])
            if p and p["policy_type"] == "savings":  # 保障型不算資產
                if p["cash_value"] is not None:
                    insurance += max(0, p["cash_value"] * rate(codes[0] if codes else BASE_CURRENCY))
                else:
                    insurance += max(0, sum(account_balance(conn, a["id"], c) * rate(c) for c in codes))
            continue
        for code in codes:
            v = account_balance(conn, a["id"], code) * rate(code)
            if a["kind"] in ("credit", "loan"):
                debt -= v  # 欠款是負餘額；溢繳的正數會抵減
            elif v < 0:
                debt -= v
            elif a["kind"] == "securities":
                securities += v
            else:
                cash += v
    for h in conn.execute("SELECT shares, price, currency FROM holdings"):
        securities += h["shares"] * h["price"] * rate(h["currency"])
    r2 = lambda n: round(n, 2)
    return {"cash": r2(cash), "securities": r2(securities), "insurance": r2(insurance), "debt": r2(debt),
            "net": r2(cash + securities + insurance - debt)}


def get_settings(conn=None):
    if conn is None:
        with db() as c:
            return get_settings(c)
    return {**DEFAULT_SETTINGS, **{r["key"]: r["value"] for r in conn.execute("SELECT key, value FROM settings")}}


def local_now():
    """依設定的時區（固定時差）取得現在時間。"""
    return datetime.now(timezone(timedelta(minutes=int(get_settings()["tz_offset"]))))


def local_today():
    return local_now().date()


_snapshot_lock = threading.Lock()


def take_snapshot(auto, refresh=True):
    """記錄今天的資產（同一天只留一筆，新的覆蓋舊的）。refresh：先更新股價。"""
    with _snapshot_lock:
        failed = []
        if refresh:
            try:
                refresh_rates()
            except Exception as err:  # 查不到匯率就用目前的匯率，不影響記錄
                print("更新匯率失敗：", err)
            try:
                failed = refresh_prices()[1]
            except Exception as err:  # 查不到股價就用目前的價格，不影響記錄
                print("更新股價失敗：", err)
        now = local_now()
        with db() as conn:
            t = asset_totals(conn)
            conn.execute(
                "INSERT OR REPLACE INTO asset_snapshots (date, cash, securities, insurance, debt, net, auto, taken_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (now.date().isoformat(), t["cash"], t["securities"], t["insurance"], t["debt"], t["net"],
                 1 if auto else 0, now.strftime("%Y-%m-%d %H:%M")),
            )
        return {**t, "failed": failed}


def snapshot_scheduler():
    """背景排程：每分鐘檢查一次，過了設定的時間（預設 17:00）而今天還沒有排程紀錄就記一筆（開機晚了也會補記當天）。"""
    while True:
        try:
            settings = get_settings()
            now = local_now()
            hour, minute = map(int, settings["snapshot_time"].split(":"))
            if settings["snapshot_enabled"] == "1" and (now.hour, now.minute) >= (hour, minute):
                with db() as conn:
                    done = conn.execute(
                        "SELECT 1 FROM asset_snapshots WHERE date = ? AND auto = 1", (now.date().isoformat(),)
                    ).fetchone()
                if not done:
                    take_snapshot(auto=True)
                    print(f"{now:%Y-%m-%d %H:%M} 已記錄今天的資產")
        except Exception as err:
            print("記錄資產失敗：", err)
        time.sleep(60)


def text(value):
    return str(value or "").strip()


def positive(value, label):
    number = float(value)
    if number <= 0:
        raise ValueError(f"{label}必須大於 0")
    return number


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC), **kwargs)

    def end_headers(self):
        # 要求瀏覽器每次都先確認檔案有沒有更新，避免改版後還在用快取的舊程式
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _allowed(self):
        ip = ipaddress.ip_address(self.client_address[0].split("%")[0])
        if ip.version == 6 and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        return ip.is_private or any(ip in net for net in TAILSCALE_NETS)

    def _json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _guard(self):
        if not self._allowed():
            self.send_error(403, "Forbidden")
            return False
        return True

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length) or b"{}")

    def _parts(self):
        """/api/accounts/3/currencies/USD → ["accounts", "3", "currencies", "USD"]"""
        parts = urlparse(self.path).path.strip("/").split("/")
        return parts[1:] if parts and parts[0] == "api" else None

    def _run(self, handler, *args):
        try:
            handler(*args)
        except (KeyError, ValueError, TypeError, json.JSONDecodeError, sqlite3.IntegrityError) as err:
            self._json({"error": str(err)}, 400)

    # ----- 路由 -----
    def do_GET(self):
        if not self._guard():
            return
        url = urlparse(self.path)
        if url.path == "/api/entries":
            process_autopays()  # 讀交易前先把到期的自動扣款記上
            month = parse_qs(url.query).get("month", [""])[0]
            with db() as conn:
                rows = conn.execute(
                    "SELECT * FROM entries WHERE date LIKE ? ORDER BY date DESC, id DESC",
                    (month + "%",),
                ).fetchall()
            return self._json([dict(r) for r in rows])
        if url.path == "/api/categories":
            with db() as conn:
                rows = conn.execute("SELECT * FROM categories ORDER BY sort, id").fetchall()
            return self._json([dict(r) for r in rows])
        if url.path == "/api/currencies":
            with db() as conn:
                rows = conn.execute("SELECT * FROM currencies ORDER BY sort, id").fetchall()
            return self._json([dict(r) for r in rows])
        if url.path == "/api/autopays":
            with db() as conn:
                rows = conn.execute("SELECT * FROM autopays ORDER BY sort, id").fetchall()
            return self._json([dict(r) for r in rows])
        if url.path == "/api/rebates":
            with db() as conn:
                rows = conn.execute("SELECT * FROM rebates ORDER BY date DESC, id DESC").fetchall()
            return self._json([dict(r) for r in rows])
        if url.path == "/api/trades":
            with db() as conn:
                rows = conn.execute("SELECT * FROM trades ORDER BY date DESC, id DESC").fetchall()
            return self._json([dict(r) for r in rows])
        if url.path == "/api/settings":
            return self._json(get_settings())
        if url.path == "/api/snapshots":
            with db() as conn:
                rows = conn.execute("SELECT * FROM asset_snapshots ORDER BY date").fetchall()
            return self._json([dict(r) for r in rows])
        if url.path == "/api/fixedcosts":
            with db() as conn:
                rows = conn.execute("SELECT * FROM fixed_costs ORDER BY sort, id").fetchall()
            return self._json([dict(r) for r in rows])
        if url.path == "/api/policies":
            with db() as conn:
                rows = conn.execute("SELECT * FROM policies").fetchall()
            return self._json([dict(r) for r in rows])
        if url.path == "/api/loans":
            with db() as conn:
                rows = conn.execute("SELECT * FROM loans").fetchall()
            return self._json([dict(r) for r in rows])
        if url.path == "/api/holdings":
            with db() as conn:
                rows = conn.execute("SELECT * FROM holdings ORDER BY sort, id").fetchall()
            return self._json([dict(r) for r in rows])
        if url.path == "/api/accounts":
            return self._json(self._list_accounts())
        super().do_GET()

    def do_POST(self):
        if not self._guard():
            return
        parts = self._parts()
        handlers = {
            ("entries",): self._create_entry,
            ("categories",): self._create_category,
            ("accounts",): self._create_account,
            ("holdings",): self._create_holding,
            ("holdings", "refresh"): self._refresh_prices,
            ("currencies",): self._create_currency,
            ("currencies", "refresh"): self._refresh_rates,
            ("trades",): self._create_trade,
            ("rebates",): self._create_rebate,
            ("autopays",): self._create_autopay,
            ("fixedcosts",): self._create_fixed_cost,
            ("snapshots",): lambda data: self._json(take_snapshot(auto=False), 201),  # 手動記錄今天
        }
        if parts and tuple(parts) in handlers:
            return self._run(lambda: handlers[tuple(parts)](self._read_json()))
        # POST /api/autopays/<id>/post：確認並記錄一次扣款（提醒模式用）
        if parts and len(parts) == 3 and parts[0] == "autopays" and parts[1].isdigit() and parts[2] == "post":
            return self._run(lambda: self._post_autopay(int(parts[1]), self._read_json()))
        # POST /api/policies/<id>/payments：繳保費
        if parts and len(parts) == 3 and parts[0] == "policies" and parts[1].isdigit() and parts[2] == "payments":
            return self._run(lambda: self._policy_payment(int(parts[1]), self._read_json()))
        # POST /api/loans/<id>/reconcile：與銀行核對剩餘本金（apply=true 時把差額調整到最近一期）
        if parts and len(parts) == 3 and parts[0] == "loans" and parts[1].isdigit() and parts[2] == "reconcile":
            return self._run(lambda: self._reconcile_loan(int(parts[1]), self._read_json()))
        # POST /api/loans/<id>/recalculate：依日期重新編號、重算各期利息
        if parts and len(parts) == 3 and parts[0] == "loans" and parts[1].isdigit() and parts[2] == "recalculate":
            return self._run(lambda: self._recalculate_loan(int(parts[1])))
        # POST /api/loans/<id>/payments：記錄貸款還款（本期或額外）
        if parts and len(parts) == 3 and parts[0] == "loans" and parts[1].isdigit() and parts[2] == "payments":
            return self._run(lambda: self._loan_payment(int(parts[1]), self._read_json()))
        # POST /api/accounts/<id>/currencies：替帳戶加入幣別
        if parts and len(parts) == 3 and parts[0] == "accounts" and parts[1].isdigit() and parts[2] == "currencies":
            return self._run(lambda: self._add_account_currency(int(parts[1]), self._read_json()))
        self.send_error(404)

    def do_PUT(self):
        if not self._guard():
            return
        parts = self._parts() or []
        # 拖曳排序：PUT /api/<accounts|categories|currencies>/order，內容 {"ids": [依新順序排列的 id]}
        if len(parts) == 2 and parts[1] == "order" and parts[0] in ("accounts", "categories", "currencies", "holdings", "autopays", "fixedcosts"):
            table = "fixed_costs" if parts[0] == "fixedcosts" else parts[0]
            return self._run(lambda: self._reorder(table, self._read_json()))
        if parts == ["settings"]:
            return self._run(lambda: self._save_settings(self._read_json()))
        if len(parts) == 2 and parts[1].isdigit():
            handler = {
                "categories": self._rename_category,
                "accounts": self._update_account,
                "currencies": self._update_currency,
                "holdings": self._update_holding,
                "loans": self._save_loan,
                "policies": self._save_policy,
                "autopays": self._update_autopay,
                "fixedcosts": self._update_fixed_cost,
                "entries": self._update_entry,
                "trades": self._update_trade,
                "rebates": self._update_rebate,
            }.get(parts[0])
            if handler:
                return self._run(lambda: handler(int(parts[1]), self._read_json()))
        # PUT /api/accounts/<id>/currencies/<代碼>：修改該幣別的初始餘額
        if len(parts) == 4 and parts[0] == "accounts" and parts[1].isdigit() and parts[2] == "currencies":
            return self._run(lambda: self._update_account_currency(int(parts[1]), parts[3], self._read_json()))
        self.send_error(404)

    def do_DELETE(self):
        if not self._guard():
            return
        parts = self._parts() or []
        if len(parts) == 2 and parts[1].isdigit():
            id_ = int(parts[1])
            if parts[0] == "entries":
                with db() as conn:
                    conn.execute("DELETE FROM entries WHERE id = ?", (id_,))
                return self._json({"ok": True})
            if parts[0] == "categories":
                with db() as conn:
                    conn.execute("DELETE FROM categories WHERE id = ? OR parent_id = ?", (id_, id_))
                return self._json({"ok": True})
            if parts[0] == "accounts":
                return self._run(self._delete_account, id_)
            if parts[0] == "holdings":
                return self._run(self._delete_holding, id_)
            if parts[0] == "currencies":
                return self._run(self._delete_currency, id_)
            if parts[0] == "trades":
                return self._run(self._delete_trade, id_)
            if parts[0] == "rebates":
                with db() as conn:
                    conn.execute("DELETE FROM rebates WHERE id = ?", (id_,))
                return self._json({"ok": True})
            if parts[0] == "fixedcosts":
                with db() as conn:
                    conn.execute("DELETE FROM fixed_costs WHERE id = ?", (id_,))
                return self._json({"ok": True})
            if parts[0] == "autopays":  # 已記的帳保留
                with db() as conn:
                    conn.execute("DELETE FROM autopays WHERE id = ?", (id_,))
                return self._json({"ok": True})
        if len(parts) == 4 and parts[0] == "accounts" and parts[1].isdigit() and parts[2] == "currencies":
            return self._run(self._remove_account_currency, int(parts[1]), parts[3])
        # DELETE /api/loans/<id>/payments/<轉帳 id>：刪除整筆還款（本金轉帳＋配對的利息支出）
        if len(parts) == 4 and parts[0] == "loans" and parts[1].isdigit() and parts[2] == "payments" and parts[3].isdigit():
            return self._run(self._delete_loan_payment, int(parts[1]), int(parts[3]))
        self.send_error(404)

    def _reorder(self, table, data):
        ids = [int(i) for i in data["ids"]]
        with db() as conn:
            conn.executemany(f"UPDATE {table} SET sort = ? WHERE id = ?", [(i, id_) for i, id_ in enumerate(ids, 1)])
        self._json({"ok": True})

    # ----- 交易 -----
    def _create_entry(self, e):
        with db() as conn:
            f = self._entry_fields(conn, e)
            cur = conn.execute(
                "INSERT INTO entries (date, type, category, subcategory, account_id, from_account_id, to_account_id, "
                "amount, currency, to_currency, to_amount, loan_kind, loan_id, note) "
                "VALUES (:date, :type, :category, :subcategory, :account_id, :from_account_id, :to_account_id, "
                ":amount, :currency, :to_currency, :to_amount, :loan_kind, :loan_id, :note)", f)
        self._json({"id": cur.lastrowid}, 201)

    @staticmethod
    def _entry_locked(conn, row):
        """貸款還款、利息、保費這類系統拆分過的交易不能直接修改（改了本金利息會對不上）。"""
        if row["loan_kind"]:
            return True
        if row["type"] == "transfer" and row["to_account_id"]:
            kind = conn.execute("SELECT kind FROM accounts WHERE id = ?", (row["to_account_id"],)).fetchone()
            return bool(kind) and kind["kind"] in ("loan", "insurance")
        return False

    def _update_entry(self, id_, e):
        with db() as conn:
            row = conn.execute("SELECT * FROM entries WHERE id = ?", (id_,)).fetchone()
            if not row:
                raise ValueError("找不到這筆交易")
            if self._entry_locked(conn, row):
                raise ValueError("這筆是貸款還款或保費，請到該帳戶頁的還款／繳費紀錄刪除後重記")
            f = self._entry_fields(conn, {**e, "type": row["type"]})
            conn.execute(
                "UPDATE entries SET date = :date, category = :category, subcategory = :subcategory, account_id = :account_id, "
                "from_account_id = :from_account_id, to_account_id = :to_account_id, amount = :amount, currency = :currency, "
                "to_currency = :to_currency, to_amount = :to_amount, loan_kind = :loan_kind, loan_id = :loan_id, note = :note "
                "WHERE id = :id", {**f, "id": id_})
        self._json({"ok": True})

    def _entry_fields(self, conn, e):
        type_ = e["type"]
        if type_ not in TYPES:
            raise ValueError("類型錯誤")
        amount = positive(e["amount"], "金額")
        currency = text(e.get("currency")) or BASE_CURRENCY
        category = subcategory = ""
        account_id = from_id = to_id = to_currency = to_amount = loan_id = None
        loan_kind = ""
        date.fromisoformat(str(e["date"])[:10])  # 日期格式錯誤會丟 ValueError
        if type_ == "transfer":
            from_id = self._account_id(conn, e.get("from_account_id"), "轉出帳戶")
            to_id = self._account_id(conn, e.get("to_account_id"), "轉入帳戶")
            if not from_id or not to_id:
                raise ValueError("轉帳需要選擇轉出帳戶與轉入帳戶")
            to_currency = text(e.get("to_currency")) or currency
            if from_id == to_id and currency == to_currency:
                raise ValueError("轉出與轉入不能是同一個帳戶的同一個幣別")
            self._check_currency(conn, from_id, currency, "轉出帳戶")
            self._check_currency(conn, to_id, to_currency, "轉入帳戶")
            # 同幣別：轉入金額 = 轉出金額；跨幣別（換匯）：要填轉入金額
            to_amount = amount if currency == to_currency else positive(e.get("to_amount") or 0, "轉入金額")
            if e.get("loan_kind") == "extra":
                kind = conn.execute("SELECT kind FROM accounts WHERE id = ?", (to_id,)).fetchone()["kind"]
                if kind != "loan":
                    raise ValueError("只有轉入貸款才能標記為額外還款")
                loan_kind, loan_id = "extra", to_id
        else:
            category = text(e.get("category")) or "其他雜項"
            subcategory = text(e.get("subcategory"))
            account_id = self._account_id(conn, e.get("account_id"), "帳戶")
            self._check_currency(conn, account_id, currency, "帳戶")
        return {
            "date": str(e["date"])[:10], "type": type_, "category": category, "subcategory": subcategory,
            "account_id": account_id, "from_account_id": from_id, "to_account_id": to_id, "amount": amount,
            "currency": currency, "to_currency": to_currency, "to_amount": to_amount, "loan_kind": loan_kind,
            "loan_id": loan_id, "note": text(e.get("note")),
        }

    @staticmethod
    def _account_id(conn, value, label):
        if value in (None, ""):
            return None
        id_ = int(value)
        if not conn.execute("SELECT 1 FROM accounts WHERE id = ?", (id_,)).fetchone():
            raise ValueError(f"{label}不存在")
        return id_

    @staticmethod
    def _check_currency(conn, account_id, code, label):
        if not conn.execute("SELECT 1 FROM currencies WHERE code = ?", (code,)).fetchone():
            raise ValueError(f"幣別 {code} 不存在")
        if account_id is not None and not conn.execute(
            "SELECT 1 FROM account_currencies WHERE account_id = ? AND currency = ?", (account_id, code)
        ).fetchone():
            raise ValueError(f"{label}還沒有 {code}，請先到帳戶頁加入這個幣別")

    # ----- 帳戶 -----
    def _list_accounts(self):
        with db() as conn:
            accounts = [dict(r) for r in conn.execute(
                "SELECT id, name, kind, sort, settlement_for, fee_rate, fee_min, tax_rate FROM accounts ORDER BY sort, id"
            )]
            holdings = conn.execute(
                "SELECT ac.account_id, ac.currency, ac.initial_balance FROM account_currencies ac "
                "LEFT JOIN currencies c ON c.code = ac.currency ORDER BY c.sort, c.id"
            ).fetchall()
        by_account = {}
        for h in holdings:
            by_account.setdefault(h["account_id"], []).append(
                {"currency": h["currency"], "initial_balance": h["initial_balance"]}
            )
        for a in accounts:
            a["currencies"] = by_account.get(a["id"], [])
        return accounts

    def _create_account(self, a):
        name, kind = text(a.get("name")), a.get("kind")
        currency = text(a.get("currency")) or BASE_CURRENCY
        if kind not in ACCOUNT_KINDS:
            raise ValueError("帳戶類型錯誤")
        if not name:
            raise ValueError("名稱不能空白")
        initial = float(a.get("initial_balance") or 0)
        with db() as conn:
            if conn.execute("SELECT 1 FROM accounts WHERE name = ?", (name,)).fetchone():
                raise ValueError(f"已經有「{name}」這個帳戶")
            self._check_currency(conn, None, currency, "")
            sort = conn.execute("SELECT COALESCE(MAX(sort), 0) + 1 FROM accounts").fetchone()[0]
            id_ = conn.execute("INSERT INTO accounts (name, kind, sort) VALUES (?, ?, ?)", (name, kind, sort)).lastrowid
            conn.execute(
                "INSERT INTO account_currencies (account_id, currency, initial_balance) VALUES (?, ?, ?)",
                (id_, currency, initial),
            )
        self._json({"id": id_}, 201)

    def _update_account(self, id_, a):
        """可只改名稱（name）、只設定交割戶（settlement_for：證券戶 id，null 取消連結），
        或證券戶的手續費設定（fee_rate、fee_min、tax_rate，空白＝依幣別預設）。"""
        with db() as conn:
            account = conn.execute("SELECT kind FROM accounts WHERE id = ?", (id_,)).fetchone()
            if not account:
                raise ValueError("帳戶不存在")
            if "name" in a:
                name = text(a.get("name"))
                if not name:
                    raise ValueError("名稱不能空白")
                if conn.execute("SELECT 1 FROM accounts WHERE name = ? AND id <> ?", (name, id_)).fetchone():
                    raise ValueError(f"已經有「{name}」這個帳戶")
                conn.execute("UPDATE accounts SET name = ? WHERE id = ?", (name, id_))
            if "settlement_for" in a:
                target = a.get("settlement_for")
                if target in (None, ""):
                    conn.execute("UPDATE accounts SET settlement_for = NULL WHERE id = ?", (id_,))
                else:
                    target = int(target)
                    if account["kind"] != "bank":
                        raise ValueError("只有一般帳戶（銀行）可以設為交割戶")
                    sec = conn.execute("SELECT kind FROM accounts WHERE id = ?", (target,)).fetchone()
                    if not sec or sec["kind"] != "securities":
                        raise ValueError("請選擇證券戶")
                    # 一個證券戶只有一個交割戶：先解除其他銀行對它的連結
                    conn.execute("UPDATE accounts SET settlement_for = NULL WHERE settlement_for = ?", (target,))
                    conn.execute("UPDATE accounts SET settlement_for = ? WHERE id = ?", (target, id_))
            for col, label, limit in (("fee_rate", "手續費率", 10), ("fee_min", "最低手續費", None), ("tax_rate", "賣出稅費率", 10)):
                if col not in a:
                    continue
                if account["kind"] != "securities":
                    raise ValueError("手續費設定只能用在證券戶")
                value = None if a[col] in (None, "") else float(a[col])
                if value is not None and (value < 0 or (limit and value > limit)):
                    raise ValueError(f"{label}要在 0～{limit}% 之間" if limit else f"{label}不能是負數")
                conn.execute(f"UPDATE accounts SET {col} = ? WHERE id = ?", (value, id_))
        self._json({"ok": True})

    def _delete_account(self, id_):
        with db() as conn:
            used = conn.execute(
                "SELECT COUNT(*) FROM entries WHERE account_id = ? OR from_account_id = ? OR to_account_id = ?",
                (id_, id_, id_),
            ).fetchone()[0]
            if used:
                raise ValueError(f"這個帳戶還有 {used} 筆交易，請先刪除那些交易才能刪除帳戶")
            traded = conn.execute("SELECT COUNT(*) FROM trades WHERE account_id = ? OR bank_id = ?", (id_, id_)).fetchone()[0]
            traded += conn.execute("SELECT COUNT(*) FROM rebates WHERE account_id = ? OR bank_id = ?", (id_, id_)).fetchone()[0]
            if traded:
                raise ValueError(f"這個帳戶還有 {traded} 筆股票交易，請先刪除那些交易才能刪除帳戶")
            held = conn.execute("SELECT COUNT(*) FROM holdings WHERE account_id = ?", (id_,)).fetchone()[0]
            if held:
                raise ValueError(f"這個帳戶還有 {held} 檔持股，請先刪除持股才能刪除帳戶")
            conn.execute("DELETE FROM account_currencies WHERE account_id = ?", (id_,))
            conn.execute("UPDATE accounts SET settlement_for = NULL WHERE settlement_for = ?", (id_,))
            conn.execute("DELETE FROM loans WHERE account_id = ?", (id_,))
            conn.execute("DELETE FROM policies WHERE account_id = ?", (id_,))
            conn.execute("DELETE FROM autopays WHERE account_id = ?", (id_,))
            conn.execute("UPDATE fixed_costs SET account_id = NULL WHERE account_id = ?", (id_,))
            conn.execute("DELETE FROM accounts WHERE id = ?", (id_,))
        self._json({"ok": True})

    def _add_account_currency(self, id_, data):
        currency = text(data.get("currency"))
        initial = float(data.get("initial_balance") or 0)
        with db() as conn:
            if not conn.execute("SELECT 1 FROM accounts WHERE id = ?", (id_,)).fetchone():
                raise ValueError("帳戶不存在")
            self._check_currency(conn, None, currency, "")
            if conn.execute(
                "SELECT 1 FROM account_currencies WHERE account_id = ? AND currency = ?", (id_, currency)
            ).fetchone():
                raise ValueError(f"這個帳戶已經有 {currency}")
            conn.execute(
                "INSERT INTO account_currencies (account_id, currency, initial_balance) VALUES (?, ?, ?)",
                (id_, currency, initial),
            )
        self._json({"ok": True}, 201)

    def _update_account_currency(self, id_, currency, data):
        initial = float(data["initial_balance"])
        with db() as conn:
            cur = conn.execute(
                "UPDATE account_currencies SET initial_balance = ? WHERE account_id = ? AND currency = ?",
                (initial, id_, currency),
            )
            if not cur.rowcount:
                raise ValueError("這個帳戶沒有這個幣別")
        self._json({"ok": True})

    def _remove_account_currency(self, id_, currency):
        with db() as conn:
            used = conn.execute(
                "SELECT COUNT(*) FROM entries WHERE (account_id = ? OR from_account_id = ?) AND currency = ? "
                "OR to_account_id = ? AND to_currency = ?",
                (id_, id_, currency, id_, currency),
            ).fetchone()[0]
            if used:
                raise ValueError(f"這個帳戶的 {currency} 還有 {used} 筆交易，不能移除")
            count = conn.execute("SELECT COUNT(*) FROM account_currencies WHERE account_id = ?", (id_,)).fetchone()[0]
            if count <= 1:
                raise ValueError("帳戶至少要保留一個幣別")
            conn.execute("DELETE FROM account_currencies WHERE account_id = ? AND currency = ?", (id_, currency))
        self._json({"ok": True})

    # ----- 自動扣款 -----
    @staticmethod
    def _autopay_fields(a):
        name = text(a.get("name"))
        if not name:
            raise ValueError("請填扣款項目，例如：手機費")
        day = int(float(a.get("day") or 0))
        if not 1 <= day <= 31:
            raise ValueError("扣款日請填 1～31")
        amount = positive(a.get("amount") or 0, "扣款金額")
        start = text(a.get("start_date"))[:10]
        date.fromisoformat(start)  # 格式錯誤會丟 ValueError
        return {
            "name": name, "day": day, "amount": amount, "start_date": start,
            "category": text(a.get("category")), "subcategory": text(a.get("subcategory")),
            "auto_post": 1 if a.get("auto_post") in (True, 1, "1", "true") else 0,
            "active": 0 if a.get("active") in (False, 0, "0", "false") else 1,
            "note": text(a.get("note")),
        }

    def _create_autopay(self, a):
        f = self._autopay_fields(a)
        with db() as conn:
            account = conn.execute("SELECT kind FROM accounts WHERE id = ?", (int(a["account_id"]),)).fetchone()
            if not account or account["kind"] not in AUTOPAY_KINDS:
                raise ValueError("自動扣款只能設定在信用卡或銀行帳戶")
            sort = conn.execute("SELECT COALESCE(MAX(sort), 0) + 1 FROM autopays").fetchone()[0]
            cur = conn.execute(
                "INSERT INTO autopays (account_id, name, day, amount, category, subcategory, auto_post, active, "
                "start_date, note, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (int(a["account_id"]), f["name"], f["day"], f["amount"], f["category"], f["subcategory"],
                 f["auto_post"], f["active"], f["start_date"], f["note"], sort),
            )
        process_autopays()  # 首次扣款日若已過，馬上補記
        self._json({"id": cur.lastrowid}, 201)

    def _update_autopay(self, id_, a):
        with db() as conn:
            row = conn.execute("SELECT * FROM autopays WHERE id = ?", (id_,)).fetchone()
            if not row:
                raise ValueError("找不到這個自動扣款")
            f = self._autopay_fields({**dict(row), **a})
            conn.execute(
                "UPDATE autopays SET name = ?, day = ?, amount = ?, category = ?, subcategory = ?, auto_post = ?, "
                "active = ?, start_date = ?, note = ? WHERE id = ?",
                (f["name"], f["day"], f["amount"], f["category"], f["subcategory"], f["auto_post"], f["active"],
                 f["start_date"], f["note"], id_),
            )
        process_autopays()
        self._json({"ok": True})

    # ----- 系統設定 -----
    def _save_settings(self, data):
        values = {}
        if "snapshot_time" in data:
            t = text(data["snapshot_time"])
            if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", t):
                raise ValueError("更新時間格式錯誤，例如 17:00")
            values["snapshot_time"] = t
        if "snapshot_enabled" in data:
            values["snapshot_enabled"] = "0" if data["snapshot_enabled"] in (False, 0, "0", "false") else "1"
        if "tz_offset" in data:
            offset = int(float(data["tz_offset"]))
            if not -12 * 60 <= offset <= 14 * 60:
                raise ValueError("時區超出範圍")
            values["tz_offset"] = str(offset)
        with db() as conn:
            conn.executemany("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", values.items())
            self._json(get_settings(conn))

    # ----- 固定開銷 -----
    @staticmethod
    def _fixed_cost_fields(a):
        name = text(a.get("name"))
        if not name:
            raise ValueError("請填項目名稱，例如：房租")
        frequency = int(float(a.get("frequency") or 1))
        if frequency not in (1, 3, 6, 12):
            raise ValueError("頻率只能是每月、每季、每半年或每年")
        account_id = a.get("account_id")
        return {
            "name": name, "amount": positive(a.get("amount") or 0, "金額"),
            "currency": text(a.get("currency")) or BASE_CURRENCY, "frequency": frequency,
            "category": text(a.get("category")), "subcategory": text(a.get("subcategory")),
            "account_id": int(account_id) if account_id not in (None, "", 0, "0") else None,
            "active": 0 if a.get("active") in (False, 0, "0", "false") else 1,
            "note": text(a.get("note")),
        }

    @staticmethod
    def _check_fixed_account(conn, f):
        if f["account_id"] is not None and not conn.execute("SELECT 1 FROM accounts WHERE id = ?", (f["account_id"],)).fetchone():
            raise ValueError("找不到這個付款帳戶")

    def _create_fixed_cost(self, a):
        f = self._fixed_cost_fields(a)
        with db() as conn:
            self._check_fixed_account(conn, f)
            sort = conn.execute("SELECT COALESCE(MAX(sort), 0) + 1 FROM fixed_costs").fetchone()[0]
            cur = conn.execute(
                "INSERT INTO fixed_costs (name, amount, currency, frequency, category, subcategory, account_id, active, note, sort) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (f["name"], f["amount"], f["currency"], f["frequency"], f["category"], f["subcategory"],
                 f["account_id"], f["active"], f["note"], sort),
            )
        self._json({"id": cur.lastrowid}, 201)

    def _update_fixed_cost(self, id_, a):
        with db() as conn:
            row = conn.execute("SELECT * FROM fixed_costs WHERE id = ?", (id_,)).fetchone()
            if not row:
                raise ValueError("找不到這個固定開銷")
            f = self._fixed_cost_fields({**dict(row), **a})
            self._check_fixed_account(conn, f)
            conn.execute(
                "UPDATE fixed_costs SET name = ?, amount = ?, currency = ?, frequency = ?, category = ?, subcategory = ?, "
                "account_id = ?, active = ?, note = ? WHERE id = ?",
                (f["name"], f["amount"], f["currency"], f["frequency"], f["category"], f["subcategory"],
                 f["account_id"], f["active"], f["note"], id_),
            )
        self._json({"ok": True})

    def _post_autopay(self, id_, data):
        with _autopay_lock, db() as conn:
            row = conn.execute("SELECT * FROM autopays WHERE id = ?", (id_,)).fetchone()
            if not row:
                raise ValueError("找不到這個自動扣款")
            when = text(data.get("date"))[:10]
            date.fromisoformat(when)
            insert_autopay_entry(conn, dict(row), when, positive(data.get("amount") or row["amount"], "扣款金額"))
        self._json({"ok": True}, 201)

    # ----- 保險 -----
    @staticmethod
    def _policy_account(conn, id_):
        account = conn.execute("SELECT name, kind FROM accounts WHERE id = ?", (id_,)).fetchone()
        if not account or account["kind"] != "insurance":
            raise ValueError("只有保險帳戶可以設定保單")
        return account

    def _save_policy(self, id_, data):
        policy_type = data.get("policy_type") or "protection"
        if policy_type not in ("protection", "savings"):
            raise ValueError("保單類型錯誤")
        frequency = int(data.get("frequency") or 12)
        if frequency not in (1, 3, 6, 12):
            raise ValueError("繳費頻率錯誤")
        numbers = {}
        for key, label in (("premium", "保費"), ("pay_years", "繳費年期"), ("sum_insured", "保額")):
            numbers[key] = float(data.get(key) or 0)
            if numbers[key] < 0:
                raise ValueError(f"{label}不能是負數")
        cash_value = None if text(data.get("cash_value")) == "" else float(data["cash_value"])
        with db() as conn:
            self._policy_account(conn, id_)
            old = conn.execute("SELECT cash_value, cash_value_date FROM policies WHERE account_id = ?", (id_,)).fetchone()
            # 保單價值有變才更新日期
            changed = not old or old["cash_value"] != cash_value
            value_date = local_now().strftime("%Y-%m-%d") if changed and cash_value is not None else (old["cash_value_date"] if old else "")
            pay_account = self._account_id(conn, data.get("pay_account_id"), "扣款帳戶")
            conn.execute(
                "INSERT INTO policies (account_id, insurer, policy_type, premium, frequency, pay_years, start_date, "
                "sum_insured, cash_value, cash_value_date, pay_account_id, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
                "ON CONFLICT(account_id) DO UPDATE SET insurer = excluded.insurer, policy_type = excluded.policy_type, "
                "premium = excluded.premium, frequency = excluded.frequency, pay_years = excluded.pay_years, "
                "start_date = excluded.start_date, sum_insured = excluded.sum_insured, cash_value = excluded.cash_value, "
                "cash_value_date = excluded.cash_value_date, pay_account_id = excluded.pay_account_id, note = excluded.note",
                (id_, text(data.get("insurer")), policy_type, numbers["premium"], frequency, int(numbers["pay_years"]),
                 text(data.get("start_date"))[:10], numbers["sum_insured"], cash_value, value_date, pay_account,
                 text(data.get("note"))),
            )
        self._json({"ok": True})

    def _policy_payment(self, id_, data):
        """繳保費：儲蓄型轉入保單（資產）；保障型記為支出（金融保險 › 保險費）。"""
        amount = positive(data.get("amount") or 0, "保費")
        date = str(data["date"])[:10]
        with db() as conn:
            name = self._policy_account(conn, id_)["name"]
            from_id = self._account_id(conn, data.get("from_account_id"), "扣款帳戶")
            if not from_id:
                raise ValueError("請選擇扣款帳戶")
            code = conn.execute(
                "SELECT currency FROM account_currencies WHERE account_id = ? ORDER BY rowid LIMIT 1", (id_,)
            ).fetchone()["currency"]
            self._check_currency(conn, from_id, code, "扣款帳戶")
            policy = conn.execute("SELECT policy_type FROM policies WHERE account_id = ?", (id_,)).fetchone()
            savings = policy and policy["policy_type"] == "savings"
            period = conn.execute(
                "SELECT COUNT(*) FROM entries WHERE loan_id = ? AND loan_kind = 'premium'", (id_,)
            ).fetchone()[0] + 1
            note = text(data.get("note")) or f"{name} 第 {period} 期保費"
            if savings:
                conn.execute(
                    "INSERT INTO entries (date, type, from_account_id, to_account_id, amount, currency, to_currency, "
                    "to_amount, loan_kind, loan_id, note) VALUES (?, 'transfer', ?, ?, ?, ?, ?, ?, 'premium', ?, ?)",
                    (date, from_id, id_, amount, code, code, amount, id_, note),
                )
            else:
                conn.execute(
                    "INSERT INTO entries (date, type, category, subcategory, account_id, amount, currency, loan_kind, "
                    "loan_id, note) VALUES (?, 'expense', ?, ?, ?, ?, ?, 'premium', ?, ?)",
                    (date, *PREMIUM_CATEGORY, from_id, amount, code, id_, note),
                )
        self._json({"period": period, "savings": bool(savings)}, 201)

    # ----- 貸款 -----
    def _save_loan(self, id_, data):
        with db() as conn:
            account = conn.execute("SELECT kind FROM accounts WHERE id = ?", (id_,)).fetchone()
            if not account or account["kind"] != "loan":
                raise ValueError("只有貸款帳戶可以設定貸款資訊")
            principal = float(data.get("principal") or 0)
            rate = float(data.get("annual_rate") or 0)
            term = int(float(data.get("term_months") or 0))
            if principal < 0 or rate < 0 or term < 0:
                raise ValueError("借款金額、利率、期數不能是負數")
            monthly = float(data.get("monthly_payment") or 0)
            if not monthly and principal and term:
                monthly = round(annuity_payment(principal, rate, term))  # 沒填就依本息平均攤還試算
            pay_account = self._account_id(conn, data.get("pay_account_id"), "扣款帳戶")
            conn.execute(
                "INSERT INTO loans (account_id, principal, annual_rate, monthly_payment, term_months, start_date, pay_account_id) "
                "VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET principal = excluded.principal, "
                "annual_rate = excluded.annual_rate, monthly_payment = excluded.monthly_payment, "
                "term_months = excluded.term_months, start_date = excluded.start_date, pay_account_id = excluded.pay_account_id",
                (id_, principal, rate, monthly, term, text(data.get("start_date"))[:10], pay_account),
            )
        self._json({"ok": True, "monthly_payment": monthly})

    def _loan_payment(self, id_, data):
        """本期還款：有利率就拆成利息（支出）＋本金（轉帳）；額外還款：全部是本金。"""
        kind = data.get("kind")
        if kind not in ("regular", "extra"):
            raise ValueError("還款類型錯誤")
        amount = positive(data.get("amount") or 0, "還款金額")
        date = str(data["date"])[:10]
        with db() as conn:
            loan_account = conn.execute("SELECT name, kind FROM accounts WHERE id = ?", (id_,)).fetchone()
            if not loan_account or loan_account["kind"] != "loan":
                raise ValueError("貸款不存在")
            from_id = self._account_id(conn, data.get("from_account_id"), "扣款帳戶")
            if not from_id:
                raise ValueError("請選擇扣款帳戶")
            code = conn.execute(
                "SELECT currency FROM account_currencies WHERE account_id = ? ORDER BY rowid LIMIT 1", (id_,)
            ).fetchone()["currency"]
            self._check_currency(conn, from_id, code, "扣款帳戶")
            loan = conn.execute("SELECT * FROM loans WHERE account_id = ?", (id_,)).fetchone()
            rate = loan["annual_rate"] if loan else 0
            name = loan_account["name"]

            interest = 0
            if kind == "regular" and rate > 0:
                owed = max(0, -account_balance(conn, id_, code))
                interest = min(amount, round(owed * rate / 100 / 12))
            principal = amount - interest
            period = conn.execute(
                "SELECT COUNT(*) FROM entries WHERE type = 'transfer' AND to_account_id = ? AND loan_kind <> 'extra'",
                (id_,),
            ).fetchone()[0] + 1
            note = text(data.get("note")) or (f"{name} 第 {period} 期還款" if kind == "regular" else f"{name} 額外還款")
            if principal > 0:
                conn.execute(
                    "INSERT INTO entries (date, type, from_account_id, to_account_id, amount, currency, to_currency, "
                    "to_amount, loan_kind, loan_id, note) VALUES (?, 'transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (date, from_id, id_, principal, code, code, principal, "extra" if kind == "extra" else "", id_, note),
                )
            if interest > 0:
                conn.execute(
                    "INSERT INTO entries (date, type, category, subcategory, account_id, amount, currency, loan_kind, "
                    "loan_id, note) VALUES (?, 'expense', ?, ?, ?, ?, ?, 'interest', ?, ?)",
                    (date, *LOAN_INTEREST_CATEGORY, from_id, interest, code, id_, f"{name} 第 {period} 期利息"),
                )
        self._json({"principal": principal, "interest": interest}, 201)

    @staticmethod
    def _loan_repayments(conn, id_):
        """貸款的所有還款（依日期），每筆配對同一天、由貸款頁一起建立的利息支出。"""
        transfers = [dict(r) for r in conn.execute(
            "SELECT * FROM entries WHERE type = 'transfer' AND to_account_id = ? ORDER BY date, id", (id_,)
        )]
        interests = [dict(r) for r in conn.execute(
            "SELECT * FROM entries WHERE loan_id = ? AND loan_kind = 'interest' ORDER BY id", (id_,)
        )]
        used = set()
        for t in transfers:
            pair = next((i for i in interests if i["id"] not in used and i["date"] == t["date"] and i["id"] > t["id"]), None)
            if pair:
                used.add(pair["id"])
            t["interest_entry"] = pair
        return transfers

    def _delete_loan_payment(self, id_, transfer_id):
        with db() as conn:
            payment = next((t for t in self._loan_repayments(conn, id_) if t["id"] == transfer_id), None)
            if not payment:
                raise ValueError("找不到這筆還款")
            conn.execute("DELETE FROM entries WHERE id = ?", (transfer_id,))
            if payment["interest_entry"]:
                conn.execute("DELETE FROM entries WHERE id = ?", (payment["interest_entry"]["id"],))
        self._json({"ok": True})

    def _reconcile_loan(self, id_, data):
        bank = float(data["balance"])
        if bank < 0:
            raise ValueError("銀行剩餘本金請填正數")
        with db() as conn:
            account = conn.execute("SELECT kind FROM accounts WHERE id = ?", (id_,)).fetchone()
            if not account or account["kind"] != "loan":
                raise ValueError("貸款不存在")
            code = conn.execute(
                "SELECT currency FROM account_currencies WHERE account_id = ? ORDER BY rowid LIMIT 1", (id_,)
            ).fetchone()["currency"]
            ours = max(0, -account_balance(conn, id_, code))
            diff = round(ours - bank, 2)  # 正數：銀行認列的本金比記帳本多（記帳本少扣了本金）
            adjusted = None
            if data.get("apply") and diff:
                # 差額通常來自銀行按天數計息：只調整最近一期的本金／利息拆分，該期總額不變
                regulars = [t for t in self._loan_repayments(conn, id_) if t["loan_kind"] != "extra" and t["interest_entry"]]
                if not regulars:
                    raise ValueError("沒有含利息的本期還款可以調整")
                last = regulars[-1]
                principal = last["amount"] + diff
                interest = last["interest_entry"]["amount"] - diff
                if principal <= 0 or interest <= 0:
                    raise ValueError(f"差額 {diff:,.0f} 太大，不適合只調整最近一期，請先檢查是否有重複或漏記的還款")
                conn.execute("UPDATE entries SET amount = ?, to_amount = ? WHERE id = ?", (principal, principal, last["id"]))
                conn.execute("UPDATE entries SET amount = ? WHERE id = ?", (interest, last["interest_entry"]["id"]))
                adjusted = last["date"]
            conn.execute("INSERT OR IGNORE INTO loans (account_id) VALUES (?)", (id_,))
            conn.execute(
                "UPDATE loans SET bank_balance = ?, bank_date = ? WHERE account_id = ?",
                (bank, local_now().strftime("%Y-%m-%d"), id_),
            )
        self._json({"ours": ours, "bank": bank, "diff": diff, "adjusted": adjusted})

    def _recalculate_loan(self, id_):
        """依日期重新編號期數，並用剩餘本金重算每期利息；每期還款總額（本金＋利息）不變。"""
        with db() as conn:
            account = conn.execute("SELECT name, kind FROM accounts WHERE id = ?", (id_,)).fetchone()
            if not account or account["kind"] != "loan":
                raise ValueError("貸款不存在")
            name = account["name"]
            loan = conn.execute("SELECT annual_rate FROM loans WHERE account_id = ?", (id_,)).fetchone()
            rate = loan["annual_rate"] if loan else 0
            holding = conn.execute(
                "SELECT currency, initial_balance FROM account_currencies WHERE account_id = ? ORDER BY rowid LIMIT 1", (id_,)
            ).fetchone()
            owed = -holding["initial_balance"]
            auto_note = re.compile(rf"^{re.escape(name)} 第 \d+ 期(還款|利息)$")
            period = changed = 0

            def set_note(entry, note):
                # 只改系統自動產生的備註，使用者自己寫的不動
                if entry["note"] != note and (not entry["note"] or auto_note.match(entry["note"])):
                    conn.execute("UPDATE entries SET note = ? WHERE id = ?", (note, entry["id"]))
                    return 1
                return 0

            for t in self._loan_repayments(conn, id_):
                amount = t["to_amount"] if t["to_amount"] is not None else t["amount"]
                if t["loan_kind"] == "extra":
                    owed -= amount
                    continue
                period += 1
                pair = t["interest_entry"]
                if pair and rate > 0:
                    total = amount + pair["amount"]
                    interest = min(total, round(owed * rate / 1200))
                    principal = total - interest
                    if principal > 0 and (principal != amount or interest != pair["amount"]):
                        conn.execute("UPDATE entries SET amount = ?, to_amount = ? WHERE id = ?", (principal, principal, t["id"]))
                        if interest > 0:
                            conn.execute("UPDATE entries SET amount = ? WHERE id = ?", (interest, pair["id"]))
                        else:
                            conn.execute("DELETE FROM entries WHERE id = ?", (pair["id"],))
                            pair = None
                        changed += 1
                        amount = principal
                    if pair:
                        changed += set_note(pair, f"{name} 第 {period} 期利息")
                if t["loan_id"] is not None:
                    changed += set_note(t, f"{name} 第 {period} 期還款")
                owed -= amount
        self._json({"periods": period, "changed": changed})

    # ----- 持股 -----
    @staticmethod
    def _holding_fields(h):
        symbol = text(h.get("symbol")).upper()
        if not symbol:
            raise ValueError("股票代號不能空白")
        numbers = {}
        for key, label in (("shares", "股數"), ("cost", "購買成本"), ("price", "目前價格")):
            numbers[key] = float(h.get(key) or 0)
            if numbers[key] < 0:
                raise ValueError(f"{label}不能是負數")
        return symbol, text(h.get("name")), numbers

    def _create_holding(self, h):
        symbol, name, n = self._holding_fields(h)
        currency = text(h.get("currency")) or BASE_CURRENCY
        price_time, warning = "", ""
        name = holding_name(name, symbol, currency)  # 台股先試中文名稱
        if not name or text(h.get("price")) == "":
            quote = fetch_quote(symbol, currency)
            if quote:
                name = name or quote["name"]
                if text(h.get("price")) == "":
                    n["price"], price_time = quote["price"], quote["time"]
            else:
                warning = f"Yahoo Finance 查不到 {symbol}（{currency}）的股價，請確認代號與幣別，或手動輸入價格"
        with db() as conn:
            account = conn.execute("SELECT kind FROM accounts WHERE id = ?", (int(h["account_id"]),)).fetchone()
            if not account or account["kind"] != "securities":
                raise ValueError("持股只能加在證券戶")
            self._check_currency(conn, None, currency, "")
            sort = conn.execute("SELECT COALESCE(MAX(sort), 0) + 1 FROM holdings").fetchone()[0]
            cur = conn.execute(
                "INSERT INTO holdings (account_id, symbol, name, shares, cost, price, currency, price_time, sort, base_shares, base_cost) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (int(h["account_id"]), symbol, name, n["shares"], n["cost"], n["price"], currency, price_time, sort,
                 n["shares"], n["cost"]),
            )
        self._json({"id": cur.lastrowid, "warning": warning}, 201)

    def _refresh_prices(self, data):
        """更新股價：account_id 有給就只更新該證券戶，否則全部。"""
        updated, failed = refresh_prices(data.get("account_id"))
        self._json({"updated": updated, "failed": failed})

    def _update_holding(self, id_, h):
        with db() as conn:
            row = conn.execute("SELECT * FROM holdings WHERE id = ?", (id_,)).fetchone()
            if not row:
                raise ValueError("持股不存在")
            symbol, name, n = self._holding_fields({**dict(row), **h})
            base_shares, base_cost = self._holding_base(conn, row, n)
            conn.execute(
                "UPDATE holdings SET symbol = ?, name = ?, shares = ?, cost = ?, price = ?, price_time = ?, delisted = ?, "
                "base_shares = ?, base_cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (symbol, name, n["shares"], n["cost"], n["price"],
                 "" if "price" in h else row["price_time"], 1 if h.get("delisted", row["delisted"]) else 0,
                 base_shares, base_cost, id_),
            )
            recalc_holding(conn, id_)
        self._json({"ok": True})

    def _delete_holding(self, id_):
        with db() as conn:
            n = conn.execute("SELECT COUNT(*) FROM trades WHERE holding_id = ?", (id_,)).fetchone()[0]
            if n:
                raise ValueError(f"這檔股票還有 {n} 筆交易紀錄，請先刪除交易才能刪除持股")
            conn.execute("DELETE FROM holdings WHERE id = ?", (id_,))
        self._json({"ok": True})

    @staticmethod
    def _holding_base(conn, row, n):
        """手動改股數、成本：沒有交易就直接當期初；有交易時回推期初，讓「期初＋交易」剛好等於輸入的值。"""
        trades = conn.execute("SELECT side, shares FROM trades WHERE holding_id = ?", (row["id"],)).fetchall()
        if not trades:
            return n["shares"], n["cost"]
        net = sum(t["shares"] if t["side"] == "buy" else -t["shares"] for t in trades)
        base_shares = n["shares"] - net
        if base_shares < -1e-9:
            raise ValueError("股數比交易紀錄算出來的還少，請改交易紀錄")
        base_shares = max(0, base_shares)
        c0 = replay_holding(conn, row["id"], base_shares, 0)[1]
        if base_shares < 1e-9:  # 沒有期初部位：成本完全由交易決定
            if abs(n["cost"] - c0) > 0.01:
                raise ValueError("這檔的成本完全來自交易紀錄，要調整請修改交易")
            return 0, 0
        # 成本對期初成本是線性的：重播兩次（期初成本 0 和 1）求斜率
        c0 = replay_holding(conn, row["id"], base_shares, 0)[1]
        c1 = replay_holding(conn, row["id"], base_shares, 1)[1]
        k = c1 - c0
        if abs(k) < 1e-12:
            if abs(n["cost"] - c0) > 0.01:
                raise ValueError("期初持股已全部賣出，成本由交易紀錄決定，請改交易紀錄")
            return base_shares, row["base_cost"]
        base_cost = (n["cost"] - c0) / k
        if base_cost < -0.01:
            raise ValueError("成本比交易紀錄算出來的還低，請改交易紀錄")
        return base_shares, max(0, base_cost)

    # ----- 股票交易 -----
    def _trade_fields(self, conn, t, account_id=None):
        account_id = int(account_id or t.get("account_id") or 0)
        account = conn.execute("SELECT kind FROM accounts WHERE id = ?", (account_id,)).fetchone()
        if not account or account["kind"] != "securities":
            raise ValueError("股票交易只能記在證券戶")
        bank = conn.execute("SELECT id, name FROM accounts WHERE kind = 'bank' AND settlement_for = ?", (account_id,)).fetchone()
        if not bank:
            raise ValueError("這個證券戶還沒有綁定交割戶，請先到銀行帳戶頁的「證券交割戶」設定")
        side = t.get("side")
        if side not in ("buy", "sell"):
            raise ValueError("請選擇買進或賣出")
        when = text(t.get("date"))[:10]
        date.fromisoformat(when)
        shares = positive(t.get("shares") or 0, "股數")
        if shares < 1:
            raise ValueError("股數最少 1 股")
        # 成交價金（股數 × 價格）為主；舊的呼叫方式只給 price 也可以。price 由價金 ÷ 股數回推
        if text(t.get("gross")) != "":
            gross = float(t.get("gross"))
            if gross <= 0:
                raise ValueError("成交價金必須大於 0")
            price = gross / shares
        else:
            price = float(t.get("price") or 0)
            if price <= 0:
                raise ValueError("價格必須大於 0")
            gross = shares * price
        fee, tax = float(t.get("fee") or 0), float(t.get("tax") or 0) if side == "sell" else 0
        if fee < 0 or tax < 0:
            raise ValueError("手續費、證交稅不能是負數")
        amount = gross + fee if side == "buy" else gross - fee - tax
        if amount <= 0:
            raise ValueError("手續費與稅比成交金額還高，請確認金額")
        return {"account_id": account_id, "bank_id": bank["id"], "bank_name": bank["name"], "side": side, "date": when,
                "shares": shares, "price": price, "fee": round(fee, 4), "tax": round(tax, 4),
                "amount": round(amount, 4), "note": text(t.get("note"))}

    def _trade_holding(self, conn, t, f):
        """交易對應的持股：選現有的（holding_id），或新股票（symbol＋currency），買進時自動建立持股。"""
        if t.get("holding_id"):
            h = conn.execute("SELECT * FROM holdings WHERE id = ? AND account_id = ?",
                             (int(t["holding_id"]), f["account_id"])).fetchone()
            if not h:
                raise ValueError("找不到這檔持股")
            return h
        symbol = text(t.get("symbol")).upper()
        if not symbol:
            raise ValueError("請選擇股票或輸入代號")
        currency = text(t.get("currency")) or BASE_CURRENCY
        h = conn.execute("SELECT * FROM holdings WHERE account_id = ? AND symbol = ? AND currency = ?",
                         (f["account_id"], symbol, currency)).fetchone()
        if h:
            return h
        if f["side"] == "sell":
            raise ValueError(f"這個證券戶沒有 {symbol}，不能賣出")
        self._check_currency(conn, None, currency, "")
        name = holding_name("", symbol, currency) or text(t.get("name"))
        quote = None if name and currency == BASE_CURRENCY else fetch_quote(symbol, currency)
        sort = conn.execute("SELECT COALESCE(MAX(sort), 0) + 1 FROM holdings").fetchone()[0]
        cur = conn.execute(
            "INSERT INTO holdings (account_id, symbol, name, shares, cost, price, currency, price_time, sort, base_shares, base_cost) "
            "VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, 0, 0)",
            (f["account_id"], symbol, name or (quote["name"] if quote else ""),
             quote["price"] if quote else f["price"], currency, quote["time"] if quote else "", sort))
        return conn.execute("SELECT * FROM holdings WHERE id = ?", (cur.lastrowid,)).fetchone()

    def _create_trade(self, t):
        with db() as conn:
            f = self._trade_fields(conn, t)
            h = self._trade_holding(conn, t, f)
            self._check_currency(conn, f["bank_id"], h["currency"], f"交割戶「{f['bank_name']}」")
            cur = conn.execute(
                "INSERT INTO trades (account_id, holding_id, bank_id, date, side, shares, price, fee, tax, amount, currency, note) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (f["account_id"], h["id"], f["bank_id"], f["date"], f["side"], f["shares"], f["price"], f["fee"],
                 f["tax"], f["amount"], h["currency"], f["note"]))
            recalc_holding(conn, h["id"])  # 賣超過持股會丟錯，整筆不寫入
            row = conn.execute("SELECT * FROM trades WHERE id = ?", (cur.lastrowid,)).fetchone()
        self._json(dict(row), 201)

    def _update_trade(self, id_, t):
        with db() as conn:
            row = conn.execute("SELECT * FROM trades WHERE id = ?", (id_,)).fetchone()
            if not row:
                raise ValueError("找不到這筆股票交易")
            f = self._trade_fields(conn, {**dict(row), **t}, row["account_id"])
            conn.execute(
                "UPDATE trades SET date = ?, side = ?, shares = ?, price = ?, fee = ?, tax = ?, amount = ?, note = ? WHERE id = ?",
                (f["date"], f["side"], f["shares"], f["price"], f["fee"], f["tax"], f["amount"], f["note"], id_))
            recalc_holding(conn, row["holding_id"])
        self._json({"ok": True})

    # ----- 手續費折讓 -----
    def _rebate_fields(self, conn, r, account_id=None):
        account_id = int(account_id or r.get("account_id") or 0)
        account = conn.execute("SELECT kind FROM accounts WHERE id = ?", (account_id,)).fetchone()
        if not account or account["kind"] != "securities":
            raise ValueError("折讓款只能記在證券戶")
        bank = conn.execute("SELECT id, name FROM accounts WHERE kind = 'bank' AND settlement_for = ?", (account_id,)).fetchone()
        if not bank:
            raise ValueError("這個證券戶還沒有綁定交割戶，請先到銀行帳戶頁的「證券交割戶」設定")
        when = text(r.get("date"))[:10]
        date.fromisoformat(when)
        currency = text(r.get("currency")) or BASE_CURRENCY
        self._check_currency(conn, bank["id"], currency, f"交割戶「{bank['name']}」")
        return {"account_id": account_id, "bank_id": bank["id"], "date": when, "currency": currency,
                "amount": positive(r.get("amount") or 0, "折讓款"), "note": text(r.get("note"))}

    def _create_rebate(self, r):
        with db() as conn:
            f = self._rebate_fields(conn, r)
            cur = conn.execute(
                "INSERT INTO rebates (account_id, bank_id, date, amount, currency, note) VALUES (?, ?, ?, ?, ?, ?)",
                (f["account_id"], f["bank_id"], f["date"], f["amount"], f["currency"], f["note"]))
        self._json({"id": cur.lastrowid}, 201)

    def _update_rebate(self, id_, r):
        with db() as conn:
            row = conn.execute("SELECT * FROM rebates WHERE id = ?", (id_,)).fetchone()
            if not row:
                raise ValueError("找不到這筆折讓款")
            f = self._rebate_fields(conn, {**dict(row), **r}, row["account_id"])
            conn.execute("UPDATE rebates SET date = ?, amount = ?, currency = ?, note = ? WHERE id = ?",
                         (f["date"], f["amount"], f["currency"], f["note"], id_))
        self._json({"ok": True})

    def _delete_trade(self, id_):
        with db() as conn:
            row = conn.execute("SELECT holding_id FROM trades WHERE id = ?", (id_,)).fetchone()
            if not row:
                raise ValueError("找不到這筆股票交易")
            conn.execute("DELETE FROM trades WHERE id = ?", (id_,))
            recalc_holding(conn, row["holding_id"])  # 刪掉買進後若之後的賣出不夠賣，會丟錯並還原
        self._json({"ok": True})

    # ----- 幣別 -----
    def _currency_fields(self, c):
        name, symbol = text(c.get("name")), text(c.get("symbol"))
        if not name:
            raise ValueError("幣別名稱不能空白")
        return name, symbol, positive(c.get("rate") or 0, "匯率")

    def _refresh_rates(self, data):
        updated, failed = refresh_rates()
        self._json({"updated": updated, "failed": failed})

    def _create_currency(self, c):
        code = text(c.get("code")).upper()
        if not CURRENCY_CODE_RE.match(code):
            raise ValueError("幣別代碼請用 2～6 個英文字母或數字，例如 EUR")
        rate_time = ""
        if not c.get("rate"):  # 匯率留空：自動從 Yahoo 查
            quote = fetch_rate(code)
            if not quote:
                raise ValueError(f"查不到 {code} 的匯率，請手動輸入")
            c = {**c, "rate": round(quote["price"], 6)}
            rate_time = quote["time"] or local_now().strftime("%Y-%m-%d %H:%M")
        name, symbol, rate = self._currency_fields(c)
        with db() as conn:
            if conn.execute("SELECT 1 FROM currencies WHERE code = ?", (code,)).fetchone():
                raise ValueError(f"已經有 {code} 這個幣別")
            sort = conn.execute("SELECT COALESCE(MAX(sort), 0) + 1 FROM currencies").fetchone()[0]
            cur = conn.execute(
                "INSERT INTO currencies (code, name, symbol, rate, sort, rate_time) VALUES (?, ?, ?, ?, ?, ?)",
                (code, name, symbol or code, rate, sort, rate_time),
            )
        self._json({"id": cur.lastrowid}, 201)

    def _update_currency(self, id_, c):
        with db() as conn:
            row = conn.execute("SELECT * FROM currencies WHERE id = ?", (id_,)).fetchone()
            if not row:
                raise ValueError("幣別不存在")
            merged = {"name": row["name"], "symbol": row["symbol"], "rate": row["rate"], **c}
            name, symbol, rate = self._currency_fields(merged)
            if row["code"] == BASE_CURRENCY:
                rate = 1  # 台幣是本位幣，匯率固定為 1
            conn.execute(
                "UPDATE currencies SET name = ?, symbol = ?, rate = ?, rate_time = ? WHERE id = ?",
                (name, symbol or row["code"], rate, "" if "rate" in c and rate != row["rate"] else row["rate_time"], id_),
            )
        self._json({"ok": True})

    def _delete_currency(self, id_):
        with db() as conn:
            row = conn.execute("SELECT code FROM currencies WHERE id = ?", (id_,)).fetchone()
            if not row:
                raise ValueError("幣別不存在")
            code = row["code"]
            if code == BASE_CURRENCY:
                raise ValueError("台幣是本位幣，不能刪除")
            used = conn.execute(
                "SELECT COUNT(*) FROM entries WHERE currency = ? OR to_currency = ?", (code, code)
            ).fetchone()[0]
            if used:
                raise ValueError(f"還有 {used} 筆交易使用 {code}，不能刪除")
            stocks = conn.execute("SELECT COUNT(*) FROM holdings WHERE currency = ?", (code,)).fetchone()[0]
            if stocks:
                raise ValueError(f"還有 {stocks} 檔持股使用 {code}，不能刪除")
            held = conn.execute("SELECT COUNT(*) FROM account_currencies WHERE currency = ?", (code,)).fetchone()[0]
            if held:
                raise ValueError(f"還有 {held} 個帳戶持有 {code}，請先從帳戶移除")
            conn.execute("DELETE FROM currencies WHERE id = ?", (id_,))
        self._json({"ok": True})

    # ----- 分類 -----
    def _create_category(self, c):
        type_, name = c["type"], text(c.get("name"))
        parent_id = int(c["parent_id"]) if c.get("parent_id") not in (None, "") else None
        if type_ not in CATEGORY_TYPES:
            raise ValueError("類型錯誤")
        if not name:
            raise ValueError("名稱不能空白")
        with db() as conn:
            if parent_id is not None:
                parent = conn.execute(
                    "SELECT type FROM categories WHERE id = ? AND parent_id IS NULL", (parent_id,)
                ).fetchone()
                if not parent or parent["type"] != type_:
                    raise ValueError("主分類不存在")
            if conn.execute(
                "SELECT 1 FROM categories WHERE type = ? AND parent_id IS ? AND name = ?", (type_, parent_id, name)
            ).fetchone():
                raise ValueError(f"已經有「{name}」這個分類")
            sort = conn.execute("SELECT COALESCE(MAX(sort), 0) + 1 FROM categories").fetchone()[0]
            cur = conn.execute(
                "INSERT INTO categories (type, name, parent_id, sort) VALUES (?, ?, ?, ?)",
                (type_, name, parent_id, sort),
            )
        self._json({"id": cur.lastrowid}, 201)

    def _rename_category(self, id_, c):
        name = text(c.get("name"))
        if not name:
            raise ValueError("名稱不能空白")
        with db() as conn:
            row = conn.execute("SELECT * FROM categories WHERE id = ?", (id_,)).fetchone()
            if not row:
                raise ValueError("分類不存在")
            if conn.execute(
                "SELECT 1 FROM categories WHERE type = ? AND parent_id IS ? AND name = ? AND id <> ?",
                (row["type"], row["parent_id"], name, id_),
            ).fetchone():
                raise ValueError(f"已經有「{name}」這個分類")
            conn.execute("UPDATE categories SET name = ? WHERE id = ?", (name, id_))
            # 已記錄的交易一起改名
            if row["parent_id"] is None:
                conn.execute(
                    "UPDATE entries SET category = ? WHERE type = ? AND category = ?",
                    (name, row["type"], row["name"]),
                )
            else:
                parent = conn.execute("SELECT name FROM categories WHERE id = ?", (row["parent_id"],)).fetchone()
                conn.execute(
                    "UPDATE entries SET subcategory = ? WHERE type = ? AND category = ? AND subcategory = ?",
                    (name, row["type"], parent["name"], row["name"]),
                )
        self._json({"ok": True})


def start_server(port=PORT):
    """建立資料庫、補記自動扣款、啟動每日排程，回傳還沒開始服務的伺服器（安裝版的啟動程式也用這個）。"""
    init_db()
    process_autopays()
    threading.Thread(target=snapshot_scheduler, daemon=True).start()
    return ThreadingHTTPServer(("0.0.0.0", port), Handler)


if __name__ == "__main__":
    server = start_server()
    print(f"記帳本已啟動：本機 http://localhost:{PORT}")
    for ip in sorted(own_ips()):
        if ip.startswith("192.168."):
            print(f"區域網路：http://{ip}:{PORT}")
        elif ip.startswith("100."):
            print(f"外地 Tailscale：http://{ip}:{PORT}")
    server.serve_forever()
