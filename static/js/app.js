// ===== 設定：交易類型、帳戶種類、側邊選單從這裡改 =====
// （分類請到網頁的「分類設定」、帳戶到「帳戶管理」、幣別與匯率到「幣別設定」管理）
const BASE = "TWD"; // 本位幣：統計一律換算成台幣

const TYPES = {
  expense: { name: "支出", icon: "out", btn: "btn-danger", box: "box-danger", text: "text-danger", sign: "-" },
  income: { name: "收入", icon: "in", btn: "btn-success", box: "box-success", text: "text-success", sign: "" },
  transfer: { name: "轉帳", icon: "transfer", btn: "btn-primary", box: "box-primary", text: "text-primary", sign: "" },
};

const ACCOUNT_KINDS = {
  bank: { name: "帳戶", icon: "bank", box: "box-primary", color: "aqua", example: "台新銀行", initialHint: "初始餘額" },
  securities: { name: "證券戶", icon: "stock", box: "box-warning", color: "yellow", example: "元大證券", initialHint: "初始餘額" },
  credit: { name: "信用卡", icon: "card", box: "box-purple", color: "purple", example: "玉山 Pi 卡", initialHint: "目前欠款填負數" },
  loan: { name: "貸款", icon: "loan", box: "box-danger", color: "red", example: "房屋貸款", initialHint: "剩餘本金填負數" },
  insurance: { name: "保險", icon: "shield", box: "box-success", color: "green", example: "○○人壽 美元儲蓄險", initialHint: "記帳前已繳保費" },
};
// 負債型帳戶：餘額是負的（欠款），頁面上改顯示欠多少
const DEBT_KINDS = {
  credit: { label: "目前欠款", hint: "繳卡費請用「轉帳」從銀行轉入", initialHint: "開始記帳前已經欠多少，請填負數，例如 -3000" },
  loan: { label: "剩餘貸款", hint: "還款請用「轉帳」從銀行轉入；利息可另記支出", initialHint: "開始記帳前還欠多少本金，請填負數，例如 -250000" },
};

// { accounts: "bank" } 這種項目會展開成該種類的所有帳戶
const MENU = [
  { header: "主選單" },
  { route: "", label: "首頁", icon: "dashboard" },
  { route: "fixed", label: "固定開銷", icon: "repeat" },
  { route: "assets", label: "資產變化", icon: "chart" },
  { header: "會計" },
  { route: "calendar", label: "行事曆", icon: "calendar" },
  { route: "expense", label: "支出", icon: "out" },
  { route: "income", label: "收入", icon: "in" },
  { route: "transfer", label: "轉帳", icon: "transfer" },
  { route: "new", label: "新增交易", icon: "plus" },
  { header: "帳戶" },
  { accounts: "bank" },
  { header: "證券戶", action: { id: "refresh-all-prices", label: "更新股價", icon: "refresh", title: "一次更新所有證券戶的股價（Yahoo Finance）" } },
  { accounts: "securities" },
  { header: "信用卡" },
  { accounts: "credit" },
  { header: "貸款" },
  { accounts: "loan" },
  { header: "保險" },
  { accounts: "insurance" },
  { header: "分類" },
  { route: "categories", label: "分類統計", icon: "tag" },
  { header: "設定" },
  { route: "prefs", label: "系統設定", icon: "sliders" },
  { route: "accounts", label: "帳戶管理", icon: "bank" },
  { route: "settings", label: "分類設定", icon: "gear" },
  { route: "currencies", label: "幣別設定", icon: "coin" },
];

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  out: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  in: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  transfer: '<path d="M4 8h15l-4-4M20 16H5l4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
  bank: '<path d="M3 10h18M12 3l9 5H3zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  stock: '<path d="M7 3v18M17 3v18"/><rect x="4.5" y="7" width="5" height="8"/><rect x="14.5" y="10" width="5" height="6"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  loan: '<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M19 5L5 19"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9a2 2 0 0 0-1.8-1h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1M12 6v2m0 8v2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0zM8 21h8"/>',
  chart: '<path d="M3 3v18h18M7 15l4-4 3 3 6-6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
};

// ===== 工具函式 =====
const $ = (sel) => document.querySelector(sel);
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// 時區：載入系統設定後改成伺服器設定的時差（分鐘），之前先用這台裝置的時區
let tzOffset = null;
const today = () => {
  if (tzOffset != null) return new Date(Date.now() + tzOffset * 60000).toISOString().slice(0, 10);
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const monthLabel = (m) => `${m.slice(0, 4)} 年 ${Number(m.slice(5))} 月`;
const shiftMonth = (m, delta) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// ===== 資料 =====
const state = { entries: [], categories: [], accounts: [], currencies: [], holdings: [], loans: [], policies: [], autopays: [], fixedcosts: [], snapshots: [], settings: {}, trades: [], month: today().slice(0, 7), flash: null };
// 隱私模式：金額顯示成 *****；開關記在這台裝置（手機設了不影響電腦）
const MASK = "*****";
state.privacy = (() => {
  try { return localStorage.getItem("privacy") === "1"; } catch { return false; }
})();
// 顯示偏好：字體大小、背景顏色、語言，存在這台裝置
const prefs = (() => {
  const base = { font: "100", bg: "default", lang: "tw" };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("prefs") || "{}"); } catch { /* 讀不到就用預設 */ }
  const p = { ...base, ...saved };
  if (!["tw", "en", "ja"].includes(p.lang)) p.lang = "tw"; // 已取消的語言（例如简体）改回繁體
  return p;
})();
function savePrefs() {
  try { localStorage.setItem("prefs", JSON.stringify(prefs)); } catch { /* 無痕模式等情況記不住，僅本次有效 */ }
}
function applyPrefs() {
  const root = document.documentElement;
  root.style.zoom = prefs.font === "100" ? "" : String(Number(prefs.font) / 100);
  root.dataset.bg = prefs.bg;
  root.lang = { en: "en", ja: "ja" }[prefs.lang] ?? "zh-Hant";
  const bar = { navy: "#17202c", black: "#0c0d0f", green: "#16211d", purple: "#1d1826" }[prefs.bg] ?? "#1f2429";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bar);
}
applyPrefs();

// 語言：繁體中文是原文；English／日本語用 i18n.js 的對照表翻譯。只改畫面文字，資料本身不改。
// <option> 只改 label（顯示文字），option.text 仍是原本的繁體，送出時不會把翻譯寫進資料庫。
// 不要翻譯的元素加 translate="no"（例如語言選單本身）。
let trText = null;
const tr = (s) => (trText && s ? trText(s) : s);

// 英文：中文標點換成英文標點並整理空白
const EN_PUNCT = { "，": ", ", "。": ". ", "：": ": ", "；": "; ", "、": ", ", "（": " (", "）": ") ", "「": " “", "」": "” ",
  "？": "? ", "！": "! ", "＋": " + ", "＝": " = ", "－": " − ", "～": "–", "・": " · ", "／": " / " };
function tidyEnglish(t) {
  return t.replace(/[，。：；、（）「」？！＋＝－～・／]/g, (c) => EN_PUNCT[c])
    .replace(/\s+/g, " ").replace(/\s+([,.:;!?)%”])/g, "$1").replace(/([(“])\s+/g, "$1").trim();
}
// 用 i18n.js 的對照表做翻譯函式：整段符合就整段換；否則先套格式規則（日期、筆數…），再由長到短逐段替換
function makeTranslator(lang) {
  const col = lang === "en" ? 1 : 2;
  const dict = new Map(window.I18N_TABLE.map((row) => [row[0], row[col]]));
  const exact = window.I18N_EXACT[lang];
  const rules = window.I18N_RULES[lang];
  const SINGLE = ["與", "從", "起", "共"]; // 單一字只開放這幾個逐段替換，其他（例如「大」）只在整段符合時換，避免改到帳戶名稱
  const keys = [...dict.keys()].filter((k) => k.length > 1 || SINGLE.includes(k)).sort((x, y) => y.length - x.length);
  const re = new RegExp(keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
  const en = lang === "en";
  return (s) => {
    if (!/[\u3400-\u9fff]/.test(s)) return s;
    const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0];
    let t = s.trim();
    if (exact[t] != null) return lead + exact[t] + tail;
    if (dict.has(t)) return lead + dict.get(t) + tail;
    for (const [pattern, to] of rules.pre) t = t.replace(pattern, to); // 日期、萬…
    t = t.replace(re, (m) => (en ? ` ${dict.get(m)} ` : dict.get(m)));
    for (const [pattern, to] of rules.post) t = t.replace(pattern, to); // 「3 筆」這類數量
    t = en ? tidyEnglish(t) : t.replace(/，/g, "、");
    return lead + t + tail;
  };
}

// 記住每個文字節點翻好的結果：日文翻譯裡也有漢字，不記住的話 MutationObserver 會一直重翻、停不下來
const translated = new WeakMap();
function convertTree(root) {
  if (!trText || !root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    const p = root.parentNode;
    if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) || p.closest?.('[translate="no"]')) return;
    if (p.nodeName === "OPTION") { const label = trText(p.text); if (p.label !== label) p.label = label; return; }
    if (translated.get(root) === root.nodeValue) return;
    const v = trText(root.nodeValue);
    translated.set(root, v);
    if (v !== root.nodeValue) root.nodeValue = v;
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  for (const el of [root, ...root.querySelectorAll("[placeholder],[title],[aria-label]")]) {
    if (el.closest('[translate="no"]')) continue;
    for (const attr of ["placeholder", "title", "aria-label"]) {
      const v = el.getAttribute?.(attr);
      if (v) { const c = trText(v); if (c !== v) el.setAttribute(attr, c); }
    }
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(convertTree);
}
const loadScript = (src) => new Promise((resolve, reject) => {
  const script = document.createElement("script");
  script.src = src;
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});
async function setupLanguage() {
  if (prefs.lang === "tw" || trText) return;
  try {
    await loadScript("js/i18n.js");
    trText = makeTranslator(prefs.lang);
  } catch {
    return; // 載入失敗就維持繁體
  }
  convertTree(document.body);
  document.title = tr(document.title);
  // 跳出的確認、輸入、提示視窗也翻譯（預設值不翻，例如改名時原本的名稱）
  for (const fn of ["alert", "confirm", "prompt"]) {
    const orig = window[fn].bind(window);
    window[fn] = (msg, ...rest) => orig(tr(String(msg ?? "")), ...rest);
  }
  new MutationObserver((list) => list.forEach((m) => {
    if (m.type === "characterData") convertTree(m.target);
    else m.addedNodes.forEach(convertTree);
  })).observe(document.body, { childList: true, subtree: true, characterData: true });
}

const inMonth = (m) => state.entries.filter((r) => r.date.startsWith(m));
const mainCategories = (type) => state.categories.filter((c) => c.type === type && c.parent_id === null);
const subCategories = (parentId) => state.categories.filter((c) => c.parent_id === parentId);
const findAccount = (id) => state.accounts.find((a) => a.id === Number(id));
const accountsOf = (kind) => state.accounts.filter((a) => a.kind === kind);
const accountName = (id) => findAccount(id)?.name ?? "";
const fromName = (r) => accountName(r.from_account_id) || r.from_account;
const toName = (r) => accountName(r.to_account_id) || r.to_account;

// ----- 幣別 -----
const currency = (code) => state.currencies.find((c) => c.code === code);
const symbol = (code) => currency(code)?.symbol ?? code;
const rate = (code) => currency(code)?.rate ?? 1;
const toBase = (n, code) => n * rate(code);
const money = (n, code = BASE) =>
  state.privacy ? `${symbol(code)} ${MASK}`
    : (n < 0 ? "-" : "") + symbol(code) + " " + Math.abs(n).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
// 收入/支出合計（換算成台幣）
const sumBase = (rows, type) => rows.filter((r) => r.type === type).reduce((s, r) => s + toBase(r.amount, r.currency), 0);
const accountCodes = (a) => a?.currencies.map((h) => h.currency) ?? [];

// ----- 帳戶餘額（每個幣別分開算） -----
// 一筆交易對某帳戶某幣別的影響（正數 = 流入）
function accountDelta(r, id, code) {
  if (r.type === "transfer") {
    let d = 0;
    if (r.from_account_id === id && r.currency === code) d -= r.amount;
    if (r.to_account_id === id && (r.to_currency ?? r.currency) === code) d += r.to_amount ?? r.amount;
    return d;
  }
  if (r.account_id !== id || r.currency !== code) return 0;
  return r.type === "income" ? r.amount : -r.amount;
}
// 一筆交易對某帳戶各幣別的影響，例如換匯會同時影響兩個幣別
function accountEffects(r, id) {
  const codes = new Set([r.currency, r.to_currency].filter(Boolean));
  return [...codes].map((code) => ({ code, delta: accountDelta(r, id, code) })).filter((e) => e.delta !== 0);
}
// 股票交割對交割戶的影響：買進扣款、賣出入帳
const tradeDelta = (t, id, code) => (t.bank_id === id && t.currency === code ? (t.side === "sell" ? t.amount : -t.amount) : 0);
function balance(id, code) {
  const initial = findAccount(id)?.currencies.find((h) => h.currency === code)?.initial_balance ?? 0;
  const cash = state.entries.reduce((b, r) => b + accountDelta(r, id, code), initial);
  return state.trades.reduce((b, t) => b + tradeDelta(t, id, code), cash);
}
// 帳戶所有幣別換算成台幣的總額
function balanceBase(id) {
  return accountCodes(findAccount(id)).reduce((s, code) => s + toBase(balance(id, code), code), 0);
}
// ----- 證券戶持股 -----
const holdingsOf = (id) => state.holdings.filter((h) => h.account_id === id);
const marketValue = (h) => h.shares * h.price;
const profit = (h) => marketValue(h) - h.cost;
const holdingsBase = (id) => holdingsOf(id).reduce((s, h) => s + toBase(marketValue(h), h.currency), 0);
// 帳戶總值（台幣）= 各幣別現金 + 持股市值
// 保險：儲蓄型有填保單價值就以保單價值為準；保障型不算資產
const policyOf = (id) => state.policies.find((p) => p.account_id === id)
  ?? { insurer: "", policy_type: "protection", premium: 0, frequency: 12, pay_years: 0, start_date: "", sum_insured: 0,
    cash_value: null, cash_value_date: "", pay_account_id: null, note: "" };
function insuranceWorth(a) {
  const p = policyOf(a.id);
  if (p.policy_type !== "savings") return 0; // 保障型：保費繳了就拿不回來，不算資產
  if (p.cash_value != null) return toBase(p.cash_value, accountCodes(a)[0] ?? BASE);
  return balanceBase(a.id);
}
// 大金額用「萬」表示，例如 NT$ 100 萬
const shortMoney = (n, code = BASE) =>
  !state.privacy && Math.abs(n) >= 1e4 ? `${symbol(code)} ${(n / 1e4).toLocaleString("zh-TW", { maximumFractionDigits: 1 })} 萬` : money(n, code);
// 證券交割戶：settlement_for 存在銀行帳戶上，指向證券戶
const settlementBankOf = (secId) => state.accounts.find((b) => b.kind === "bank" && b.settlement_for === secId);
// 證券戶「顯示用」總值：持股＋自身現金＋交割戶餘額（只用於顯示；淨資產加總用 accountWorth，避免重複）
const securitiesDisplayWorth = (a) => {
  const bank = settlementBankOf(a.id);
  return holdingsBase(a.id) + balanceBase(a.id) + (bank ? balanceBase(bank.id) : 0);
};
const accountWorth = (id) => {
  const a = findAccount(id);
  return a?.kind === "insurance" ? insuranceWorth(a) : balanceBase(id) + holdingsBase(id);
};

// 帳戶餘額的文字：只有一個幣別且沒有持股就用該幣別，否則顯示「≈ 台幣總額」
function accountTotalText(a) {
  const codes = accountCodes(a);
  if (a.kind === "securities" && settlementBankOf(a.id)) return "≈ " + money(securitiesDisplayWorth(a));
  const p = a.kind === "insurance" ? policyOf(a.id) : null;
  if (p?.policy_type === "savings" && p.cash_value != null) return money(p.cash_value, codes[0] ?? BASE);
  if (p && p.policy_type !== "savings") return p.sum_insured ? `保額 ${shortMoney(p.sum_insured, codes[0] ?? BASE)}` : "保障型";
  if (codes.length === 1 && !holdingsOf(a.id).length) return money(balance(a.id, codes[0]), codes[0]);
  return "≈ " + money(accountWorth(a.id));
}

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
async function reload() {
  [state.entries, state.categories, state.accounts, state.currencies, state.holdings, state.loans, state.policies, state.autopays, state.fixedcosts, state.snapshots, state.settings, state.trades] = await Promise.all([
    api("/api/entries?month="),
    api("/api/categories"),
    api("/api/accounts"),
    api("/api/currencies"),
    api("/api/holdings"),
    api("/api/loans"),
    api("/api/policies"),
    api("/api/autopays"),
    api("/api/fixedcosts"),
    api("/api/snapshots"),
    api("/api/settings"),
    api("/api/trades"),
  ]);
  tzOffset = Number(state.settings.tz_offset);
}
// 送出變更 → 重新載入 → 重畫；失敗就顯示錯誤
async function mutate(request, afterRender) {
  try {
    await request();
    await reload();
    render();
    afterRender?.();
  } catch (err) {
    showAlert("danger", err.message);
  }
}

// ===== 共用元件 =====
function infoBox(color, iconName, text, number, more = "") {
  return `<div class="info-box">
    <span class="info-box-icon bg-${color}">${icon(iconName)}</span>
    <div class="info-box-content">
      <span class="info-box-text">${text}</span>
      <span class="info-box-number">${number}</span>
      ${more ? `<span class="info-box-more">${more}</span>` : ""}
    </div>
  </div>`;
}

function box(title, body, { cls = "box-primary", tools = "", footer = "", flush = false, id = "" } = {}) {
  return `<div class="box ${cls}"${id ? ` data-id="${id}"` : ""}>
    <div class="box-header"><h3 class="box-title">${title}</h3>${tools ? `<div class="box-tools">${tools}</div>` : ""}</div>
    <div class="box-body${flush ? " no-padding" : ""}">${body}</div>
    ${footer ? `<div class="box-footer">${footer}</div>` : ""}
  </div>`;
}

// 依交易類型上色的金額（台幣統計用）
function amount(type, value, code = BASE) {
  const t = TYPES[type];
  return `<span class="amount ${t.text}">${t.sign}${money(value, code)}</span>`;
}
// 交易本身的金額（原幣別）；跨幣別轉帳顯示「轉出 → 轉入」
function entryAmount(r) {
  if (r.type === "transfer" && r.to_currency && r.to_currency !== r.currency) {
    return `<span class="amount text-primary">${money(r.amount, r.currency)} → ${money(r.to_amount, r.to_currency)}</span>`;
  }
  return amount(r.type, r.amount, r.currency);
}
// 帶正負號的金額（帳戶頁用：流入綠、流出紅）
function signedAmount(v, code) {
  return `<span class="amount ${v < 0 ? "text-danger" : "text-success"}">${v > 0 ? "+" : ""}${money(v, code)}</span>`;
}
// 餘額：負數才標紅
function balanceText(v, code) {
  return `<span class="amount${v < 0 ? " text-danger" : ""}">${money(v, code)}</span>`;
}
// 股票損益：照台股習慣紅漲綠跌
const plClass = (v) => (v > 0 ? "pl-up" : v < 0 ? "pl-down" : "");
function plText(v, code) {
  return `<span class="amount ${plClass(v)}">${v > 0 ? "+" : ""}${money(v, code)}</span>`;
}
function plPct(v) {
  return `<span class="amount ${plClass(v)}">${v > 0 ? "+" : ""}${v.toFixed(2)}%</span>`;
}

function categoryCell(r) {
  if (r.type === "transfer") {
    let label = r.to_currency && r.to_currency !== r.currency ? "換匯" : "轉帳";
    const toKind = findAccount(r.to_account_id)?.kind;
    if (toKind === "loan") label = r.loan_kind === "extra" ? "額外還款" : "還款";
    if (toKind === "insurance") label = "保費";
    return `<span class="muted">${label}</span>`;
  }
  return esc(r.category) + (r.subcategory ? ` <span class="muted">› ${esc(r.subcategory)}</span>` : "");
}
function accountCell(r) {
  if (r.type === "transfer") return `${esc(fromName(r))} → ${esc(toName(r))}`;
  return esc(accountName(r.account_id)) || `<span class="muted">—</span>`;
}

// 貸款還款、利息、保費是系統拆分過的，不能直接修改（和伺服器 _entry_locked 同一套規則）
function entryLocked(r) {
  if (r.loan_kind) return true;
  return r.type === "transfer" && ["loan", "insurance"].includes(findAccount(r.to_account_id)?.kind);
}

// accountId 有值時，金額改成相對該帳戶的流入/流出（各幣別分開列）
function txTable(rows, { deletable = true, accountId = null, showDate = true } = {}) {
  if (!rows.length) return `<p class="empty">沒有交易紀錄</p>`;
  return `<div class="table-wrap"><table class="table table-hover">
    <thead><tr>${showDate ? "<th>日期</th>" : ""}<th>分類</th><th>帳戶</th><th>描述</th><th class="text-right">金額</th>${deletable ? "<th></th>" : ""}</tr></thead>
    <tbody>${rows.map((r) => `<tr>
      ${showDate ? `<td class="nowrap">${r.date}</td>` : ""}
      <td>${categoryCell(r)}</td>
      <td>${accountCell(r)}</td>
      <td class="muted">${esc(r.note) || "—"}</td>
      <td class="text-right">${accountId
        ? accountEffects(r, accountId).map((e) => signedAmount(e.delta, e.code)).join("<br>")
        : entryAmount(r)}</td>
      ${deletable ? `<td class="text-right nowrap">${entryLocked(r)
        ? `<span class="muted" title="貸款還款、保費請到該帳戶頁的還款／繳費紀錄處理">${icon("lock")}</span>`
        : `<button class="btn btn-xs btn-default" data-edit="${r.id}" title="修改">${icon("edit")}</button>`}
        <button class="btn btn-xs btn-default" data-del="${r.id}" title="刪除">${icon("trash")}</button></td>` : ""}
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function monthNav() {
  return `<div class="btn-group">
    <button class="btn btn-default btn-sm" data-month="-1" aria-label="上個月">‹</button>
    <label class="btn btn-default btn-sm static month-pick" title="選擇年月">${monthLabel(state.month)}
      <input type="month" value="${state.month}" data-month-pick aria-label="選擇年月"></label>
    <button class="btn btn-default btn-sm" data-month="1" aria-label="下個月">›</button>
  </div>`;
}

const dragHandle = `<span class="drag-handle" title="拖曳排序">${icon("grip")}</span>`;

// 讓 el 的子元素可以拖曳排序，放開後把新順序（子元素的 data-id）存到 url
function makeSortable(el, url, options = {}) {
  if (!el || !window.Sortable) return;
  Sortable.create(el, {
    animation: 150,
    delay: 150, // 手機上要按住一下才開始拖，避免跟捲動打架
    delayOnTouchOnly: true,
    ghostClass: "sortable-ghost",
    ...options,
    onEnd(evt) {
      if (evt.oldIndex === evt.newIndex) return;
      const ids = [...el.children].map((child) => Number(child.dataset.id)).filter(Boolean);
      mutate(() => api(url, { method: "PUT", body: JSON.stringify({ ids }) }));
    },
  });
}

// 帳戶下拉選單的選項，依種類分組
function accountOptions(selectedId, { cashOnly = false } = {}) {
  return Object.entries(ACCOUNT_KINDS).map(([kind, k]) => {
    const list = accountsOf(kind).filter((a) => !cashOnly || kind !== "securities" || a.id === Number(selectedId));
    if (!list.length) return "";
    return `<optgroup label="${k.name}">${list.map((a) =>
      `<option value="${a.id}"${a.id === selectedId ? " selected" : ""}>${esc(a.name)}</option>`
    ).join("")}</optgroup>`;
  }).join("");
}
// 幣別下拉選單的選項
function currencyOptions(codes, selected) {
  return codes.map((code) =>
    `<option value="${esc(code)}"${code === selected ? " selected" : ""}>${esc(code)} ${esc(currency(code)?.name ?? "")}</option>`
  ).join("");
}

function byCategory(rows) {
  const map = {};
  rows.forEach((r) => (map[r.category] = (map[r.category] || 0) + toBase(r.amount, r.currency)));
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function progressList(items, total) {
  if (!items.length) return `<p class="empty">本月還沒有支出</p>`;
  return items.map(([name, v]) => {
    const pct = total ? (v / total) * 100 : 0;
    return `<div class="progress-item">
      <div class="progress-label"><span>${esc(name)}</span><span>${money(v)} <small class="muted">(${pct.toFixed(0)}%)</small></span></div>
      <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
    </div>`;
  }).join("");
}

function barChart(months) {
  const W = 600, H = 220, L = 60, R = 10, T = 10, B = 28;
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  // 刻度取 1、2、2.5、5 × 10ⁿ，讓 Y 軸數字好讀
  const raw = max / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((k) => k * p >= raw) * p;
  const top = step * 4;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const cw = (W - L - R) / months.length;
  const bw = Math.min(24, cw / 3);
  // 隱私模式不顯示金額刻度（長條高度仍可看出相對大小）
  const short = (v) => (state.privacy ? "" : v >= 10000 ? `${+(v / 10000).toFixed(1)}萬` : v.toLocaleString("zh-TW"));
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="近 6 個月收支">`;
  for (let i = 0; i <= 4; i++) {
    const v = (top * i) / 4;
    s += `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`;
    s += `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${short(v)}</text>`;
  }
  months.forEach((m, i) => {
    const cx = L + cw * i + cw / 2;
    s += `<rect class="bar-in" x="${cx - bw - 1}" y="${y(m.income)}" width="${bw}" height="${y(0) - y(m.income)}"><title>收入 ${money(m.income)}</title></rect>`;
    s += `<rect class="bar-out" x="${cx + 1}" y="${y(m.expense)}" width="${bw}" height="${y(0) - y(m.expense)}"><title>支出 ${money(m.expense)}</title></rect>`;
    s += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${m.label}</text>`;
  });
  return s + `</svg><div class="legend"><span><i class="bg-green"></i>收入</span><span><i class="bg-red"></i>支出</span></div>`;
}

// ----- 資產配置／負債配置（環形圖） -----
// 依類別的分組：顏色固定跟著類別走，不因金額排名改變
const ASSET_GROUPS = [
  { key: "twd", name: "台幣存款", color: "var(--series-1)" },
  { key: "fx", name: "外幣存款", color: "var(--series-2)" },
  { key: "seccash", name: "證券戶現金", color: "var(--series-3)" },
  { key: "twstock", name: "台股", color: "var(--series-4)" },
  { key: "fxstock", name: "海外股票", color: "var(--series-5)" },
  { key: "insurance", name: "保險（保單價值）", color: "var(--series-6)" },
];
const DEBT_GROUPS = [
  { key: "credit", name: "信用卡", color: "var(--series-1)" },
  { key: "loan", name: "貸款", color: "var(--series-2)" },
  { key: "negative", name: "帳戶負餘額", color: "var(--series-3)" },
];
const SERIES_COLORS = [1, 2, 3, 4, 5].map((i) => `var(--series-${i})`);

// 算出資產（正數部分）與負債（信用卡、貸款、帳戶負餘額），全部換算成台幣
function assetTotals() {
  const groups = Object.fromEntries(ASSET_GROUPS.map((g) => [g.key, 0]));
  const debts = Object.fromEntries(DEBT_GROUPS.map((g) => [g.key, 0]));
  for (const a of state.accounts) {
    if (a.kind === "insurance") {
      groups.insurance += Math.max(0, accountWorth(a.id));
      continue;
    }
    for (const code of accountCodes(a)) {
      const v = toBase(balance(a.id, code), code);
      if (DEBT_KINDS[a.kind]) debts[a.kind] -= v; // 信用卡、貸款（溢繳的正數會抵減）
      else if (v < 0) debts.negative -= v; // 一般帳戶或證券戶餘額是負的
      else if (a.kind === "securities") groups.seccash += v;
      else groups[code === BASE ? "twd" : "fx"] += v;
    }
    for (const h of holdingsOf(a.id)) groups[h.currency === BASE ? "twstock" : "fxstock"] += toBase(marketValue(h), h.currency);
  }
  const assets = Object.values(groups).reduce((s, v) => s + v, 0);
  const debt = Object.values(debts).reduce((s, v) => s + v, 0);
  return { groups, debts, assets, debt, net: assets - debt };
}

// 依帳戶：前 5 大，其餘併成「其他」；顏色依帳戶在清單中的順序，不依金額排名
// list 的每一項可帶 detail（點擊後的明細）與 href（帳戶頁）
function topAccounts(list, unit = "個帳戶") {
  const top = [...list].sort((x, y) => y.value - x.value).slice(0, 5);
  const items = list.filter((x) => top.includes(x)).map((x, i) => ({ ...x, color: SERIES_COLORS[i] }));
  const rest = list.filter((x) => !top.includes(x));
  if (rest.length) {
    items.push({
      name: `其他 ${rest.length} ${unit}`, value: rest.reduce((s, x) => s + x.value, 0), color: "var(--series-other)",
      detail: () => rest.map(({ name, value, href, sub, note }) => ({ name, value, href, sub: sub ?? note })),
      ...(rest.some((x) => x.records) && { records: rest.flatMap((x) => x.records ?? []) }),
    });
  }
  return items;
}

// ----- 明細：點擊環形圖某一塊時顯示的內容 -----
const accountHref = (a) => `#/account/${a.id}`;
const isCashAccount = (a) => !DEBT_KINDS[a.kind] && !["securities", "insurance"].includes(a.kind);

// 各帳戶各幣別的正餘額（filter 決定要哪些帳戶／幣別）
function cashDetail(filter) {
  const out = [];
  for (const a of state.accounts) {
    for (const code of accountCodes(a)) {
      if (!filter(a, code)) continue;
      const b = balance(a.id, code);
      const v = toBase(b, code);
      if (v > 0) out.push({ name: code === BASE ? a.name : `${a.name}（${code}）`, value: v, sub: code === BASE ? "" : money(b, code), href: accountHref(a) });
    }
  }
  return out;
}

// 各檔股票市值；同一檔在多個證券戶會合併。foreign：true 海外／false 台股／null 全部
function stockDetail(foreign, accountId = null) {
  const map = new Map();
  for (const h of state.holdings) {
    if (accountId != null && h.account_id !== accountId) continue;
    if (foreign != null && (h.currency !== BASE) !== foreign) continue;
    const v = toBase(marketValue(h), h.currency);
    if (v <= 0) continue;
    const key = `${h.symbol}|${h.currency}`;
    const e = map.get(key) ?? { name: `${h.symbol} ${h.name}`.trim(), value: 0, accounts: new Set(), shares: 0, code: h.currency };
    e.value += v;
    e.shares += h.shares;
    e.accounts.add(accountName(h.account_id));
    map.set(key, e);
  }
  return [...map.values()].map((e) => ({
    name: e.name, value: e.value,
    sub: `${state.privacy ? MASK : e.shares.toLocaleString("zh-TW")} 股・${[...e.accounts].join("、")}${e.code !== BASE ? `・${e.code}` : ""}`,
  }));
}

// 單一帳戶的組成：各幣別現金＋各檔持股（保險則為保單價值）
function accountDetail(a) {
  if (a.kind === "insurance") return [{ name: a.name, value: accountWorth(a.id), href: accountHref(a) }];
  const cash = accountCodes(a).flatMap((code) => {
    const b = balance(a.id, code);
    const v = toBase(b, code);
    return v > 0 ? [{ name: `現金（${currency(code)?.name ?? code}）`, value: v, sub: code === BASE ? "" : money(b, code) }] : [];
  });
  return [...cash, ...stockDetail(null, a.id)];
}

// 欠款：負債型帳戶看整體；一般帳戶只算負的幣別餘額
const debtOwed = (a) => (DEBT_KINDS[a.kind]
  ? -balanceBase(a.id)
  : -accountCodes(a).reduce((s, code) => s + Math.min(0, toBase(balance(a.id, code), code)), 0));
const debtAccounts = (kind) => state.accounts.filter((a) => a.kind === kind)
  .map((a) => ({ name: a.name, value: debtOwed(a), href: accountHref(a) })).filter((x) => x.value > 0);

const ASSET_DETAIL = {
  twd: () => cashDetail((a, code) => isCashAccount(a) && code === BASE),
  fx: () => cashDetail((a, code) => isCashAccount(a) && code !== BASE),
  seccash: () => cashDetail((a) => a.kind === "securities"),
  twstock: () => stockDetail(false),
  fxstock: () => stockDetail(true),
  insurance: () => state.accounts.filter((a) => a.kind === "insurance")
    .map((a) => ({ name: a.name, value: accountWorth(a.id), href: accountHref(a) })).filter((x) => x.value > 0),
};
const DEBT_DETAIL = {
  credit: () => debtAccounts("credit"),
  loan: () => debtAccounts("loan"),
  negative: () => state.accounts.filter((a) => !DEBT_KINDS[a.kind])
    .map((a) => ({ name: a.name, value: debtOwed(a), href: accountHref(a) })).filter((x) => x.value > 0),
};

// 保障型保單：依保額或依年保費（月繳×12、季繳×4…）
const protectionPolicies = () => state.accounts.filter((a) => a.kind === "insurance" && policyOf(a.id).policy_type !== "savings");
function protectionItems(view) {
  return topAccounts(protectionPolicies()
    .map((a) => {
      const p = policyOf(a.id);
      const code = accountCodes(a)[0] ?? BASE;
      const value = view === "premium" ? (p.premium * 12) / p.frequency : p.sum_insured;
      return { name: a.name, value: toBase(value, code), href: accountHref(a) };
    })
    .filter((x) => x.value > 0), "張保單");
}

function assetItems(view) {
  if (view === "account") {
    return topAccounts(state.accounts
      .filter((a) => !DEBT_KINDS[a.kind])
      .map((a) => ({ name: a.name, value: accountWorth(a.id), href: accountHref(a), detail: () => accountDetail(a) }))
      .filter((x) => x.value > 0));
  }
  const { groups } = assetTotals();
  return ASSET_GROUPS.map((g) => ({ name: g.name, value: groups[g.key], color: g.color, detail: ASSET_DETAIL[g.key] }))
    .filter((x) => x.value > 0);
}

function debtItems(view) {
  if (view === "account") {
    return topAccounts(state.accounts
      .map((a) => ({ name: a.name, value: debtOwed(a), href: accountHref(a) }))
      .filter((x) => x.value > 0));
  }
  const { debts } = assetTotals();
  return DEBT_GROUPS.map((g) => ({ name: g.name, value: debts[g.key], color: g.color, detail: DEBT_DETAIL[g.key] }))
    .filter((x) => x.value > 0);
}

// ----- 支出／收入頁的分類佔比（看哪些開銷可以省） -----
const flowRows = (type, m = state.month) => inMonth(m).filter((r) => r.type === type);
const sumRows = (rows) => rows.reduce((s, r) => s + toBase(r.amount, r.currency), 0);
// 和上個月比較，例如「上月 NT$ 3,200（+15.6%）」
function vsLastMonth(now, prev) {
  if (!prev) return "上月沒有";
  const pct = ((now - prev) / prev) * 100;
  return `上月 ${money(prev)}（${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%）`;
}
// 依 field（主分類／子分類）拆開，每項附筆數與上月金額
function flowBreakdown(rows, prevRows, field, blank) {
  const keys = [...new Set(rows.map((r) => r[field] || ""))];
  return keys.map((k) => {
    const list = rows.filter((r) => (r[field] || "") === k);
    const value = sumRows(list);
    return { name: k || blank, value, sub: `${list.length} 筆・${vsLastMonth(value, sumRows(prevRows.filter((r) => (r[field] || "") === k)))}` };
  });
}
function flowItems(type, view) {
  const rows = flowRows(type);
  const prev = flowRows(type, shiftMonth(state.month, -1));
  const item = (name, list, prevList, field, blank) => {
    const value = sumRows(list);
    return { name, value, note: vsLastMonth(value, sumRows(prevList)), records: list,
      detail: () => flowBreakdown(list, prevList, field, blank) };
  };
  if (view === "account") {
    const order = state.accounts.map((a) => a.id);
    const ids = [...new Set(rows.map((r) => r.account_id))].sort((x, y) => order.indexOf(x) - order.indexOf(y));
    return topAccounts(ids.map((id) => item(accountName(id) || "（未指定帳戶）",
      rows.filter((r) => r.account_id === id), prev.filter((r) => r.account_id === id), "category", "（未分類）"))
      .filter((x) => x.value > 0));
  }
  // 依主分類：順序照分類設定（顏色跟著分類走），設定裡已刪除的分類排最後
  const names = mainCategories(type).map((c) => c.name);
  rows.forEach((r) => { if (!names.includes(r.category)) names.push(r.category); });
  return topAccounts(names.map((name) => item(name || "（未分類）",
    rows.filter((r) => r.category === name), prev.filter((r) => r.category === name), "subcategory", "（無子分類）"))
    .filter((x) => x.value > 0), "個分類");
}
const FIXED_VIEWS = [["item", "依項目"], ["category", "依分類"]];
const FLOW_VIEWS = [["category", "依分類"], ["account", "依帳戶"]];

// 首頁的環形圖：key 用來記住各自的「依類別／依帳戶」選擇
const DONUTS = {
  asset: { title: "資產配置", icon: "chart", cls: "box-primary", center: "資產總額", items: assetItems, empty: "還沒有正數的資產可以畫圖" },
  debt: { title: "負債配置", icon: "loan", cls: "box-danger", center: "負債總額", items: debtItems, empty: "目前沒有負債 🎉" },
  protection: {
    title: "保障配置", icon: "shield", cls: "box-success", items: protectionItems,
    views: [["sum", "依保額"], ["premium", "依年保費"]],
    center: (view) => (view === "premium" ? "年保費合計" : "保額合計"),
    empty: "還沒有填保額或保費的保障型保單（在保單設定把類型設為保障型）",
  },
  expense: { title: "支出分類佔比", icon: "out", cls: "box-danger", center: "支出總額", views: FLOW_VIEWS,
    items: (view) => flowItems("expense", view), empty: "這個月沒有支出紀錄" },
  fixedMonthly: { title: "月繳佔比", icon: "repeat", cls: "box-warning", center: "月繳合計", views: FIXED_VIEWS,
    items: (view) => fixedDonutItems(view, false), empty: "沒有月繳的固定開銷" },
  fixedYearly: { title: "年繳佔比", icon: "calendar", cls: "box-danger", center: "年繳合計", views: FIXED_VIEWS,
    items: (view) => fixedDonutItems(view, true), empty: "沒有年繳的固定開銷" },
  income: { title: "收入分類佔比", icon: "in", cls: "box-success", center: "收入總額", views: FLOW_VIEWS,
    items: (view) => flowItems("income", view), empty: "這個月沒有收入紀錄" },
};
const DEFAULT_VIEWS = [["group", "依類別"], ["account", "依帳戶"]];
const donutView = (key) => state.donutView?.[key] ?? (DONUTS[key].views ?? DEFAULT_VIEWS)[0][0];

function donutChart(items, total, centerLabel) {
  const size = 220, c = size / 2, r = 82, width = 32;
  const C = 2 * Math.PI * r;
  const gap = items.length > 1 ? 2 : 0; // 區塊之間留 2px 底色縫隙
  let offset = 0;
  const segs = items.map((it, i) => {
    const len = (it.value / total) * C;
    const seg = `<circle class="donut-seg" data-i="${i}" cx="${c}" cy="${c}" r="${r}" fill="none"
      style="stroke:${it.color}" stroke-width="${width}" stroke-dasharray="${Math.max(0.5, len - gap)} ${C}"
      stroke-dashoffset="${-offset}" transform="rotate(-90 ${c} ${c})"/>`;
    offset += len;
    return seg;
  }).join("");
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="${centerLabel}環形圖">
    ${segs}
    <text class="donut-center-label" x="${c}" y="${c - 6}" text-anchor="middle">${centerLabel}</text>
    <text class="donut-center-value" x="${c}" y="${c + 16}" text-anchor="middle">${
      total >= 1e5 ? shortMoney(total) : money(Math.round(total))}</text>
  </svg>`;
}

function donutBox(key, footer, extraTools = "") {
  const d = DONUTS[key];
  const view = donutView(key);
  const items = d.items(view);
  const total = items.reduce((s, x) => s + x.value, 0);
  const center = typeof d.center === "function" ? d.center(view) : d.center;
  const tabs = (d.views ?? DEFAULT_VIEWS).map(([k, label]) =>
    `<button class="btn btn-sm ${k === view ? "btn-primary" : "btn-default"}" data-donut-view="${key}:${k}">${label}</button>`
  ).join("");
  const body = total > 0
    ? `<div class="donut-wrap" data-donut="${key}">
        ${donutChart(items, total, center)}
        <table class="table donut-legend"><tbody>${items.map((it, i) => `<tr data-i="${i}"${
          it.detail || it.href ? ` class="clickable" title="點擊看明細"` : ""}>
          <td><span class="swatch" style="background:${it.color}"></span>${esc(it.name)}</td>
          <td class="text-right amount">${money(it.value)}</td>
          <td class="text-right amount">${((it.value / total) * 100).toFixed(1)}%</td>
        </tr>`).join("")}</tbody></table>
      </div>`
    : `<p class="empty">${d.empty}</p>`;
  return box(`${icon(d.icon)} ${d.title}`, body, { cls: d.cls, tools: `<div class="btn-group">${tabs}</div>${extraTools}`, footer });
}

function assetBoxes() {
  const { assets, debt, net } = assetTotals();
  return donutBox("asset",
    `<span class="muted hint-inline">資產 ${money(assets)} − 負債 ${money(debt)} ＝ 淨資產 <strong>${money(net)}</strong>・外幣與海外股票依「幣別設定」匯率換算成台幣</span>`)
    + donutBox("debt",
      `<span class="muted hint-inline">信用卡為目前未繳金額、貸款為剩餘本金、帳戶負餘額為餘額小於 0 的一般帳戶或證券戶・外幣依匯率換算成台幣</span>`)
    + (protectionPolicies().length ? donutBox("protection",
      `<span class="muted hint-inline">保障型保單（醫療、意外、定期壽險）不計入資產・年保費 ＝ 每期保費 × 一年繳費次數・外幣保單依匯率換算成台幣</span>`) : "");
}

// 提示框放在滑鼠右下（不超出右邊）；字體放大時整頁有 zoom，滑鼠座標要除回去
function placeTip(tip, e) {
  const z = Number(document.documentElement.style.zoom) || 1;
  const x = Math.min(e.clientX + 14, window.innerWidth - tip.getBoundingClientRect().width - 8);
  tip.style.left = `${x / z}px`;
  tip.style.top = `${(e.clientY + 14) / z}px`;
}

// 環形圖與表格互相連動：滑過任一個就標亮它並顯示提示
function bindDonut(wrap, items) {
  const total = items.reduce((s, x) => s + x.value, 0);
  let tip = $(".chart-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "chart-tip";
    document.body.appendChild(tip);
  }
  tip.hidden = true;
  const marks = wrap.querySelectorAll("[data-i]");
  const highlight = (i) => marks.forEach((m) => m.classList.toggle("dim", i != null && m.dataset.i !== String(i)));
  wrap.addEventListener("mousemove", (e) => {
    const target = e.target.closest("[data-i]");
    if (!target) { highlight(null); tip.hidden = true; return; }
    const it = items[target.dataset.i];
    highlight(target.dataset.i);
    tip.innerHTML = `<strong>${esc(it.name)}</strong><br>${money(it.value)}・${((it.value / total) * 100).toFixed(1)}%`;
    tip.hidden = false;
    placeTip(tip, e);
  });
  wrap.addEventListener("mouseleave", () => { highlight(null); tip.hidden = true; });
}

function bindDonuts() {
  document.querySelectorAll(".donut-wrap[data-donut]").forEach((wrap) => {
    const key = wrap.dataset.donut;
    const items = DONUTS[key].items(donutView(key));
    bindDonut(wrap, items);
    // 點擊某一塊（或表格那一列）：有明細就開小視窗，沒有就前往帳戶頁
    wrap.addEventListener("click", (e) => {
      const target = e.target.closest("[data-i]");
      const it = target && items[target.dataset.i];
      if (!it) return;
      if (it.detail) openDetail(key, it, items.reduce((s, x) => s + x.value, 0));
      else if (it.href) location.hash = it.href;
    });
  });
}

function closeDetail() {
  $("#detailModal")?.remove();
  document.removeEventListener("keydown", detailKeydown);
}
function detailKeydown(e) {
  if (e.key === "Escape") closeDetail();
}

// 明細小視窗：環形圖顯示前 5 大＋其他，表格列出全部
function openDetail(key, item, chartTotal) {
  const d = DONUTS[key];
  const rows = item.detail().filter((x) => x.value > 0).sort((x, y) => y.value - x.value);
  const total = rows.reduce((s, x) => s + x.value, 0);
  const colorOf = (i) => (i < 5 ? SERIES_COLORS[i] : "var(--series-other)");
  const slices = rows.slice(0, 5).map((x, i) => ({ ...x, color: colorOf(i) }));
  if (rows.length > 5) {
    slices.push({ name: `其他 ${rows.length - 5} 項`, value: rows.slice(5).reduce((s, x) => s + x.value, 0), color: colorOf(5) });
  }
  const whole = typeof d.center === "function" ? d.center(donutView(key)) : d.center;
  const pctOf = (v, base) => (base ? `${((v / base) * 100).toFixed(1)}%` : "—");
  const body = rows.length
    ? `<div class="donut-wrap">
        ${donutChart(slices, total, "合計")}
        <table class="table donut-legend detail-table">
          <thead><tr><th>項目</th><th class="text-right">金額</th><th class="text-right">佔此類</th><th class="text-right">佔${whole.replace(/總額|合計/, "")}</th></tr></thead>
          <tbody>${rows.map((x, i) => `<tr data-i="${Math.min(i, 5)}">
            <td><span class="swatch" style="background:${colorOf(i)}"></span>${x.href ? `<a href="${x.href}">${esc(x.name)}</a>` : esc(x.name)}
              ${x.sub ? `<div class="muted detail-sub">${esc(x.sub)}</div>` : ""}</td>
            <td class="text-right amount">${money(x.value)}</td>
            <td class="text-right amount">${pctOf(x.value, total)}</td>
            <td class="text-right amount muted">${pctOf(x.value, chartTotal)}</td>
          </tr>`).join("")}</tbody>
        </table>
      </div>`
    : `<p class="empty">沒有明細</p>`;

  closeDetail();
  $(".chart-tip")?.setAttribute("hidden", "");
  const modal = document.createElement("div");
  modal.id = "detailModal";
  modal.className = "modal-backdrop";
  modal.innerHTML = `<div class="box ${d.cls} modal-box" role="dialog" aria-modal="true" aria-labelledby="detailTitle">
    <div class="box-header">
      <h3 class="box-title" id="detailTitle">${esc(item.name)} <small class="muted">明細</small></h3>
      <button class="modal-close" type="button" aria-label="關閉">×</button>
    </div>
    <div class="box-body">
      <p class="detail-head">${money(item.value)}，佔${esc(whole)} <strong>${pctOf(item.value, chartTotal)}</strong>・共 ${rows.length} 項${
        item.note ? `・${esc(item.note)}` : ""}</p>
      ${body}
      ${item.records ? `<h4 class="detail-records">交易明細（${item.records.length} 筆，金額由大到小）</h4>
        ${txTable([...item.records].sort((x, y) => toBase(y.amount, y.currency) - toBase(x.amount, x.currency)), { deletable: false })}` : ""}
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest(".modal-close") || e.target.closest("a[href^='#']")) closeDetail();
  });
  document.addEventListener("keydown", detailKeydown);
  const wrap = modal.querySelector(".donut-wrap");
  if (wrap) bindDonut(wrap, slices);
  modal.querySelector(".modal-close").focus();
}

// ===== 頁面 =====
function dashboardPage() {
  const m = today().slice(0, 7);
  const rows = inMonth(m);
  const inc = sumBase(rows, "income");
  const out = sumBase(rows, "expense");
  const { assets, debt, net } = assetTotals();
  const count = (type) => rows.filter((r) => r.type === type).length;
  const trend = Array.from({ length: 6 }, (_, i) => {
    const mm = shiftMonth(m, i - 5);
    const r = inMonth(mm);
    return { label: `${Number(mm.slice(5))}月`, income: sumBase(r, "income"), expense: sumBase(r, "expense") };
  });

  return {
    title: "首頁",
    sub: monthLabel(m) + "概況（外幣已換算成台幣）",
    crumbs: ["首頁"],
    after() {
      bindDonuts();
    },
    html: `
      <div class="grid grid-4">
        ${infoBox("green", "in", "本月收入", money(inc), `${count("income")} 筆`)}
        ${infoBox("red", "out", "本月支出", money(out), `${count("expense")} 筆`)}
        ${infoBox("blue", "scale", "本月結餘", money(inc - out))}
        ${infoBox("purple", "chart", "淨資產", money(net), `資產 ${money(assets)}・負債 ${money(debt)}`)}
      </div>
      ${pendingAutopays().length ? box(`${icon("refresh")} 待確認的自動扣款`,
        `<div class="table-wrap"><table class="table"><tbody>${pendingRows(pendingAutopays(), true)}</tbody></table></div>`,
        { cls: "box-warning", flush: true, footer: `<span class="muted hint-inline">改成帳單上的實際金額後按「記錄」；設定在各信用卡頁的「自動扣款」</span>` }) : ""}
      ${assetBoxes()}
      <div class="grid grid-2">
        ${box("收支趨勢（近 6 個月）", barChart(trend))}
        ${box("本月支出分類", progressList(byCategory(rows.filter((r) => r.type === "expense")), out), { cls: "box-danger" })}
      </div>
      ${box("最近交易", txTable(state.entries.slice(0, 10), { deletable: false }), {
        cls: "box-default",
        flush: true,
        footer: `<a href="#/expense">查看全部支出</a> · <a href="#/income">查看全部收入</a> · <a href="#/transfer">查看全部轉帳</a>`,
      })}`,
  };
}

function listPage(type) {
  const t = TYPES[type];
  const rows = inMonth(state.month).filter((r) => r.type === type);
  const foreign = rows.some((r) => r.currency !== BASE);
  const total = type === "transfer" ? "" : `<span>合計${foreign ? "（換算台幣）" : ""}：${amount(type, sumBase(rows, type))}</span>`;
  const chart = DONUTS[type]
    ? donutBox(type, `<span class="muted hint-inline">點圓餅圖或分類看子分類與每一筆交易・外幣依匯率換算成台幣</span>`, monthNav())
    : "";
  return {
    title: t.name,
    sub: monthLabel(state.month),
    crumbs: ["首頁", t.name],
    after: bindDonuts,
    html: chart + box(`${t.name}紀錄`, txTable(rows), {
      cls: t.box,
      flush: true,
      tools: monthNav(),
      footer: `<div class="box-footer-row">
        <a class="btn btn-sm ${t.btn}" href="#/new/${type}">${icon("plus")} 新增${t.name}</a>
        ${total}
      </div>`,
    }),
  };
}

// ----- 行事曆：點日期看當天交易、直接新增（補登） -----
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
// 日曆格子裡的小金額：不加幣別符號，大數字用「萬」
const dayAmt = (n) => state.privacy ? "•••" : n >= 1e5 ? `${+(n / 1e4).toFixed(1)}萬` : Math.round(n).toLocaleString("zh-TW");
const dayLabel = (d) => `${Number(d.slice(5, 7))} 月 ${Number(d.slice(8))} 日（週${WEEKDAYS[new Date(d + "T00:00").getDay()]}）`;

function calendarPage() {
  const m = state.month;
  const now = today();
  if (!state.calDay?.startsWith(m)) state.calDay = now.startsWith(m) ? now : `${m}-01`;
  const day = state.calDay;
  const rows = inMonth(m);
  const [y, mo] = m.split("-").map(Number);
  const first = new Date(y, mo - 1, 1).getDay();
  const days = new Date(y, mo, 0).getDate();

  const cells = WEEKDAYS.map((w) => `<div class="cal-head">${w}</div>`);
  for (let i = 0; i < first; i++) cells.push(`<div></div>`);
  for (let i = 1; i <= days; i++) {
    const d = `${m}-${String(i).padStart(2, "0")}`;
    const list = rows.filter((r) => r.date === d);
    const inc = sumBase(list, "income");
    const exp = sumBase(list, "expense");
    const cls = ["cal-day", d === now && "today", d === day && "selected"].filter(Boolean).join(" ");
    cells.push(`<button type="button" class="${cls}" data-cal-day="${d}" aria-label="${dayLabel(d)}">
      <span class="cal-num">${i}</span>
      ${inc ? `<span class="cal-amt text-success">${dayAmt(inc)}</span>` : ""}
      ${exp ? `<span class="cal-amt text-danger">${dayAmt(exp)}</span>` : ""}
      ${list.some((r) => r.type === "transfer") ? `<span class="cal-dot" title="有轉帳"></span>` : ""}
    </button>`);
  }

  const inc = sumBase(rows, "income");
  const exp = sumBase(rows, "expense");
  const form = txForm(state.calType ?? "expense", state.calAccount, { date: day, embedded: true });
  const tools = `${monthNav()}${m === now.slice(0, 7) ? "" : `<button class="btn btn-default btn-sm" data-cal-today>今天</button>`}`;

  return {
    title: "行事曆",
    sub: monthLabel(m),
    crumbs: ["首頁", "行事曆"],
    html: `
      ${box("行事曆", `<div class="cal-summary">
          <div><small>本月收入</small><span class="text-success">${money(inc)}</span></div>
          <div><small>本月支出</small><span class="text-danger">${money(exp)}</span></div>
          <div><small>本月結餘</small><span>${money(inc - exp)}</span></div>
        </div>
        <div class="cal-grid">${cells.join("")}</div>`, { cls: "box-default", flush: true, tools })}
      ${form.html}
      <div id="calDayBox">${dayBox(day)}</div>`,
    after() {
      form.after();
      // 表單裡直接改日期：同一個月就跟著選那天，跨月就換到那個月
      $("#f-date").addEventListener("change", (e) => {
        const d = e.target.value;
        if (!d) return;
        if (d.startsWith(state.month)) return selectCalDay(d);
        state.month = d.slice(0, 7);
        state.calDay = d;
        render();
      });
    },
  };
}

// 行事曆下方「當天交易」
function dayBox(day) {
  const dayRows = state.entries.filter((r) => r.date === day);
  const dayInc = sumBase(dayRows, "income");
  const dayExp = sumBase(dayRows, "expense");
  return box(`${dayLabel(day)}的交易`, txTable(dayRows, { showDate: false }), {
    cls: "box-default",
    flush: true,
    footer: dayRows.length ? `<div class="box-footer-row"><span class="muted">${dayRows.length} 筆</span>
      <span>收入 ${amount("income", dayInc)}　支出 ${amount("expense", dayExp)}</span></div>` : "",
  });
}

// 點日期：只換選取框、表單日期與當天交易，不重畫整頁（已經填一半的表單不會不見）
function selectCalDay(d) {
  state.calDay = d;
  document.querySelectorAll(".cal-day").forEach((el) => el.classList.toggle("selected", el.dataset.calDay === d));
  if ($("#f-date")) $("#f-date").value = d;
  $("#calDayBox").innerHTML = dayBox(d);
}

// 網址 #/new/<類型>/<帳戶 id>，帳戶 id 可省略（從帳戶頁進來時會帶）
function newPage(arg, arg2) {
  const type = TYPES[arg] ? arg : "expense";
  const form = txForm(type, findAccount(arg2)?.id ?? null);
  return { title: "新增交易", sub: TYPES[type].name, crumbs: ["首頁", "新增交易"], ...form };
}

// 修改交易：#/edit/<id>，表單和新增共用，存完回到原本的頁面（state.returnTo）
function editPage(arg) {
  const entry = state.entries.find((r) => r.id === Number(arg));
  const page = { title: "修改交易", crumbs: ["首頁", "修改交易"] };
  if (!entry) return { ...page, html: `<p class="empty">找不到這筆交易（可能已刪除）</p>` };
  if (entryLocked(entry)) {
    return { ...page, html: box("無法直接修改", `<p>這筆是貸款還款、利息或保費，本金與利息是系統拆分的。請到
      <a href="#/account/${entry.to_account_id ?? entry.loan_id}">該帳戶頁</a>的還款／繳費紀錄刪除後重記。</p>`, { cls: "box-warning" }) };
  }
  return { ...page, sub: TYPES[entry.type].name, ...txForm(entry.type, null, { entry }) };
}

// 新增交易表單（新增交易頁與行事曆共用）。embedded：嵌在行事曆裡，類型用按鈕切換、存完留在行事曆
function txForm(type, preset, { date = today(), embedded = false, entry = null } = {}) {
  const t = TYPES[type];
  const editing = Boolean(entry);
  const entry_ = entry; // submit 裡的 entry 是要送出的資料，原本那筆用 entry_
  if (editing) date = entry.date;
  // 證券戶只做股票交易，記帳表單不預選證券戶
  preset = findAccount(preset)?.kind === "securities" ? null : findAccount(preset)?.id ?? null;
  const cashAccounts = state.accounts.filter((a) => a.kind !== "securities");
  const mains = mainCategories(type);
  const noAccount = (msg) => `<div class="form-group"><label>帳戶</label>
    <span class="muted">${msg}，請先到 <a href="#/accounts">帳戶管理</a> 新增</span></div>`;
  // 帳戶下拉 + 幣別下拉（幣別選項依帳戶持有的幣別，在 after() 填入）
  const accountRow = (label, id, selected) => `
    <div class="form-group"><label for="${id}">${label}</label>
      <div class="input-row">
        <select class="form-control" id="${id}">${accountOptions(selected, { cashOnly: true })}</select>
        <select class="form-control cur-select" id="${id}-cur" aria-label="${label}幣別"></select>
      </div>
    </div>`;

  const typeButtons = editing
    ? `<span class="btn ${t.btn} static-type">${icon(t.icon)} ${t.name}</span>`
    : Object.entries(TYPES).map(([k, v]) => embedded
    ? `<button type="button" class="btn ${k === type ? v.btn : "btn-default"}" data-cal-type="${k}">${icon(v.icon)} ${v.name}</button>`
    : `<a class="btn ${k === type ? v.btn : "btn-default"}" href="#/new/${k}${preset ? "/" + preset : ""}">${icon(v.icon)} ${v.name}</a>`
  ).join("");

  let fields = "";
  if (type === "transfer") {
    if (!cashAccounts.length) {
      fields = noAccount("還沒有帳戶");
    } else {
      const from = editing ? entry.from_account_id : preset ?? cashAccounts[0].id;
      const to = editing ? entry.to_account_id : (cashAccounts.find((a) => a.id !== from) ?? cashAccounts[0]).id;
      fields = accountRow("轉出帳戶", "f-from", from) + accountRow("轉入帳戶", "f-to", to);
    }
  } else {
    fields = mains.length
      ? `<div class="form-group"><label for="f-cat">主分類</label>
          <select class="form-control" id="f-cat">${mains.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select>
        </div>
        <div class="form-group"><label for="f-sub">子分類</label>
          <select class="form-control" id="f-sub"></select>
        </div>`
      : `<div class="form-group"><label>分類</label>
          <span class="muted">還沒有${t.name}分類，請先到 <a href="#/settings/${type}">分類設定</a> 新增</span>
        </div>`;
    fields += cashAccounts.length
      ? accountRow("帳戶", "f-account", editing ? entry.account_id : preset ?? cashAccounts[0].id)
      : noAccount("還沒有帳戶");
  }

  return {
    html: `<form id="txForm" autocomplete="off">${box(editing ? `修改${t.name}` : embedded ? `新增${t.name}` : "交易資訊", `
      <div class="form-group"><label>類型</label><div class="btn-group">${typeButtons}</div></div>
      ${fields}
      <div class="form-group"><label for="f-amount">${type === "transfer" ? "轉出金額" : "金額"}</label>
        <div class="input-group"><span class="input-group-addon" id="f-sym">${symbol(BASE)}</span>
          <input class="form-control" id="f-amount" type="number" min="0.01" step="0.01" inputmode="decimal" required value="${editing ? entry.amount : ""}">
        </div>
      </div>
      <div class="form-group" id="g-to-amount" hidden><label for="f-to-amount">轉入金額</label>
        <div>
          <div class="input-group"><span class="input-group-addon" id="f-to-sym"></span>
            <input class="form-control" id="f-to-amount" type="number" min="0.01" step="0.01" inputmode="decimal">
          </div>
          <small class="muted">跨幣別（換匯）：已依「幣別設定」的匯率估算，請改成實際入帳金額</small>
        </div>
      </div>
      <div class="form-group" id="g-extra" hidden><label>還款類型</label>
        <label class="checkbox"><input type="checkbox" id="f-extra"> 額外還款（提前還本金，不算在期數裡）</label>
      </div>
      <div class="form-group"><label for="f-date">日期</label>
        <input class="form-control" id="f-date" type="date" value="${date}" required>
      </div>
      <div class="form-group"><label for="f-note">描述</label>
        <input class="form-control" id="f-note" placeholder="選填，例如：午餐便當" value="${editing ? esc(entry.note) : ""}">
      </div>`, {
      cls: t.box,
      footer: `<div class="box-footer-row">
        ${editing ? `<a class="btn btn-default" href="${esc(state.returnTo || `#/${type}`)}">取消</a>`
          : embedded ? `<span class="muted">點上面的日期可換日期</span>`
          : `<label class="checkbox"><input type="checkbox" id="f-stay" checked> 儲存後留在此頁繼續新增</label>`}
        <button class="btn ${t.btn}" type="submit">${editing ? "儲存修改" : `儲存${t.name}`}</button>
      </div>`,
    })}</form>`,
    after() {
      const catSelect = $("#f-cat");
      if (catSelect) {
        const fillSubs = () => {
          const subs = subCategories(Number(catSelect.value));
          $("#f-sub").innerHTML = subs.length
            ? subs.map((c) => `<option>${esc(c.name)}</option>`).join("")
            : `<option value="">（無子分類）</option>`;
        };
        catSelect.addEventListener("change", fillSubs);
        if (editing) {
          const opt = [...catSelect.options].find((o) => o.text === entry.category);
          if (opt) catSelect.value = opt.value;
          else { catSelect.insertAdjacentHTML("beforeend", `<option value="">${esc(entry.category)}</option>`); catSelect.value = ""; }
        }
        fillSubs();
        if (editing) {
          const sub = $("#f-sub");
          if (![...sub.options].some((o) => o.value === entry.subcategory)) {
            sub.insertAdjacentHTML("beforeend", `<option value="${esc(entry.subcategory)}">${esc(entry.subcategory || "（無子分類）")}</option>`);
          }
          sub.value = entry.subcategory;
        }
      }
      if (editing) {
        // 先放入原本的幣別，下面 fill() 會保留它
        const preCur = { "#f-account-cur": entry.currency, "#f-from-cur": entry.currency, "#f-to-cur": entry.to_currency ?? entry.currency };
        Object.entries(preCur).forEach(([sel, code]) => { if ($(sel)) $(sel).innerHTML = `<option value="${esc(code)}">${esc(code)}</option>`; });
        if (entry.to_amount != null && entry.to_currency !== entry.currency) {
          $("#f-to-amount").value = entry.to_amount;
          $("#f-to-amount").dataset.touched = "1";
        }
        if (entry.loan_kind === "extra") $("#f-extra").checked = true;
      }

      // 幣別：帳戶換了就重填幣別選項；金額前綴跟著幣別；跨幣別轉帳顯示「轉入金額」
      const fromCur = $("#f-account-cur") ?? $("#f-from-cur");
      const toCur = $("#f-to-cur");
      const toAmount = $("#f-to-amount");
      const refresh = () => {
        const fromCode = fromCur?.value || BASE;
        $("#f-sym").textContent = symbol(fromCode);
        if (!toCur) return;
        $("#g-extra").hidden = findAccount($("#f-to").value)?.kind !== "loan"; // 轉入貸款才能標記額外還款
        const cross = toCur.value !== fromCode;
        $("#g-to-amount").hidden = !cross;
        toAmount.required = cross;
        $("#f-to-sym").textContent = symbol(toCur.value);
        if (cross && !toAmount.dataset.touched) {
          const amt = Number($("#f-amount").value);
          toAmount.value = amt ? +((amt * rate(fromCode)) / rate(toCur.value)).toFixed(2) : "";
        }
      };
      ["#f-account", "#f-from", "#f-to"].forEach((sel) => {
        const accSel = $(sel);
        if (!accSel) return;
        const curSel = $(`${sel}-cur`);
        const fill = () => {
          const codes = accountCodes(findAccount(accSel.value));
          curSel.innerHTML = currencyOptions(codes, codes.includes(curSel.value) ? curSel.value : codes[0]);
          refresh();
        };
        accSel.addEventListener("change", fill);
        curSel.addEventListener("change", refresh);
        fill();
      });
      $("#f-amount").addEventListener("input", refresh);
      toAmount.addEventListener("input", () => (toAmount.dataset.touched = "1"));

      $("#txForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = e.submitter;
        btn.disabled = true;
        const entry = {
          type,
          date: $("#f-date").value,
          amount: $("#f-amount").value,
          currency: fromCur?.value || BASE,
          note: $("#f-note").value,
        };
        let label = "";
        if (type === "transfer") {
          entry.from_account_id = $("#f-from")?.value;
          entry.to_account_id = $("#f-to")?.value;
          entry.to_currency = toCur?.value;
          if (entry.to_currency !== entry.currency) entry.to_amount = toAmount.value;
          if (!$("#g-extra").hidden && $("#f-extra").checked) entry.loan_kind = "extra";
          label = `${accountName(entry.from_account_id)} → ${accountName(entry.to_account_id)}`;
        } else {
          entry.account_id = $("#f-account")?.value || null;
          if (catSelect) {
            entry.category = catSelect.selectedOptions[0].text;
            entry.subcategory = $("#f-sub").value;
            label = entry.category + (entry.subcategory ? ` › ${entry.subcategory}` : "");
          }
        }
        try {
          if (editing) {
            await putJson(`/api/entries/${entry_.id}`, entry);
            state.flash = ["success", `已修改${t.name}：${label} ${money(Number(entry.amount), entry.currency)}`];
            state.month = entry.date.slice(0, 7);
            state.calDay = entry.date;
            await reload();
            location.hash = state.returnTo || `#/${type}`;
            return;
          }
          await api("/api/entries", { method: "POST", body: JSON.stringify(entry) });
          await reload();
          const msg = `已新增${t.name}：${label} ${money(Number(entry.amount), entry.currency)}`;
          if (embedded) {
            // 留在行事曆、停在這筆的日期；記住帳戶，下一筆不用重選
            state.flash = ["success", msg];
            state.month = entry.date.slice(0, 7);
            state.calDay = entry.date;
            state.calAccount = entry.account_id ?? entry.from_account_id;
            render();
          } else if ($("#f-stay").checked) {
            showAlert("success", msg);
            $("#f-amount").value = "";
            $("#f-note").value = "";
            toAmount.value = "";
            delete toAmount.dataset.touched;
            $("#f-amount").focus();
            $("#menu").innerHTML = menuHtml("new"); // 更新側欄餘額
          } else {
            state.flash = ["success", msg];
            state.month = entry.date.slice(0, 7);
            location.hash = preset ? `#/account/${preset}` : `#/${type}`;
          }
        } catch (err) {
          showAlert("danger", (editing ? "修改失敗：" : "新增失敗：") + err.message);
        } finally {
          btn.disabled = false;
        }
      });
    },
  };
}

// 證券戶的持股表：代號、名稱、股數、成本、價格可直接改（離開欄位自動儲存），其餘自動計算
function holdingsBox(a) {
  const list = holdingsOf(a.id);
  const field = (h, key, cls, numeric = true) =>
    `<input class="form-control input-sm ${cls}" data-hold-field="${key}" data-hold-id="${h.id}" value="${esc(h[key])}"${
      numeric ? ' type="number" step="any" min="0" inputmode="decimal"' : ""}>`;
  const rows = list.map((h) => {
    const value = marketValue(h);
    const pl = profit(h);
    return `<tr data-id="${h.id}">
      <td class="handle-cell">${dragHandle}</td>
      <td class="nowrap">${field(h, "symbol", "w-code", false)}${h.currency !== BASE ? ` <span class="code-tag">${esc(h.currency)}</span>` : ""}${
        h.delisted ? ` <span class="code-tag tag-delisted" title="已下市：更新股價時略過，價格請手動輸入">已下市</span>` : ""}</td>
      <td>${field(h, "name", "w-name", false)}</td>
      <td>${field(h, "shares", "w-num")}</td>
      <td>${field(h, "cost", "w-num")}</td>
      <td class="text-right muted nowrap">${h.shares ? money(h.cost / h.shares, h.currency) : "—"}</td>
      <td title="${h.delisted ? "已下市，不會自動更新" : h.price_time ? `Yahoo 股價時間 ${esc(h.price_time)}` : "手動輸入的價格"}">${field(h, "price", "w-num")}</td>
      <td class="text-right nowrap">${money(value, h.currency)}</td>
      <td class="text-right nowrap">${plText(pl, h.currency)}</td>
      <td class="text-right nowrap">${h.cost ? plPct((pl / h.cost) * 100) : "—"}</td>
      <td class="text-right nowrap">
        <button class="btn btn-xs btn-default" data-hold-delist="${h.id}" title="${h.delisted ? "恢復自動更新股價" : "標記為已下市（更新股價時略過）"}">${h.delisted ? "恢復" : "下市"}</button>
        <button class="btn btn-xs btn-default" data-hold-del="${h.id}" title="刪除">${icon("trash")}</button>
      </td>
    </tr>`;
  }).join("");

  const cost = list.reduce((s, h) => s + toBase(h.cost, h.currency), 0);
  const value = holdingsBase(a.id);
  const foreign = list.some((h) => h.currency !== BASE);
  const table = list.length
    ? `<div class="table-wrap"><table class="table table-hover holdings">
        <thead><tr><th class="handle-cell"></th><th>代號</th><th>名稱</th><th>股數</th><th>購買成本</th>
          <th class="text-right">均價</th><th>目前價格</th><th class="text-right">市值</th><th class="text-right">損益</th><th class="text-right">報酬率</th><th></th></tr></thead>
        <tbody id="holdingSort">${rows}</tbody>
        <tfoot><tr>
          <td></td><td colspan="3"><strong>合計</strong>${foreign ? ` <span class="muted">（換算台幣）</span>` : ""}</td>
          <td class="amount nowrap">${money(cost)}</td><td></td><td></td>
          <td class="text-right nowrap amount">${money(value)}</td>
          <td class="text-right nowrap">${plText(value - cost)}</td>
          <td class="text-right nowrap">${cost ? plPct(((value - cost) / cost) * 100) : "—"}</td><td></td>
        </tr></tfoot>
      </table></div>`
    : `<p class="empty">還沒有持股，從下面新增第一檔</p>`;

  const codes = state.currencies.map((c) => c.code);
  const latest = list.map((h) => h.price_time).filter(Boolean).sort().pop();
  return box(`${icon("stock")} 持股`, table, {
    cls: "box-warning",
    flush: true,
    tools: list.length
      ? `<span class="muted hint-inline">${latest ? `股價時間 ${esc(latest)}` : "尚未從 Yahoo 更新"}</span>
         <button class="btn btn-sm btn-primary" data-refresh-prices="${a.id}">${icon("transfer")} 更新股價</button>`
      : "",
    footer: `<form class="inline-form" data-add-holding="${a.id}">
      <input class="form-control code-input" name="symbol" placeholder="代號，例如 2330" required>
      <input class="form-control" name="name" placeholder="名稱（留空自動抓）">
      <input class="form-control num-input" name="shares" type="number" step="any" min="0" inputmode="decimal" placeholder="股數" required>
      <input class="form-control num-input" name="cost" type="number" step="any" min="0" inputmode="decimal" placeholder="購買成本" required>
      <input class="form-control num-input" name="price" type="number" step="any" min="0" inputmode="decimal" placeholder="價格（留空自動抓）">
      <select class="form-control cur-select" name="currency" aria-label="幣別">${currencyOptions(codes, accountCodes(a)[0] ?? BASE)}</select>
      <button class="btn btn-default" type="submit">${icon("plus")} 新增持股</button>
    </form>
    <p class="muted hint">代號依幣別判斷市場：台幣填 2330（上市上櫃自動判斷）、美金填 AAPL、港幣填 700、日幣填 7203；也可直接填 Yahoo 代號如 0700.HK。購買成本＝總成本（含手續費）。表格內數字改完自動儲存，拖曳 ⠿ 排序。有股票交易紀錄的股票，股數與成本由交易自動計算；手動修改會調整交易之前的期初持股。</p>`,
  });
}

// ===== 股票交易（證券戶）：買進／賣出、已實現損益；錢從綁定的交割戶進出 =====
const SIDES = { buy: { name: "買進", cls: "tag-buy" }, sell: { name: "賣出", cls: "tag-sell" } };
const tradesOf = (accountId) => state.trades.filter((t) => t.account_id === accountId);
const shareText = (n) => (state.privacy ? MASK : Number(n).toLocaleString("zh-TW", { maximumFractionDigits: 4 }));
const holdingLabel = (h) => (h ? `${h.symbol} ${h.name}`.trim() : "（已刪除的股票）");
// 台股手續費 0.1425%（最低 20 元）、賣出證交稅 0.3%；其他市場預設 0，可自行修改
function estimateCosts(side, gross, code) {
  if (code !== BASE || !gross) return { fee: 0, tax: 0 };
  return { fee: Math.max(20, Math.floor(gross * 0.001425)), tax: side === "sell" ? Math.floor(gross * 0.003) : 0 };
}
const realizedBase = (list) => list.filter((t) => t.side === "sell").reduce((s, t) => s + toBase(t.realized, t.currency), 0);

function tradeSection(a, bank) {
  if (!bank) {
    const banks = accountsOf("bank");
    return box(`${icon("transfer")} 股票交易`, `<p class="empty">要記錄股票買賣，請先綁定交割戶：到銀行帳戶頁的「證券交割戶」選擇「${esc(a.name)}」。</p>
      ${banks.length ? `<p class="text-center">${banks.map((b) => `<a class="btn btn-sm btn-default" href="#/account/${b.id}">${esc(b.name)}</a>`).join(" ")}</p>` : ""}`,
      { cls: "box-warning" });
  }
  const trades = tradesOf(a.id);
  const year = state.tradeYear ?? state.month.slice(0, 4);
  const yearTrades = trades.filter((t) => t.date.startsWith(year));
  const holdings = holdingsOf(a.id);
  const editing = trades.find((t) => t.id === state.editTrade);
  const v = editing ?? { side: "buy", date: today(), shares: "", price: "", fee: "", tax: "", note: "" };
  const hasCost = (k) => editing && v[k] !== "" ? ` data-touched="1"` : "";

  // 每月已實現損益（台幣）
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${pad2(i + 1)}`).map((m) => {
    const list = yearTrades.filter((t) => t.date.startsWith(m));
    const sum = (side) => list.filter((t) => t.side === side).reduce((s, t) => s + toBase(t.amount, t.currency), 0);
    return { m, count: list.length, buy: sum("buy"), sell: sum("sell"), realized: realizedBase(list) };
  });
  const monthTable = `<div class="table-wrap"><table class="table table-hover trade-months">
      <thead><tr><th>月份</th><th class="text-right">筆數</th><th class="text-right">買進金額</th><th class="text-right">賣出金額</th><th class="text-right">已實現損益</th></tr></thead>
      <tbody>${months.map((r) => `<tr class="${r.count ? "" : "row-muted"}">
        <td>${Number(r.m.slice(5))} 月</td><td class="text-right">${r.count || "—"}</td>
        <td class="text-right amount">${r.buy ? money(Math.round(r.buy)) : "—"}</td>
        <td class="text-right amount">${r.sell ? money(Math.round(r.sell)) : "—"}</td>
        <td class="text-right">${r.realized ? plText(Math.round(r.realized)) : "—"}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td><strong>${year} 年合計</strong></td><td class="text-right">${yearTrades.length}</td>
        <td class="text-right amount">${money(Math.round(months.reduce((s, r) => s + r.buy, 0)))}</td>
        <td class="text-right amount">${money(Math.round(months.reduce((s, r) => s + r.sell, 0)))}</td>
        <td class="text-right"><strong>${plText(Math.round(realizedBase(yearTrades)))}</strong></td></tr></tfoot>
    </table></div>`;

  const list = yearTrades.length
    ? `<div class="table-wrap"><table class="table table-hover trade-list">
        <thead><tr><th>日期</th><th>買賣</th><th>股票</th><th class="text-right">股數</th><th class="text-right">成交價</th>
          <th class="text-right">手續費＋稅</th><th class="text-right">交割金額</th><th class="text-right">已實現損益</th><th>備註</th><th></th></tr></thead>
        <tbody>${yearTrades.map((t) => {
          const h = state.holdings.find((x) => x.id === t.holding_id);
          return `<tr class="${t.id === state.editTrade ? "row-editing" : ""}">
            <td class="nowrap">${t.date}</td>
            <td><span class="code-tag ${SIDES[t.side].cls}">${SIDES[t.side].name}</span></td>
            <td>${esc(holdingLabel(h))}</td>
            <td class="text-right">${shareText(t.shares)}</td>
            <td class="text-right amount">${money(t.price, t.currency)}</td>
            <td class="text-right amount muted">${money(t.fee + t.tax, t.currency)}</td>
            <td class="text-right">${signedAmount(t.side === "sell" ? t.amount : -t.amount, t.currency)}</td>
            <td class="text-right">${t.side === "sell" ? plText(t.realized, t.currency) : `<span class="muted">—</span>`}</td>
            <td class="muted">${esc(t.note) || "—"}</td>
            <td class="text-right nowrap">
              <button class="btn btn-xs btn-default" data-trade-edit="${t.id}" title="修改">${icon("edit")}</button>
              <button class="btn btn-xs btn-default" data-trade-del="${t.id}" title="刪除">${icon("trash")}</button>
            </td></tr>`;
        }).join("")}</tbody>
      </table></div>`
    : `<p class="empty">${year} 年沒有股票交易</p>`;

  const codes = accountCodes(bank);
  const holdingOptions = holdings.map((h) => `<option value="${h.id}" data-currency="${esc(h.currency)}"${editing && editing.holding_id === h.id ? " selected" : ""}>
    ${esc(holdingLabel(h))}（持有 ${shareText(h.shares)} 股）</option>`).join("");
  const form = `<form class="trade-form" data-trade-form="${a.id}" autocomplete="off">
      <div class="form-group"><label>買賣</label><div class="btn-group" role="radiogroup">
        ${Object.entries(SIDES).map(([k, s]) => `<label class="btn btn-sm ${v.side === k ? (k === "buy" ? "btn-danger" : "btn-success") : "btn-default"} side-btn">
          <input type="radio" name="side" value="${k}"${v.side === k ? " checked" : ""} hidden>${s.name}</label>`).join("")}
      </div></div>
      <div class="form-group"><label for="tr-holding">股票</label><div class="input-row">
        <select class="form-control" id="tr-holding" name="holding_id"${editing ? " disabled" : ""}>${holdingOptions}
          ${editing ? "" : `<option value="">＋ 其他股票（輸入代號）</option>`}</select>
      </div></div>
      <div class="form-group" id="tr-new"${holdings.length || editing ? " hidden" : ""}><label for="tr-symbol">代號</label><div class="input-row">
        <input class="form-control" id="tr-symbol" name="symbol" placeholder="代號，例如 2330">
        <select class="form-control cur-select" name="currency" aria-label="幣別">${currencyOptions(codes, codes[0] ?? BASE)}</select>
      </div></div>
      <div class="form-group"><label for="tr-date">日期</label><input class="form-control" id="tr-date" name="date" type="date" value="${esc(v.date)}" required></div>
      <div class="form-group"><label for="tr-shares">股數</label><input class="form-control" id="tr-shares" name="shares" type="number" min="0" step="any" inputmode="decimal" value="${v.shares}" required placeholder="一張 = 1000 股"></div>
      <div class="form-group"><label for="tr-price">成交價</label><input class="form-control" id="tr-price" name="price" type="number" min="0" step="any" inputmode="decimal" value="${v.price}" required></div>
      <div class="form-group"><label for="tr-fee">手續費</label><input class="form-control" id="tr-fee" name="fee" type="number" min="0" step="any" inputmode="decimal" value="${v.fee}"${hasCost("fee")}></div>
      <div class="form-group" id="tr-tax-row"${v.side === "sell" ? "" : " hidden"}><label for="tr-tax">證交稅</label><input class="form-control" id="tr-tax" name="tax" type="number" min="0" step="any" inputmode="decimal" value="${v.tax}"${hasCost("tax")}></div>
      <div class="form-group"><label>交割金額</label><div><strong id="tr-amount">—</strong>
        <p class="muted hint">台股自動估算手續費 0.1425%（最低 20 元）與證交稅 0.3%（ETF 是 0.1%），請改成券商實際收的金額。</p></div></div>
      <div class="form-group"><label for="tr-note">備註</label><input class="form-control" id="tr-note" name="note" value="${esc(v.note)}" placeholder="選填"></div>
      <div class="box-footer-row">
        <span class="muted">交割戶：<a href="#/account/${bank.id}">${esc(bank.name)}</a>（買進扣款、賣出入帳）</span>
        <span>${editing ? `<button class="btn btn-default" type="button" data-trade-cancel>取消</button> ` : ""}
        <button class="btn btn-primary" type="submit">${editing ? "儲存修改" : "記錄交易"}</button></span>
      </div>
    </form>`;

  const yearNav = `<div class="btn-group">
      <button class="btn btn-default btn-sm" data-trade-year="-1" aria-label="前一年">‹</button>
      <span class="btn btn-default btn-sm static">${year} 年</span>
      <button class="btn btn-default btn-sm" data-trade-year="1" aria-label="後一年">›</button></div>`;
  return `
    <div class="grid grid-3">
      ${infoBox("aqua", "calendar", `${monthLabel(state.month)}已實現損益`, plText(Math.round(realizedBase(trades.filter((t) => t.date.startsWith(state.month))))), "換算台幣")}
      ${infoBox("yellow", "chart", `${state.month.slice(0, 4)} 年已實現損益`, plText(Math.round(realizedBase(trades.filter((t) => t.date.startsWith(state.month.slice(0, 4)))))), "換算台幣")}
      ${infoBox("purple", "scale", "累計已實現損益", plText(Math.round(realizedBase(trades))), `${trades.filter((t) => t.side === "sell").length} 筆賣出`)}
    </div>
    <div class="grid grid-2">
      ${box(`${icon(editing ? "edit" : "plus")} ${editing ? "修改股票交易" : "記錄股票交易"}`, form, { cls: editing ? "box-warning" : "box-primary" })}
      ${box(`${icon("chart")} 每月已實現損益`, monthTable, { cls: "box-default", flush: true, tools: yearNav,
        footer: `<span class="muted hint-inline">已實現損益＝賣出交割金額－賣出股數的平均成本（移動平均，含買進手續費）；外幣換算台幣</span>` })}
    </div>
    ${box(`${icon("list")} 股票交易紀錄 <small class="muted">${year} 年</small>`, list, { cls: "box-default", flush: true, tools: yearNav })}`;
}

// 交易表單：切換買賣、股票，輸入股數價格時自動估算手續費、稅與交割金額
function bindTradeForm() {
  const form = $("[data-trade-form]");
  if (!form) return;
  const f = form.elements;
  const codeOf = () => (f.holding_id.value ? f.holding_id.selectedOptions[0].dataset.currency : f.currency.value);
  const side = () => form.querySelector('input[name="side"]:checked').value;
  const update = () => {
    const s = side();
    form.querySelectorAll(".side-btn").forEach((b) => {
      const on = b.querySelector("input").checked;
      b.className = `btn btn-sm side-btn ${on ? (b.querySelector("input").value === "buy" ? "btn-danger" : "btn-success") : "btn-default"}`;
    });
    $("#tr-new").hidden = Boolean(f.holding_id.value) || f.holding_id.disabled;
    f.symbol.required = !$("#tr-new").hidden;
    $("#tr-tax-row").hidden = s !== "sell";
    const code = codeOf();
    const gross = Number(f.shares.value) * Number(f.price.value);
    const est = estimateCosts(s, gross, code);
    if (!f.fee.dataset.touched) f.fee.value = gross ? est.fee : "";
    if (!f.tax.dataset.touched) f.tax.value = gross && s === "sell" ? est.tax : "";
    const fee = Number(f.fee.value) || 0, tax = s === "sell" ? Number(f.tax.value) || 0 : 0;
    $("#tr-amount").innerHTML = gross
      ? `${s === "buy" ? "扣款" : "入帳"} ${money(s === "buy" ? gross + fee : gross - fee - tax, code)}`
      : "—";
  };
  form.addEventListener("change", update);
  form.addEventListener("input", (e) => {
    if (e.target === f.fee || e.target === f.tax) e.target.dataset.touched = "1";
    update();
  });
  update();
}

// ----- 貸款 -----
const loanOf = (id) => state.loans.find((l) => l.account_id === id)
  ?? { principal: 0, annual_rate: 0, monthly_payment: 0, term_months: 0, start_date: "", pay_account_id: null };
const termText = (months) => (months ? `${months} 期（${+(months / 12).toFixed(1)} 年）` : "—");
const monthInterest = (owed, annualRate, amount) => Math.min(amount, Math.round((owed * annualRate) / 1200));

// 依目前剩餘本金、每月還款、利率估算還要繳幾期（繳不完利息回傳 Infinity）
function periodsToPayoff(owed, payment, annualRate) {
  if (owed <= 0) return 0;
  if (!payment) return null;
  const r = annualRate / 1200;
  if (!r) return Math.ceil(owed / payment);
  if (payment <= owed * r) return Infinity;
  return Math.ceil(-Math.log(1 - (r * owed) / payment) / Math.log(1 + r));
}

function loanStats(a) {
  const loan = loanOf(a.id);
  const code = accountCodes(a)[0] ?? BASE;
  const owed = Math.max(0, -balance(a.id, code));
  const repayments = state.entries.filter((r) => r.type === "transfer" && r.to_account_id === a.id);
  const paid = repayments.filter((r) => r.loan_kind !== "extra").length;
  const extra = repayments.filter((r) => r.loan_kind === "extra").reduce((s, r) => s + (r.to_amount ?? r.amount), 0);
  const interest = state.entries.filter((r) => r.loan_id === a.id && r.loan_kind === "interest").reduce((s, r) => s + r.amount, 0);
  return { loan, code, owed, paid, extra, interest, need: periodsToPayoff(owed, loan.monthly_payment, loan.annual_rate) };
}

// 貸款的所有還款（依日期），配對同一天一起建立的利息支出，並推算每筆還款後的剩餘本金
function loanRepayments(a) {
  const code = accountCodes(a)[0] ?? BASE;
  const transfers = state.entries
    .filter((r) => r.type === "transfer" && r.to_account_id === a.id)
    .sort((x, y) => x.date.localeCompare(y.date) || x.id - y.id);
  const interests = state.entries.filter((r) => r.loan_id === a.id && r.loan_kind === "interest").sort((x, y) => x.id - y.id);
  const perMonth = {};
  transfers.forEach((t) => { if (t.loan_kind !== "extra") perMonth[t.date.slice(0, 7)] = (perMonth[t.date.slice(0, 7)] ?? 0) + 1; });
  const used = new Set();
  let owed = -(a.currencies.find((h) => h.currency === code)?.initial_balance ?? 0);
  let period = 0;
  return transfers.map((t) => {
    const pair = interests.find((i) => !used.has(i.id) && i.date === t.date && i.id > t.id);
    if (pair) used.add(pair.id);
    const extra = t.loan_kind === "extra";
    const principal = t.to_amount ?? t.amount;
    owed -= principal;
    return {
      t, pair, extra, principal, owed,
      interest: pair?.amount ?? 0,
      period: extra ? null : ++period,
      dupe: !extra && perMonth[t.date.slice(0, 7)] > 1, // 同一個月有兩筆以上本期還款
    };
  });
}

// 依首期還款日推算，到今天應該繳了幾期
function expectedPeriods(start) {
  if (!start) return null;
  const [y, m, d] = start.split("-").map(Number);
  const [ty, tm, td] = today().split("-").map(Number);
  return Math.max(0, (ty - y) * 12 + (tm - m) + (td >= d ? 1 : 0));
}

function loanHistoryBox(a, code, loan) {
  const rows = loanRepayments(a);
  const regular = rows.filter((r) => !r.extra).length;
  const expected = expectedPeriods(loan.start_date);
  const dupes = rows.filter((r) => r.dupe).length;
  const checks = [];
  if (expected != null) {
    const diff = regular - expected;
    checks.push(diff === 0
      ? `<span class="text-success">✓ 依首期還款日 ${esc(loan.start_date)} 推算，到今天應繳 ${expected} 期，已記錄 ${regular} 期，期數相符</span>`
      : `<span class="text-warn">⚠ 依首期還款日 ${esc(loan.start_date)} 推算，到今天應繳 ${expected} 期，已記錄 ${regular} 期（${diff > 0 ? `多 ${diff}` : `少 ${-diff}`} 期）</span>`);
  } else {
    checks.push(`<span class="muted">在「貸款設定」填首期還款日，就能核對應繳期數</span>`);
  }
  if (dupes) checks.push(`<span class="text-warn">⚠ 有 ${dupes} 筆本期還款落在同一個月，已用黃底標示</span>`);

  const sum = (key) => rows.reduce((s, r) => s + r[key], 0);
  const table = rows.length
    ? `<div class="table-wrap"><table class="table table-hover">
        <thead><tr><th>期數</th><th>日期</th><th>類型</th><th>扣款帳戶</th><th class="text-right">本金</th><th class="text-right">利息</th>
          <th class="text-right">合計</th><th class="text-right">還款後剩餘本金</th><th></th></tr></thead>
        <tbody>${rows.map((r) => `<tr class="${r.dupe ? "row-warn" : ""}">
          <td>${r.extra ? "—" : `第 ${r.period} 期`}${r.dupe ? " ⚠" : ""}</td>
          <td class="nowrap">${r.t.date}</td>
          <td>${r.extra ? `<span class="text-success">額外還款</span>` : "本期還款"}</td>
          <td>${esc(fromName(r.t))}</td>
          <td class="text-right amount">${money(r.principal, code)}</td>
          <td class="text-right amount">${r.interest ? money(r.interest, code) : "—"}</td>
          <td class="text-right amount">${money(r.principal + r.interest, code)}</td>
          <td class="text-right amount">${money(Math.max(0, r.owed), code)}</td>
          <td class="text-right"><button class="btn btn-xs btn-default" data-loan-pay-del="${a.id}|${r.t.id}" title="刪除這筆還款（本金＋利息）">${icon("trash")}</button></td>
        </tr>`).join("")}</tbody>
        <tfoot><tr><td colspan="4"><strong>合計</strong></td>
          <td class="text-right amount">${money(sum("principal"), code)}</td>
          <td class="text-right amount">${money(sum("interest"), code)}</td>
          <td class="text-right amount">${money(sum("principal") + sum("interest"), code)}</td><td colspan="2"></td></tr></tfoot>
      </table></div>`
    : `<p class="empty">還沒有還款紀錄</p>`;

  return box(`${icon("list")} 還款紀錄`, table, {
    cls: "box-default",
    flush: true,
    tools: rows.length ? `<button class="btn btn-sm btn-default" data-loan-recalc="${a.id}">${icon("transfer")} 重新編號並重算利息</button>` : "",
    footer: `<div class="loan-checks">${checks.join("<br>")}</div>${reconcilePanel(a, code, loan, rows, dupes)}`,
  });
}

// 與銀行核對：輸入銀行 APP 的剩餘本金，比對差額並給建議
function reconcilePanel(a, code, loan, rows, dupes) {
  const owed = Math.max(0, -balance(a.id, code));
  const bank = loan.bank_balance;
  let result = `<span class="muted">輸入銀行 APP 顯示的剩餘本金，按「核對」</span>`;
  if (bank != null) {
    const diff = Math.round((owed - bank) * 100) / 100;
    const head = `${esc(loan.bank_date)} 核對：銀行 ${money(bank, code)}，記帳本 ${money(owed, code)}`;
    const lastRegular = [...rows].reverse().find((r) => !r.extra && r.pair);
    if (!diff) {
      result = `<span class="text-success">✓ ${head}，完全相符</span>`;
    } else {
      const tips = [];
      if (dupes) tips.push("有標 ⚠ 的重複還款，請先刪除重複那筆，再按「重新編號並重算利息」");
      const small = lastRegular && Math.abs(diff) < Math.min(lastRegular.principal, lastRegular.interest);
      if (small && !dupes) {
        tips.push(`差額不大，通常是銀行按實際天數計息造成的。可以把差額調整到最近一期（${lastRegular.t.date}）：
          本金 ${money(lastRegular.principal, code)} → ${money(lastRegular.principal + diff, code)}、
          利息 ${money(lastRegular.interest, code)} → ${money(lastRegular.interest - diff, code)}，該期總額不變
          <button class="btn btn-xs btn-primary" type="button" data-loan-adjust="${a.id}">調整最近一期</button>`);
      } else if (!dupes) {
        tips.push("差額較大，請對照上面的還款紀錄，檢查是否有漏記、重複或金額輸入錯誤的還款");
      }
      result = `<span class="text-warn">⚠ ${head}，差 ${money(Math.abs(diff), code)}（記帳本${diff > 0 ? "多" : "少"}）</span>`
        + tips.map((t) => `<br>・${t}`).join("");
    }
  }
  return `<div class="reconcile">
    <form class="inline-form" data-loan-reconcile="${a.id}">
      <div class="input-group"><span class="input-group-addon">銀行剩餘本金 ${symbol(code)}</span>
        <input class="form-control" name="bank" type="number" min="0" step="any" inputmode="decimal" value="${bank ?? ""}" required>
      </div>
      <button class="btn btn-default" type="submit">${icon("scale")} 核對</button>
    </form>
    <div class="loan-checks">${result}</div>
  </div>`;
}

function loanSection(a) {
  const { loan, code, owed, paid, extra, interest, need } = loanStats(a);
  const left = loan.term_months ? Math.max(0, loan.term_months - paid) : null;
  const pct = loan.principal ? Math.max(0, Math.min(100, (1 - owed / loan.principal) * 100)) : 0;
  const thisMonth = today().slice(0, 7);
  const planEnd = loan.start_date && loan.term_months ? monthLabel(shiftMonth(loan.start_date.slice(0, 7), loan.term_months - 1)) : "";
  let needText = "";
  if (need === Infinity) needText = "每月還款不夠付利息，永遠還不完";
  else if (need === 0) needText = "已還清 🎉";
  else if (need) needText = `照目前每月還款約再 ${need} 期，${monthLabel(shiftMonth(thisMonth, need - 1))}還清`;

  const initial = a.currencies.find((h) => h.currency === code)?.initial_balance ?? 0;
  const banks = state.accounts.filter((x) => x.kind !== "loan" && accountCodes(x).includes(code));
  const payFrom = loan.pay_account_id ?? banks[0]?.id;
  const bankOptions = (selected) => banks.map((b) => `<option value="${b.id}"${b.id === selected ? " selected" : ""}>${esc(b.name)}</option>`).join("");

  const stats = `<div class="grid grid-4">
    ${infoBox("blue", "chart", "已繳期數", loan.term_months ? `${paid} / ${loan.term_months} 期` : `${paid} 期`, left != null ? `原訂剩 ${left} 期${planEnd ? `，${planEnd}結清` : ""}` : "請先在「貸款設定」填期數")}
    ${infoBox("aqua", "scale", "預估剩餘期數", need == null ? "—" : need === Infinity ? "∞" : `${need} 期`, needText || "請先填每月還款")}
    ${infoBox("yellow", "out", "累計已付利息", money(interest, code), loan.annual_rate ? `年利率 ${loan.annual_rate}%` : "未設定利率")}
    ${infoBox("green", "in", "累計額外還款", money(extra, code), "提前還的本金")}
  </div>
  ${loan.principal ? `<div class="box box-default"><div class="box-body">
    <div class="progress-label"><span>本金已還 ${pct.toFixed(1)}%</span><span>剩餘本金 ${money(owed, code)} / 借款 ${money(loan.principal, code)}</span></div>
    <div class="progress"><div class="progress-bar bg-green" style="width:${pct}%"></div></div>
  </div></div>` : ""}`;

  const payForm = banks.length
    ? `<form id="loanPay" data-loan="${a.id}">
        <div class="form-group"><label for="lp-kind">還款類型</label>
          <select class="form-control" id="lp-kind"><option value="regular">本期還款（第 ${paid + 1} 期）</option><option value="extra">額外還款（全部算本金）</option></select>
        </div>
        <div class="form-group"><label for="lp-from">扣款帳戶</label><select class="form-control" id="lp-from">${bankOptions(payFrom)}</select></div>
        <div class="form-group"><label for="lp-amount">金額</label>
          <div><div class="input-group"><span class="input-group-addon">${symbol(code)}</span>
            <input class="form-control" id="lp-amount" type="number" min="0.01" step="0.01" inputmode="decimal" value="${loan.monthly_payment || ""}" required>
          </div><small class="muted" id="lp-preview"></small></div>
        </div>
        <div class="form-group"><label for="lp-date">日期</label><input class="form-control" id="lp-date" type="date" value="${today()}" required></div>
        <div class="text-right"><button class="btn btn-danger" type="submit">${icon("plus")} 記錄還款</button></div>
      </form>`
    : `<p class="empty">還沒有可以扣款的 ${esc(code)} 帳戶</p>`;

  const field = (id, label, value, attrs = "", after = "") => `<div class="form-group"><label for="${id}">${label}</label>
    <div><input class="form-control" id="${id}" value="${esc(value)}" ${attrs}>${after}</div></div>`;
  const settingsForm = `<form id="loanSettings" data-loan="${a.id}">
      ${field("ls-principal", "借款金額", loan.principal || "", 'type="number" min="0" step="any" inputmode="decimal"')}
      ${field("ls-rate", "年利率 %", loan.annual_rate || "", 'type="number" min="0" step="any" inputmode="decimal" placeholder="例如 1.775，無息填 0"')}
      ${field("ls-term", "還款期數", loan.term_months || "", 'type="number" min="0" step="1" inputmode="numeric" placeholder="月數，例如 96"', `<small class="muted" id="ls-term-text">${termText(loan.term_months)}</small>`)}
      ${field("ls-monthly", "每月還款", loan.monthly_payment || "", 'type="number" min="0" step="any" inputmode="decimal" placeholder="留空依利率與期數自動試算"')}
      ${field("ls-start", "首期還款日", loan.start_date, 'type="date"')}
      <div class="form-group"><label for="ls-pay">預設扣款帳戶</label>
        <select class="form-control" id="ls-pay"><option value="">—</option>${bankOptions(loan.pay_account_id)}</select></div>
      <div class="box-footer-row">
        ${loan.principal && !initial ? `<button class="btn btn-sm btn-default" type="button" data-loan-initial="${a.id}">把借款金額設為目前欠款</button>` : "<span></span>"}
        <button class="btn btn-primary" type="submit">儲存設定</button>
      </div>
    </form>`;

  return stats + `<div class="grid grid-2">
    ${box(`${icon("plus")} 還款`, payForm, { cls: "box-danger" })}
    ${box(`${icon("gear")} 貸款設定`, settingsForm, { cls: "box-default" })}
  </div>` + loanHistoryBox(a, code, loan);
}

// 貸款頁的表單：即時顯示利息/本金拆分與期數換算，送出還款與設定
function bindLoanForms(a) {
  const { loan, code, owed } = loanStats(a);
  const pay = $("#loanPay");
  if (pay) {
    const preview = () => {
      const amount = Number($("#lp-amount").value) || 0;
      const regular = $("#lp-kind").value === "regular";
      const interest = regular && loan.annual_rate ? monthInterest(owed, loan.annual_rate, amount) : 0;
      $("#lp-preview").textContent = amount
        ? (interest ? `利息 ${money(interest, code)}（記成支出）＋ 本金 ${money(amount - interest, code)}（從剩餘貸款扣除）` : `全部 ${money(amount, code)} 從剩餘貸款扣除`)
        : "";
    };
    $("#lp-kind").addEventListener("change", () => {
      $("#lp-amount").value = $("#lp-kind").value === "regular" ? loan.monthly_payment || "" : "";
      preview();
    });
    $("#lp-amount").addEventListener("input", preview);
    preview();
    pay.addEventListener("submit", (e) => {
      e.preventDefault();
      mutate(async () => {
        const r = await postJson(`/api/loans/${a.id}/payments`, {
          kind: $("#lp-kind").value, from_account_id: $("#lp-from").value, amount: $("#lp-amount").value, date: $("#lp-date").value,
        });
        state.flash = ["success", `已記錄還款：本金 ${money(r.principal, code)}${r.interest ? `、利息 ${money(r.interest, code)}` : ""}`];
      });
    });
  }

  $("#ls-term").addEventListener("input", (e) => ($("#ls-term-text").textContent = termText(Number(e.target.value))));
  $("#loanSettings").addEventListener("submit", (e) => {
    e.preventDefault();
    mutate(async () => {
      const r = await putJson(`/api/loans/${a.id}`, {
        principal: $("#ls-principal").value, annual_rate: $("#ls-rate").value, term_months: $("#ls-term").value,
        monthly_payment: $("#ls-monthly").value, start_date: $("#ls-start").value, pay_account_id: $("#ls-pay").value || null,
      });
      state.flash = ["success", `貸款設定已儲存${r.monthly_payment ? `，每月還款 ${money(r.monthly_payment, code)}` : ""}`];
    });
  });
}

// ----- 自動扣款 -----
const autopaysOf = (id) => state.autopays.filter((x) => x.account_id === id);
const pad2 = (n) => String(n).padStart(2, "0");

// 從 start_date 起到 until（含），每月 day 號（小月取月底）、且晚於 last_posted 的扣款日（和伺服器同一套算法）
function autopayDates(ap, until) {
  const out = [];
  let [y, m] = ap.start_date.split("-").map(Number);
  for (;;) {
    const d = `${y}-${pad2(m)}-${pad2(Math.min(ap.day, new Date(y, m, 0).getDate()))}`;
    if (d > until) return out;
    if (d >= ap.start_date && (!ap.last_posted || d > ap.last_posted)) out.push(d);
    if (++m > 12) { m = 1; y++; }
  }
}
// 下次扣款日：今天之後（也晚於已記錄日）的第一個
function nextAutopayDate(ap) {
  const after = ap.last_posted > today() ? ap.last_posted : today();
  return autopayDates({ ...ap, last_posted: after }, `${Number(today().slice(0, 4)) + 2}-12-31`)[0] ?? "";
}
// 「提醒確認」模式中已到期、還沒記帳的扣款
function pendingAutopays(accountId = null) {
  return state.autopays
    .filter((ap) => ap.active && !ap.auto_post && (accountId == null || ap.account_id === accountId))
    .flatMap((ap) => autopayDates(ap, today()).map((d) => ({ ap, date: d })));
}

// 支出分類下拉（值為「主分類|子分類」）
function expenseCategoryOptions(main, sub) {
  return mainCategories("expense").map((m) => {
    const values = [[m.name, ""], ...subCategories(m.id).map((s) => [m.name, s.name])];
    return `<optgroup label="${esc(m.name)}">${values.map(([mm, ss]) =>
      `<option value="${esc(`${mm}|${ss}`)}"${mm === main && ss === sub ? " selected" : ""}>${esc(ss ? `${mm} › ${ss}` : mm)}</option>`
    ).join("")}</optgroup>`;
  }).join("");
}

function pendingRows(list, showAccount) {
  return list.map(({ ap, date }) => `<tr>
    <td class="nowrap">${date}</td>
    ${showAccount ? `<td>${esc(accountName(ap.account_id))}</td>` : ""}
    <td>${esc(ap.name)} <span class="muted">${esc(ap.subcategory || ap.category)}</span></td>
    <td><div class="input-group input-narrow"><span class="input-group-addon input-sm">${symbol(accountCodes(findAccount(ap.account_id))[0] ?? BASE)}</span>
      <input class="form-control input-sm" type="number" min="0.01" step="0.01" inputmode="decimal" value="${ap.amount}" data-ap-amount="${ap.id}|${date}"></div></td>
    <td class="text-right"><button class="btn btn-xs btn-success" data-ap-post="${ap.id}|${date}">${icon("plus")} 記錄</button></td>
  </tr>`).join("");
}

function autopayBox(a) {
  const list = autopaysOf(a.id);
  const code = accountCodes(a)[0] ?? BASE;
  const pending = pendingAutopays(a.id);
  const field = (ap, key, cls, attrs = "") =>
    `<input class="form-control input-sm ${cls}" data-ap-field="${key}" data-ap-id="${ap.id}" value="${esc(ap[key])}" ${attrs}>`;
  const rows = list.map((ap) => `<tr class="${ap.active ? "" : "row-muted"}">
    <td>${field(ap, "name", "w-name")}</td>
    <td class="nowrap">每月 ${field(ap, "day", "w-day", 'type="number" min="1" max="31" step="1" inputmode="numeric"')} 號</td>
    <td>${field(ap, "amount", "w-num", 'type="number" min="0.01" step="0.01" inputmode="decimal"')}</td>
    <td><select class="form-control input-sm" data-ap-field="category" data-ap-id="${ap.id}">${expenseCategoryOptions(ap.category, ap.subcategory)}</select></td>
    <td><select class="form-control input-sm" data-ap-field="auto_post" data-ap-id="${ap.id}">
      <option value="1"${ap.auto_post ? " selected" : ""}>自動入帳</option>
      <option value="0"${ap.auto_post ? "" : " selected"}>提醒確認</option></select></td>
    <td class="nowrap">${!ap.active ? `<span class="muted">已暫停</span>`
      : pending.some((p) => p.ap.id === ap.id) ? `<span class="text-warn">⚠ 待確認</span>` : esc(nextAutopayDate(ap))}</td>
    <td class="text-right nowrap">
      <button class="btn btn-xs btn-default" data-ap-toggle="${ap.id}">${ap.active ? "暫停" : "啟用"}</button>
      <button class="btn btn-xs btn-default" data-ap-del="${ap.id}" title="刪除（已記的帳會保留）">${icon("trash")}</button>
    </td>
  </tr>`).join("");
  const monthly = list.filter((ap) => ap.active).reduce((s, ap) => s + ap.amount, 0);

  const defaultCat = mainCategories("expense").find((m) => m.name === "交流通訊");
  const table = list.length
    ? `<div class="table-wrap"><table class="table autopays">
        <thead><tr><th>扣款項目</th><th>扣款日</th><th>金額</th><th>支出分類</th><th>模式</th><th>下次扣款日</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2"><strong>每月合計</strong></td><td class="amount">${money(monthly, code)}</td><td colspan="4" class="muted">（啟用中的項目）</td></tr></tfoot>
      </table></div>`
    : `<p class="empty">還沒有自動扣款項目</p>`;
  const pendingTable = pending.length
    ? `<div class="pending"><strong class="text-warn">⚠ 待確認的扣款</strong>：改成帳單上的實際金額後按「記錄」
        <div class="table-wrap"><table class="table"><tbody>${pendingRows(pending, false)}</tbody></table></div></div>`
    : "";

  return box(`${icon("refresh")} 自動扣款`, pendingTable + table, {
    cls: "box-purple",
    flush: true,
    footer: `<form class="inline-form" data-add-autopay="${a.id}">
        <input class="form-control" name="name" placeholder="扣款項目，例如：手機費" required>
        <div class="input-group input-day"><span class="input-group-addon">每月</span>
          <input class="form-control" name="day" type="number" min="1" max="31" step="1" inputmode="numeric" placeholder="幾" required>
          <span class="input-group-addon addon-right">號</span></div>
        <input class="form-control num-input" name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="金額" required>
        <select class="form-control" name="category" aria-label="支出分類">${expenseCategoryOptions(
          defaultCat?.name, subCategories(defaultCat?.id).find((s) => s.name === "手機費")?.name ?? "")}</select>
        <select class="form-control mode-select" name="auto_post" aria-label="模式">
          <option value="1">自動入帳</option><option value="0">提醒確認</option></select>
        <div class="input-group input-start"><span class="input-group-addon">從</span>
          <input class="form-control" name="start_date" type="date" value="${today()}" required></div>
        <button class="btn btn-default" type="submit">${icon("plus")} 新增</button>
      </form>
      <p class="muted hint">自動入帳：到扣款日自動在這張卡記一筆支出（金額固定的，例如串流訂閱）。提醒確認：到期先列為「待確認」，改成實際金額再記錄（金額會變的，例如手機費、電費）。31 號遇到小月會在月底扣；「從」之前的月份不會補記。</p>`,
  });
}

// ----- 保險 -----
const FREQUENCIES ={ 1: "月繳", 3: "季繳", 6: "半年繳", 12: "年繳" };

// 依首期繳費日與繳費頻率推算：到今天應繳幾期、下次繳費日
function premiumSchedule(p) {
  const periods = p.pay_years ? Math.round((p.pay_years * 12) / p.frequency) : 0;
  if (!p.start_date) return { periods, due: null, next: "" };
  const dateAt = (k) => `${shiftMonth(p.start_date.slice(0, 7), k * p.frequency)}-${p.start_date.slice(8, 10)}`;
  let k = 0;
  while (dateAt(k) <= today() && (!periods || k < periods)) k++;
  return { periods, due: k, next: periods && k >= periods ? "" : dateAt(k) };
}

function policySection(a) {
  const p = policyOf(a.id);
  const code = accountCodes(a)[0] ?? BASE;
  const savings = p.policy_type === "savings";
  const payments = state.entries
    .filter((r) => r.loan_id === a.id && r.loan_kind === "premium")
    .sort((x, y) => x.date.localeCompare(y.date) || x.id - y.id);
  const recorded = payments.reduce((s, r) => s + r.amount, 0);
  const before = a.currencies.find((h) => h.currency === code)?.initial_balance ?? 0; // 記帳前已繳
  const totalPaid = before + recorded;
  const { periods, due, next } = premiumSchedule(p);

  const valueBox = savings
    ? infoBox("green", "shield", "保單價值", p.cash_value != null ? money(p.cash_value, code) : "—",
      p.cash_value != null ? `更新於 ${esc(p.cash_value_date)}` : "在「保單設定」填目前保單價值（解約金）")
    : infoBox("green", "shield", "保額", p.sum_insured ? money(p.sum_insured, code) : "—", "保障型：保費記為支出");
  const gain = savings && p.cash_value != null ? p.cash_value - totalPaid : null;
  const stats = `<div class="grid grid-4">
    ${valueBox}
    ${infoBox("blue", "coin", "累計已繳保費", money(totalPaid, code),
      `${payments.length} 筆紀錄${before ? `＋記帳前 ${money(before, code)}` : ""}`)}
    ${gain != null
      ? infoBox(gain >= 0 ? "green" : "red", gain >= 0 ? "in" : "out", "解約損益", `${gain > 0 ? "+" : ""}${money(gain, code)}`,
        totalPaid ? `報酬率 ${gain > 0 ? "+" : ""}${((gain / totalPaid) * 100).toFixed(2)}%` : "")
      : infoBox("aqua", "chart", "繳費進度", due == null ? "—" : periods ? `${due} / ${periods} 期` : `${due} 期`,
        due == null ? "在「保單設定」填首期繳費日" : `${FREQUENCIES[p.frequency]}${p.pay_years ? `・${p.pay_years} 年期` : ""}`)}
    ${infoBox("yellow", "scale", "下次繳費日", next || (due != null ? "已繳費期滿" : "—"), p.premium ? `保費 ${money(p.premium, code)}` : "")}
  </div>`;

  const payers = state.accounts.filter((x) => !["insurance", "loan"].includes(x.kind) && accountCodes(x).includes(code));
  const payFrom = p.pay_account_id ?? payers[0]?.id;
  const payerOptions = (selected) => Object.entries(ACCOUNT_KINDS).map(([kind, k]) => {
    const list = payers.filter((x) => x.kind === kind);
    return list.length ? `<optgroup label="${k.name}">${list.map((x) =>
      `<option value="${x.id}"${x.id === selected ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</optgroup>` : "";
  }).join("");

  const payForm = payers.length
    ? `<form id="policyPay" data-policy="${a.id}">
        <div class="form-group"><label for="pp-from">扣款帳戶</label><select class="form-control" id="pp-from">${payerOptions(payFrom)}</select></div>
        <div class="form-group"><label for="pp-amount">保費</label>
          <div class="input-group"><span class="input-group-addon">${symbol(code)}</span>
            <input class="form-control" id="pp-amount" type="number" min="0.01" step="0.01" inputmode="decimal" value="${p.premium || ""}" required>
          </div></div>
        <div class="form-group"><label for="pp-date">日期</label><input class="form-control" id="pp-date" type="date" value="${today()}" required></div>
        <p class="muted hint">${savings ? "儲蓄型：保費會從扣款帳戶轉入這張保單，累積成資產" : "保障型：保費會記成支出（金融保險 › 保險費）"}</p>
        <div class="text-right"><button class="btn btn-success" type="submit">${icon("plus")} 記錄繳費（第 ${payments.length + 1} 筆）</button></div>
      </form>`
    : `<p class="empty">還沒有可以扣款的 ${esc(code)} 帳戶</p>`;

  const field = (id, label, value, attrs = "", hint = "") => `<div class="form-group"><label for="${id}">${label}</label>
    <div><input class="form-control" id="${id}" value="${esc(value)}" ${attrs}>${hint ? `<small class="muted">${hint}</small>` : ""}</div></div>`;
  const num = 'type="number" min="0" step="any" inputmode="decimal"';
  const settingsForm = `<form id="policySettings" data-policy="${a.id}">
      ${field("ps-insurer", "保險公司", p.insurer, 'placeholder="例如：○○人壽"')}
      <div class="form-group"><label for="ps-type">保單類型</label>
        <select class="form-control" id="ps-type">
          <option value="protection"${savings ? "" : " selected"}>保障型（醫療、意外、定期壽險）</option>
          <option value="savings"${savings ? " selected" : ""}>儲蓄型（儲蓄險、終身壽險、投資型）</option>
        </select></div>
      ${field("ps-premium", "保費", p.premium || "", num)}
      <div class="form-group"><label for="ps-freq">繳費頻率</label>
        <select class="form-control" id="ps-freq">${Object.entries(FREQUENCIES).map(([v, label]) =>
          `<option value="${v}"${Number(v) === p.frequency ? " selected" : ""}>${label}</option>`).join("")}</select></div>
      ${field("ps-years", "繳費年期", p.pay_years || "", 'type="number" min="0" step="1" inputmode="numeric" placeholder="例如 6、20"', "年")}
      ${field("ps-start", "首期繳費日", p.start_date, 'type="date"')}
      ${field("ps-sum", "保額", p.sum_insured || "", num)}
      ${field("ps-value", "目前保單價值", p.cash_value ?? "", num + ' placeholder="儲蓄型才需要，填解約金"',
        p.cash_value_date ? `上次更新 ${esc(p.cash_value_date)}` : "")}
      <div class="form-group"><label for="ps-pay">預設扣款帳戶</label>
        <select class="form-control" id="ps-pay"><option value="">—</option>${payerOptions(p.pay_account_id)}</select></div>
      ${field("ps-note", "備註", p.note, 'placeholder="保單號碼、受益人等"')}
      <div class="text-right"><button class="btn btn-primary" type="submit">儲存設定</button></div>
    </form>`;

  const checks = due == null ? "" : `<div class="loan-checks">${payments.length === due
    ? `<span class="text-success">✓ 依首期繳費日推算應繳 ${due} 期，已記錄 ${payments.length} 筆</span>`
    : `<span class="text-warn">⚠ 依首期繳費日推算應繳 ${due} 期，已記錄 ${payments.length} 筆（記帳前繳的不在紀錄裡屬正常）</span>`}</div>`;
  const history = payments.length
    ? `<div class="table-wrap"><table class="table table-hover">
        <thead><tr><th>#</th><th>日期</th><th>扣款帳戶</th><th>記錄方式</th><th class="text-right">保費</th><th></th></tr></thead>
        <tbody>${payments.map((r, i) => `<tr>
          <td>${i + 1}</td><td class="nowrap">${r.date}</td>
          <td>${esc(accountName(r.type === "transfer" ? r.from_account_id : r.account_id))}</td>
          <td class="muted">${r.type === "transfer" ? "轉入保單" : "支出"}</td>
          <td class="text-right amount">${money(r.amount, code)}</td>
          <td class="text-right"><button class="btn btn-xs btn-default" data-del="${r.id}" title="刪除">${icon("trash")}</button></td>
        </tr>`).join("")}</tbody>
        <tfoot><tr><td colspan="4"><strong>合計</strong></td><td class="text-right amount">${money(recorded, code)}</td><td></td></tr></tfoot>
      </table></div>`
    : `<p class="empty">還沒有繳費紀錄</p>`;

  return stats + `<div class="grid grid-2">
    ${box(`${icon("plus")} 繳保費`, payForm, { cls: "box-success" })}
    ${box(`${icon("gear")} 保單設定${p.insurer ? `<small class="muted">　${esc(p.insurer)}</small>` : ""}`, settingsForm, { cls: "box-default" })}
  </div>` + box(`${icon("list")} 繳費紀錄`, history, { cls: "box-default", flush: true, footer: checks });
}

function bindPolicyForms(a) {
  const code = accountCodes(a)[0] ?? BASE;
  $("#policyPay")?.addEventListener("submit", (e) => {
    e.preventDefault();
    mutate(async () => {
      const r = await postJson(`/api/policies/${a.id}/payments`, {
        from_account_id: $("#pp-from").value, amount: $("#pp-amount").value, date: $("#pp-date").value,
      });
      state.flash = ["success", `已記錄第 ${r.period} 期保費 ${money(Number($("#pp-amount").value), code)}${r.savings ? "（轉入保單）" : "（記為支出）"}`];
    });
  });
  $("#policySettings").addEventListener("submit", (e) => {
    e.preventDefault();
    mutate(async () => {
      await putJson(`/api/policies/${a.id}`, {
        insurer: $("#ps-insurer").value, policy_type: $("#ps-type").value, premium: $("#ps-premium").value,
        frequency: $("#ps-freq").value, pay_years: $("#ps-years").value, start_date: $("#ps-start").value,
        sum_insured: $("#ps-sum").value, cash_value: $("#ps-value").value, pay_account_id: $("#ps-pay").value || null,
        note: $("#ps-note").value,
      });
      state.flash = ["success", "保單設定已儲存"];
    });
  });
}

function accountPage(arg) {
  const a = findAccount(arg);
  if (!a) return { title: "帳戶", crumbs: ["首頁", "帳戶"], html: `<p class="empty">找不到這個帳戶</p>` };
  const k = ACCOUNT_KINDS[a.kind];
  const codes = accountCodes(a);
  // 有交割戶的證券戶：現金就是交割銀行的餘額，交易紀錄、流入流出、新增交易都以銀行為準
  const bank = a.kind === "securities" ? settlementBankOf(a.id) : null;
  const cashAcc = bank ?? a;
  const rows = inMonth(state.month).filter((r) => accountEffects(r, cashAcc.id).length);
  const monthTrades = state.trades.filter((t) => t.bank_id === cashAcc.id && t.date.startsWith(state.month));
  const flow = (sign) => rows.reduce((s, r) =>
    s + accountEffects(r, cashAcc.id).reduce((x, e) => x + Math.max(0, sign * toBase(e.delta, e.code)), 0), 0)
    + monthTrades.reduce((s, t) => s + Math.max(0, sign * toBase(tradeDelta(t, cashAcc.id, t.currency), t.currency)), 0);
  const multi = codes.length > 1;
  // 證券戶沒有交割戶時不能記一般交易（證券戶只做股票交易）
  const addButtons = a.kind === "securities" && !bank ? "" : Object.entries(TYPES).map(([type, t]) =>
    `<a class="btn btn-sm ${t.btn}" href="#/new/${type}/${cashAcc.id}">${icon("plus")} ${t.name}</a>`
  ).join("");
  // 銀行（交割戶）頁：本月的股票交割
  const settleList = a.kind === "bank" && monthTrades.length ? box(`${icon("stock")} 股票交割 <small class="muted">${monthLabel(state.month)}</small>`,
    `<div class="table-wrap"><table class="table table-hover"><thead><tr><th>日期</th><th>證券戶</th><th>買賣</th><th>股票</th><th class="text-right">股數</th><th class="text-right">交割金額</th></tr></thead>
      <tbody>${monthTrades.map((t) => `<tr><td class="nowrap">${t.date}</td>
        <td><a href="#/account/${t.account_id}">${esc(accountName(t.account_id))}</a></td>
        <td><span class="code-tag ${SIDES[t.side].cls}">${SIDES[t.side].name}</span></td>
        <td>${esc(holdingLabel(state.holdings.find((h) => h.id === t.holding_id)))}</td>
        <td class="text-right">${shareText(t.shares)}</td>
        <td class="text-right">${signedAmount(tradeDelta(t, a.id, t.currency), t.currency)}</td></tr>`).join("")}</tbody>
    </table></div>`, { cls: "box-default", flush: true }) : "";

  // 交割戶餘額方塊；證券戶自己若還有現金餘額會跟銀行重複，提醒歸零
  const settlementBoxes = bank
    ? bank.currencies.map((h) => infoBox("aqua", "bank", `交割戶餘額（${currency(h.currency)?.name ?? h.currency}）`,
        money(balance(bank.id, h.currency), h.currency), `<a href="#/account/${bank.id}">${esc(bank.name)}</a>`)).join("")
      + a.currencies.filter((h) => balance(a.id, h.currency)).map((h) => infoBox("yellow", k.icon, `證券戶自身餘額（${h.currency}）`,
        money(balance(a.id, h.currency), h.currency), "已連結交割戶，這筆會跟銀行重複計算，建議把初始餘額歸零")).join("")
    : "";

  // 每個幣別一個餘額方塊；信用卡顯示「欠款」
  const balanceBoxes = bank ? settlementBoxes : a.currencies.map((h) => {
    const b = balance(a.id, h.currency);
    const name = currency(h.currency)?.name ?? h.currency;
    const debt = DEBT_KINDS[a.kind];
    if (debt) {
      return infoBox(k.color, k.icon, `${debt.label}（${name}）`, money(Math.max(0, -b), h.currency),
        b > 0 ? `溢繳 ${money(b, h.currency)}` : debt.hint);
    }
    return infoBox(k.color, k.icon, `${name}餘額`, money(b, h.currency),
      h.currency === BASE ? `初始餘額 ${money(h.initial_balance, h.currency)}` : `≈ ${money(toBase(b, h.currency))}`);
  }).join("");

  const missing = state.currencies.filter((c) => !codes.includes(c.code));
  const currencyTable = `<div class="table-wrap"><table class="table">
      <thead><tr><th>幣別</th><th class="text-right">初始餘額</th><th class="text-right">目前餘額</th><th class="text-right">≈ 台幣</th><th></th></tr></thead>
      <tbody>${a.currencies.map((h) => {
        const b = balance(a.id, h.currency);
        return `<tr>
          <td>${esc(h.currency)} <span class="muted">${esc(currency(h.currency)?.name ?? "")}</span></td>
          <td class="text-right">${balanceText(h.initial_balance, h.currency)}</td>
          <td class="text-right">${balanceText(b, h.currency)}</td>
          <td class="text-right muted">${money(toBase(b, h.currency))}</td>
          <td class="text-right nowrap">
            <button class="btn btn-xs btn-default" data-acc-cur-initial="${a.id}|${esc(h.currency)}">${icon("edit")} 初始餘額</button>
            ${multi ? `<button class="btn btn-xs btn-default" data-acc-cur-del="${a.id}|${esc(h.currency)}" title="移除這個幣別">${icon("trash")}</button>` : ""}
          </td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>`;
  const addCurrency = missing.length
    ? `<form class="inline-form" data-add-acc-cur="${a.id}">
        <select class="form-control" name="cur">${currencyOptions(missing.map((c) => c.code))}</select>
        <input class="form-control" name="initial" type="number" step="0.01" inputmode="decimal" placeholder="${k.initialHint}">
        <button class="btn btn-default" type="submit">${icon("plus")} 加入幣別</button>
      </form>`
    : `<span class="muted">所有幣別都已加入。要其他幣別請先到 <a href="#/currencies">幣別設定</a> 新增。</span>`;

  // 證券戶：多顯示持股市值與未實現損益
  const isSecurities = a.kind === "securities";
  const holdingCost = holdingsOf(a.id).reduce((s, h) => s + toBase(h.cost, h.currency), 0);
  const holdingPl = holdingsBase(a.id) - holdingCost;
  const holdingBoxes = isSecurities && holdingsOf(a.id).length
    ? infoBox("blue", "chart", "持股市值", money(holdingsBase(a.id)),
      `帳戶總值 ${money(securitiesDisplayWorth(a))}${bank ? "（含交割戶）" : ""}`)
      + infoBox(holdingPl >= 0 ? "red" : "green", holdingPl >= 0 ? "in" : "out", "未實現損益",
        `<span>${holdingPl > 0 ? "+" : ""}${money(holdingPl)}</span>`,
        holdingCost ? `報酬率 ${holdingPl > 0 ? "+" : ""}${((holdingPl / holdingCost) * 100).toFixed(2)}%` : "")
    : "";

  // 銀行帳戶：設定它是哪個證券戶的交割戶
  const linkedSec = a.kind === "bank" && a.settlement_for ? findAccount(a.settlement_for) : null;
  const settlementBox = a.kind === "bank" && accountsOf("securities").length
    ? box(`${icon("stock")} 證券交割戶`, `<form class="inline-form" data-settlement="${a.id}">
        <select class="form-control" name="sec">
          <option value="">— 不是交割戶 —</option>
          ${accountsOf("securities").map((s) => {
            const other = settlementBankOf(s.id);
            const taken = other && other.id !== a.id ? `（目前交割戶：${esc(other.name)}）` : "";
            return `<option value="${s.id}"${s.id === a.settlement_for ? " selected" : ""}>${esc(s.name)}${taken}</option>`;
          }).join("")}
        </select>
        <button class="btn btn-default" type="submit">儲存</button>
      </form>
      <p class="muted hint">${linkedSec
        ? `這個帳戶是「<a href="#/account/${linkedSec.id}">${esc(linkedSec.name)}</a>」的交割戶：證券戶頁面會直接顯示這個帳戶的餘額與交易，淨資產只算一次。`
        : "如果這個銀行帳戶是某個證券戶的交割戶（股票買賣的錢從這裡進出），選擇該證券戶，兩邊就會顯示同一筆餘額。"}</p>`,
      { cls: "box-default" })
    : "";

  return {
    title: esc(a.name),
    sub: k.name + (multi ? `・${codes.join(" / ")}` : "") + (bank ? `・交割戶：${bank.name}` : "") + (linkedSec ? `・${linkedSec.name} 的交割戶` : ""),
    crumbs: ["首頁", k.name, esc(a.name)],
    after() {
      makeSortable($("#holdingSort"), "/api/holdings/order", { handle: ".drag-handle" });
      if (a.kind === "loan") bindLoanForms(a);
      if (a.kind === "securities") bindTradeForm();
      if (a.kind === "insurance") bindPolicyForms(a);
    },
    html: `
      ${a.kind === "insurance" ? policySection(a) : `<div class="grid grid-4">
        ${holdingBoxes}
        ${balanceBoxes}
        ${infoBox("green", "in", `${monthLabel(state.month)}流入`, money(flow(1)), multi ? "換算台幣" : "")}
        ${infoBox("red", "out", `${monthLabel(state.month)}流出`, money(flow(-1)), multi ? "換算台幣" : "")}
      </div>`}
      ${isSecurities ? holdingsBox(a) : ""}
      ${isSecurities ? tradeSection(a, bank) : ""}
      ${a.kind === "credit" ? autopayBox(a) : ""}
      ${a.kind === "loan" ? loanSection(a) : ""}

      ${box(bank ? `交割戶交易紀錄 <small class="muted">${esc(bank.name)}</small>` : "交易紀錄", txTable(rows, { accountId: cashAcc.id }), {
        cls: k.box,
        flush: true,
        tools: monthNav(),
        footer: addButtons ? `<div class="btn-row">${addButtons}</div>` : "",
      })}
      ${settleList}
      ${settlementBox}
      ${box(`${icon("coin")} 幣別與初始餘額${bank ? `<small class="muted">　證券戶自身（已連結交割戶，通常應為 0）</small>` : ""}`, currencyTable, { cls: "box-default", flush: true, footer: addCurrency })}`,
  };
}

function addAccountForm(kind) {
  const k = ACCOUNT_KINDS[kind];
  return `<form class="inline-form" data-add-acc data-kind="${kind}">
    <input class="form-control" name="accName" placeholder="新增${k.name}，例如：${k.example}" required>
    <select class="form-control cur-select" name="accCur" aria-label="幣別">${currencyOptions(state.currencies.map((c) => c.code), BASE)}</select>
    <input class="form-control initial-input" name="accInitial" type="number" step="0.01" inputmode="decimal" placeholder="${k.initialHint}">
    <button class="btn btn-default" type="submit">${icon("plus")} 新增</button>
  </form>`;
}

function accountsPage() {
  const sections = Object.entries(ACCOUNT_KINDS).map(([kind, k]) => {
    const list = accountsOf(kind);
    const body = list.length
      ? `<div class="table-wrap"><table class="table table-hover">
          <thead><tr><th class="handle-cell"></th><th>名稱</th><th>幣別</th><th class="text-right">目前餘額</th><th></th></tr></thead>
          <tbody data-sort-kind="${kind}">${list.map((a) => `<tr data-id="${a.id}">
            <td class="handle-cell">${dragHandle}</td>
            <td><a href="#/account/${a.id}">${esc(a.name)}</a>${a.settlement_for && findAccount(a.settlement_for)
              ? ` <span class="code-tag">${esc(findAccount(a.settlement_for).name)} 交割戶</span>` : ""}${
              kind === "securities" && settlementBankOf(a.id) ? ` <span class="code-tag">交割：${esc(settlementBankOf(a.id).name)}</span>` : ""}</td>
            <td>${accountCodes(a).map((c) => `<span class="code-tag">${esc(c)}</span>`).join("")}</td>
            <td class="text-right"><span class="amount${accountWorth(a.id) < 0 ? " text-danger" : ""}">${accountTotalText(a)}</span></td>
            <td class="text-right nowrap">
              <button class="btn btn-xs btn-default" data-acc-rename="${a.id}">${icon("edit")} 改名</button>
              <a class="btn btn-xs btn-default" href="#/account/${a.id}">${icon("coin")} 幣別/初始餘額</a>
              <button class="btn btn-xs btn-default" data-acc-del="${a.id}" title="刪除">${icon("trash")}</button>
            </td>
          </tr>`).join("")}</tbody>
        </table></div>`
      : `<p class="empty">還沒有${k.name}</p>`;
    return box(`${icon(k.icon)} ${k.name}`, body, { cls: k.box, flush: true, footer: addAccountForm(kind) });
  }).join("");

  return {
    title: "帳戶管理",
    sub: "帳戶、證券戶、信用卡、貸款與保險（拖曳 ⠿ 排序）",
    crumbs: ["首頁", "帳戶管理"],
    html: sections,
    after() {
      document.querySelectorAll("[data-sort-kind]").forEach((tbody) =>
        makeSortable(tbody, "/api/accounts/order", { handle: ".drag-handle" })
      );
    },
  };
}

function currenciesPage() {
  const rows = state.currencies.map((c) => {
    const isBase = c.code === BASE;
    return `<tr data-id="${c.id}">
      <td class="handle-cell">${dragHandle}</td>
      <td><strong>${esc(c.code)}</strong></td>
      <td><input class="form-control input-sm" data-cur-field="name" data-cur-id="${c.id}" value="${esc(c.name)}"></td>
      <td><input class="form-control input-sm" data-cur-field="symbol" data-cur-id="${c.id}" value="${esc(c.symbol)}"></td>
      <td><div class="input-group">
        <span class="input-group-addon input-sm">1 ${esc(c.code)} =</span>
        <input class="form-control input-sm rate-input" type="number" step="0.0001" min="0" data-cur-field="rate" data-cur-id="${c.id}" value="${Number(c.rate).toFixed(4)}"${isBase ? " disabled" : ""}>
        <span class="input-group-addon input-sm addon-right">台幣</span>
      </div></td>
      <td class="nowrap muted">${isBase ? "—" : c.rate_time ? `${esc(c.rate_time)}` : "手動設定"}</td>
      <td class="text-right">${isBase ? `<span class="muted">本位幣</span>` : `<button class="btn btn-xs btn-default" data-cur-del="${c.id}" title="刪除">${icon("trash")}</button>`}</td>
    </tr>`;
  }).join("");

  return {
    title: "幣別設定",
    sub: "名稱、符號、匯率改完自動儲存（拖曳 ⠿ 排序）",
    crumbs: ["首頁", "幣別設定"],
    html: box(`${icon("coin")} 幣別`, `<div class="table-wrap"><table class="table currency-table">
        <thead><tr><th class="handle-cell"></th><th>代碼</th><th>名稱</th><th>符號</th><th>匯率</th><th>匯率更新時間</th><th></th></tr></thead>
        <tbody id="currencySort">${rows}</tbody>
      </table></div>`, {
      cls: "box-warning",
      flush: true,
      tools: `<button class="btn btn-sm btn-default" data-refresh-rates>${icon("refresh")} 更新匯率</button>`,
      footer: `<form class="inline-form" data-add-currency>
        <input class="form-control code-input" name="code" placeholder="代碼，例如 EUR" maxlength="6" required>
        <input class="form-control" name="name" placeholder="名稱，例如 歐元" required>
        <input class="form-control code-input" name="symbol" placeholder="符號，例如 €">
        <input class="form-control initial-input" name="rate" type="number" step="0.0001" min="0" placeholder="匯率（留空自動查）">
        <button class="btn btn-default" type="submit">${icon("plus")} 新增幣別</button>
      </form>
      <p class="muted hint">匯率只用來把外幣換算成台幣做統計（首頁、總資產、分類統計），以及換匯時估算轉入金額；帳戶裡的外幣餘額永遠以原幣別記錄。</p>
      <p class="muted hint">匯率來源：Yahoo Finance 的市場匯率（與銀行牌告的買賣價會有些差距）。每天自動更新時會一起更新；按「更新匯率」可立即更新。手動改過的匯率會顯示「手動設定」，直到下次更新。</p>`,
    }),
    after() {
      makeSortable($("#currencySort"), "/api/currencies/order", { handle: ".drag-handle" });
    },
  };
}

function categoriesPage() {
  const map = {};
  inMonth(state.month).filter((r) => r.type !== "transfer").forEach((r) => {
    const c = (map[r.category] ??= { expense: 0, income: 0, count: 0 });
    c[r.type] += toBase(r.amount, r.currency);
    c.count++;
  });
  const items = Object.entries(map).sort((a, b) => b[1].expense + b[1].income - (a[1].expense + a[1].income));
  const body = items.length
    ? `<div class="table-wrap"><table class="table table-hover">
        <thead><tr><th>主分類</th><th class="text-right">支出</th><th class="text-right">收入</th><th class="text-right">筆數</th></tr></thead>
        <tbody>${items.map(([n, c]) => `<tr>
          <td>${icon("tag", "muted")} ${esc(n)}</td>
          <td class="text-right">${c.expense ? amount("expense", c.expense) : "—"}</td>
          <td class="text-right">${c.income ? amount("income", c.income) : "—"}</td>
          <td class="text-right">${c.count}</td>
        </tr>`).join("")}</tbody>
      </table></div>`
    : `<p class="empty">這個月沒有紀錄</p>`;
  return {
    title: "分類統計",
    sub: monthLabel(state.month) + "（外幣已換算成台幣）",
    crumbs: ["首頁", "分類統計"],
    html: box("各分類統計", body, { flush: true, tools: monthNav() }),
  };
}

function addCategoryForm(type, parentId, placeholder) {
  return `<form class="inline-form" data-add-cat data-type="${type}" data-parent="${parentId}">
    <input class="form-control" name="catName" placeholder="${placeholder}" required>
    <button class="btn btn-default" type="submit">${icon("plus")} 新增</button>
  </form>`;
}

function settingsPage(arg) {
  const type = arg === "income" ? "income" : "expense";
  const t = TYPES[type];
  const tabs = ["expense", "income"].map((k) =>
    `<a class="btn ${k === type ? TYPES[k].btn : "btn-default"}" href="#/settings/${k}">${TYPES[k].name}分類</a>`
  ).join("");

  const cards = mainCategories(type).map((m) => {
    const subs = subCategories(m.id);
    const chips = subs.length
      ? subs.map((s) => `<span class="chip" data-id="${s.id}">${esc(s.name)}
          <button type="button" data-rename="${s.id}" title="重新命名">${icon("edit")}</button>
          <button type="button" data-delcat="${s.id}" title="刪除">×</button>
        </span>`).join("")
      : `<span class="muted">還沒有子分類</span>`;
    return box(`${dragHandle}${esc(m.name)}`, `<div class="chips">${chips}</div>${addCategoryForm(type, m.id, "新增子分類")}`, {
      cls: t.box,
      id: m.id,
      tools: `<button class="btn btn-xs btn-default" data-rename="${m.id}">${icon("edit")} 改名</button>
              <button class="btn btn-xs btn-default" data-delcat="${m.id}">${icon("trash")} 刪除</button>`,
    });
  }).join("");

  return {
    title: "分類設定",
    sub: `${t.name}分類（拖曳 ⠿ 排主分類，直接拖子分類標籤排子分類）`,
    crumbs: ["首頁", "分類設定"],
    html: `
      <div class="toolbar"><div class="btn-group">${tabs}</div></div>
      ${box("新增主分類", addCategoryForm(type, "", `輸入新的${t.name}主分類名稱`), { cls: "box-default" })}
      <div class="grid grid-3" id="mainSort">${cards}</div>`,
    after() {
      makeSortable($("#mainSort"), "/api/categories/order", { handle: ".drag-handle" });
      document.querySelectorAll(".chips").forEach((el) =>
        makeSortable(el, "/api/categories/order", { filter: "button", preventOnFilter: false })
      );
    },
  };
}

// ===== 固定開銷：手動項目＋自動扣款＋貸款月付＋保費，換算成每月金額統計 =====
const FIXED_SOURCES = { manual: "手動", autopay: "自動扣款", loan: "貸款", insurance: "保險" };

// m 月份用來算「本月已記錄」；monthly 是換算成每月的台幣金額
function fixedItems(m = state.month) {
  const month = inMonth(m);
  const out = [];
  for (const fc of state.fixedcosts) {
    // 手動項目沒有綁交易，用「同分類（有子分類就比對子分類）的支出」估算本月已記錄
    const records = fc.category ? month.filter((r) => r.type === "expense" && r.category === fc.category
      && (!fc.subcategory || r.subcategory === fc.subcategory)) : [];
    out.push({ source: "manual", id: fc.id, name: fc.name, account: accountName(fc.account_id), category: fc.category,
      subcategory: fc.subcategory, amount: fc.amount, code: fc.currency, frequency: fc.frequency, active: !!fc.active, records });
  }
  for (const ap of state.autopays) {
    const a = findAccount(ap.account_id);
    out.push({ source: "autopay", name: ap.name, account: a?.name ?? "", href: a && accountHref(a), category: ap.category,
      subcategory: ap.subcategory, amount: ap.amount, code: accountCodes(a)[0] ?? BASE, frequency: 1, active: !!ap.active,
      records: month.filter((r) => r.autopay_id === ap.id) });
  }
  for (const a of accountsOf("loan")) {
    const l = loanOf(a.id);
    if (!l.monthly_payment || balanceBase(a.id) >= 0) continue; // 沒設月付或已還清
    out.push({ source: "loan", name: a.name, account: accountName(l.pay_account_id), href: accountHref(a), category: "貸款還款",
      subcategory: "", amount: l.monthly_payment, code: accountCodes(a)[0] ?? BASE, frequency: 1, active: true,
      records: month.filter((r) => (r.type === "transfer" && r.to_account_id === a.id && r.loan_kind !== "extra")
        || (r.loan_kind === "interest" && r.loan_id === a.id)) });
  }
  for (const a of accountsOf("insurance")) {
    const p = policyOf(a.id);
    if (!p.premium || (p.start_date && !premiumSchedule(p).next)) continue; // 沒填保費或已繳完
    out.push({ source: "insurance", name: a.name, account: accountName(p.pay_account_id), href: accountHref(a), category: "金融保險",
      subcategory: "保險費", amount: p.premium, code: accountCodes(a)[0] ?? BASE, frequency: p.frequency, active: true,
      records: month.filter((r) => (r.loan_kind === "premium" && r.loan_id === a.id) || (r.type === "transfer" && r.to_account_id === a.id)) });
  }
  return out.map((x) => ({ ...x, monthly: toBase(x.amount, x.code) / x.frequency, recorded: sumRows(x.records) }));
}

// 月繳、年繳分開看：yearly=false 只看月繳（每月金額）；yearly=true 看年繳（含季繳、半年繳，換算成每年金額）
function fixedDonutItems(view, yearly) {
  const items = fixedItems().filter((x) => x.active && (x.frequency > 1) === yearly);
  const valueOf = (x) => Math.round(yearly ? x.monthly * 12 : x.monthly);
  const subOf = (x) => `${FREQUENCIES[x.frequency]} ${money(x.amount, x.code)}${x.account ? `・${x.account}` : ""}`;
  if (view === "item") {
    return topAccounts(items.map((x) => ({ name: x.name, value: valueOf(x), href: x.href, sub: subOf(x) }))
      .filter((x) => x.value > 0), "項");
  }
  // 依分類：順序照分類設定（顏色跟著分類走）
  const order = [...mainCategories("expense").map((c) => c.name), "貸款還款"];
  const keyOf = (x) => x.category || "（未分類）";
  const keys = [...new Set(items.map(keyOf))].sort((x, y) => (order.indexOf(x) + 1 || 99) - (order.indexOf(y) + 1 || 99));
  return topAccounts(keys.map((k) => {
    const list = items.filter((x) => keyOf(x) === k);
    return {
      name: k, value: list.reduce((s, x) => s + valueOf(x), 0),
      detail: () => list.map((x) => ({ name: x.name, value: valueOf(x), href: x.href, sub: subOf(x) })),
    };
  }).filter((x) => x.value > 0), "類");
}

const fixedCategoryText = (x) => x.category ? esc(x.category) + (x.subcategory ? ` <span class="muted">› ${esc(x.subcategory)}</span>` : "") : `<span class="muted">—</span>`;

function fixedPage() {
  const all = fixedItems();
  const active = all.filter((x) => x.active).sort((x, y) => y.monthly - x.monthly);
  const monthly = active.reduce((s, x) => s + x.monthly, 0);
  const monthlyPaid = active.filter((x) => x.frequency === 1).reduce((s, x) => s + x.monthly, 0);
  const yearlyPaid = active.filter((x) => x.frequency > 1).reduce((s, x) => s + x.monthly * 12, 0);
  const countOf = (yearly) => active.filter((x) => (x.frequency > 1) === yearly).length;
  const recorded = active.reduce((s, x) => s + x.recorded, 0);
  const paused = all.length - active.length;

  const summary = active.length
    ? `<div class="table-wrap"><table class="table table-hover fixed-table">
        <thead><tr><th>項目</th><th>來源</th><th>帳戶</th><th>分類</th><th>頻率</th><th class="text-right">每期金額</th>
          <th class="text-right">換算每月</th><th class="text-right">當月已記錄</th></tr></thead>
        <tbody>${active.map((x) => `<tr>
          <td>${x.href ? `<a href="${x.href}">${esc(x.name)}</a>` : esc(x.name)}</td>
          <td class="nowrap"><span class="chip">${FIXED_SOURCES[x.source]}</span></td>
          <td>${esc(x.account) || `<span class="muted">—</span>`}</td>
          <td>${fixedCategoryText(x)}</td>
          <td class="nowrap">${FREQUENCIES[x.frequency]}</td>
          <td class="text-right amount">${money(x.amount, x.code)}</td>
          <td class="text-right amount">${money(Math.round(x.monthly))}</td>
          <td class="text-right amount">${x.recorded ? money(Math.round(x.recorded)) : `<span class="muted">—</span>`}</td>
        </tr>`).join("")}</tbody>
        <tfoot><tr><td colspan="6"><strong>合計</strong></td><td class="text-right amount"><strong>${money(Math.round(monthly))}</strong></td>
          <td class="text-right amount">${money(Math.round(recorded))}</td></tr></tfoot>
      </table></div>`
    : `<p class="empty">還沒有固定開銷</p>`;

  // 手動項目：表格內直接修改（離開欄位自動儲存）
  const manual = state.fixedcosts;
  const field = (fc, key, cls, attrs = "") =>
    `<input class="form-control input-sm ${cls}" data-fc-field="${key}" data-fc-id="${fc.id}" value="${esc(fc[key])}" ${attrs}>`;
  const freqOptions = (sel) => Object.entries(FREQUENCIES).map(([v, label]) =>
    `<option value="${v}"${Number(v) === sel ? " selected" : ""}>${label}</option>`).join("");
  const codes = state.currencies.map((c) => c.code);
  const manualTable = manual.length
    ? `<div class="table-wrap"><table class="table autopays fixed-manual">
        <thead><tr><th>項目</th><th>金額</th><th>頻率</th><th>支出分類</th><th>付款帳戶</th><th></th></tr></thead>
        <tbody>${manual.map((fc) => `<tr class="${fc.active ? "" : "row-muted"}">
          <td>${field(fc, "name", "w-name")}</td>
          <td class="nowrap"><div class="input-row">
            <select class="form-control input-sm cur-mini" data-fc-field="currency" data-fc-id="${fc.id}" aria-label="幣別">${codes.map((c) =>
              `<option${c === fc.currency ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
            ${field(fc, "amount", "w-num", 'type="number" min="0.01" step="0.01" inputmode="decimal"')}</div></td>
          <td><select class="form-control input-sm" data-fc-field="frequency" data-fc-id="${fc.id}">${freqOptions(fc.frequency)}</select></td>
          <td><select class="form-control input-sm" data-fc-field="category" data-fc-id="${fc.id}">
            <option value="|">（不指定）</option>${expenseCategoryOptions(fc.category, fc.subcategory)}</select></td>
          <td><select class="form-control input-sm" data-fc-field="account_id" data-fc-id="${fc.id}">
            <option value="">（不指定）</option>${accountOptions(fc.account_id)}</select></td>
          <td class="text-right nowrap">
            <button class="btn btn-xs btn-default" data-fc-toggle="${fc.id}">${fc.active ? "暫停" : "啟用"}</button>
            <button class="btn btn-xs btn-default" data-fc-del="${fc.id}" title="刪除">${icon("trash")}</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>`
    : `<p class="empty">還沒有手動項目</p>`;
  const defaultCat = mainCategories("expense").find((m) => m.name === "居家物業");

  return {
    title: "固定開銷",
    sub: "每個月一定要付的錢",
    crumbs: ["首頁", "固定開銷"],
    after: bindDonuts,
    html: `
      <div class="grid grid-4">
        ${infoBox("yellow", "repeat", "月繳合計（每月）", money(Math.round(monthlyPaid)), `${countOf(false)} 項`)}
        ${infoBox("red", "calendar", "年繳合計（每年）", money(Math.round(yearlyPaid)), `${countOf(true)} 項（含季繳、半年繳）`)}
        ${infoBox("aqua", "list", "全部換算每年", money(Math.round(monthly * 12)),
          `約每月 ${money(Math.round(monthly))}${paused ? `・另有 ${paused} 項暫停中` : ""}`)}
        ${infoBox("green", "chart", `${monthLabel(state.month)}已記錄`, money(Math.round(recorded)), "已記帳的固定開銷")}
      </div>
      <div class="grid grid-2">
        ${donutBox("fixedMonthly", `<span class="muted hint-inline">每月要付的金額（台幣）</span>`)}
        ${donutBox("fixedYearly", `<span class="muted hint-inline">每年要付的金額（台幣）；季繳 × 4、半年繳 × 2 換算成每年</span>`)}
      </div>
      ${box(`${icon("list")} 固定開銷總表`, summary, {
        cls: "box-default", flush: true, tools: monthNav(),
        footer: `<span class="muted hint-inline">自動扣款、貸款月付、保費會自動列入（到各帳戶頁修改）；手動項目的「已記錄」是同分類支出的合計，僅供參考</span>`,
      })}
      ${box(`${icon("plus")} 手動項目`, manualTable, {
        cls: "box-warning", flush: true,
        footer: `<form class="inline-form" data-add-fixed>
            <input class="form-control" name="name" placeholder="項目，例如：房租" required>
            <select class="form-control cur-mini" name="currency" aria-label="幣別">${codes.map((c) => `<option>${esc(c)}</option>`).join("")}</select>
            <input class="form-control num-input" name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="金額" required>
            <select class="form-control mode-select" name="frequency" aria-label="頻率">${freqOptions(1)}</select>
            <select class="form-control" name="category" aria-label="支出分類"><option value="|">（不指定分類）</option>${expenseCategoryOptions(defaultCat?.name, "")}</select>
            <select class="form-control" name="account_id" aria-label="付款帳戶"><option value="">（不指定帳戶）</option>${accountOptions(null)}</select>
            <button class="btn btn-default" type="submit">${icon("plus")} 新增</button>
          </form>
          <p class="muted hint">放沒有設定成自動扣款的固定支出，例如房租、管理費、訂閱、孝親費。這裡只做統計，不會自動記帳。</p>`,
      })}`,
  };
}

// ===== 資產變化：伺服器每天 17:00 記錄的資產快照 =====
// 顏色依固定順序（series-1～4），跟著項目走
const SNAP_SERIES = [
  { key: "cash", name: "現金資產", color: "var(--series-1)" },
  { key: "securities", name: "證券資產", color: "var(--series-2)" },
  { key: "debt", name: "債務", color: "var(--series-3)" },
  { key: "net", name: "淨資產", color: "var(--series-4)" },
];
const SNAP_BARS = SNAP_SERIES.filter((s) => s.key !== "net"); // 直方：現金、證券、債務
const SNAP_NET = SNAP_SERIES.find((s) => s.key === "net"); // 折線：淨資產
const SNAP_RANGES = [["30", "30 天"], ["90", "90 天"], ["120", "120 天"], ["365", "1 年"]];
const snapView = () => {
  const v = { range: "90", ...state.snapView };
  return SNAP_RANGES.some(([k]) => k === v.range) ? v : { ...v, range: "90" };
};

// 期間內的快照（由舊到新）
function snapRows() {
  const d = new Date();
  d.setDate(d.getDate() - Number(snapView().range) + 1);
  const from = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return state.snapshots.filter((r) => r.date >= from);
}
// 每組直方代表一段期間：每天放不下就改每週、再放不下改每月（取該期間最後一筆）
function snapPeriods(rows, max) {
  const weekOf = (r) => { const d = new Date(r.date + "T00:00"); d.setDate(d.getDate() - d.getDay()); return d.toDateString(); };
  for (const [unit, keyOf] of [["日", (r) => r.date], ["週", weekOf], ["月", (r) => r.date.slice(0, 7)]]) {
    const last = new Map();
    rows.forEach((r) => last.set(keyOf(r), r));
    if (last.size <= max || unit === "月") return { unit, rows: [...last.values()] };
  }
}
const snapLabel = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
const snapAxis = (n) => (state.privacy ? "•••" : Math.abs(n) >= 1e4 ? `${+(n / 1e4).toFixed(0)}萬` : Math.round(n).toLocaleString("zh-TW"));

// 數值軸：含 0，往外取整到好看的刻度（四個項目共用同一個軸，都是台幣）
function snapScale(rows) {
  const values = rows.flatMap((r) => SNAP_SERIES.map((s) => r[s.key]));
  let lo = Math.min(0, ...values), hi = Math.max(0, ...values);
  if (hi === lo) hi = lo + 1;
  const raw = (hi - lo) / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= raw);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return { lo, hi, ticks };
}

function snapTipHtml(r) {
  return `<strong>${r.date}</strong>${SNAP_SERIES.map((s) =>
    `<br><span class="swatch" style="background:${s.color}"></span>${s.name} ${money(r[s.key])}`).join("")}`;
}

// 同一張圖：現金、證券、債務畫直方，淨資產畫折線；依容器寬度畫，滑過顯示該期四個數值
function drawSnapChart(el) {
  const W = Math.max(300, el.clientWidth), mobile = W < 560;
  const { unit, rows } = snapPeriods(snapRows(), mobile ? 31 : 45);
  const H = mobile ? 260 : 320, L = 52, R = 14, T = 14, B = 28;
  const { lo, hi, ticks } = snapScale(rows);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const slot = (W - L - R) / rows.length;
  const xAt = (i) => L + slot * i + slot / 2;
  const n = SNAP_BARS.length;
  const bw = Math.max(2, Math.min(16, (slot * 0.8) / n - 1));

  let svg = `<svg class="snap-chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  ticks.forEach((t) => {
    svg += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/>
      <text class="axis" x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${snapAxis(t)}</text>`;
  });
  const every = Math.max(1, Math.ceil(rows.length / (mobile ? 4 : 8))); // x 軸標籤不要擠
  rows.forEach((r, i) => {
    if (i % every === 0 || i === rows.length - 1) {
      svg += `<text class="axis" x="${xAt(i)}" y="${H - 8}" text-anchor="middle">${unit === "月" ? `${Number(r.date.slice(5, 7))}月` : snapLabel(r.date)}</text>`;
    }
    const start = xAt(i) - (n * (bw + 1)) / 2;
    SNAP_BARS.forEach((s, k) => {
      const v = r[s.key], top = y(Math.max(0, v)), bottom = y(Math.min(0, v));
      svg += `<rect x="${start + k * (bw + 1)}" y="${top}" width="${bw}" height="${Math.max(1, bottom - top)}" rx="2" style="fill:${s.color}"/>`;
    });
  });
  svg += `<line class="zero" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>`;
  // 淨資產折線畫在直方上面；點加一圈面板色外框，壓在直方上也看得清楚
  svg += `<polyline class="snap-line" points="${rows.map((r, i) => `${xAt(i)},${y(r.net)}`).join(" ")}" style="stroke:${SNAP_NET.color}"/>`;
  if (rows.length <= 45) svg += rows.map((r, i) => `<circle class="snap-dot" cx="${xAt(i)}" cy="${y(r.net)}" r="4" style="fill:${SNAP_NET.color}"/>`).join("");
  svg += `<line class="crosshair" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/>
    <rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/></svg>`;
  el.innerHTML = svg + (unit !== "日" ? `<p class="muted hint-inline">期間較長，每組代表每${unit}最後一筆紀錄</p>` : "");

  const tip = $(".chart-tip") ?? document.body.appendChild(Object.assign(document.createElement("div"), { className: "chart-tip" }));
  tip.hidden = true;
  const svgEl = el.querySelector("svg"), cross = el.querySelector(".crosshair");
  svgEl.addEventListener("mousemove", (e) => {
    const box = svgEl.getBoundingClientRect();
    const i = Math.min(rows.length - 1, Math.max(0, Math.floor((((e.clientX - box.left) / box.width) * W - L) / slot)));
    cross.setAttribute("x1", xAt(i));
    cross.setAttribute("x2", xAt(i));
    cross.setAttribute("visibility", "visible");
    tip.innerHTML = snapTipHtml(rows[i]);
    tip.hidden = false;
    placeTip(tip, e);
  });
  svgEl.addEventListener("mouseleave", () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); });
}

function assetsPage() {
  const all = state.snapshots;
  const view = snapView();
  const rows = snapRows();
  const latest = all.at(-1);
  const change = (from) => (latest && from ? latest.net - from.net : null);
  const changeText = (d) => d == null ? "—" : `<span class="${d >= 0 ? "text-success" : "text-danger"}">${d >= 0 ? "+" : "−"}${money(Math.round(Math.abs(d)))}</span>`;
  const btns = (list, key) => `<div class="btn-group">${list.map(([k, label]) =>
    `<button class="btn btn-sm ${view[key] === k ? "btn-primary" : "btn-default"}" data-snap="${key}:${k}">${label}</button>`).join("")}</div>`;
  const hasInsurance = rows.some((r) => r.insurance);
  const table = rows.length
    ? `<div class="table-wrap snap-table"><table class="table table-hover">
        <thead><tr><th>日期</th>${SNAP_SERIES.map((s) => `<th class="text-right"><span class="swatch" style="background:${s.color}"></span>${s.name}</th>`).join("")}
          ${hasInsurance ? `<th class="text-right">保單價值</th>` : ""}<th class="text-right">淨資產變化</th></tr></thead>
        <tbody>${rows.map((r, i) => ({ r, prev: rows[i - 1] })).reverse().map(({ r, prev }) => `<tr>
          <td class="nowrap">${r.date}${r.auto ? "" : ` <span class="muted" title="手動記錄於 ${esc(r.taken_at)}">（手動）</span>`}</td>
          ${SNAP_SERIES.map((s) => `<td class="text-right amount">${money(Math.round(r[s.key]))}</td>`).join("")}
          ${hasInsurance ? `<td class="text-right amount">${money(Math.round(r.insurance))}</td>` : ""}
          <td class="text-right amount">${prev ? changeText(r.net - prev.net) : `<span class="muted">—</span>`}</td>
        </tr>`).join("")}</tbody>
      </table></div>`
    : `<p class="empty">這段期間沒有紀錄</p>`;
  const legend = `<div class="legend snap-legend">${SNAP_BARS.map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join("")}
    <span><i class="legend-line" style="background:${SNAP_NET.color}"></i>${SNAP_NET.name}（折線）</span></div>`;
  const recordBtn = `<button class="btn btn-sm btn-default" data-snap-now>${icon("refresh")} 現在記錄一筆</button>`;

  return {
    title: "資產變化",
    sub: `每天 ${state.settings.snapshot_time} 自動更新股價並記錄（外幣依匯率換算成台幣）`,
    crumbs: ["首頁", "資產變化"],
    html: `
      <div class="grid grid-4">
        ${infoBox("aqua", "scale", "目前淨資產", latest ? money(Math.round(latest.net)) : "—", latest ? `記錄於 ${esc(latest.taken_at)}` : "還沒有紀錄")}
        ${infoBox("green", "chart", "較前一筆", changeText(change(all.at(-2))), all.at(-2) ? `與 ${all.at(-2).date} 相比` : "需要兩筆以上紀錄")}
        ${infoBox("yellow", "calendar", "期間變化", changeText(rows.length > 1 ? change(rows[0]) : null), rows.length > 1 ? `從 ${rows[0].date} 起` : "需要兩筆以上紀錄")}
        ${infoBox("purple", "list", "紀錄天數", `${all.length} 天`, all.length ? `從 ${all[0].date} 開始` : `每天 ${state.settings.snapshot_time} 自動記錄`)}
      </div>
      ${box(`${icon("chart")} 資產變化圖`, rows.length
        ? `${legend}<div id="snapChart" class="snap-chart-wrap"></div>`
        : `<p class="empty">${all.length ? "這段期間沒有紀錄，請選較長的期間" : `還沒有紀錄。每天 ${state.settings.snapshot_time} 會自動記錄，也可以按右上「現在記錄一筆」`}</p>`, {
        cls: "box-primary",
        tools: `${btns(SNAP_RANGES, "range")}${recordBtn}`,
        footer: `<span class="muted hint-inline">現金資產＝銀行等一般帳戶的正餘額；證券資產＝證券戶現金＋持股市值；債務＝信用卡、貸款欠款與帳戶負餘額；淨資產＝現金＋證券＋儲蓄型保單價值－債務。電腦在 ${state.settings.snapshot_time} 沒開時，開機後會補記當天；更早漏掉的日子無法補（查不到當天的股價）。</span>`,
      })}
      ${box(`${icon("list")} 每日紀錄`, table, { cls: "box-default", flush: true })}`,
    after() {
      const el = $("#snapChart");
      if (el) drawSnapChart(el);
    },
  };
}

// ===== 系統設定 =====
// 顯示偏好（字體、背景、語言）存在這台裝置；每日更新時間、時區存在伺服器，所有裝置共用
const FONT_SIZES = [["90", "小"], ["100", "標準"], ["115", "大"], ["130", "特大"]];
const BG_THEMES = [
  ["default", "炭灰（預設）", "#121417", "#1e2226"],
  ["navy", "深海藍", "#0f1520", "#18212e"],
  ["black", "純黑", "#000000", "#111316"],
  ["green", "墨綠", "#0f1714", "#18231f"],
  ["purple", "暗紫", "#15121c", "#1f1a28"],
];
const LANGS = [["tw", "繁體中文"], ["en", "English"], ["ja", "日本語"]];
const TZ_OFFSETS = [
  [-480, "UTC−8 洛杉磯（冬令）"], [-420, "UTC−7 洛杉磯（夏令）"], [-300, "UTC−5 紐約（冬令）"], [-240, "UTC−4 紐約（夏令）"],
  [0, "UTC+0 倫敦（冬令）"], [60, "UTC+1 倫敦（夏令）、巴黎（冬令）"], [120, "UTC+2 巴黎（夏令）"],
  [420, "UTC+7 曼谷、胡志明市"], [480, "UTC+8 台北、香港、新加坡"], [540, "UTC+9 東京、首爾"],
  [600, "UTC+10 雪梨（冬令）"], [660, "UTC+11 雪梨（夏令）"], [720, "UTC+12 奧克蘭（冬令）"], [780, "UTC+13 奧克蘭（夏令）"],
];
const tzLabel = (offset) => TZ_OFFSETS.find(([o]) => o === offset)?.[1]
  ?? `UTC${offset < 0 ? "−" : "+"}${Math.floor(Math.abs(offset) / 60)}${Math.abs(offset) % 60 ? `:${pad2(Math.abs(offset) % 60)}` : ""}`;

// 下次自動更新的時間（依伺服器設定的時區）
function nextSnapshotText() {
  const st = state.settings;
  if (st.snapshot_enabled !== "1") return "已停用";
  const now = new Date(Date.now() + Number(st.tz_offset) * 60000).toISOString(); // 設定時區的現在
  const doneToday = state.snapshots.some((r) => r.date === now.slice(0, 10) && r.auto);
  const passed = now.slice(11, 16) >= st.snapshot_time;
  return `${passed || doneToday ? (doneToday ? "明天" : "稍後（今天還沒記，1 分鐘內會補記）") : "今天"} ${passed && !doneToday ? "" : st.snapshot_time}`.trim();
}

function prefsPage() {
  const st = state.settings;
  const btns = (list, key) => `<div class="btn-group">${list.map(([k, label]) =>
    `<button type="button" class="btn ${prefs[key] === k ? "btn-primary" : "btn-default"}" data-pref="${key}:${k}">${label}</button>`).join("")}</div>`;
  const themes = `<div class="theme-list">${BG_THEMES.map(([k, label, bg, surface]) => `
    <button type="button" class="theme-card${prefs.bg === k ? " active" : ""}" data-pref="bg:${k}" aria-pressed="${prefs.bg === k}">
      <span class="theme-sample" style="background:${bg}"><span style="background:${surface}"></span></span>${label}
    </button>`).join("")}</div>`;
  const offset = Number(st.tz_offset);
  const tzOptions = (TZ_OFFSETS.some(([o]) => o === offset) ? TZ_OFFSETS : [...TZ_OFFSETS, [offset, tzLabel(offset)]])
    .map(([o, label]) => `<option value="${o}"${o === offset ? " selected" : ""}>${label}</option>`).join("");
  const latest = state.snapshots.at(-1);

  return {
    title: "系統設定",
    sub: "顯示、每日自動更新、時區與語言",
    crumbs: ["首頁", "系統設定"],
    html: `<div class="grid grid-2">
      ${box(`${icon("eye")} 顯示（只套用在這台裝置）`, `
        <div class="form-group"><label>字體大小</label><div>${btns(FONT_SIZES, "font")}
          <p class="muted hint">手機選「小」時，點輸入框 iPhone 可能會自動放大畫面。</p></div></div>
        <div class="form-group"><label>背景顏色</label>${themes}</div>
        <div class="form-group"><label>語言</label><div><span translate="no">${btns(LANGS, "lang")}</span>
          <p class="muted hint">只轉換畫面文字；記錄的分類、帳戶名稱等資料不會被改掉。自己取的名稱（例如帳戶名稱）會維持原文。</p></div></div>
        <div class="form-group"><label>預覽</label><div class="pref-preview">今天午餐 <strong class="text-danger">-NT$ 120</strong>・薪資 <strong class="text-success">NT$ 52,000</strong></div></div>`,
        { cls: "box-primary", footer: `<span class="muted hint-inline">每台手機、電腦各自記住自己的設定，例如手機可以用大字、電腦用標準。</span>` })}
      ${box(`${icon("refresh")} 每日自動更新（所有裝置共用）`, `
        <div class="form-group"><label for="set-enabled">每日自動更新</label>
          <label class="checkbox"><input type="checkbox" id="set-enabled" data-setting="snapshot_enabled"${st.snapshot_enabled === "1" ? " checked" : ""}>
            每天更新全部匯率、股價並記錄資產變化</label></div>
        <div class="form-group"><label for="set-time">更新時間</label>
          <div><input class="form-control input-time" id="set-time" type="time" step="60" value="${esc(st.snapshot_time)}" data-setting="snapshot_time">
          <p class="muted hint">台股 13:30 收盤，建議 14:30 之後；美股收盤約在台灣時間早上 4～5 點。電腦在這個時間沒開，開機後會補記當天。</p></div></div>
        <div class="form-group"><label for="set-tz">時區</label>
          <div><select class="form-control" id="set-tz" data-setting="tz_offset">${tzOptions}</select>
          <p class="muted hint">決定「今天」是哪一天與更新時間；夏令時間不會自動切換，換季時請手動改。</p></div></div>
        <div class="form-group"><label>狀態</label><div>
          下次更新：<strong>${nextSnapshotText()}</strong><br>
          <span class="muted">最近一次紀錄：${latest ? `${esc(latest.taken_at)}${latest.auto ? "（自動）" : "（手動）"}` : "還沒有"}</span></div></div>`,
        { cls: "box-warning", footer: `<button class="btn btn-sm btn-default" data-snap-now>${icon("refresh")} 立即更新股價並記錄</button>` })}
    </div>`,
  };
}

const PAGES = {
  "": dashboardPage,
  expense: () => listPage("expense"),
  income: () => listPage("income"),
  transfer: () => listPage("transfer"),
  new: newPage,
  edit: editPage,
  fixed: fixedPage,
  assets: assetsPage,
  prefs: prefsPage,
  calendar: calendarPage,
  account: accountPage,
  accounts: accountsPage,
  currencies: currenciesPage,
  categories: categoriesPage,
  settings: settingsPage,
};

// ===== 畫面渲染與事件 =====
function showAlert(kind, text) {
  $("#alerts").innerHTML = `<div class="alert alert-${kind}">${esc(text)}</div>`;
}

function menuLink(href, label, iconName, active, extra = "") {
  return `<li class="${active ? "active" : ""}"><a href="#/${href}">${icon(iconName)}<span class="menu-label">${label}</span>${extra}</a></li>`;
}

function menuHtml(route, arg) {
  return MENU.map((item) => {
    if (item.header) {
      const act = item.action;
      return `<li class="header">${item.header}${act
        ? `<button class="header-action" data-menu-action="${act.id}" title="${act.title}">${icon(act.icon)}<span>${act.label}</span></button>`
        : ""}</li>`;
    }
    if (item.accounts) {
      const k = ACCOUNT_KINDS[item.accounts];
      return accountsOf(item.accounts).map((a) =>
        menuLink(`account/${a.id}`, esc(a.name), k.icon, route === "account" && Number(arg) === a.id,
          `<span class="menu-badge${accountWorth(a.id) < 0 ? " text-danger" : ""}">${accountTotalText(a)}</span>`)
      ).join("") + `<li><a class="menu-add" href="#/accounts">${icon("plus")}<span>新增${k.name}</span></a></li>`;
    }
    return menuLink(item.route, item.label, item.icon, item.route === route);
  }).join("");
}

function render() {
  const [route = "", arg, arg2] = location.hash.replace(/^#\/?/, "").split("/");
  if (route !== "account") state.editTrade = null;
  const page = (PAGES[route] || PAGES[""])(arg, arg2);

  document.title = tr(`${page.title} · 記帳本`);
  $("#menu").innerHTML = menuHtml(route, arg);
  $("#contentHeader").innerHTML = `
    <h1>${page.title}${page.sub ? ` <small>${esc(page.sub)}</small>` : ""}</h1>
    <ol class="breadcrumb">${page.crumbs.map((c, i) =>
      i < page.crumbs.length - 1 ? `<li><a href="#/">${c}</a></li>` : `<li>${c}</li>`
    ).join("")}</ol>`;
  $("#content").innerHTML = page.html;
  $(".chart-tip")?.setAttribute("hidden", ""); // 換頁時收起圖表提示
  closeDetail();
  $("#alerts").innerHTML = "";
  if (state.flash) {
    showAlert(...state.flash);
    state.flash = null;
  }
  page.after?.();
  document.body.classList.remove("sidebar-open");
}

const putJson = (url, body) => api(url, { method: "PUT", body: JSON.stringify(body) });
const postJson = (url, body) => api(url, { method: "POST", body: JSON.stringify(body) });

$("#content").addEventListener("click", async (e) => {
  const del = e.target.closest("[data-del]");
  if (del && confirm("確定要刪除這筆交易嗎？")) {
    return mutate(() => api(`/api/entries/${del.dataset.del}`, { method: "DELETE" }));
  }

  const donutToggle = e.target.closest("[data-donut-view]");
  if (donutToggle) {
    const [key, view] = donutToggle.dataset.donutView.split(":");
    state.donutView = { ...state.donutView, [key]: view };
    return render();
  }

  const calDay = e.target.closest("[data-cal-day]");
  if (calDay) return selectCalDay(calDay.dataset.calDay);
  const calType = e.target.closest("[data-cal-type]");
  if (calType) {
    state.calType = calType.dataset.calType;
    return render();
  }
  if (e.target.closest("[data-cal-today]")) {
    state.month = today().slice(0, 7);
    state.calDay = today();
    return render();
  }
  // 點年月：叫出原生的年月選擇器（iPhone 會是滾輪）
  const pick = e.target.closest("[data-month-pick]");
  if (pick) {
    try { pick.showPicker?.(); } catch { }
    return;
  }

  const fcToggle = e.target.closest("[data-fc-toggle]");
  if (fcToggle) {
    const fc = state.fixedcosts.find((x) => x.id === Number(fcToggle.dataset.fcToggle));
    return mutate(() => putJson(`/api/fixedcosts/${fc.id}`, { active: !fc.active }));
  }
  const fcDel = e.target.closest("[data-fc-del]");
  if (fcDel) {
    const fc = state.fixedcosts.find((x) => x.id === Number(fcDel.dataset.fcDel));
    if (confirm(`刪除固定開銷「${fc.name}」？`)) return mutate(() => api(`/api/fixedcosts/${fc.id}`, { method: "DELETE" }));
    return;
  }

  const pref = e.target.closest("[data-pref]");
  if (pref) {
    const [key, value] = pref.dataset.pref.split(":");
    const langChanged = key === "lang" && prefs.lang !== value;
    prefs[key] = value;
    savePrefs();
    applyPrefs();
    if (langChanged) return location.reload(); // 換語言重新載入最乾淨（繁體不必載入轉換程式）
    return render();
  }

  const refreshRates = e.target.closest("[data-refresh-rates]");
  if (refreshRates) {
    refreshRates.disabled = true;
    refreshRates.classList.add("spinning");
    return mutate(async () => {
      const r = await postJson("/api/currencies/refresh", {});
      state.flash = r.failed.length
        ? ["warning", `已更新 ${r.updated} 個匯率；查不到：${r.failed.join("、")}（請確認代碼，或手動輸入）`]
        : ["success", `已從 Yahoo Finance 更新 ${r.updated} 個匯率`];
    });
  }

  const snap = e.target.closest("[data-snap]");
  if (snap) {
    const [key, value] = snap.dataset.snap.split(":");
    state.snapView = { ...snapView(), [key]: value };
    return render();
  }
  const snapNow = e.target.closest("[data-snap-now]");
  if (snapNow) {
    snapNow.disabled = true;
    snapNow.classList.add("spinning");
    return mutate(async () => {
      const r = await postJson("/api/snapshots", {});
      state.flash = r.failed.length
        ? ["warning", `已記錄今天的資產；股價查不到：${r.failed.join("、")}（用原本的價格）`]
        : ["success", `已更新股價並記錄今天的資產（${state.settings.snapshot_time} 會再自動記一次並取代這筆）`];
    });
  }

  const edit = e.target.closest("[data-edit]");
  if (edit) {
    state.returnTo = location.hash || "#/";
    location.hash = `#/edit/${edit.dataset.edit}`;
    return;
  }
  const tradeEdit = e.target.closest("[data-trade-edit]");
  if (tradeEdit) {
    state.editTrade = Number(tradeEdit.dataset.tradeEdit);
    render();
    $("[data-trade-form]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (e.target.closest("[data-trade-cancel]")) {
    state.editTrade = null;
    return render();
  }
  const tradeDel = e.target.closest("[data-trade-del]");
  if (tradeDel) {
    const t = state.trades.find((x) => x.id === Number(tradeDel.dataset.tradeDel));
    const h = state.holdings.find((x) => x.id === t.holding_id);
    if (!confirm(`刪除這筆股票交易？\n${t.date} ${SIDES[t.side].name} ${holdingLabel(h)} ${shareText(t.shares)} 股\n持股與損益會重新計算。`)) return;
    return mutate(async () => {
      await api(`/api/trades/${t.id}`, { method: "DELETE" });
      if (state.editTrade === t.id) state.editTrade = null;
      state.flash = ["success", "已刪除股票交易，持股與損益已重新計算"];
    });
  }
  const tradeYear = e.target.closest("[data-trade-year]");
  if (tradeYear) {
    state.tradeYear = String(Number(state.tradeYear ?? state.month.slice(0, 4)) + Number(tradeYear.dataset.tradeYear));
    return render();
  }

  const nav = e.target.closest("[data-month]");
  if (nav) {
    state.month = shiftMonth(state.month, Number(nav.dataset.month));
    return render();
  }

  // ----- 分類 -----
  const rename = e.target.closest("[data-rename]");
  if (rename) {
    const c = state.categories.find((x) => x.id === Number(rename.dataset.rename));
    const name = prompt("新的名稱：", c.name)?.trim();
    if (name && name !== c.name) return mutate(() => putJson(`/api/categories/${c.id}`, { name }));
    return;
  }

  const delCat = e.target.closest("[data-delcat]");
  if (delCat) {
    const c = state.categories.find((x) => x.id === Number(delCat.dataset.delcat));
    const msg = c.parent_id === null
      ? `刪除主分類「${c.name}」以及它底下所有子分類？\n已記錄的交易不會被刪除。`
      : `刪除子分類「${c.name}」？\n已記錄的交易不會被刪除。`;
    if (confirm(msg)) return mutate(() => api(`/api/categories/${c.id}`, { method: "DELETE" }));
    return;
  }

  // ----- 帳戶 -----
  const accRename = e.target.closest("[data-acc-rename]");
  if (accRename) {
    const a = findAccount(accRename.dataset.accRename);
    const name = prompt("新的帳戶名稱：", a.name)?.trim();
    if (name && name !== a.name) return mutate(() => putJson(`/api/accounts/${a.id}`, { name }));
    return;
  }

  const accDel = e.target.closest("[data-acc-del]");
  if (accDel) {
    const a = findAccount(accDel.dataset.accDel);
    if (confirm(`刪除「${a.name}」？`)) return mutate(() => api(`/api/accounts/${a.id}`, { method: "DELETE" }));
    return;
  }

  const curInitial = e.target.closest("[data-acc-cur-initial]");
  if (curInitial) {
    const [id, code] = curInitial.dataset.accCurInitial.split("|");
    const a = findAccount(id);
    const h = a.currencies.find((x) => x.currency === code);
    const hint = DEBT_KINDS[a.kind]?.initialHint ?? "開始記帳前帳戶裡原本有多少";
    const input = prompt(`「${a.name}」${code} 的初始餘額（${hint}）：`, h.initial_balance);
    if (input === null || input.trim() === "") return;
    const value = Number(input);
    if (Number.isNaN(value)) return showAlert("danger", "初始餘額請輸入數字");
    return mutate(() => putJson(`/api/accounts/${id}/currencies/${encodeURIComponent(code)}`, { initial_balance: value }));
  }

  const curDel = e.target.closest("[data-acc-cur-del]");
  if (curDel) {
    const [id, code] = curDel.dataset.accCurDel.split("|");
    if (confirm(`從「${accountName(id)}」移除 ${code}？`)) {
      return mutate(() => api(`/api/accounts/${id}/currencies/${encodeURIComponent(code)}`, { method: "DELETE" }));
    }
    return;
  }

  // ----- 貸款：刪除整筆還款、重新計算 -----
  const loanPayDel = e.target.closest("[data-loan-pay-del]");
  if (loanPayDel) {
    const [loanId, transferId] = loanPayDel.dataset.loanPayDel.split("|").map(Number);
    const a = findAccount(loanId);
    const r = loanRepayments(a).find((x) => x.t.id === transferId);
    const code = accountCodes(a)[0];
    const what = r.extra ? "額外還款" : `第 ${r.period} 期還款`;
    const detail = `${r.t.date}　本金 ${money(r.principal, code)}${r.interest ? `、利息 ${money(r.interest, code)}` : ""}`;
    if (!confirm(`刪除「${a.name}」${what}？\n${detail}\n\n本金轉帳與利息支出會一起刪除。`)) return;
    return mutate(async () => {
      await api(`/api/loans/${loanId}/payments/${transferId}`, { method: "DELETE" });
      state.flash = ["success", `已刪除 ${r.t.date} 的${what}。如果刪的是中間某一期，建議按「重新編號並重算利息」讓之後各期的期數與利息正確。`];
    });
  }

  const loanAdjust = e.target.closest("[data-loan-adjust]");
  if (loanAdjust) {
    const a = findAccount(loanAdjust.dataset.loanAdjust);
    const bank = loanOf(a.id).bank_balance;
    if (!confirm(`把與銀行的差額調整到「${a.name}」最近一期的本金／利息拆分？\n調整後剩餘本金會等於銀行的 ${bank.toLocaleString()}。`)) return;
    return mutate(async () => {
      const r = await postJson(`/api/loans/${a.id}/reconcile`, { balance: bank, apply: true });
      state.flash = ["success", `已調整 ${r.adjusted} 那一期，剩餘本金與銀行一致（${money(r.bank)}）`];
    });
  }

  const loanRecalc = e.target.closest("[data-loan-recalc]");
  if (loanRecalc) {
    const a = findAccount(loanRecalc.dataset.loanRecalc);
    if (!confirm(`依日期重新編號「${a.name}」的期數，並用剩餘本金重算每一期的利息與本金？\n\n・每期還款總額（本金＋利息）不變，只調整兩者的拆分\n・額外還款、你自己寫的備註不會被改\n・如果之前按過「調整最近一期」，重算後請再核對一次`)) return;
    return mutate(async () => {
      const r = await postJson(`/api/loans/${a.id}/recalculate`, {});
      state.flash = ["success", `已重新計算 ${r.periods} 期，更新 ${r.changed} 處`];
    });
  }

  // ----- 貸款：把借款金額設為目前欠款（初始餘額 = -借款金額） -----
  const loanInitial = e.target.closest("[data-loan-initial]");
  if (loanInitial) {
    const a = findAccount(loanInitial.dataset.loanInitial);
    const code = accountCodes(a)[0];
    const principal = loanOf(a.id).principal;
    if (confirm(`把「${a.name}」的初始餘額設為 -${principal.toLocaleString()}（代表開始記帳時還欠全額）？`)) {
      return mutate(() => putJson(`/api/accounts/${a.id}/currencies/${encodeURIComponent(code)}`, { initial_balance: -principal }));
    }
    return;
  }

  // ----- 自動扣款 -----
  const apPost = e.target.closest("[data-ap-post]");
  if (apPost) {
    const [id, date] = apPost.dataset.apPost.split("|");
    const amount = document.querySelector(`[data-ap-amount="${id}|${date}"]`).value;
    const item = state.autopays.find((x) => x.id === Number(id));
    return mutate(async () => {
      await postJson(`/api/autopays/${id}/post`, { date, amount });
      state.flash = ["success", `已記錄 ${date} ${item.name} ${money(Number(amount), accountCodes(findAccount(item.account_id))[0] ?? BASE)}`];
    });
  }
  const apToggle = e.target.closest("[data-ap-toggle]");
  if (apToggle) {
    const item = state.autopays.find((x) => x.id === Number(apToggle.dataset.apToggle));
    return mutate(() => putJson(`/api/autopays/${item.id}`, { active: !item.active }));
  }
  const apDel = e.target.closest("[data-ap-del]");
  if (apDel) {
    const item = state.autopays.find((x) => x.id === Number(apDel.dataset.apDel));
    if (confirm(`刪除自動扣款「${item.name}」？\n已經記的帳會保留。`)) {
      return mutate(() => api(`/api/autopays/${item.id}`, { method: "DELETE" }));
    }
    return;
  }

  // ----- 持股 -----
  const refresh = e.target.closest("[data-refresh-prices]");
  if (refresh) {
    const label = refresh.innerHTML;
    refresh.disabled = true;
    refresh.textContent = "更新中…";
    return mutate(async () => {
      const r = await postJson("/api/holdings/refresh", { account_id: refresh.dataset.refreshPrices });
      state.flash = r.failed.length
        ? ["warning", `已更新 ${r.updated} 檔；查不到：${r.failed.join("、")}（請確認代號與幣別）`]
        : ["success", `已從 Yahoo Finance 更新 ${r.updated} 檔股價`];
    }).finally(() => {
      refresh.disabled = false; // 失敗時頁面不會重畫，把按鈕恢復
      refresh.innerHTML = label;
    });
  }

  const delist = e.target.closest("[data-hold-delist]");
  if (delist) {
    const h = state.holdings.find((x) => x.id === Number(delist.dataset.holdDelist));
    const label = `${h.symbol} ${h.name}`.trim();
    if (!h.delisted && !confirm(`把 ${label} 標記為已下市？\n更新股價時會略過這檔，價格請自己輸入（例如 0 或清算價值）。`)) return;
    return mutate(() => putJson(`/api/holdings/${h.id}`, { delisted: !h.delisted }));
  }

  const delHolding = e.target.closest("[data-hold-del]");
  if (delHolding) {
    const h = state.holdings.find((x) => x.id === Number(delHolding.dataset.holdDel));
    if (confirm(`刪除持股 ${h.symbol} ${h.name}？`)) {
      return mutate(() => api(`/api/holdings/${h.id}`, { method: "DELETE" }));
    }
    return;
  }

  // ----- 幣別 -----
  const delCurrency = e.target.closest("[data-cur-del]");
  if (delCurrency) {
    const c = state.currencies.find((x) => x.id === Number(delCurrency.dataset.curDel));
    if (confirm(`刪除幣別 ${c.code}（${c.name}）？`)) {
      return mutate(() => api(`/api/currencies/${c.id}`, { method: "DELETE" }));
    }
  }
});

// 表格裡直接編輯的欄位（幣別設定、持股），改完（離開欄位或按 Enter）就存
$("#content").addEventListener("change", (e) => {
  const setting = e.target.closest("[data-setting]");
  if (setting) {
    const key = setting.dataset.setting;
    const value = setting.type === "checkbox" ? setting.checked : setting.value;
    if (key === "snapshot_time" && !value) return;
    return mutate(async () => {
      await putJson("/api/settings", { [key]: value });
      state.flash = ["success", key === "tz_offset" ? `時區已改為 ${tzLabel(Number(value))}` : "已儲存每日自動更新設定"];
    });
  }
  const pick = e.target.closest("[data-month-pick]");
  if (pick) {
    if (pick.value) state.month = pick.value;
    return render();
  }
  const cur = e.target.closest("[data-cur-field]");
  if (cur) return mutate(() => putJson(`/api/currencies/${cur.dataset.curId}`, { [cur.dataset.curField]: cur.value }));
  const hold = e.target.closest("[data-hold-field]");
  if (hold) return mutate(() => putJson(`/api/holdings/${hold.dataset.holdId}`, { [hold.dataset.holdField]: hold.value }));
  const fc = e.target.closest("[data-fc-field]");
  if (fc) {
    const key = fc.dataset.fcField;
    const body = key === "category"
      ? { category: fc.value.split("|")[0], subcategory: fc.value.split("|")[1] ?? "" }
      : { [key]: fc.value };
    return mutate(() => putJson(`/api/fixedcosts/${fc.dataset.fcId}`, body));
  }
  const ap = e.target.closest("[data-ap-field]");
  if (ap) {
    const key = ap.dataset.apField;
    const body = key === "category"
      ? { category: ap.value.split("|")[0], subcategory: ap.value.split("|")[1] ?? "" }
      : { [key]: ap.value };
    return mutate(() => putJson(`/api/autopays/${ap.dataset.apId}`, body));
  }
});

// 各頁的「新增」表單
$("#content").addEventListener("submit", (e) => {
  const form = e.target;
  const f = form.elements;

  if (form.matches("[data-add-cat]")) {
    e.preventDefault();
    const { type, parent } = form.dataset;
    return mutate(
      () => postJson("/api/categories", { type, name: f.catName.value, parent_id: parent || null }),
      () => $(`[data-add-cat][data-parent="${parent}"] input`)?.focus()
    );
  }

  if (form.matches("[data-add-acc]")) {
    e.preventDefault();
    const { kind } = form.dataset;
    return mutate(
      () => postJson("/api/accounts", {
        kind, name: f.accName.value, currency: f.accCur.value, initial_balance: f.accInitial.value || 0,
      }),
      () => $(`[data-add-acc][data-kind="${kind}"] input`)?.focus()
    );
  }

  if (form.matches("[data-add-acc-cur]")) {
    e.preventDefault();
    const id = form.dataset.addAccCur;
    return mutate(() => postJson(`/api/accounts/${id}/currencies`, { currency: f.cur.value, initial_balance: f.initial.value || 0 }));
  }

  if (form.matches("[data-trade-form]")) {
    e.preventDefault();
    const side = form.querySelector('input[name="side"]:checked').value;
    const body = {
      account_id: form.dataset.tradeForm, side, date: f.date.value, shares: f.shares.value, price: f.price.value,
      fee: f.fee.value || 0, tax: side === "sell" ? f.tax.value || 0 : 0, note: f.note.value,
    };
    if (f.holding_id.value) body.holding_id = f.holding_id.value;
    else Object.assign(body, { symbol: f.symbol.value, currency: f.currency.value });
    const editingId = state.editTrade;
    return mutate(async () => {
      const r = editingId ? await putJson(`/api/trades/${editingId}`, body) : await postJson("/api/trades", body);
      state.editTrade = null;
      const t = editingId ? state.trades.find((x) => x.id === editingId) : r;
      state.flash = ["success", editingId ? "已修改股票交易，持股與損益已重新計算"
        : side === "sell" ? `已記錄賣出，已實現損益 ${t.realized >= 0 ? "+" : ""}${money(t.realized, t.currency)}`
        : `已記錄買進，交割戶扣款 ${money(t.amount, t.currency)}`];
    });
  }

  if (form.matches("[data-add-fixed]")) {
    e.preventDefault();
    const [category, subcategory = ""] = f.category.value.split("|");
    return mutate(async () => {
      await postJson("/api/fixedcosts", {
        name: f.name.value, amount: f.amount.value, currency: f.currency.value, frequency: f.frequency.value,
        category, subcategory, account_id: f.account_id.value || null,
      });
      state.flash = ["success", `已新增固定開銷「${f.name.value}」`];
    });
  }

  if (form.matches("[data-add-autopay]")) {
    e.preventDefault();
    const [category, subcategory = ""] = f.category.value.split("|");
    return mutate(async () => {
      await postJson("/api/autopays", {
        account_id: form.dataset.addAutopay, name: f.name.value, day: f.day.value, amount: f.amount.value,
        category, subcategory, auto_post: f.auto_post.value === "1", start_date: f.start_date.value,
      });
      state.flash = ["success", `已新增自動扣款「${f.name.value}」，每月 ${f.day.value} 號`];
    });
  }

  if (form.matches("[data-settlement]")) {
    e.preventDefault();
    const sec = f.sec.value;
    return mutate(async () => {
      await putJson(`/api/accounts/${form.dataset.settlement}`, { settlement_for: sec || null });
      state.flash = ["success", sec ? `已設為「${accountName(sec)}」的交割戶` : "已取消交割戶連結"];
    });
  }

  if (form.matches("[data-loan-reconcile]")) {
    e.preventDefault();
    return mutate(() => postJson(`/api/loans/${form.dataset.loanReconcile}/reconcile`, { balance: f.bank.value }));
  }

  if (form.matches("[data-add-holding]")) {
    e.preventDefault();
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true; // 留空時會向 Yahoo 查，可能要一兩秒
    return mutate(
      async () => {
        const r = await postJson("/api/holdings", {
          account_id: form.dataset.addHolding, symbol: f.symbol.value, name: f.name.value,
          shares: f.shares.value, cost: f.cost.value, price: f.price.value, currency: f.currency.value,
        });
        if (r.warning) state.flash = ["warning", r.warning];
      },
      () => $("[data-add-holding] input")?.focus()
    ).finally(() => (submit.disabled = false));
  }

  if (form.matches("[data-add-currency]")) {
    e.preventDefault();
    return mutate(() => postJson("/api/currencies", {
      code: f.code.value, name: f.name.value, symbol: f.symbol.value, rate: f.rate.value,
    }));
  }
});

// 側欄標題上的按鈕：證券戶「更新股價」一次更新所有證券戶
$("#menu").addEventListener("click", (e) => {
  const btn = e.target.closest('[data-menu-action="refresh-all-prices"]');
  if (!btn) return;
  if (!state.holdings.length) return showAlert("warning", "還沒有任何持股，請先到證券戶新增持股");
  btn.disabled = true;
  btn.classList.add("spinning");
  btn.querySelector("span").textContent = "更新中…";
  mutate(async () => {
    const r = await postJson("/api/holdings/refresh", {});
    state.flash = r.failed.length
      ? ["warning", `已更新 ${r.updated} 檔股價；查不到：${r.failed.join("、")}（請確認代號與幣別）`]
      : ["success", `已從 Yahoo Finance 更新全部 ${r.updated} 檔股價`];
  }).finally(() => {
    // 成功時側欄會重畫；失敗時把按鈕恢復
    btn.disabled = false;
    btn.classList.remove("spinning");
    btn.querySelector("span").textContent = "更新股價";
  });
});

// 隱私模式按鈕
function syncPrivacyButton() {
  const btn = $("#privacyToggle");
  btn.innerHTML = icon(state.privacy ? "eyeOff" : "eye");
  btn.title = state.privacy ? "顯示金額" : "隱藏金額";
  btn.setAttribute("aria-label", btn.title);
  btn.setAttribute("aria-pressed", String(state.privacy));
  document.body.classList.toggle("privacy", state.privacy);
}
$("#privacyToggle").addEventListener("click", () => {
  state.privacy = !state.privacy;
  try { localStorage.setItem("privacy", state.privacy ? "1" : "0"); } catch { /* 無痕模式等情況記不住，僅本次有效 */ }
  syncPrivacyButton();
  render();
});
syncPrivacyButton();
$("#calendarLink").innerHTML = icon("calendar");

$("#sidebarToggle").addEventListener("click", () => {
  document.body.classList.toggle(window.innerWidth < 768 ? "sidebar-open" : "sidebar-collapse");
});
$("#backdrop").addEventListener("click", () => document.body.classList.remove("sidebar-open"));
window.addEventListener("hashchange", render);

setupLanguage()
  .then(reload)
  .then(render)
  .catch((err) => showAlert("danger", "無法載入資料：" + err.message));
