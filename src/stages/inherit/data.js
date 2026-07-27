// 「継承」：数値まわりの定数と月次計算ロジック（因数モデル版）
//
// ■設計方針（多店舗・出店・エリアマネージャーへの拡張に耐える形）
//   売上 ＝ 実客数 × 客単価
//   実客数 ＝ min( 潜在需要, capacity(スタッフ数, 接客時間) )
//   ・capacity（対応可能人数の上限）はスタッフ数と一人あたり接客時間で決まる
//   ・施策も外部イベントも「どのレバーをどれだけ動かすか」を effects として宣言するだけ
//     → 因数分解がそのまま計算式になり、capacity上限が自動で効く（＝失敗も自然に発生する）
//   会社PL ＝ Σ店舗営業利益 − 本社経費（役員報酬等） − 支払利息 ± 特別損益
//   会社BS／現金／借入 は会社レベル。出店＝storesに1件追加、エリアマネージャー＝本社費レバー、で拡張する。

import { sumLever } from "./effects";

export const COMPANY_NAME = "株式会社フルール";
export const STORE_NAME = "サロン・ドゥ・フルール 本店";
export const BANK_NAME = "さくら信用金庫";

// ── 会社レベルの定数 ──
export const START_CASH = 1800000;      // 引き継いだ時点の会社の現預金
export const ANNUAL_RATE = 0.03;        // 借入金利（年率）
// 毎月の元本返済額（定額）。借入9,500,000をおよそ4年半で返す水準。
// ここを重くしすぎると、どう経営しても現金が尽きる詰みゲームになる。
// 「利益は出ているのに現金は減る」（＝利益とお金は別物）が成立する範囲で、
// 手を打てば黒字化できる余地を残した値。
export const PRINCIPAL_PAYMENT = 180000;

export const DRAW_DEFAULT = 200000;     // 役員報酬（月額）の初期値＝父の代の水準。ちょうど「黒字だが現金が減る」帯
export const DRAW_MIN = 0;
export const DRAW_MAX = 400000;
export const DRAW_STEP = 25000;

export const DEMO_MONTHS = 4;           // 短縮デモで銀行が再訪問するまでの月数

// ── 自己資本比率の目標ライン ──
export const EQUITY_RATIO_TARGET = 30;
export const EQUITY_STREAK_TARGET = 3;

// ── 貸借対照表（BS）用の定数 ──
export const CAPITAL_STOCK = 300000;
export const RETAINED_EARNINGS_INIT = 500000;

// ── 業界の賃金水準 ──
// 据え置きが「中立」ではなく「緩やかな悪化」になるよう、毎月わずかに上がっていく。
export const MARKET_WAGE_START = 300000;
export const MARKET_WAGE_DRIFT = 0.0025; // 月0.25%（年約3%）

// ── 店舗マスタ（レバー適用前の素の状態）──
export const STORE_DEFS = [
  {
    id: "honten", name: "サロン・ドゥ・フルール 本店",
    baseDemand: 320,        // 潜在需要（月・人）
    unitPrice: 5000,        // 客単価
    staffCount: 2,          // スタイリスト数
    maxStaff: 5,            // この広さで働ける人数の天井（店舗拡張で引き上げる）
    hoursPerDay: 8, daysPerMonth: 25,
    serviceHours: 1.0,      // 一人あたり接客時間
    cogsRate: 0.22,         // 原価率（消耗材料費）
    rent: 200000, otherFixed: 100000, depreciation: 50000,
    wagePerStaff: 300000,   // スタッフ1人あたり人件費
    fixedAssets: 5000000,
    educationLevel: 2,      // 教育レベル 0〜5。接客時間・口コミ・退職確率に効く
    equipmentAge: 14,       // 設備の最終更新からの経過月数
    strainMonths: 0,        // 稼働95%超が続いた月数（疲弊）
  },
  {
    id: "nigoten", name: "サロン・ドゥ・フルール 2号店",
    baseDemand: 240,
    unitPrice: 4500,
    staffCount: 2,
    maxStaff: 4,
    hoursPerDay: 8, daysPerMonth: 25,
    serviceHours: 1.0,
    cogsRate: 0.22,
    rent: 180000, otherFixed: 90000, depreciation: 40000,
    wagePerStaff: 290000,
    fixedAssets: 3500000,   // 本店より小さめ。店舗営業利益がほぼトントン＝「赤字店舗どうする」の布石
    educationLevel: 1,
    equipmentAge: 26,
    strainMonths: 0,
  },
];

export const FIXED_ASSETS = STORE_DEFS.reduce((a, s) => a + s.fixedAssets, 0); // 8,500,000

// 開始時点で 資産(現金+固定資産) = 負債(借入)+純資産(資本金+利益剰余金) が釣り合うように借入を逆算
export const LOAN_START = (START_CASH + FIXED_ASSETS) - (CAPITAL_STOCK + RETAINED_EARNINGS_INIT); // 9,500,000

// 稼働中の店舗を作る（React側の初期stateに使う）。レバーはすべて effects 側で持つ。
export const makeStores = () => STORE_DEFS.map(s => ({ ...s }));

// ── capacity（対応可能人数の上限）＝ 因数分解の中核 ──
export const capacityOf = (staffCount, serviceHours, hoursPerDay = 8, daysPerMonth = 25) =>
  Math.floor((staffCount * hoursPerDay * daysPerMonth) / Math.max(0.1, serviceHours));

/**
 * 店舗の派生値。effects（期限つき効果）を当てた後の実効値を返す。
 * @param s 店舗
 * @param effects 効果の配列
 * @param month 現在月
 */
export function deriveStore(s, effects = [], month = 0) {
  const serviceHours = Math.max(0.1, s.serviceHours + sumLever(effects, month, "serviceHours", s.id));
  const capacity = capacityOf(s.staffCount, serviceHours, s.hoursPerDay, s.daysPerMonth);
  const demand = Math.max(0, Math.round(s.baseDemand + sumLever(effects, month, "demand", s.id)));
  const customers = Math.min(demand, capacity);   // ← 需要が上限を超えたら頭打ち
  const unitPrice = Math.max(0, Math.round(s.unitPrice + sumLever(effects, month, "unitPrice", s.id)));
  // 原価率は「素の値＋市況（外部）＋仕入改善（内部）」の3層。要因分解できるよう分けて保持する。
  const cogsExternal = sumLever(effects, month, "cogsRateExternal", s.id);
  const cogsInternal = sumLever(effects, month, "cogsRateInternal", s.id);
  const cogsRate = Math.min(0.9, Math.max(0, s.cogsRate + cogsExternal + cogsInternal));
  const wagePerStaff = Math.max(0, s.wagePerStaff + sumLever(effects, month, "wagePerStaff", s.id));
  const otherFixed = Math.max(0, s.otherFixed + sumLever(effects, month, "otherFixed", s.id));
  const utilization = capacity > 0 ? customers / capacity : 0;
  return {
    serviceHours, capacity, demand, customers, unitPrice,
    cogsRate, cogsExternal, cogsInternal, wagePerStaff, otherFixed, utilization,
  };
}

/**
 * 店舗の1ヶ月（店舗営業利益まで）。
 * ※ storeOperating は「貢献利益」ではない。貢献利益は本来 売上−変動費 で、
 *    ここでは家賃・人件費・減価償却（いずれも固定費）まで差し引いている。
 *    本社経費（役員報酬）と支払利息を負担する前の、店舗単位の営業利益。
 */
export function calcStoreMonth(s, effects = [], month = 0) {
  const d = deriveStore(s, effects, month);
  const sales = Math.round(d.customers * d.unitPrice);
  const cogs = Math.round(sales * d.cogsRate);
  const labor = s.staffCount * d.wagePerStaff;
  const storeOperating = sales - cogs - s.rent - labor - d.otherFixed - s.depreciation;
  return {
    id: s.id, name: s.name,
    capacity: d.capacity, demand: d.demand, customers: d.customers, unitPrice: d.unitPrice,
    serviceHours: d.serviceHours, cogsRate: d.cogsRate, utilization: d.utilization,
    sales, cogs, rent: s.rent, labor, otherFixed: d.otherFixed, depreciation: s.depreciation,
    storeOperating, staffCount: s.staffCount, wagePerStaff: d.wagePerStaff,
    educationLevel: s.educationLevel, equipmentAge: s.equipmentAge, strainMonths: s.strainMonths,
  };
}

/**
 * 会社全体の1ヶ月。
 * @param o {
 *   loanBalance, executiveComp, stores, effects, month,
 *   extraordinaryLoss, extraordinaryGain,
 *   actionCost      その月に実行した施策の費用（広告費・採用費・研修費など＝販管費）
 *   annualRate      借入金利。金利改定イベントで動くので定数ではなく引数で受ける
 *   depreciationCap 固定資産の残存簿価。取得原価を超えて償却し続けないための上限
 * }
 */
export function calcMonth(o) {
  const {
    loanBalance, executiveComp, stores, effects = [], month = 0,
    extraordinaryLoss = 0, extraordinaryGain = 0,
    actionCost = 0, annualRate = ANNUAL_RATE, depreciationCap = Infinity,
  } = o;

  const storeResults = stores.map(s => calcStoreMonth(s, effects, month));
  const sum = (f) => storeResults.reduce((a, r) => a + r[f], 0);

  const sales = sum("sales");
  const cogs = sum("cogs");
  const gross = sales - cogs;
  const rent = sum("rent");
  const labor = sum("labor");
  const storeOtherFixed = sum("otherFixed");
  const storeOperatingTotal = sum("storeOperating");

  // 簿価を超えて償却しない。超過分は費用に計上しないので店舗営業利益に足し戻す。
  const depreciationRaw = sum("depreciation");
  const depreciation = Math.max(0, Math.min(depreciationRaw, Math.max(0, depreciationCap)));
  const depAdjust = depreciationRaw - depreciation;

  // 本社経費：役員報酬 ＋ エリアマネージャー等（hqOtherFixedレバー）
  const hqOtherFixed = Math.max(0, sumLever(effects, month, "hqOtherFixed"));
  const hqCost = executiveComp + hqOtherFixed;

  // 施策費は本業の費用（広告宣伝費・採用費・研修費など）なので販管費に入れる。
  // 特別損失にしてしまうと「その期かぎりの出来事」という説明と矛盾する。
  const otherFixed = storeOtherFixed + hqOtherFixed + actionCost;
  const operating = storeOperatingTotal + depAdjust - hqCost - actionCost; // 営業利益
  const interest = Math.round(loanBalance * (annualRate / 12));
  const ordinary = operating - interest;             // 経常利益＝平常時の実力
  const netProfit = ordinary + extraordinaryGain - extraordinaryLoss; // 当期純利益（税金は考慮しない簡易モデル）

  const principal = Math.min(PRINCIPAL_PAYMENT, loanBalance);
  // 減価償却費は現金を伴わない費用なので足し戻す。元本返済は差し引く。
  // 施策費は netProfit に含まれており、実際の支出もこの月に起きるので調整しない。
  const cashChange = netProfit - principal + depreciation;

  return {
    storeResults,
    sales, cogs, gross, rent, labor, otherFixed, storeOtherFixed, hqOtherFixed,
    executiveComp, hqCost, depreciation, storeOperatingTotal, actionCost,
    operating, interest, ordinary, extraordinaryLoss, extraordinaryGain, netProfit,
    principal, cashChange, annualRate,
    customers: sum("customers"),
    newLoanBalance: loanBalance - principal,
  };
}

// ── 店舗施策のレバー定義（第1章の2件。ここは物語上の固定イベント）──
export const TREATMENT = {
  unitPriceDelta: 2000,     // 平均客単価UP
  serviceHoursDelta: 0.6,   // 接客時間UP → capacity低下
  hireWage: 300000,         // 増員1人あたりの人件費
};
export const PROMO = {
  claimedNewCustomers: 150, // 業者の触れ込み（鵜呑みにしてはいけない）
  demandDelta: 150,
  unitPriceDelta: -200,
  otherFixedDelta: 80000,
  discountRate: 0.2,
  duration: 6,              // クーポンの効果は6ヶ月で切れる
};

// 本店の素の状態（ヒアリングの初期回答やノートの表示に使う）
const HONTEN = STORE_DEFS[0];
export const CURRENT_CUSTOMERS = HONTEN.baseDemand;
export const AVG_TICKET = HONTEN.unitPrice;
export const STAFF_COUNT = HONTEN.staffCount;
export const HOURS_PER_DAY = HONTEN.hoursPerDay;
export const DAYS_PER_MONTH = HONTEN.daysPerMonth;
export const SERVICE_HOURS_BASE = HONTEN.serviceHours;

// ── 前期（先代最後の1年間）の決算書 ──
export const PRIOR_YEAR_PL = {
  sales: 32000000, cogs: 7040000, gross: 24960000,
  rent: 4560000, labor: 14160000, executiveComp: 3600000, otherFixed: 2280000, depreciation: 1080000,
  operating: -720000, interest: 300000, ordinary: -1020000, netProfit: -1020000,
};

export const yen = n => (n < 0 ? "▲" : "") + "¥" + Math.round(Math.abs(n)).toLocaleString();

export const manYen = n => {
  const v = Math.round((Math.abs(n) / 10000) * 10) / 10;
  return (n < 0 ? "▲" : "") + v.toLocaleString(undefined, { maximumFractionDigits: 1 }) + "万円";
};

export const manYenDiff = d => {
  if (d === 0) return "±0万円";
  const v = Math.round((Math.abs(d) / 10000) * 10) / 10;
  return (d > 0 ? "+" : "−") + v.toLocaleString(undefined, { maximumFractionDigits: 1 }) + "万円";
};

// 万円（単位表記なし）。マトリクス表示用。
export const man = n => {
  const v = Math.round((Math.abs(n) / 10000) * 10) / 10;
  return (n < 0 ? "▲" : "") + v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};
