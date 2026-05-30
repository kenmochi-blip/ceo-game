// ゲーム定数とフォーマット用ヘルパー
export const START_CASH = 4200000;
export const TARGET_PROFIT = 1500000;
export const MONTHS = 12;
export const SETUP_TOTAL = 3300000;
export const SETUP_ASSET = 1100000;
export const RENT = 150000, LEASE = 30000, UTILITY = 40000;
export const FOOD_INVEST_COST = 200000;
export const MOS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export const yen = n => "¥" + Math.round(n).toLocaleString();
