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
export const LABOR = 450000;            // 人件費
export const OTHER_FIXED = 100000;      // その他固定費（水道光熱費等）

export const DRAW_DEFAULT = 300000;     // 生活費（役員報酬）：father's old habit
export const DRAW_MIN = 0;
export const DRAW_MAX = 300000;
export const DRAW_STEP = 50000;

export const DEMO_MONTHS = 4;           // このデモで進める月数（4ヶ月後に銀行面談）

export const yen = n => (n < 0 ? "▲" : "") + "¥" + Math.round(Math.abs(n)).toLocaleString();

// 1ヶ月分の経営結果を計算する
export function calcMonth(loanBalance, draw) {
  const cogs = Math.round(SALES * COGS_RATE);
  const gross = SALES - cogs;
  const operating = gross - RENT - LABOR - OTHER_FIXED;
  const interest = Math.round(loanBalance * (ANNUAL_RATE / 12));
  const netProfit = operating - interest;
  const principal = Math.min(PRINCIPAL_PAYMENT, loanBalance);
  const cashChange = netProfit - principal - draw;
  return {
    sales: SALES, cogs, gross, rent: RENT, labor: LABOR, otherFixed: OTHER_FIXED,
    operating, interest, netProfit, principal, draw, cashChange,
    newLoanBalance: loanBalance - principal,
  };
}
