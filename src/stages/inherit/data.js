// 「継承」：数値まわりの定数と月次計算ロジック（因数モデル版）
//
// ■設計方針（多店舗・出店・エリアマネージャーへの拡張に耐える形）
//   売上 ＝ 実客数 × 客単価
//   実客数 ＝ min( 潜在需要, capacity(スタッフ数, 接客時間) )
//   ・capacity（対応可能人数の上限）は 店の広さ・設備＝スタッフ数と一人あたり接客時間で決まる
//   ・施策は「需要／客単価／接客時間／人員／コスト のどのレバーをどれだけ動かすか」を宣言するだけ
//     → ③の因数分解がそのまま計算式になり、capacity上限が自動で効く（＝失敗も自然に発生する）
//   会社PL ＝ Σ店舗の貢献利益 − 役員報酬（本社費） − 支払利息
//   会社BS／現金／借入 は会社レベル。出店＝storesに1件追加、エリアマネージャー＝本社費レバー、で拡張する。

export const COMPANY_NAME = "株式会社フルール";
export const STORE_NAME = "サロン・ドゥ・フルール 本店";
export const BANK_NAME = "さくら信用金庫";

// ── 会社レベルの定数 ──
export const START_CASH = 1800000;      // 引き継いだ時点の会社の現預金
export const ANNUAL_RATE = 0.03;        // 借入金利（年率）
export const PRINCIPAL_PAYMENT = 250000; // 毎月の元本返済額（定額。2店舗分の借入に対応）

export const DRAW_DEFAULT = 200000;     // 役員報酬（月額）の初期値＝父の代の水準。ちょうど「黒字だが現金が減る」帯
export const DRAW_MIN = 0;
export const DRAW_MAX = 400000;
export const DRAW_STEP = 25000;

export const DEMO_MONTHS = 4;           // 体験版で銀行が再訪問するまでの月数（本番は継続）

// ── 自己資本比率の目標ライン ──
export const EQUITY_RATIO_TARGET = 30;   // まず目指すべき自己資本比率（%）
export const EQUITY_STREAK_TARGET = 3;   // この目標を連続で維持すると銀行から前向きな話が出る月数

// ── 貸借対照表（BS）用の定数 ──
export const CAPITAL_STOCK = 300000;      // 資本金
export const RETAINED_EARNINGS_INIT = 500000; // 引き継ぎ時点の利益剰余金（先代からの積み上げ分）

// ── 店舗マスタ（レバー適用前の素の状態）──
// 各店舗は「需要・供給・単価・コスト」のレバーを持つ。delta系（demandDelta等）は施策で加算される。
export const STORE_DEFS = [
  {
    id: "honten", name: "サロン・ドゥ・フルール 本店",
    baseDemand: 320,        // 潜在需要（月・人）
    unitPrice: 5000,        // 客単価
    staffCount: 2,          // スタイリスト数
    hoursPerDay: 8, daysPerMonth: 25,
    serviceHours: 1.0,      // 一人あたり接客時間
    cogsRate: 0.22,         // 原価率（シャンプー・カラー剤等の消耗材料費）
    rent: 200000, otherFixed: 100000, depreciation: 50000,
    wagePerStaff: 300000,   // スタッフ1人あたり人件費（人件費 = staffCount × wagePerStaff）
    fixedAssets: 5000000,   // 什器・敷金など
  },
  {
    id: "nigoten", name: "サロン・ドゥ・フルール 2号店",
    baseDemand: 240,
    unitPrice: 4500,
    staffCount: 2,
    hoursPerDay: 8, daysPerMonth: 25,
    serviceHours: 1.0,
    cogsRate: 0.22,
    rent: 180000, otherFixed: 90000, depreciation: 40000,
    wagePerStaff: 290000,
    fixedAssets: 3500000,   // 本店より小さめ。この店は貢献がほぼトントン＝将来の「赤字店舗どうする」の布石
  },
];

// 会社の固定資産合計・減価償却合計（BS表示・BS釣り合いに使う）
export const FIXED_ASSETS = STORE_DEFS.reduce((a, s) => a + s.fixedAssets, 0); // 8,500,000

// 開始時点で 資産(現金+固定資産) = 負債(借入)+純資産(資本金+利益剰余金) が釣り合うように借入を逆算
//   現金1,800,000 + 固定8,500,000 = 借入 + (300,000 + 500,000)
export const LOAN_START = (START_CASH + FIXED_ASSETS) - (CAPITAL_STOCK + RETAINED_EARNINGS_INIT); // 9,500,000

// 施策で動かせるレバーだけを初期化した「稼働中の店舗」を作る（React側の初期stateに使う）
export const makeStores = () => STORE_DEFS.map(s => ({
  ...s,
  demandDelta: 0, unitPriceDelta: 0, serviceHoursDelta: 0, otherFixedDelta: 0,
}));

// ── capacity（対応可能人数の上限）＝ ③因数分解の中核 ──
export const capacityOf = (staffCount, serviceHours, hoursPerDay = 8, daysPerMonth = 25) =>
  Math.floor((staffCount * hoursPerDay * daysPerMonth) / serviceHours);

// 店舗の派生値（capacity・需要・実客数・客単価）を計算
export function deriveStore(s) {
  const serviceHours = s.serviceHours + (s.serviceHoursDelta || 0);
  const capacity = capacityOf(s.staffCount, serviceHours, s.hoursPerDay, s.daysPerMonth);
  const demand = s.baseDemand + (s.demandDelta || 0);
  const customers = Math.min(demand, capacity);   // ← 需要が上限を超えたら頭打ち（rosyな予測はここで現実に直面する）
  const unitPrice = s.unitPrice + (s.unitPriceDelta || 0);
  return { serviceHours, capacity, demand, customers, unitPrice };
}

// 店舗の1ヶ月（PLの店舗貢献まで）
export function calcStoreMonth(s) {
  const d = deriveStore(s);
  const sales = Math.round(d.customers * d.unitPrice);
  const cogs = Math.round(sales * s.cogsRate);
  const labor = s.staffCount * s.wagePerStaff;
  const otherFixed = s.otherFixed + (s.otherFixedDelta || 0);
  const contribution = sales - cogs - s.rent - labor - otherFixed - s.depreciation; // 店舗貢献利益（本社費・利息控除前）
  return {
    id: s.id, name: s.name,
    capacity: d.capacity, demand: d.demand, customers: d.customers, unitPrice: d.unitPrice, serviceHours: d.serviceHours,
    sales, cogs, rent: s.rent, labor, otherFixed, depreciation: s.depreciation, contribution,
    staffCount: s.staffCount,
  };
}

// 会社全体の1ヶ月。stores配列 ＋ 会社レベルのパラメータ（借入・役員報酬・本社費）から会社PLを合算。
// 返すフィールドは決算書UIがそのまま描ける形（sales/cogs/gross/rent/labor/executiveComp/otherFixed/
// depreciation/operating/interest/ordinary/netProfit/principal/cashChange/newLoanBalance）。
export function calcMonth(loanBalance, executiveComp, stores, hqOtherFixed = 0) {
  const storeResults = stores.map(calcStoreMonth);
  const sum = (f) => storeResults.reduce((a, r) => a + r[f], 0);
  const sales = sum("sales");
  const cogs = sum("cogs");
  const gross = sales - cogs;
  const rent = sum("rent");
  const labor = sum("labor");
  const storeOtherFixed = sum("otherFixed");
  const depreciation = sum("depreciation");
  const otherFixed = storeOtherFixed + hqOtherFixed; // 本社費（エリアマネージャー等）はここに乗せて拡張
  const operating = gross - rent - labor - otherFixed - executiveComp - depreciation; // 営業利益
  const interest = Math.round(loanBalance * (ANNUAL_RATE / 12));
  const ordinary = operating - interest; // 経常利益
  const netProfit = ordinary;            // 当期純利益（特別損益・税金は考慮しない簡易モデル）
  const principal = Math.min(PRINCIPAL_PAYMENT, loanBalance);
  // 減価償却費は現金を伴わない費用なのでキャッシュでは足し戻す。元本返済は差し引く。
  const cashChange = netProfit - principal + depreciation;
  return {
    storeResults,
    sales, cogs, gross, rent, labor, otherFixed, executiveComp, depreciation,
    operating, interest, ordinary, netProfit, principal, cashChange,
    customers: sum("customers"),
    newLoanBalance: loanBalance - principal,
  };
}

// ── 店舗施策のレバー定義（施策と数字の対応を一箇所に集約。ここを足すだけで施策を増やせる）──
// トリートメント新メニュー：客単価UP（upsell）＆接客時間UP（capacity低下）。増員でcapacityを取り戻せる。
export const TREATMENT = {
  unitPriceDelta: 2000,     // 平均客単価UP（興味を持つ約7割が+¥3,000前後のトリートメントを追加 → 平均+¥2,000）
  serviceHoursDelta: 0.6,   // 接客時間UP（1.0→1.6時間）→ cap低下
  hireWage: 300000,         // 増員1人あたりの人件費（本店 wagePerStaff と一致）
};
// 新規客クーポン：業者の触れ込みは「新規+150人」（rosyな売上予測）。実際は capacity で頭打ちになる＝③の核。
export const PROMO = {
  claimedNewCustomers: 150, // 業者の触れ込み（この数字を鵜呑みにしてはいけない）
  demandDelta: 150,
  unitPriceDelta: -200,     // 初回割引で平均客単価がやや下がる
  otherFixedDelta: 80000,   // 配布コスト（チラシ・SNS広告）
  discountRate: 0.2,        // 新規客への割引率（客単価が下がることの説明用）
};

// 本店の素の状態（ヒアリングの初期回答やノートの表示に使う）
const HONTEN = STORE_DEFS[0];
export const CURRENT_CUSTOMERS = HONTEN.baseDemand; // 本店の現状客数
export const AVG_TICKET = HONTEN.unitPrice;
export const STAFF_COUNT = HONTEN.staffCount;
export const HOURS_PER_DAY = HONTEN.hoursPerDay;
export const DAYS_PER_MONTH = HONTEN.daysPerMonth;
export const SERVICE_HOURS_BASE = HONTEN.serviceHours;

// ── 前期（先代最後の1年間）の決算書（志村さんの初回解説用の実例。2店舗・約100万円の赤字）──
export const PRIOR_YEAR_PL = {
  sales: 32000000, cogs: 7040000, gross: 24960000,
  rent: 4560000, labor: 14160000, executiveComp: 3600000, otherFixed: 2280000, depreciation: 1080000,
  operating: -720000, interest: 300000, ordinary: -1020000, netProfit: -1020000,
};

export const yen = n => (n < 0 ? "▲" : "") + "¥" + Math.round(Math.abs(n)).toLocaleString();

// 万円単位の表示（PL・BS用）
export const manYen = n => {
  const v = Math.round((Math.abs(n) / 10000) * 10) / 10;
  return (n < 0 ? "▲" : "") + v.toLocaleString(undefined, { maximumFractionDigits: 1 }) + "万円";
};

// 前月比の増減表示（万円単位、符号つき）
export const manYenDiff = d => {
  if (d === 0) return "±0万円";
  const v = Math.round((Math.abs(d) / 10000) * 10) / 10;
  return (d > 0 ? "+" : "−") + v.toLocaleString(undefined, { maximumFractionDigits: 1 }) + "万円";
};
