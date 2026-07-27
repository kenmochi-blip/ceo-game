// 「継承」：施策の定義（データ駆動）
//
// ■並びは「どのレバーを動かすか」＝売上の因数分解そのもの。
//   業務分類（マーケ・人事…）ではなくレバーで分類することで、メニューを開くたびに
//   「売上を上げたい → 客数か客単価か」を目にすることになる。UIそのものが教材になる。
//
// ■1つの施策が持つ属性
//   initialCost 実行時に出ていく現金 / effects 効果（遅延・持続・減衰つき）
//   patch       店舗そのものを書き換えるもの（増員・教育レベル・設備更新など）
//   遅延と持続があることで「今すぐ効く手」と「効くのが遅いが持続する手」の差が生まれ、
//   短期と長期のトレードオフという経営の本質が遊びの中に立ち上がる。

import { makeEffect } from "./effects";
import { manYen } from "./data";

export const ACTION_GROUPS = [
  { key: "customers", lv: "LEVER 01", name: "客数を増やす" },
  { key: "price", lv: "LEVER 02", name: "客単価を上げる" },
  { key: "capacity", lv: "LEVER 03", name: "対応力を上げる" },
  { key: "cogs", lv: "LEVER 04", name: "原価を下げる" },
  { key: "fixed", lv: "LEVER 05", name: "固定費を見直す" },
  { key: "people", lv: "LEVER 06", name: "人を守る" },
];

// 効果に幅を持たせる（業者の触れ込み通りにはならない、を数字で表現する）
const jitter = (base, spread) => Math.round(base * (1 + (Math.random() * 2 - 1) * spread));

export const ACTIONS = [
  // ── LEVER 01 客数を増やす ──
  {
    id: "flyer",
    group: "customers",
    label: "チラシ・SNS広告を出す",
    desc: "すぐ効くが、効果は月を追うごとに薄れていく。",
    detail: (s) => `需要が一時的に増えます（効果は毎月薄れ、6ヶ月で切れます）。配布コストは月${manYen(60000)}。`,
    scope: "store",
    initialCost: 150000,
    cooldown: 4,
    minChapter: 2,
    effects: (g, s) => [
      makeEffect({ lever: "demand", value: jitter(90, 0.3), startMonth: g.month + 1, duration: 6, decay: 0.75, storeId: s.id, source: "チラシ・SNS広告" }),
      makeEffect({ lever: "otherFixed", value: 60000, startMonth: g.month + 1, duration: 6, storeId: s.id, source: "広告費", hidden: true }),
    ],
  },
  {
    id: "referral",
    group: "customers",
    label: "紹介キャンペーンを始める",
    desc: "効き始めるのは遅いが、長く続く。",
    detail: () => "翌々月から需要が増え、1年間続きます。既存のお客様の満足度が高いほど効きます。",
    scope: "store",
    initialCost: 80000,
    cooldown: 8,
    minChapter: 2,
    effects: (g, s) => [
      // 教育レベルが高いほどよく効く＝品質への投資が回収される導線
      makeEffect({ lever: "demand", value: jitter(30 + s.educationLevel * 12, 0.25), startMonth: g.month + 2, duration: 12, storeId: s.id, source: "紹介キャンペーン" }),
    ],
  },

  // ── LEVER 02 客単価を上げる ──
  {
    id: "price_up",
    group: "price",
    label: "料金を値上げする",
    desc: "客単価は確実に上がるが、需要がどれだけ落ちるかは読めない。",
    detail: (s) => `客単価が約8%（${manYen(Math.round(s.unitPrice * 0.08))}）上がります。ただし需要は5〜20%落ちます。`,
    scope: "store",
    initialCost: 0,
    cooldown: 12,
    minChapter: 2,
    effects: (g, s) => [
      makeEffect({ lever: "unitPrice", value: Math.round(s.unitPrice * 0.08), startMonth: g.month + 1, duration: null, storeId: s.id, source: "値上げ" }),
      // 需要の落ち幅は実行するまで分からない（−5%〜−20%）
      makeEffect({ lever: "demand", value: -Math.round(s.baseDemand * (0.05 + Math.random() * 0.15)), startMonth: g.month + 1, duration: null, storeId: s.id, source: "値上げによる客離れ" }),
    ],
  },
  {
    id: "retail",
    group: "price",
    label: "店販（物販）を強化する",
    desc: "小さいが確実な客単価の上乗せ。",
    detail: () => "客単価が少し上がります。仕入れが増えるので原価率も上がります。",
    scope: "store",
    initialCost: 120000,
    cooldown: 10,
    minChapter: 2,
    effects: (g, s) => [
      makeEffect({ lever: "unitPrice", value: jitter(600, 0.2), startMonth: g.month + 1, duration: null, storeId: s.id, source: "店販強化" }),
      makeEffect({ lever: "cogsRateInternal", value: 0.015, startMonth: g.month + 1, duration: null, storeId: s.id, source: "店販の仕入", hidden: true }),
    ],
  },

  // ── LEVER 03 対応力を上げる ──
  {
    id: "hire",
    group: "capacity",
    label: "スタイリストを採用する",
    desc: "対応できる上限が増える。ただし戦力になるのは3ヶ月後。",
    detail: (s) => `募集に${manYen(200000)}かかり、3ヶ月後に1人増えます。以後の人件費は月${manYen(s.wagePerStaff)}増。`,
    scope: "store",
    initialCost: 200000,
    cooldown: 3,
    minChapter: 2,
    requires: (g, s) => s.staffCount < s.maxStaff,
    blockedReason: (g, s) => `この店舗で働けるのは${s.maxStaff}人までです。これ以上増やすには店舗を広げるか、新しい店を出す必要があります。`,
    delayedPatch: { months: 3, patch: { staffCount: +1 }, note: "スタイリストが1人増えました" },
  },
  {
    id: "training",
    group: "capacity",
    label: "研修に出す",
    desc: "効くのは半年後。だが効果は消えない。",
    detail: () => "教育レベルが1上がります。接客時間が短くなって上限が増え、口コミも起きやすく、辞めにくくなります。",
    scope: "store",
    initialCost: 250000,
    cooldown: 6,
    minChapter: 2,
    requires: (g, s) => s.educationLevel < 5,
    blockedReason: () => "すでに教育レベルは十分に高い状態です。",
    effects: (g, s) => [
      makeEffect({ lever: "serviceHours", value: -0.06, startMonth: g.month + 6, duration: null, storeId: s.id, source: "研修（習熟）" }),
    ],
    delayedPatch: { months: 6, patch: { educationLevel: +1 }, note: "教育レベルが上がりました" },
  },
  {
    id: "equipment",
    group: "capacity",
    label: "設備を更新する",
    desc: "まとまった現金が要るが、故障のリスクが消える。",
    detail: () => "接客時間が短くなり、設備の経過年数がリセットされて故障しにくくなります。",
    scope: "store",
    initialCost: 900000,
    cooldown: 24,
    minChapter: 2,
    effects: (g, s) => [
      makeEffect({ lever: "serviceHours", value: -0.05, startMonth: g.month + 1, duration: null, storeId: s.id, source: "設備更新" }),
    ],
    patch: { equipmentAge: "=0" },
  },

  // ── LEVER 04 原価を下げる ──
  {
    id: "supplier",
    group: "cogs",
    label: "仕入先を見直す",
    desc: "地味だが、効果はずっと残る。",
    detail: () => "原価率が1.5ポイント下がります。市況で原価が上がっているときほど効きます。",
    scope: "store",
    initialCost: 50000,
    cooldown: 12,
    minChapter: 2,
    effects: (g, s) => [
      makeEffect({ lever: "cogsRateInternal", value: -0.015, startMonth: g.month + 1, duration: null, storeId: s.id, source: "仕入先の見直し" }),
    ],
  },

  // ── LEVER 05 固定費を見直す ──
  {
    id: "cost_cut",
    group: "fixed",
    label: "経費を見直す",
    desc: "すぐ効く。ただし削りすぎると現場が荒れる。",
    detail: (s) => `その他固定費が月${manYen(Math.round(s.otherFixed * 0.15))}減ります。`,
    scope: "store",
    initialCost: 0,
    cooldown: 12,
    minChapter: 2,
    effects: (g, s) => [
      makeEffect({ lever: "otherFixed", value: -Math.round(s.otherFixed * 0.15), startMonth: g.month + 1, duration: null, storeId: s.id, source: "経費の見直し" }),
    ],
  },

  // ── LEVER 06 人を守る ──
  {
    id: "raise",
    group: "people",
    label: "給与を上げる",
    desc: "利益は減るが、辞められては元も子もない。",
    detail: (s) => `一人あたりの人件費が月${manYen(Math.round(s.wagePerStaff * 0.06))}増えます。退職しにくくなります。`,
    scope: "store",
    initialCost: 0,
    cooldown: 6,
    minChapter: 2,
    effects: (g, s) => [
      makeEffect({ lever: "wagePerStaff", value: Math.round(s.wagePerStaff * 0.06), startMonth: g.month + 1, duration: null, storeId: s.id, source: "昇給" }),
    ],
  },
  {
    id: "welfare",
    group: "people",
    label: "休みを増やす・待遇を改善する",
    desc: "疲弊をリセットする。",
    detail: () => "スタッフの疲弊が解消され、しばらく退職しにくくなります。その分コストは増えます。",
    scope: "store",
    initialCost: 0,
    cooldown: 8,
    minChapter: 2,
    effects: (g, s) => [
      makeEffect({ lever: "otherFixed", value: 40000, startMonth: g.month + 1, duration: null, storeId: s.id, source: "待遇改善" }),
    ],
    patch: { strainMonths: "=0" },
  },
  {
    id: "area_manager",
    group: "people",
    label: "エリアマネージャーを置く",
    desc: "店舗が増えてきたら、現場を任せる人が要る。",
    detail: () => "本社経費が増えますが、全店の疲弊が溜まりにくくなり、店長の目が行き届きます。",
    scope: "company",
    initialCost: 0,
    cooldown: 999,
    minChapter: 3,
    requires: (g) => g.stores.length >= 3,
    blockedReason: () => "店舗が3つ以上になってから考えましょう。",
    effects: (g) => [
      makeEffect({ lever: "hqOtherFixed", value: 350000, startMonth: g.month + 1, duration: null, source: "エリアマネージャー" }),
    ],
  },
];

export const actionById = (id) => ACTIONS.find(a => a.id === id);

// 実行可能かどうか（章・現金・クールダウン・個別条件）
export function canRun(action, g, store) {
  if (g.chapter < (action.minChapter ?? 3)) return { ok: false, reason: "まだこの施策は打てません。" };
  const last = g.actionCooldowns?.[`${action.id}:${store?.id ?? "co"}`];
  if (last != null && g.month - last < action.cooldown) {
    return { ok: false, reason: `前回から${action.cooldown}ヶ月は空けてください（あと${action.cooldown - (g.month - last)}ヶ月）。` };
  }
  if (action.requires && !action.requires(g, store)) {
    return { ok: false, reason: action.blockedReason ? action.blockedReason(g, store) : "いまは実行できません。" };
  }
  if ((action.initialCost ?? 0) > g.cash) {
    return { ok: false, reason: `現金が足りません（必要 ${manYen(action.initialCost)}）。` };
  }
  return { ok: true };
}
