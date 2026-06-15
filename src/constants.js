// ゲーム定数とフォーマット用ヘルパー
export const START_CASH = 3000000;        // 開業前の貯金（うち100万は両親の開業祝い）
export const TARGET_PROFIT = 1500000;     // 年間利益の★★★目標
export const MONTHS = 12;
export const SETUP_TOTAL = 2100000;       // 初期費用。開業後の現金が¥900,000残るよう設定
export const RENT = 150000, LEASE = 30000, UTILITY = 40000;
export const FOOD_INVEST_COST = 200000;
export const MOS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export const yen = n => "¥" + Math.round(n).toLocaleString();
