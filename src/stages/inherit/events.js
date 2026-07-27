// 「継承」：外部イベント（ランダム発生）
//
// ■考え方：ランダムは「ノイズ」ではなく「怠慢の答え合わせ」
//   純粋な乱数で不幸が降ってくると、プレイヤーは学習ではなく理不尽を感じる。
//   そこで発生確率を会社の状態に連動させる（給与が低いほど辞めやすい、設備更新をサボるほど壊れる）。
//   すると「ランダムイベント」は実質「数ヶ月前の判断への遅れてきた採点」になり、教材になる。
//
//   逆に 災害・制度改正 だけは確率を固定にする。経営努力で防げないからこそ
//   「現金を厚く持つ」という備えの意味が生まれ、自己資本比率の話に接続できる。
//
// ■圧力方式
//   毎月独立に判定すると「半年なにも起きない凪」と「3ヶ月連続の災難」が普通に起きる。
//   カテゴリごとに圧を溜め、発火したらリセットすることで、頻度を穏やかに保つ。

import { makeEffect } from "./effects";
import { manYen, deriveStore } from "./data";

export const CATEGORIES = ["人事", "設備", "市場", "制度", "災害"];

// 月あたりに溜まる圧（合計で月0.4〜0.6件になるよう調整）
const BASE_PRESSURE = { 人事: 0.055, 設備: 0.045, 市場: 0.05, 制度: 0.04, 災害: 0.02 };

// 会社の状態から、カテゴリごとの発生しやすさ倍率を出す。
// 制度・災害は 1.0 固定＝経営では防げない。
export function stateMultiplier(category, g) {
  const stores = g.stores;
  const avg = (f) => stores.reduce((a, s) => a + f(s), 0) / Math.max(1, stores.length);
  switch (category) {
    case "人事": {
      // 給与が業界水準を下回るほど、疲弊が続くほど、教育が薄いほど辞めやすい。
      // 昇給は effects で効くので実効値で見ること。素の wagePerStaff を見ると
      // 「給与を上げる」施策が退職確率にまったく効かなくなる。
      const wageRatio = avg(s => deriveStore(s, g.effects, g.month).wagePerStaff) / g.marketWage;
      const wagePenalty = wageRatio < 1 ? 1 + (1 - wageRatio) * 6 : Math.max(0.5, 1 - (wageRatio - 1) * 2);
      const strain = 1 + avg(s => s.strainMonths) * 0.25;
      const edu = 1 + (3 - avg(s => s.educationLevel)) * 0.12;
      return Math.max(0.3, wagePenalty * strain * edu);
    }
    case "設備":
      // 設備の経過年数がそのままリスク
      return Math.max(0.3, 0.4 + avg(s => s.equipmentAge) / 30);
    case "市場":
      // 繁盛している店ほど競合に狙われる
      return Math.max(0.5, 0.6 + avg(s => s.baseDemand) / 500);
    default:
      return 1.0; // 制度・災害
  }
}

/**
 * イベント定義
 *  omen      予兆（何ヶ月前に、誰が、なんと言うか）。大きな打撃には必ず予兆を置く。
 *  fire      発生時の処理 → { effects, patch, extraordinaryLoss, tell, title }
 *  tell      誰が伝えるか。数字ではなく人から知らされることで、訪問する動機が保たれる。
 */
export const EVENTS = [
  {
    id: "competitor",
    category: "市場",
    title: "駅前に競合サロンが開店",
    once: true,
    cooldown: 24,
    omen: { months: 2, who: "母", text: "そういえば駅前にね、工事の囲いができてたわよ。美容室ができるって聞いたけど……大丈夫かしらね。" },
    fire: (g, store) => ({
      tell: "店長",
      text: "駅前に新しいサロンができました。うちのお客様も何人か、そちらに流れているみたいです……。",
      effects: [
        makeEffect({ lever: "demand", value: -Math.round(store.baseDemand * 0.15), startMonth: g.month, duration: null, storeId: store.id, source: "駅前の競合店", category: "市場" }),
      ],
    }),
  },
  {
    id: "resign",
    category: "人事",
    title: "スタイリストの退職",
    cooldown: 8,
    omen: { months: 2, who: "店長", text: "最近、スタッフが少し疲れているみたいで……。ちょっと元気がないんです。" },
    canFire: (g, store) => store.staffCount > 1,
    fire: (g, store) => ({
      tell: "店長",
      text: "申し上げにくいのですが……スタイリストが1人、辞めることになりました。対応できる人数が減ってしまいます。",
      // strainMonths は "=0" で絶対値指定。0 と書くと「0を足す」＝何もしない、になる
      patch: { staffCount: -1, strainMonths: "=0" },
    }),
  },
  {
    id: "equipment_fail",
    category: "設備",
    title: "給湯設備の故障",
    cooldown: 10,
    severe: true,   // まとまった出費を伴う。第2章（手習い）では起こさない
    fire: (g, store) => ({
      tell: "店長",
      text: `給湯器が壊れてしまいました。修理費が${manYen(400000)}かかります。直るまでは施術に時間がかかってしまいます。`,
      // 修繕費は本業の費用（販管費）。災害損失と違い特別損失ではない。
      effects: [
        makeEffect({ lever: "otherFixed", value: 400000, startMonth: g.month, duration: 1, storeId: store.id, source: "給湯器の修理費", category: "設備", hidden: true }),
        makeEffect({ lever: "serviceHours", value: 0.2, startMonth: g.month, duration: 1, storeId: store.id, source: "設備故障（修理中）", category: "設備" }),
      ],
      patch: { equipmentAge: "=0" },
    }),
  },
  {
    id: "flood",
    category: "災害",
    title: "大雨で店舗が浸水",
    cooldown: 36,
    severe: true,
    fire: (g, store) => ({
      tell: "店長",
      text: `昨夜の大雨で店が浸水しました。復旧に${manYen(800000)}かかります。しばらくお客様も減ると思います。`,
      extraordinaryLoss: 800000,
      effects: [
        makeEffect({ lever: "demand", value: -Math.round(store.baseDemand * 0.4), startMonth: g.month, duration: 2, storeId: store.id, source: "浸水の影響", category: "災害" }),
      ],
    }),
  },
  {
    id: "material_up",
    scope: "company",   // 特定の店舗の話ではない（画面に店舗名を出さない）
    category: "市場",
    title: "カラー剤の仕入価格が高騰",
    cooldown: 12,
    fire: (g) => ({
      tell: "志村（公認会計士・税理士）",
      text: "材料の相場が上がっていますね。しばらく原価率が2ポイントほど高い状態が続きそうです。仕入先の見直しも検討してみてください。",
      effects: g.stores.map(s => makeEffect({
        lever: "cogsRateExternal", value: 0.02, startMonth: g.month, duration: 8,
        storeId: s.id, source: "材料費の高騰", category: "市場",
      })),
    }),
  },
  {
    id: "min_wage",
    scope: "company",   // 特定の店舗の話ではない（画面に店舗名を出さない）
    category: "制度",
    title: "最低賃金の引き上げ",
    cooldown: 12,
    omen: { months: 1, who: "志村（公認会計士・税理士）", text: "来月から最低賃金が上がります。人件費が少し増えることになりますね。" },
    fire: (g) => ({
      tell: "志村（公認会計士・税理士）",
      text: "最低賃金が引き上げられました。人件費が上がります。業界の給与水準も上がるので、据え置きだと相対的に見劣りしてしまいますよ。",
      effects: g.stores.map(s => makeEffect({
        lever: "wagePerStaff", value: Math.round(s.wagePerStaff * 0.03), startMonth: g.month, duration: null,
        storeId: s.id, source: "最低賃金の引き上げ", category: "制度",
      })),
    }),
  },
  {
    id: "buzz",
    category: "市場",
    title: "SNSで口コミが広がる",
    cooldown: 10,
    good: true,
    canFire: (g, store) => store.educationLevel >= 3,   // 品質への投資が回収される
    fire: (g, store) => ({
      tell: "店長",
      text: "お客様がSNSに上げてくださった投稿が広まって、問い合わせが増えています！",
      effects: [
        makeEffect({ lever: "demand", value: 80, startMonth: g.month, duration: 6, decay: 0.7, storeId: store.id, source: "口コミの広がり", category: "市場" }),
      ],
    }),
  },
  {
    id: "complaint",
    category: "人事",
    title: "クレームが広まる",
    cooldown: 10,
    canFire: (g, store) => store.strainMonths >= 3 || store.educationLevel <= 1,
    fire: (g, store) => ({
      tell: "店長",
      text: "対応が行き届かなかったお客様から、厳しいご意見をいただいてしまいました。少しお客様が減るかもしれません。",
      effects: [
        makeEffect({ lever: "demand", value: -60, startMonth: g.month, duration: 5, decay: 0.65, storeId: store.id, source: "クレームの影響", category: "人事" }),
      ],
    }),
  },
  {
    id: "mansion",
    category: "市場",
    title: "近隣にマンションが竣工",
    once: true,
    cooldown: 24,
    good: true,
    omen: { months: 2, who: "母", text: "近くに大きなマンションが建つんですって。若い方が増えるといいわねえ。" },
    fire: (g, store) => ({
      tell: "店長",
      text: "近くのマンションに入居が始まったみたいで、新しいお客様が増えてきました！",
      effects: [
        makeEffect({ lever: "demand", value: 40, startMonth: g.month, duration: null, storeId: store.id, source: "近隣マンションの竣工", category: "市場" }),
      ],
    }),
  },
  {
    id: "rate_change",
    scope: "company",   // 特定の店舗の話ではない（画面に店舗名を出さない）
    category: "制度",
    title: "銀行の金利改定",
    cooldown: 18,
    omen: { months: 1, who: "剱持（銀行担当者）", text: "来月から貸出金利の見直しがございます。詳細は改めてご連絡いたします。" },
    fire: () => ({
      tell: "剱持（銀行担当者）",
      text: "貸出金利が変更になりました。毎月の利息が変わりますので、資金繰りにご留意ください。",
      rateChange: 0.005,
    }),
  },
];

export const eventById = (id) => EVENTS.find(e => e.id === id);

/**
 * その月にイベントを発生させるか判定する。
 * @returns { fired: [{event, storeId}], pressure } 更新後の圧も返す
 */
export function rollEvents(g, rate) {
  const pressure = { ...g.eventPressure };
  const fired = [];
  if (!rate) return { fired, pressure };

  for (const cat of CATEGORIES) {
    pressure[cat] = (pressure[cat] ?? 0) + BASE_PRESSURE[cat] * (rate / 0.5);
    const p = Math.min(0.6, pressure[cat] * stateMultiplier(cat, g));
    if (Math.random() >= p) continue;

    // このカテゴリで、いま起こしうるイベントを集める
    const pool = EVENTS.filter(e => {
      if (e.category !== cat) return false;
      // 第2章（手習い）では、まとまった特別損失を伴う災害系は起こさない。
      // まだ現金の余力も打ち手も乏しく、避けようのない即死になってしまうため。
      if (e.severe && g.chapter < 3) return false;
      if (e.once && g.firedEventIds?.includes(e.id)) return false;
      const last = g.eventCooldowns?.[e.id];
      if (last != null && g.month - last < e.cooldown) return false;
      // 予兆待ちのものは二重に出さない
      if (g.omens?.some(o => o.eventId === e.id)) return false;
      // 条件を満たす対象店舗が1つもないものは、この時点で除外しておく。
      // 抽選してから外すと、その月の発火機会が黙って捨てられてしまう。
      if (e.canFire && !g.stores.some(s => e.canFire(g, s))) return false;
      return true;
    });
    if (pool.length === 0) continue;

    const ev = pool[Math.floor(Math.random() * pool.length)];
    // 対象店舗を選ぶ。会社レベルのイベントは特定の店に紐づけない。
    const store = ev.scope === "company"
      ? null
      : (() => {
          const targets = g.stores.filter(s => !ev.canFire || ev.canFire(g, s));
          return targets[Math.floor(Math.random() * targets.length)] ?? g.stores[0];
        })();

    fired.push({ eventId: ev.id, storeId: store?.id ?? null });
    pressure[cat] = 0;
    break; // 1ヶ月に発火するのは1件まで（もぐら叩きにしない）
  }
  return { fired, pressure };
}
