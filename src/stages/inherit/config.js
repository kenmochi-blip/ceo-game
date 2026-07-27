// 「継承」：章立てとゲームモードの設定
//
// 同じコードから「短縮デモ（/mg で公開）」と「本編（長期プレイ）」を出し分ける。
// ビルド時に VITE_GAME_MODE=demo を渡すとデモになる。URLに ?mode=demo / ?mode=full でも上書き可能（動作確認用）。

export const GAME_MODES = {
  // 本編：期限なく続く。1年かけてチュートリアルを終え、母の一言で第3章（オープン）へ。
  full: {
    key: "full",
    chapter1End: 3,        // 第1章（一本道）の終わり
    graduationMonth: 12,   // 卒業判定を始める月
    hardEnd: null,         // 強制終了なし
    eventStartMonth: 4,    // 外部イベントが起き始める月
    eventRateCh2: 0.3,     // 第2章の月あたり発生期待値
    eventRateCh3: 0.5,     // 第3章の月あたり発生期待値
  },
  // 短縮デモ：4ヶ月で銀行が再訪して区切りをつける。外部イベントも卒業も出さない。
  demo: {
    key: "demo",
    chapter1End: 3,
    graduationMonth: null,
    hardEnd: 4,
    eventStartMonth: null,
    eventRateCh2: 0,
    eventRateCh3: 0,
  },
};

function resolveMode() {
  // URLパラメータが最優先（動作確認用）
  if (typeof window !== "undefined" && window.location) {
    const p = new URLSearchParams(window.location.search).get("mode");
    if (p && GAME_MODES[p]) return GAME_MODES[p];
  }
  const envMode = import.meta.env?.VITE_GAME_MODE;
  if (envMode && GAME_MODES[envMode]) return GAME_MODES[envMode];
  return GAME_MODES.full;
}

export const MODE = resolveMode();
export const IS_DEMO = MODE.key === "demo";

// ── 卒業条件（第2章 → 第3章）──
// 「失敗しても卒業できる」ことを優先する。成否ではなく「一通り経験したか」で判定する。
export const GRADUATION = {
  requiredMonths: 12,
  // 必読の基礎トピック
  requiredTopics: ["kessansho", "pl", "bs", "profit_vs_cash", "capacity_factor"],
  // 以下のうち2つ以上を満たせばよい
  optionalTargets: 2,
};

export const CHAPTER_LABEL = { 1: "第一章 継承", 2: "第二章 手習い", 3: "第三章 経営" };
