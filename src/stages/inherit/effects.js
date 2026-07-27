// 「継承」：期限つき効果（レバーへの加算）の管理
//
// ■なぜ必要か
//   従来は demandDelta などの数値を店舗に直接加算していたため、一度効いた施策の効果が
//   永久に残り続けた（クーポンの需要+150が5年後も効いている、という状態）。
//   効果を「いつ始まり・何ヶ月続き・どう減衰するか」を持つオブジェクトにすることで、
//   ・キャンペーンは切れる、災害は復旧する、といった時間の流れが表現できる
//   ・ダッシュボードの「いま起きていること」がこの配列をそのまま描画できる
//   ・source を持たせることで「需要が減ったのはクーポン効果が切れたから」と要因分解できる

// 効果が乗るレバーの一覧。store系は storeId で対象を指定し、company系は会社レベルに効く。
export const LEVERS = {
  demand: { scope: "store", label: "需要" },
  unitPrice: { scope: "store", label: "客単価" },
  serviceHours: { scope: "store", label: "接客時間" },
  otherFixed: { scope: "store", label: "その他固定費" },
  cogsRateExternal: { scope: "store", label: "原価率（市況）" },
  cogsRateInternal: { scope: "store", label: "原価率（仕入改善）" },
  wagePerStaff: { scope: "store", label: "人件費単価" },
  hqOtherFixed: { scope: "company", label: "本社経費" },
};

let seq = 0;
export const nextEffectId = () => `e${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * 効果を1件つくる。
 * @param {object} o
 *   lever      どのレバーを動かすか（LEVERSのキー）
 *   value      1ヶ月あたりの加算値
 *   startMonth 効き始める月（遅延させたい施策は未来の月を渡す）
 *   duration   継続月数。null なら永続
 *   decay      毎月かける減衰率（0.7なら毎月7割に薄れる）。null なら減衰なし
 *   storeId    対象店舗。null なら全店（company scopeのレバーでは無視）
 *   source     何によるものか（表示・要因分解用）
 */
export const makeEffect = (o) => ({
  id: nextEffectId(),
  lever: o.lever,
  value: o.value,
  startMonth: o.startMonth,
  duration: o.duration ?? null,
  decay: o.decay ?? null,
  storeId: o.storeId ?? null,
  source: o.source ?? "",
  category: o.category ?? null,
  hidden: o.hidden ?? false, // ダッシュボードの「いま起きていること」に出さない場合
});

// ある月における、その効果の実効値。範囲外なら0。
export function effectValueAt(e, month) {
  const elapsed = month - e.startMonth;
  if (elapsed < 0) return 0;                                   // まだ効き始めていない
  if (e.duration != null && elapsed >= e.duration) return 0;   // もう切れている
  if (e.decay != null) return e.value * Math.pow(e.decay, elapsed);
  return e.value;
}

// その月に有効な効果だけを返す
export const activeEffects = (effects, month) =>
  effects.filter(e => effectValueAt(e, month) !== 0);

// 指定レバー・指定店舗に効いている合計値
export function sumLever(effects, month, lever, storeId = null) {
  let total = 0;
  for (const e of effects) {
    if (e.lever !== lever) continue;
    if (LEVERS[lever]?.scope === "store" && e.storeId != null && e.storeId !== storeId) continue;
    total += effectValueAt(e, month);
  }
  return total;
}

// 期限切れの効果を捨てる（履歴を無限に太らせないため、月次処理の最後に呼ぶ）
export const pruneEffects = (effects, month) =>
  effects.filter(e => e.duration == null || month - e.startMonth < e.duration);

// 残り月数（永続なら null）。ダッシュボード表示用。
export function remainingMonths(e, month) {
  if (e.duration == null) return null;
  return Math.max(0, e.duration - (month - e.startMonth));
}
