# 記帳本（Accounting book）

個人記帳網頁：資料存在本機 SQLite，用 Python 內建套件提供網頁與 API（不需要安裝任何套件），區網或 VPN（例如 Tailscale）都能連。介面仿 Firefly III（AdminLTE），暗色系，繁體中文（另有 English、日本語介面）。

> 這份是公開的開發說明。個人環境（IP、部署路徑、個人決定）放在 `CLAUDE.local.md`，不進 git。

## 溝通與原則

- 回覆、畫面文字、程式註解一律用**繁體中文**。
- 動手前先用幾行說明設計（尤其是記帳邏輯），再實作；改完要實際驗證再回報。
- **正式資料（`data/ledger.db`）不要擅自修改**；測試一律用資料庫副本（見「開發流程」）。發現資料異常（例如帳戶負餘額、重複還款）要指出，但讓使用者決定怎麼處理。
- **不要把個人資料放進 git**：`data/`、`CLAUDE.local.md`、打包產物都在 `.gitignore`。

## 執行

- 啟動：`start.bat`（= `python server.py`），port **5000**（環境變數 `LEDGER_PORT` 可改），瀏覽器開 `http://localhost:5000`。需要 **Python 3.11 以上**（樹莓派 Bookworm 是 3.11）：不要用 3.12 才有的語法，例如 f-string 大括號裡用同一種引號。
- Linux／樹莓派：`deploy/raspberry-pi/install.sh` 裝成 systemd 服務 `ledger.service`（`Restart=always`）＋ `ledger-backup.timer`（每天 03:30 `tools/backup.py --keep 30`，`Persistent=true`）；`update.sh` 先備份再 `git pull --ff-only` 並重開。`.gitattributes` 讓 `.sh` 保持 LF。
- 存取限制（`Handler._allowed`）：只接受私有 IP（本機、區網）與 Tailscale 網段，其他公網 IP 回 403。
- **記帳本沒有登入功能，不能公開到網際網路**（例如 Tailscale Funnel、路由器轉發）。反向代理進來的連線在伺服器看來是 127.0.0.1，會被放行，所以要公開一定要先做登入驗證。

## 功能總覽

| 位置 | 功能 |
|---|---|
| 頂欄 | ☰ 收合側欄、👁 隱私模式（`#privacyToggle`）、📅 行事曆、＋ 新增交易 |
| 側欄 | 首頁、固定開銷、資產變化、行事曆、支出／收入／轉帳列表、新增交易；帳戶／證券戶／信用卡／貸款／保險五區（各帳戶右側顯示餘額，`MENU` 的 `{accounts: kind}` 展開）；證券戶標題右邊「更新股價」；分類統計；設定（系統設定、帳戶管理、分類設定、幣別設定） |
| 首頁 | 本月收入／支出／結餘、淨資產；待確認的自動扣款；資產配置、負債配置、保障配置三個環形圖（可切換檢視，點擊開明細小視窗）；近 6 個月收支趨勢；本月支出分類；最近交易 |
| 固定開銷 | 彙整「手動項目＋啟用中的自動扣款＋未還清貸款的月付＋未繳完保單的保費」，季繳／年繳換算成每月台幣；月繳、年繳兩個環形圖（依項目／依分類）、總表（含當月已記錄）、手動項目可直接編輯。只做統計，不會自動記帳 |
| 資產變化 | 伺服器每天定時（預設 17:00）先更新匯率、股價，再記錄現金資產／證券資產／債務／淨資產（`asset_snapshots`）；同一張圖：現金、證券、債務畫直方，淨資產畫折線；30／90／120 天／1 年切換；組數太多就改每週、每月最後一筆；每日紀錄表 |
| 行事曆 | 月曆格子顯示每天收入（綠）支出（紅）、有轉帳標藍點；下方嵌「新增交易」表單（點日期換日期，用來補登），再下方是當天交易 |
| 支出／收入頁 | 上方分類佔比環形圖（依分類／依帳戶）；點一塊開明細：子分類佔比、與上月比較、該分類每筆交易（金額由大到小）；下方是紀錄 |
| 新增／修改交易 | 支出／收入／轉帳；主分類＋子分類；帳戶＋幣別（**不列證券戶**，證券戶只做股票交易）；跨幣別轉帳（換匯）要填轉入金額；轉入貸款可勾「額外還款」。交易列表每列有 ✏️ 修改（`#/edit/<id>`，存完回 `state.returnTo`）；貸款還款、利息、保費鎖住不能改（`entryLocked()`／`_entry_locked()`） |
| 一般帳戶頁 | 各幣別餘額、本月流入流出、交易紀錄、幣別與初始餘額；銀行可設定為某證券戶的「證券交割戶」 |
| 證券戶頁 | 持股表（代號、名稱、股數、成本、價格可直接改；均價、市值、損益、報酬率自動算；下市標記；拖曳排序；更新股價）；**股票交易**（買進／賣出，依證券戶的「手續費設定」估算手續費與賣出稅費——台股叫證交稅、外幣叫規費，本月／今年／累計已實現損益、每月損益表、交易紀錄可修改刪除；**必須綁定交割戶**）；有交割戶時顯示銀行餘額與交易 |
| 信用卡頁 | 目前欠款、自動扣款（自動入帳／提醒確認） |
| 貸款頁 | 貸款設定、記錄還款（本期／額外）、還款進度、還款紀錄（核對期數、標示同月重複、刪除整筆、重新編號並重算利息）、與銀行核對剩餘本金 |
| 保險頁 | 保單設定、繳保費、繳費紀錄、下次繳費日；儲蓄型顯示保單價值與解約損益 |
| 系統設定 | 顯示（**存在各裝置 localStorage `prefs`**）：字體大小（整頁 `zoom` 90／100／115／130%）、背景顏色（`:root[data-bg]` 五種暗色）、語言（繁體／English／日本語）。每日自動更新（**存在伺服器 `settings` 表，所有裝置共用**）：啟用、更新時間、時區 |
| 帳戶管理／分類設定／幣別設定 | 新增、改名、刪除、拖曳排序；幣別匯率可直接修改或「更新匯率」 |

## 檔案

| 路徑 | 內容 |
|---|---|
| `server.py` | 全部後端：資料表定義與遷移（`init_db`）、API 路由、Yahoo／證交所查價與匯率、自動扣款、每日排程 |
| `static/index.html` | 外框（頂欄、側欄、內容區） |
| `static/js/app.js` | 全部前端（單一檔案，無建置工具）：最上面是設定（`TYPES`、`ACCOUNT_KINDS`、`MENU`、`ICONS`） |
| `static/js/i18n.js` | 英文、日文介面對照表與規則（選了 English／日本語才載入） |
| `static/css/style.css` | 樣式；`:root` 是所有顏色變數 |
| `static/js/vendor/Sortable.min.js` | SortableJS 1.15.2（MIT），拖曳排序，放本地不走 CDN |
| `static/manifest.json`、`static/icons/` | 手機 App（PWA）設定與圖示（180 給 iOS、192／512 給 manifest） |
| `tools/icon.html` | App 圖示原始檔；用 Edge 無頭模式截圖產生 PNG（做法寫在檔案開頭） |
| `tools/test_server.py` | 用資料庫副本在 5001 跑的測試伺服器 |
| `tools/backup.py` | 備份資料庫：SQLite `backup()` 線上備份（伺服器執行中也安全），存 `backups/ledger-日期時間.db`，保留最新 N 份 |
| `deploy/raspberry-pi/` | `install.sh`（systemd 服務＋每日備份）、`update.sh`（備份 → git pull → 重開） |
| `packaging/` | 打包成 Windows 安裝程式（PyInstaller，見「打包」） |
| `data/ledger.db` | 資料（不進 git，第一次啟動自動建立） |

## 資料模型（`server.py`）

**餘額不存資料庫**：前端用「初始餘額 + 所有交易」即時計算（`balance(id, code)`），伺服器的 `account_balance()` 是同一套算法。

| 資料表 | 重點 |
|---|---|
| `entries` | 交易。`type` = expense／income／transfer。支出收入用 `account_id`＋`currency`；轉帳用 `from_account_id`／`to_account_id`，跨幣別（換匯）時 `to_currency`／`to_amount` 不同。`from_account`／`to_account` 文字欄是舊版遺留。 |
| | `loan_kind`＋`loan_id`（名稱沿用，實際是「關聯帳戶」）：`extra` 額外還款、`interest` 還款利息支出、`premium` 保費；`loan_id` 指向貸款或保險帳戶。`autopay_id` 指向產生它的自動扣款。 |
| `categories` | 支出／收入的主分類（`parent_id` NULL）與子分類；改名會一併更新 `entries` 的文字。 |
| `accounts` | `kind` = bank／securities／credit／loan／insurance。`settlement_for`：銀行帳戶是哪個證券戶的交割戶。證券戶的手續費設定 `fee_rate`（%）、`fee_min`、`tax_rate`（賣出稅費 %），NULL＝依帳戶主要幣別預設（台幣 0.1425%／20／0.3%，外幣全部 0，見前端 `FEE_DEFAULTS`）。`initial_balance` 是舊欄位，已不用。 |
| `account_currencies` | 帳戶持有哪些幣別與各自初始餘額（主鍵 account_id + currency）。 |
| `currencies` | 幣別與「1 單位 = 幾台幣」匯率；TWD 是本位幣（匯率固定 1、不能刪）。`rate_time`：從 Yahoo 更新的時間，空白＝手動設定。畫面顯示到小數點後 4 位。 |
| `holdings` | 證券戶持股：代號、名稱、股數、總成本、目前價格、幣別、`price_time`、`delisted`（已下市，更新股價時略過）。`base_shares`／`base_cost`：期初持股（股票交易紀錄之前的部位）；**有交易時 `shares`／`cost` 由 `recalc_holding()` 重播算出**，手動改股數成本會回推期初（`_holding_base()`）。 |
| `rebates` | 手續費折讓（券商先收足手續費、事後退回）：`account_id` 證券戶、`bank_id` 交割戶、日期、金額、幣別、備註。入帳到交割戶，不算收入（前端 `rebateDelta`、伺服器 `account_balance()` 都要算）；證券戶頁的每月損益表另列「折讓款」「損益＋折讓」。 |
| `trades` | 股票交易：`side` buy／sell、股數、價格、手續費、證交稅、`amount` 交割金額（買＝股數×價＋費；賣＝股數×價－費－稅）、`bank_id` 交易當時的交割戶、`currency`（跟持股）。`cost_basis`／`realized` 由重播算（移動平均成本），不要手動寫。 |
| `loans` | 貸款設定（借款金額、年利率、月付、期數、首期日、扣款帳戶、與銀行核對的 `bank_balance`／`bank_date`）。 |
| `policies` | 保單設定；`policy_type` = protection（保障型）／savings（儲蓄型），`cash_value` 保單價值。 |
| `fixed_costs` | 手動固定開銷（名稱、金額、幣別、`frequency` 1／3／6／12 個月、分類、可不填的 `account_id`、`active`）。只用於統計；API 路徑是 `fixedcosts`。`kind`／`to_account_id` 欄位目前沒有使用。 |
| `autopays` | 自動扣款（每月 `day` 號、金額、分類、`auto_post` 自動入帳或提醒、`last_posted` 已記到哪天）。 |
| `settings` | 系統設定 key/value：`snapshot_time`（HH:MM）、`snapshot_enabled`（1／0）、`tz_offset`（與 UTC 相差的分鐘，台灣 480）。 |
| `asset_snapshots` | 每日資產快照（主鍵 `date`）：`cash`、`securities`、`insurance`（儲蓄型保單價值）、`debt`、`net`，都是台幣；`auto` 1 排程／0 手動。 |

### 遷移規則

- 新表用 `CREATE TABLE IF NOT EXISTS`；新欄位在 `init_db` 用 `PRAGMA table_info` 檢查後 `ALTER TABLE ADD COLUMN`。
- **CHECK 條件改不了**（例如帳戶加新 kind）：要「改名舊表 → 建新表 → 搬共同欄位 → 刪舊表」，`accounts` 已有通用寫法。
- 預設資料（預設分類、郵局、四種幣別；`DEFAULT_CREDIT_CARDS`／`DEFAULT_LOANS` 預設是空的）只在**該表或該 kind 第一次出現時**寫入，使用者刪光也不會再冒出來。
- 動到資料庫結構前，先把 `data/ledger.db` 備份一份。

## 記帳規則（改功能時要維持）

- **轉帳不算收入支出**；收支統計、分類統計只看 expense／income，外幣換算成台幣。
- **負債型帳戶**（`DEBT_KINDS`：credit、loan）：餘額為負代表欠款；繳卡費、還款都用「銀行 → 該帳戶」的轉帳。
- **貸款**：有年利率時，「本期還款」拆成利息（支出，金融保險 › 利息支出，`loan_kind=interest`）＋本金（轉帳）；利息 = 剩餘本金 × 年利率 ÷ 12（與銀行按日計息的小差額用「與銀行核對 → 調整最近一期」修正）。額外還款全算本金。
- **保險**：保障型保費記成支出（金融保險 › 保險費），**不計入資產**；儲蓄型保費轉入保單，資產以 `cash_value`（有填時）為準。
- **證券戶**：帳戶價值 = 自身現金 + 持股市值。有交割戶時，證券戶頁面顯示銀行餘額與交易，但**淨資產只算一次**（`accountWorth` 不含交割戶；`securitiesDisplayWorth` 只用於顯示）。
- **股票交易不算收入支出**：不寫進 `entries`，用 `trades` 表；交割金額直接影響交割戶餘額（前端 `balance()` 的 `tradeDelta`、伺服器 `account_balance()` 都要算進去）。新增、修改、刪除交易後一定 `recalc_holding()`：依日期重播「期初＋所有買賣」，賣超過當時持股就丟錯（整筆不寫入）。持股有交易時不能刪；帳戶有交易時不能刪。
- **淨資產** = 資產（各帳戶正餘額＋持股市值＋儲蓄型保單價值）− 負債（信用卡、貸款、帳戶負餘額），見 `assetTotals()`。
- **資產快照**：`asset_totals(conn)` 是前端 `assetTotals()` 的伺服器版（改一邊就要改另一邊）。`snapshot_scheduler()` 每分鐘檢查：過了 `settings.snapshot_time`（依 `tz_offset` 時區）且今天沒有 `auto=1` 的紀錄就 `take_snapshot()`（先 `refresh_rates()`、`refresh_prices()`）；開機晚了會補記當天，更早漏掉的日子不補。測試伺服器不啟動排程。
- **自動扣款**：`process_autopays()` 在伺服器啟動與每次 `GET /api/entries` 時，把「自動入帳」已到期的補記成支出；31 號遇小月取月底；`last_posted` 之前的不會重記。「提醒確認」由前端列出，確認後 `POST /api/autopays/<id>/post`。

## API（摘要）

全部在 `/api/...`，JSON；錯誤回 400 `{"error": "中文訊息"}`。

- `GET` entries（`?month=YYYY-MM`，空字串＝全部）／categories／accounts（含 `currencies` 陣列）／currencies／holdings／trades／rebates／loans／policies／autopays／fixedcosts／snapshots／settings
- `POST` entries、categories、accounts、currencies（匯率留空自動查）、holdings、rebates、trades（`holding_id`，或新股票給 `symbol`＋`currency`，買進時自動建持股）、autopays、fixedcosts、snapshots（手動記錄今天）；`currencies/refresh`；`holdings/refresh`（`{account_id?}`）；`accounts/<id>/currencies`；`loans/<id>/payments|recalculate|reconcile`；`policies/<id>/payments`；`autopays/<id>/post`
- `PUT` `settings`；`<表>/<id>`（含 `entries/<id>` 修改交易、`trades/<id>`）；`<accounts|categories|currencies|holdings|autopays|fixedcosts>/order`（`{ids}` 拖曳排序）；`accounts/<id>/currencies/<代碼>`（初始餘額）
- `DELETE` `<表>/<id>`；`accounts/<id>/currencies/<代碼>`；`loans/<id>/payments/<轉帳id>`（本金＋配對利息一起刪）
- 刪除有保護：帳戶有交易、股票交易或持股不能刪；持股有股票交易不能刪；幣別被使用不能刪；帳戶最後一個幣別不能移除。

## 前端慣例（`app.js`）

- Hash 路由：`#/<route>/<arg>/<arg2>` → `PAGES[route](arg, arg2)` 回傳 `{title, sub, crumbs, html, after()}`；`render()` 重畫整頁。
- 改資料一律走 `mutate(request, afterRender)`：送出 → `reload()` → `render()`；訊息用 `state.flash = [kind, text]`。
- 事件用委派：`#content` 上的 click／change／submit，靠 `data-*` 屬性分辨；側欄按鈕在 `#menu` 上。
- 使用者輸入一律 `esc()`；金額用 `money(n, code)`，大數字可用 `shortMoney`。
- **隱私模式**（`state.privacy`，存在各裝置）：`money()`／`shortMoney()` 回傳 `NT$ *****`，數字輸入框靠 CSS 模糊。**任何金額、股數都必須經過 `money()`／`shortMoney()` 或判斷 `state.privacy`**；百分比可以照常顯示。
- **月份切換**：`monthNav()` 的年月文字上蓋透明 `<input type="month" data-month-pick>`，點了叫出原生年月選擇器；月份存在 `state.month`，各頁共用。
- **新增交易表單是共用的 `txForm(type, preset, {date, embedded, entry})`**：`newPage`、行事曆、`editPage`（`entry` 有值＝修改，帶入原本的分類、帳戶、幣別、金額）都用它；帳戶下拉用 `accountOptions(id, { cashOnly: true })`（不列證券戶，但舊交易原本選的仍保留）；點行事曆日期走 `selectCalDay()`，只換局部，不重畫整頁。
- **時區**：用固定時差 `tz_offset`（有些 Windows 的 Python 沒有 IANA 時區資料），夏令時間不會自動切換。伺服器用 `local_now()`／`local_today()`；前端 `today()` 載入設定後改用 `tzOffset`。
- **字體大小用整頁 `zoom`**：浮動提示一律用 `placeTip(tip, e)`（會除以 zoom）。
- **語言**：程式裡的文字一律寫繁體中文，切換語言是在畫面層轉換（`trText`），資料不改：
  - `static/js/i18n.js`：`I18N_TABLE`（[繁中, 英, 日]）＋ `I18N_RULES`（`pre`：日期、萬、第 N 期；`post`：「N 筆／項／天」等數量）＋ `I18N_EXACT`（單一字只在整段符合時換）。`makeTranslator()`：整段符合 → 規則 → 由長到短逐段替換。
  - **新增或修改畫面文字時，要在 `i18n.js` 補上英日翻譯**（被 `${}` 切開的片段也要收）。
  - `convertTree()` ＋ MutationObserver；`WeakMap` 記住已翻過的節點（日文翻譯也有漢字，不記住會無限重翻）；`translate="no"` 的元素不翻；`alert／confirm／prompt` 也翻譯。
  - `<option>` 只改 `label`，`option.text`／`value` 維持繁體。**不要用讀取畫面文字的方式取得要存的資料。**
- 表格內直接編輯的欄位：`change` 事件就 PUT 儲存。
- 環形圖：`DONUTS` 註冊表（`asset`、`debt`、`protection`、`expense`、`income`、`fixedMonthly`、`fixedYearly`）。**`DONUTS` 是頂層常數，裡面引用的常數必須宣告在 `DONUTS` 之前**，否則載入時 TDZ 錯誤、整個畫面空白。項目可帶 `detail()`、`href`、`note`、`records`；頁面要在 `after` 呼叫 `bindDonuts()`。
- 伺服器對所有回應加 `Cache-Control: no-cache`；「看不到新功能」時先懷疑瀏覽器快取。

### 視覺

- 暗色系，顏色只用 `style.css` `:root` 的變數；新元件不要寫死色碼。
- 圖表分類色 `--series-1`～`--series-6` 已針對暗色面板 `#1e2226` 驗證過色盲辨識度；**依固定順序使用、不要循環**，超過 5 塊就併成灰色「其他」。顏色跟著類別走，不跟排名。
- 股票損益照台股習慣**紅漲綠跌**（`--stock-up`／`--stock-down`）。
- 手機也要能用（側欄滑出、表格可橫向捲動），可「加入主畫面」當 PWA：輸入框字體維持 **16px 以上**（否則 iOS 會自動放大）；沒有 service worker（需要 HTTPS），必須連得到伺服器。

## 外部資料

- **股價**：Yahoo Finance chart API（非官方、免金鑰）。代號依幣別判斷市場：TWD → `.TW` 再試 `.TWO`、HKD → 補零 `.HK`、JPY → `.T`、其他照原樣；已含「.」就直接用。
- **匯率**：Yahoo Finance `USDTWD=X` 這類代號（`fetch_rate()`／`refresh_rates()`），市場中間價，和銀行牌告買賣價有差距。
- **台股中文名稱**：證交所 STOCK_DAY_ALL（上市）＋櫃買中心上櫃、興櫃資料，快取 12 小時（`tw_stock_names()`）。名稱不是中文才會被換掉。
- Python 3.13+ 預設 `VERIFY_X509_STRICT`，證交所憑證會被拒；只關掉 strict（仍驗證憑證），不要整個關閉驗證。

## 開發流程

1. **測試用副本**：`python tools/test_server.py` → `http://localhost:5001`，每次啟動重新複製 `data/ledger.db`。API 測試、會寫入資料的畫面測試都在這裡做。
2. **截圖檢查畫面**：Edge／Chrome 無頭模式
   `msedge --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=4000 --window-size=1366,900 --screenshot=<png> <url>`
   - 要看手機版用 520 寬。
   - 需要點擊、切換時：在 `static/` 放暫時的 `_xxx.html`，用 iframe 載入頁面並模擬操作，用完立刻刪掉（`_` 開頭的檔案不會被打包）。**會寫入資料的操作一定對著 5001 測試伺服器跑。**
   - App 圖示改了 `tools/icon.html` 後，用無頭模式加 `--force-device-scale-factor=1 --window-size=<尺寸>,<尺寸>` 和 `?size=<尺寸>` 重新產生 `static/icons/icon-180|192|512.png`。
3. **部署**：伺服器只在啟動時載入 `server.py`，改了後端要重開；只改 `static/` 的話重新整理即可。Windows 上 `python` 啟動器會留下子行程，要用 CommandLine 找出 `server.py` 的行程再關。
4. 讀正式資料只用唯讀連線：`sqlite3.connect("file:...ledger.db?mode=ro", uri=True)`。

## 打包（`packaging/`，目前暫停使用）

- `python packaging\build.py` → `release\記帳本安裝程式.exe`、`release\記帳本解除安裝.exe`。會在 `packaging\.venv` 建獨立環境（PyInstaller、Pillow）。**只打包 `server.py`＋`static\`，不包含 `data\`。**
- 安裝到 `%LOCALAPPDATA%\Programs\LedgerBook`、資料在 `%LOCALAPPDATA%\記帳本`，不需要系統管理員權限；`--silent` 可無視窗安裝／解除安裝。
- 測試安裝一定要設 `LEDGER_INSTALL_TEST=<暫存資料夾>`（安裝位置、捷徑、登錄機碼、連接埠都改到測試處）。
- 沒有程式碼簽章：開著 Windows 11「智慧型應用程式控制」的電腦可能直接擋下 exe（沒有「仍要執行」），所以目前建議用原始碼（README）方式使用。

## 已知限制與可能的下一步

- 貸款還款、利息、保費不能直接修改，要在該帳戶頁刪除後重記。
- 股票已實現損益用移動平均成本（部分券商用先進先出，數字會略有不同）；沒有股利、除權息紀錄。
- **隱私模式只是遮住畫面**，不是密碼保護。
- 自動備份只有 Linux 的 systemd timer；Windows 要自己排程 `tools/backup.py`。沒有登入功能（不能公開到網路）、沒有離線記帳。
- 中文股名只涵蓋上市、上櫃、興櫃；外國股票用 Yahoo 的英文名稱（可自行改名，不會被覆蓋）。

## Shell 注意事項（Windows）

- PowerShell 5.1：沒有 `&&`；中文輸出可能亂碼，Python 加 `$env:PYTHONIOENCODING = "utf-8"`。
- 在 PowerShell／bash 用 `python -c "..."` 時，字串裡的引號與反斜線容易出錯；複雜的就寫成 .py 檔再執行。
- 大段修改 `server.py`／`app.js` 時，用 Python 腳本做「舊字串必須剛好出現一次」的替換（assert count == 1）。
