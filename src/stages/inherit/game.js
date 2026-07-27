// 「継承」：ゲーム状態と月次処理の中核
//
// ■なぜ1つのオブジェクトに集約するか
//   従来は施策1件につき専用のuseStateが7個必要だった（seenStaffEvent〜staffEventResultPending）。
//   この方式では施策15件・イベント20件を書ききれない。
//   シミュレーション状態を1つのオブジェクトにまとめることで、
//   ・施策/イベントの追加が「定義配列への追記」だけで済む
//   ・そのままセーブ対象になる（保存の実装がほぼ不要）
//   ・月次処理が1箇所に集まり、順序の間違いが起きにくい
//   画面遷移やパネル開閉といったUIの状態は、これとは別にReact側で持つ。

import {
  makeStores, calcMonth, deriveStore, START_CASH, LOAN_START, DRAW_DEFAULT,
  MARKET_WAGE_START, MARKET_WAGE_DRIFT, ANNUAL_RATE,
  FIXED_ASSETS, CAPITAL_STOCK, RETAINED_EARNINGS_INIT,
  EQUITY_RATIO_TARGET,
} from "./data";
import { pruneEffects } from "./effects";
import { MODE, GRADUATION } from "./config";
import { ACTIONS, actionById } from "./actions";
import { EVENTS, eventById, rollEvents } from "./events";

// 引き継いだ時点の自己資本比率（卒業条件「改善しているか」の基準値）
export const INITIAL_EQUITY_RATIO =
  ((CAPITAL_STOCK + RETAINED_EARNINGS_INIT) / (START_CASH + FIXED_ASSETS)) * 100;

export function initialGame(gender = "son") {
  return {
    mode: MODE.key,
    gender,
    month: 1,
    chapter: 1,
    cash: START_CASH,
    loanBalance: LOAN_START,
    annualRate: ANNUAL_RATE,
    draw: DRAW_DEFAULT,
    stores: makeStores(),
    effects: [],
    marketWage: MARKET_WAGE_START,
    fixedAssets: FIXED_ASSETS,   // 設備投資で増えるのでstateで持つ
    history: [],
    lastResult: null,

    // 決算で処理する未計上の支出
    pendingActionCost: 0,        // 施策の費用（販管費として計上）
    pendingCapex: [],            // 設備投資（資産計上）
    pendingExtraordinaryLoss: 0, // 災害損失など

    // 第1章の固定イベント進行
    seenBaseline: false, baselineAsked: [], baselineMonth: null,
    seenStaffEvent: false, staffEventChoice: null, staffAsked: [],
    seenPromo: false, promoChoice: null, promoAsked: [],

    // 汎用の進行状態
    pendingReflections: [],   // 答え合わせ待ち { kind, storeId, month, actionId, label }
    actionLog: [],            // 実行した施策の記録
    actionCooldowns: {},      // `${actionId}:${storeId}` → 実行月
    delayedPatches: [],       // 遅れて効く店舗変更 { month, storeId, patch, note }
    activeEventLog: [],       // 発生したイベントの記録
    eventCooldowns: {},
    firedEventIds: [],
    eventPressure: {},
    omens: [],                // 予兆 { eventId, storeId, fireMonth, who, text, seen }
    inbox: [],                // 今月プレイヤーに伝えるべき出来事

    // 学習の進行
    lessonsRead: [], readThisMonth: 0,
    introExplainChoice: null,

    // 銀行
    equityStreak: 0, financingOffered: false,
    graduated: false, graduationSeen: false,
  };
}

// ── BS系の導出（履歴から計算する。stateに持たない）──
export function derived(g) {
  // 固定資産は設備投資で増えるので state 側を優先する（持たない古いセーブは定数にフォールバック）
  const fixedAssets = g.fixedAssets ?? FIXED_ASSETS;
  const accumDep = g.history.reduce((s, h) => s + h.depreciation, 0);
  const retainedEarnings = RETAINED_EARNINGS_INIT + g.history.reduce((s, h) => s + h.netProfit, 0);
  const fixedAssetsBook = Math.max(0, fixedAssets - accumDep);
  const totalAssets = g.cash + fixedAssetsBook;
  const totalEquity = CAPITAL_STOCK + retainedEarnings;
  const equityRatio = totalAssets > 0 ? (totalEquity / totalAssets) * 100 : 0;
  return { accumDep, retainedEarnings, fixedAssetsBook, totalAssets, totalEquity, equityRatio };
}

export const storeById = (g, id) => g.stores.find(s => s.id === id);

// 店舗にパッチを当てる（増員・教育レベル・設備更新など）。"=0" のような絶対値指定にも対応。
function applyStorePatch(stores, storeId, patch) {
  return stores.map(s => {
    if (s.id !== storeId) return s;
    const next = { ...s };
    for (const [k, v] of Object.entries(patch)) {
      if (typeof v === "string" && v.startsWith("=")) next[k] = Number(v.slice(1));
      else next[k] = (next[k] ?? 0) + v;
    }
    if (next.staffCount != null) next.staffCount = Math.max(0, Math.min(next.maxStaff ?? 99, next.staffCount));
    if (next.educationLevel != null) next.educationLevel = Math.max(0, Math.min(5, next.educationLevel));
    if (next.strainMonths != null) next.strainMonths = Math.max(0, next.strainMonths);
    if (next.equipmentAge != null) next.equipmentAge = Math.max(0, next.equipmentAge);
    return next;
  });
}

// ── 施策の実行 ──
export function runAction(g, actionId, storeId) {
  const a = actionById(actionId);
  if (!a) return g;
  const store = a.scope === "company" ? null : storeById(g, storeId);
  let next = { ...g };

  // 現金はここでは減らさない。月次処理でPLに費用（または資産）として計上したうえで動かす。
  // ここで直接引くと、その支出がPLにもBSにも現れず「資産＝負債＋純資産」が恒久的に崩れる。
  const cost = a.initialCost ?? 0;
  if (cost > 0) {
    if (a.capitalize) {
      // 設備投資は費用ではなく資産の取得。現金は出ていくが、PLには減価償却として少しずつ乗る。
      next.pendingCapex = [...(g.pendingCapex ?? []), { storeId: store?.id ?? null, amount: cost }];
    } else {
      // 広告費・採用費・研修費などは本業の費用（販管費）
      next.pendingActionCost = (g.pendingActionCost ?? 0) + cost;
    }
  }

  const newEffects = a.effects ? a.effects(g, store) : [];
  if (newEffects.length) next.effects = [...g.effects, ...newEffects];
  if (a.patch && store) next.stores = applyStorePatch(g.stores, store.id, a.patch);
  if (a.companyPatch) Object.assign(next, a.companyPatch);
  if (a.delayedPatch && store) {
    next.delayedPatches = [...g.delayedPatches, {
      month: g.month + a.delayedPatch.months, storeId: store.id,
      patch: a.delayedPatch.patch, note: a.delayedPatch.note,
    }];
  }
  next.actionCooldowns = { ...g.actionCooldowns, [`${a.id}:${store?.id ?? "co"}`]: g.month };
  next.actionLog = [...g.actionLog, { actionId: a.id, storeId: store?.id ?? null, month: g.month, label: a.label }];

  // 施策には必ず答え合わせをつける（打ちっぱなしにしない）。
  // 比較する月は「効果が最初に乗る月」。ここを実行月にすると、効果が翌月以降に始まる施策では
  // 変化のない2ヶ月を突き合わせることになり、振り返りが全問「変わりませんでした」になる。
  if (store) {
    const starts = [
      ...newEffects.map(e => e.startMonth),
      ...(a.delayedPatch ? [g.month + a.delayedPatch.months] : []),
      ...(a.patch ? [g.month] : []),
    ];
    const firstMonth = starts.length ? Math.min(...starts) : g.month;
    next.pendingReflections = [...g.pendingReflections, {
      kind: "action", actionId: a.id, storeId: store.id, month: firstMonth,
      decidedMonth: g.month, label: a.label,
    }];
  }
  return next;
}

// ── 月次処理 ──
// 順序が重要：予兆の消化 → 遅延パッチ → 設備投資の資産計上 → 決算 → 状態更新 → イベント判定 → 章の判定
export function advance(g) {
  let next = { ...g, inbox: [] };
  const inbox = [];

  // 1. 予兆が満期になったらイベントを発火させる
  const stillOmens = [];
  for (const o of g.omens) {
    if (o.fireMonth > g.month) { stillOmens.push(o); continue; }
    const ev = eventById(o.eventId);
    if (!ev) continue;
    const r = fireEvent(next, ev, o.storeId);
    next = r.game;
    inbox.push(...r.messages);
  }
  next.omens = stillOmens;

  // 2. 遅れて効く店舗変更（採用の3ヶ月後、研修の6ヶ月後など）
  const stillDelayed = [];
  for (const d of next.delayedPatches) {
    if (d.month > g.month) { stillDelayed.push(d); continue; }
    next.stores = applyStorePatch(next.stores, d.storeId, d.patch);
    const st = next.stores.find(s => s.id === d.storeId);
    inbox.push({ kind: "info", who: "店長", text: `${st?.name ?? ""}：${d.note}` });
  }
  next.delayedPatches = stillDelayed;

  // 3. 設備投資の資産計上（費用ではないのでPLには乗らず、以後の減価償却として少しずつ乗る）
  const capexList = next.pendingCapex ?? [];
  const capexTotal = capexList.reduce((a, c) => a + c.amount, 0);
  if (capexTotal > 0) {
    next.fixedAssets = (next.fixedAssets ?? FIXED_ASSETS) + capexTotal;
    for (const c of capexList) {
      if (!c.storeId) continue;
      // 耐用年数5年（60ヶ月）で按分して各店の減価償却費に上乗せする
      next.stores = applyStorePatch(next.stores, c.storeId, { depreciation: Math.round(c.amount / 60) });
    }
  }
  next.pendingCapex = [];

  // 4. 今月の決算
  const extraLoss = next.pendingExtraordinaryLoss ?? 0;
  const actionCost = next.pendingActionCost ?? 0;
  const bookBefore = derived(next).fixedAssetsBook; // 償却の上限（取得原価を超えて償却しない）
  const result = calcMonth({
    loanBalance: next.loanBalance,
    executiveComp: next.draw,
    stores: next.stores,
    effects: next.effects,
    month: g.month,
    extraordinaryLoss: extraLoss,
    actionCost,
    annualRate: next.annualRate ?? ANNUAL_RATE,
    depreciationCap: bookBefore,
  });
  next.pendingExtraordinaryLoss = 0;
  next.pendingActionCost = 0;

  // 施策費は cashChange（netProfit経由）に含まれる。設備投資は費用ではないので別途差し引く。
  const newCash = next.cash + result.cashChange - capexTotal;
  next.history = [...next.history, { m: g.month, cash: newCash, capex: capexTotal, ...result }];
  next.lastResult = result;
  next.cash = newCash;
  next.loanBalance = result.newLoanBalance;
  next.readThisMonth = 0;

  // 5. 店舗の状態を更新（疲弊・設備の経過・業界賃金の上昇）
  next.stores = next.stores.map(s => {
    const r = result.storeResults.find(x => x.id === s.id);
    const strained = r && r.utilization >= 0.95;
    // エリアマネージャーがいると現場に目が届き、疲弊が溜まる速さが半分になる
    const step = next.areaManager ? 0.5 : 1;
    return {
      ...s,
      equipmentAge: (s.equipmentAge ?? 0) + 1,
      strainMonths: strained ? (s.strainMonths ?? 0) + step : 0,
    };
  });
  next.marketWage = Math.round(next.marketWage * (1 + MARKET_WAGE_DRIFT));

  // 6. 自己資本比率のストリーク
  const d = derived(next);
  next.equityStreak = d.equityRatio >= EQUITY_RATIO_TARGET ? next.equityStreak + 1 : 0;

  // 7. 月を進める
  next.month = g.month + 1;
  next.effects = pruneEffects(next.effects, next.month);

  // 8. 外部イベントの判定（第2章以降・本編のみ）
  const rate = eventRate(next);
  if (rate > 0) {
    const { fired, pressure } = rollEvents(next, rate);
    next.eventPressure = pressure;
    for (const f of fired) {
      const ev = eventById(f.eventId);
      if (!ev) continue;
      if (ev.omen) {
        // 予兆つき：いまは前触れだけ出し、本番は数ヶ月後
        next.omens = [...next.omens, {
          eventId: ev.id, storeId: f.storeId, fireMonth: next.month + ev.omen.months,
          who: ev.omen.who, text: ev.omen.text,
        }];
        next.eventCooldowns = { ...next.eventCooldowns, [ev.id]: next.month };
        inbox.push({ kind: "omen", who: ev.omen.who, text: ev.omen.text, title: "気になる話" });
      } else {
        const r = fireEvent(next, ev, f.storeId);
        next = r.game;
        inbox.push(...r.messages);
      }
    }
  }

  // 9. 章の判定
  next.chapter = chapterOf(next);
  next.inbox = inbox;
  return next;
}

// イベントを実際に発火させる。更新後のゲーム状態と、プレイヤーに伝えるメッセージを返す。
function fireEvent(g, ev, storeId) {
  const store = storeId ? storeById(g, storeId) : g.stores[0];
  const out = ev.fire(g, store);
  const next = { ...g };
  if (out.effects) next.effects = [...next.effects, ...out.effects];
  if (out.patch && store) next.stores = applyStorePatch(next.stores, store.id, out.patch);
  if (out.extraordinaryLoss) next.pendingExtraordinaryLoss = (next.pendingExtraordinaryLoss ?? 0) + out.extraordinaryLoss;
  if (out.rateChange) next.annualRate = Math.max(0.005, (next.annualRate ?? ANNUAL_RATE) + out.rateChange);
  next.eventCooldowns = { ...next.eventCooldowns, [ev.id]: g.month };
  next.firedEventIds = [...next.firedEventIds, ev.id];
  next.activeEventLog = [...next.activeEventLog, { eventId: ev.id, storeId: store?.id ?? null, month: g.month, title: ev.title }];
  return {
    game: next,
    messages: [{
      kind: "event", who: out.tell, text: out.text, title: ev.title, good: !!ev.good,
      // 会社レベルのイベントに、抽選で選ばれただけの無関係な店舗名を出さない
      storeName: ev.scope === "company" ? null : store?.name,
    }],
  };
}

function eventRate(g) {
  if (!MODE.eventStartMonth) return 0;
  if (g.month < MODE.eventStartMonth) return 0;
  return g.chapter >= 3 ? MODE.eventRateCh3 : MODE.eventRateCh2;
}

// ── 章の判定 ──
export function chapterOf(g) {
  if (g.graduated) return 3;
  if (g.month > MODE.chapter1End) return 2;
  return 1;
}

// 第1章の物語イベントも「自分で決めたこと」に数える（見送る判断も決断のうち）
export function decisionCount(g) {
  return g.actionLog.length
    + (g.staffEventChoice ? 1 : 0)
    + (g.promoChoice ? 1 : 0);
}

// ── 卒業条件（第2章 → 第3章）──
// 「失敗しても卒業できる」ことを優先する。成否ではなく「一通り経験したか」で見る。
export function graduationCheck(g) {
  if (!MODE.graduationMonth) return { eligible: false, required: [], optional: [] };
  const d = derived(g);
  const required = [
    { key: "months", label: `${GRADUATION.requiredMonths}ヶ月の経営を経験する`, ok: g.month > GRADUATION.requiredMonths },
    { key: "alive", label: "現金を絶やさずに続けている", ok: g.cash >= 0 },
    {
      key: "topics", label: "志村さんから基礎を一通り聞く",
      ok: GRADUATION.requiredTopics.every(t => g.lessonsRead.includes(t)),
    },
    // 成否は問わないが「自分で決断したことがある」ことは必須にする。
    // 何も決めずに月を送っただけの人が卒業してしまうと、第3章で何もできない。
    {
      key: "actions", label: "自分で3件以上の決断をする（成否は問わない）",
      ok: decisionCount(g) >= 3,
    },
  ];
  const recent = g.history.slice(-3);
  const optional = [
    { key: "profit", label: "直近3ヶ月の営業利益が黒字", ok: recent.length === 3 && recent.every(h => h.operating > 0) },
    { key: "equity", label: "自己資本比率が引き継ぎ時より改善している", ok: d.equityRatio > INITIAL_EQUITY_RATIO },
    { key: "reflect", label: "振り返りをすべて終えている", ok: g.pendingReflections.length === 0 && g.history.length > 0 },
  ];
  const optOk = optional.filter(o => o.ok).length;
  const eligible = required.every(r => r.ok) && optOk >= GRADUATION.optionalTargets;
  return { eligible, required, optional, optOk, need: GRADUATION.optionalTargets };
}

// ── 体力指標（ダッシュボード用）──
export function healthOf(store, g) {
  // 昇給施策は effects 側で効くので、素の wagePerStaff ではなく実効値で見る。
  // 素の値を見ていると「給与を上げる」を打っても体力表示が一切変わらない。
  const eff = deriveStore(store, g.effects, g.month);
  const wageRatio = eff.wagePerStaff / g.marketWage;
  const wage = wageRatio >= 1.05 ? "ok" : wageRatio >= 0.95 ? "warn" : "crit";
  const edu = store.educationLevel >= 4 ? "ok" : store.educationLevel >= 2 ? "warn" : "crit";
  const equip = store.equipmentAge < 24 ? "ok" : store.equipmentAge < 48 ? "warn" : "crit";
  const strain = store.strainMonths <= 1 ? "ok" : store.strainMonths <= 3 ? "warn" : "crit";
  return {
    wage: { level: wage, label: `給与 業界比 ${wageRatio >= 1 ? "+" : "−"}${Math.abs(Math.round((wageRatio - 1) * 100))}%` },
    edu: { level: edu, label: `教育 Lv.${store.educationLevel}` },
    equip: { level: equip, label: `設備 ${store.equipmentAge}ヶ月` },
    strain: { level: strain, label: store.strainMonths > 0 ? `疲弊 ${store.strainMonths}ヶ月` : "疲弊なし" },
  };
}

export const ALL_ACTIONS = ACTIONS;
export const ALL_EVENTS = EVENTS;
