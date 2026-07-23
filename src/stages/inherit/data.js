// 「継承」デモ：数値まわりの定数と月次計算ロジック
export const COMPANY_NAME = "株式会社フルール";
export const STORE_NAME = "サロン・ドゥ・フルール 本店";

export const START_CASH = 1800000;      // 引き継いだ時点の会社の現金
export const LOAN_START = 6000000;      // 銀行借入の残高
export const ANNUAL_RATE = 0.03;        // 借入金利（年率）
export const PRINCIPAL_PAYMENT = 200000; // 毎月の元本返済額（定額）

export const SALES = 1500000;           // 本店の月次売上（デモでは固定）
export const COGS_RATE = 0.32;          // 原価率
export const RENT = 200000;             // 家賃
export const LABOR = 450000;            // 人件費（スタッフ）
export const OTHER_FIXED = 100000;      // その他固定費（水道光熱費等）
export const DEPRECIATION_PER_MONTH = 50000; // 減価償却費（現金を伴わない費用）

export const DRAW_DEFAULT = 300000;     // 役員報酬：father's old habit（引き継ぎ時に一度だけ決め、以後変更しない）
export const DRAW_MIN = 0;
export const DRAW_MAX = 300000;
export const DRAW_STEP = 50000;

export const DEMO_MONTHS = 4;           // このデモで進める月数（4ヶ月後に銀行が再訪問）

// ── 貸借対照表（BS）用の定数 ──
export const FIXED_ASSETS = 5000000;    // 什器・敷金保証金など（減価償却により帳簿価額が減っていく）
export const CAPITAL_STOCK = 800000;    // 資本金
// 開始時点で 資産(現金+固定資産) = 負債(借入)+純資産(資本金+利益剰余金0) が釣り合うように設定
// 1,800,000 + 5,000,000 = 6,000,000 + 800,000 + 0 = 6,800,000

// ── 客数の因数分解（③の軽い体験版：スタッフ新メニュー相談イベント用）──
export const STAFF_COUNT = 2;             // 現在のスタイリスト人数
export const HOURS_PER_DAY = 8;
export const DAYS_PER_MONTH = 25;
export const SERVICE_HOURS_BASE = 1.0;    // 通常メニューの平均施術時間
export const SERVICE_HOURS_TREATMENT = 1.5; // トリートメント込みの平均施術時間
export const AVG_TICKET = 5000;           // 平均客単価（SALES = AVG_TICKET × 客数）
export const CURRENT_CUSTOMERS = Math.round(SALES / AVG_TICKET); // 300人/月

export const capacity = (staffCount, serviceHours) =>
  Math.floor((staffCount * HOURS_PER_DAY * DAYS_PER_MONTH) / serviceHours);

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

// 万円単位＋前月比つきの文字列（Row用）
export const manYenRow = (cur, prev) =>
  prev === undefined || prev === null ? manYen(cur) : `${manYen(cur)}（${manYenDiff(cur - prev)}）`;

// 1ヶ月分の経営結果を計算する（executiveCompは役員報酬＝PL費用。extraSales/extraLaborはスタッフイベント等の上乗せ分）
export function calcMonth(loanBalance, executiveComp, extraSales = 0, extraLabor = 0) {
  const sales = SALES + extraSales;
  const cogs = Math.round(sales * COGS_RATE);
  const gross = sales - cogs;
  const labor = LABOR + extraLabor;
  const depreciation = DEPRECIATION_PER_MONTH;
  const operating = gross - RENT - labor - OTHER_FIXED - executiveComp - depreciation; // 営業利益
  const interest = Math.round(loanBalance * (ANNUAL_RATE / 12));
  const ordinary = operating - interest; // 経常利益
  const netProfit = ordinary;            // 当期純利益（特別損益・税金は考慮しない簡易モデル）
  const principal = Math.min(PRINCIPAL_PAYMENT, loanBalance);
  // 減価償却費は現金を伴わない費用なので、キャッシュの増減では利益に足し戻す。元本返済は差し引く。
  const cashChange = netProfit - principal + depreciation;
  return {
    sales, cogs, gross, rent: RENT, labor, otherFixed: OTHER_FIXED, executiveComp, depreciation,
    operating, interest, ordinary, netProfit, principal, cashChange,
    newLoanBalance: loanBalance - principal,
  };
}
