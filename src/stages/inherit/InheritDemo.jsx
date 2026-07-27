import { useState, useEffect, useRef } from "react";
import {
  COMPANY_NAME, STORE_NAME, BANK_NAME, START_CASH, LOAN_START, ANNUAL_RATE,
  PRINCIPAL_PAYMENT, DRAW_MIN, DRAW_MAX, DRAW_STEP,
  EQUITY_RATIO_TARGET, EQUITY_STREAK_TARGET, yen, manYen, calcMonth,
  STAFF_COUNT, SERVICE_HOURS_BASE, CURRENT_CUSTOMERS, AVG_TICKET,
  HOURS_PER_DAY, DAYS_PER_MONTH, FIXED_ASSETS, CAPITAL_STOCK, RETAINED_EARNINGS_INIT,
  deriveStore, calcStoreMonth, TREATMENT, PROMO, DEMO_MONTHS,
} from "./data";
import { makeEffect } from "./effects";
import { MODE, IS_DEMO, CHAPTER_LABEL, APP_TITLE } from "./config";
import {
  initialGame, advance, derived, runAction, graduationCheck, storeById, decisionCount,
} from "./game";
import { saveGame, loadGame, clearSave, savedMeta } from "./save";
import { TAX_TOPICS } from "./taxTopics";
import BSDiagram from "./BSDiagram";
import PLDiagram from "./PLDiagram";
import MoneyRow from "./MoneyRow";
import Dashboard from "./Dashboard";
import SegmentPL from "./SegmentPL";
import ActionMenu from "./ActionMenu";
import { Player, Mother, Banker, Staff } from "./characters";
import Shimura from "../../components/characters/Shimura";
import TalkBox from "./TalkBox";
import Shell from "../../components/ui/Shell";
import Btn from "../../components/ui/Btn";
import Row from "../../components/ui/Row";
import Spark from "../../components/charts/Spark";

const READS_PER_MONTH = 3;
const CASH_LABEL = "会社の現預金";

const signedNum = (d, unit = "") => d === 0 ? `±0${unit}` : (d > 0 ? "+" : "−") + Math.abs(d).toLocaleString() + unit;
const signedYen = (d) => d === 0 ? "±0" : (d > 0 ? "+" : "−") + "¥" + Math.abs(d).toLocaleString();

// PL同様に、値と（前月比）の位置を行ごとに幅固定で縦に揃える汎用行
function StatRow({ label, val, diff, bold, red }) {
  return (
    <div className="flex justify-between py-1">
      <span className={"text-sm " + (bold ? "font-medium text-stone-700" : "text-stone-500")}>{label}</span>
      <span className="flex items-baseline justify-end">
        <span className={"text-sm tabular-nums text-right w-24 shrink-0 " + (bold ? "font-medium " : "") + (red ? "text-red-600" : "text-stone-700")}>{val}</span>
        <span className="text-[10px] text-stone-400 text-right w-20 shrink-0 ml-1 tabular-nums whitespace-nowrap">{diff || ""}</span>
      </span>
    </div>
  );
}

// 初回の店舗ヒアリング
const BASELINE_QUESTIONS = [
  { key: "customers", q: "今の客数を聞く", a: `月${CURRENT_CUSTOMERS}人くらいです。` },
  { key: "unitPrice", q: "客単価を聞く", a: `平均${yen(AVG_TICKET)}くらいです。` },
  { key: "staffCount", q: "店員数を聞く", a: `スタイリストは${STAFF_COUNT}人です。` },
  { key: "workDays", q: "営業日数を聞く", a: `月${DAYS_PER_MONTH}日、1日${HOURS_PER_DAY}時間営業しています。` },
  { key: "cutTime", q: "一人当たりのカット時間を聞く", a: `平均${SERVICE_HOURS_BASE}時間くらいです。` },
];

const STAFF_QUESTIONS = [
  { key: "price", q: "客単価がどれくらい上がるか聞く", a: `トリートメントを追加されるお客様が多くて、平均の客単価が${yen(AVG_TICKET)}から${yen(AVG_TICKET + TREATMENT.unitPriceDelta)}くらいに上がりそうです。` },
  { key: "time", q: "接客時間の伸びを聞く", a: `施術時間が、通常${SERVICE_HOURS_BASE}時間から${(SERVICE_HOURS_BASE + TREATMENT.serviceHoursDelta).toFixed(1)}時間に伸びるみたいです。` },
  { key: "cost", q: "スタッフを増やす場合のコストを聞く", a: `スタッフを1人増やすなら、社会保険等も込みで人件費は月${manYen(TREATMENT.hireWage)}ほど増えそうです。` },
];

const PROMO_QUESTIONS = [
  { key: "reach", q: "新規客がどれくらい増えそうか聞く", a: `業者さん曰く「このチラシなら新規のお客様が月${PROMO.claimedNewCustomers}人は増えます！」とのことです。` },
  { key: "discount", q: "客単価への影響を聞く", a: `初回${Math.round(PROMO.discountRate * 100)}%オフのクーポンなので、新規のお客様の分だけ平均客単価は少し下がりそうです。` },
  { key: "cost", q: "配布コストを聞く", a: `印刷費やSNS広告費で、月${manYen(PROMO.otherFixedDelta)}ほどかかりそうです。` },
];

// 増減の方向（増えた/減った/変わらない）を当てる汎用設問
function dirStep(question, beforeVal, afterVal, format) {
  const dir = afterVal > beforeVal ? "up" : afterVal < beforeVal ? "down" : "flat";
  return {
    q: question,
    choices: [
      { key: "up", label: "増えた" },
      { key: "down", label: "減った" },
      { key: "flat", label: "変わらない" },
    ],
    correct: dir,
    reveal: <>実際は<b>{format(beforeVal)}</b>から<b>{format(afterVal)}</b>{dir === "up" ? "に増えました" : dir === "down" ? "に減りました" : "で変わりませんでした"}。</>,
  };
}

// 志村さんとの振り返りQ&A（自分で気づいてから答え合わせする形式）
function buildReflection(kind, before, after, label) {
  const customers = v => `${v}人`;
  const causeStep = kind === "hire" ? {
    q: "客数が減らずに済んだのはなぜだと思いますか？",
    choices: [
      { key: "capacity_ok", label: "スタッフを増やして、対応できる上限を需要より高く保ったから" },
      { key: "price_effect", label: "客単価を上げたから" },
      { key: "demand_up", label: "たまたまお客様が増えたから" },
    ],
    correct: "capacity_ok",
    reveal: <>スタッフを増やしたことで、対応できる上限が<b>{after.capacity}人</b>に増え、需要<b>{after.demand}人</b>を上回ったので、来られたお客様全員に対応できました。</>,
  } : kind === "reckless" ? {
    q: "客数が減ってしまったのはなぜだと思いますか？",
    choices: [
      { key: "capacity_short", label: "スタッフを増やさなかったので、対応できる上限が需要を下回ったから" },
      { key: "price_effect", label: "客単価を上げすぎてお客様が離れたから" },
      { key: "demand_drop", label: "そもそもお客様の人気がなくなったから" },
    ],
    correct: "capacity_short",
    reveal: <>接客時間が伸びたのに増員しなかったため、対応できる上限は<b>{after.capacity}人</b>に下がりました。需要<b>{after.demand}人</b>を下回ったので、<b className="text-red-600">{after.demand - after.customers}人を取りこぼしています</b>。</>,
  } : kind === "promo" ? (() => {
    const actualIncrease = after.customers - before.customers;
    const correct = actualIncrease < PROMO.claimedNewCustomers ? "capped" : "realized";
    return {
      q: `業者さんの「新規+${PROMO.claimedNewCustomers}人」という数字は、そのまま実現したと思いますか？`,
      choices: [
        { key: "capped", label: "上限を超えていたので、その通りにはならなかった" },
        { key: "realized", label: "その通り実現した" },
      ],
      correct,
      reveal: <>今の上限は<b>{after.capacity}人</b>で、実際に増やせた客数は<b>+{actualIncrease}人</b>でした。業者さんの数字を鵜呑みにせず、まず自社の上限と照らし合わせることが大事です。</>,
    };
  })() : null;

  const steps = [
    dirStep("この店の売上は、先月と比べて増えたと思いますか？減ったと思いますか？", before.sales, after.sales, yen),
    dirStep("客数はどうなったと思いますか？", before.customers, after.customers, customers),
    dirStep("客単価はどうなったと思いますか？", before.unitPrice, after.unitPrice, yen),
    ...(causeStep ? [causeStep] : []),
    dirStep("お店の利益（店舗営業利益）はどうなったと思いますか？", before.storeOperating, after.storeOperating, yen),
  ];

  const summary = kind === "hire"
    ? <>増員することで、お客様にもしっかり対応でき、利益もしっかり伸びました。良い判断でしたね。</>
    : kind === "reckless"
      ? <>客単価は上がったものの、対応しきれずお客様を取りこぼしてしまいました。次からは、決める前に対応できる上限（スタッフ数×接客時間から計算できます）を確認するといいですよ。</>
      : kind === "promo"
        ? <>業者さんの数字をそのまま信じると、見込み違いになります。次からは、まず自社の上限と照らし合わせてから判断しましょう。</>
        : <>「{label}」の結果はこうなりました。打った手が数字のどこに効いたのか、毎回こうして確かめる癖をつけると、次の判断がぐっと楽になります。</>;

  return { steps, summary };
}

export default function InheritDemo() {
  const [g, setG] = useState(() => initialGame("son"));
  const [screen, setScreen] = useState("title");
  const [transitioning, setTransitioning] = useState(false);
  const started = useRef(false);

  // ── UIだけの状態（保存しない）──
  const [storeMode, setStoreMode] = useState(null);
  const [activeStoreId, setActiveStoreId] = useState("honten");
  const [staffQAOpen, setStaffQAOpen] = useState(false);
  const [staffDecisionOpen, setStaffDecisionOpen] = useState(false);
  const [promoQAOpen, setPromoQAOpen] = useState(false);
  const [promoDecisionOpen, setPromoDecisionOpen] = useState(false);
  const [reflectStep, setReflectStep] = useState(0);
  const [reflectAnswer, setReflectAnswer] = useState(null);
  const [noteOpenKey, setNoteOpenKey] = useState(null);
  const [plViewMode, setPlViewMode] = useState("month");
  const [plScope, setPlScope] = useState("company");
  const [taxMode, setTaxMode] = useState("menu");
  const [taxTopic, setTaxTopic] = useState(null);
  const [expandedStore, setExpandedStore] = useState(null);
  const [actionStore, setActionStore] = useState("honten");
  const [actionResult, setActionResult] = useState(null);
  const [inboxIdx, setInboxIdx] = useState(0);
  // マウント時に一度だけ読むと、リスタート後も古い情報が残って
  // 「つづきから」が押しても何も起きない死んだボタンになる。状態として持ち直す。
  const [saveInfo, setSaveInfo] = useState(() => savedMeta());

  // ── 自動セーブ ──
  useEffect(() => {
    if (started.current) saveGame(g);
  }, [g]);

  useEffect(() => { document.title = APP_TITLE; }, []);

  const d = derived(g);
  const prevCash = g.history.length === 0 ? null : g.history.length === 1 ? START_CASH : g.history[g.history.length - 2].cash;
  const cashDiff = prevCash === null ? null : g.cash - prevCash;
  const grad = graduationCheck(g);

  const patch = (o) => setG(prev => ({ ...prev, ...o }));

  const goStore = () => {
    if (!g.seenBaseline) setStoreMode("baseline");
    else if (!g.seenStaffEvent && g.month > g.baselineMonth) setStoreMode("staffEvent");
    else if (!g.seenPromo && g.seenStaffEvent && g.month > g.staffEventMonth) setStoreMode("promo");
    else setStoreMode("recap");
    setScreen("store");
  };
  const goTax = () => { setTaxMode("menu"); setTaxTopic(null); setScreen("tax"); };

  // ── 月を締める ──
  const advanceMonth = () => {
    setTransitioning(true);
    setTimeout(() => {
      const next = advance(g);
      setG(next);
      setReflectStep(0); setReflectAnswer(null); setInboxIdx(0);

      if (next.cash < 0) { setScreen("gameover"); setTransitioning(false); return; }
      if (next.inbox.length > 0) { setScreen("events"); setTransitioning(false); return; }
      routeAfterMonth(next);
      setTransitioning(false);
    }, 900);
  };

  // イベント表示のあとに進む先を決める
  const routeAfterMonth = (n) => {
    const gc = graduationCheck(n);
    if (gc.eligible && !n.graduated) { setScreen("graduation"); return; }
    if (n.equityStreak >= EQUITY_STREAK_TARGET && !n.financingOffered) {
      setG(p => ({ ...p, financingOffered: true }));
      setScreen("bankFinancingOffer"); return;
    }
    if (IS_DEMO && MODE.hardEnd && n.month > MODE.hardEnd) { setScreen("bankReview"); return; }
    setScreen("hub");
  };

  const restart = () => {
    clearSave();
    setSaveInfo(null);            // 消したセーブへのボタンを残さない
    started.current = false;
    setG(initialGame(g.gender));
    setScreen("title"); setStoreMode(null); setTaxMode("menu"); setTaxTopic(null);
    setStaffQAOpen(false); setStaffDecisionOpen(false); setPromoQAOpen(false); setPromoDecisionOpen(false);
    setReflectStep(0); setReflectAnswer(null); setNoteOpenKey(null); setPlViewMode("month");
    setPlScope("company"); setActionStore("honten"); setActiveStoreId("honten");
    setExpandedStore(null); setActionResult(null); setInboxIdx(0);
  };

  const beginGame = (gender) => {
    started.current = true;
    setSaveInfo(null);
    setG(initialGame(gender));
    setScreen("intro");
  };

  const continueGame = () => {
    const saved = loadGame();
    if (saved) { started.current = true; setG(saved); setScreen("hub"); }
    else setSaveInfo(null);       // 読めないセーブだったらボタンを消す
  };

  // ── 第1章の物語イベント ──
  const chooseStaffEvent = (choice) => {
    setG(prev => {
      let n = { ...prev, staffEventChoice: choice, seenStaffEvent: false };
      if (choice === "hold") return n;
      n.staffEventMonth = prev.month;
      const honten = prev.stores[0];
      const eff = [
        makeEffect({ lever: "unitPrice", value: TREATMENT.unitPriceDelta, startMonth: prev.month, duration: null, storeId: honten.id, source: "トリートメント新メニュー" }),
        makeEffect({ lever: "serviceHours", value: TREATMENT.serviceHoursDelta, startMonth: prev.month, duration: null, storeId: honten.id, source: "トリートメントの施術時間", hidden: true }),
      ];
      n.effects = [...prev.effects, ...eff];
      if (choice === "hire") {
        n.stores = prev.stores.map((s, i) => i === 0 ? { ...s, staffCount: s.staffCount + 1 } : s);
      }
      n.pendingReflections = [...prev.pendingReflections, {
        kind: choice === "hire" ? "hire" : "reckless", storeId: honten.id, month: prev.month, label: "トリートメント新メニュー",
      }];
      return n;
    });
  };

  const choosePromo = (choice) => {
    setG(prev => {
      let n = { ...prev, promoChoice: choice };
      if (choice === "hold") return n;
      n.promoMonth = prev.month;
      const honten = prev.stores[0];
      n.effects = [...prev.effects,
        makeEffect({ lever: "demand", value: PROMO.demandDelta, startMonth: prev.month, duration: PROMO.duration, storeId: honten.id, source: "新規客クーポン" }),
        makeEffect({ lever: "unitPrice", value: PROMO.unitPriceDelta, startMonth: prev.month, duration: PROMO.duration, storeId: honten.id, source: "クーポン割引", hidden: true }),
        makeEffect({ lever: "otherFixed", value: PROMO.otherFixedDelta, startMonth: prev.month, duration: PROMO.duration, storeId: honten.id, source: "クーポン配布費", hidden: true }),
      ];
      n.pendingReflections = [...prev.pendingReflections, {
        kind: "promo", storeId: honten.id, month: prev.month, label: "新規客クーポン",
      }];
      return n;
    });
  };

  const motherMessage = () => {
    if (g.history.length === 0) return <>まずは<b>{STORE_NAME}</b>に一度顔を出してみたら？志村さんの事務所にも決算書があるはずよ。</>;
    if (!g.seenStaffEvent) return <>お店のスタッフさん、何か相談したいことがあるみたいだったけど。</>;
    if (g.chapter >= 3) return <>あなたに任せておけば、もう心配ないわね。お父さんもきっと同じことを言うと思うわ。</>;
    return <>数字をちゃんと見ていれば、大きく間違えることはないから。その調子よ。分からないことがあれば志村さんの事務所にも顔を出してみて。</>;
  };

  // 待っている判断（ダッシュボード用）
  const pendingList = [
    ...(g.pendingReflections.filter(r => g.month > r.month).map(r => ({
      icon: "💬", text: `志村さんと「${r.label}」の振り返り`, where: "志村事務所",
    }))),
    ...(!g.seenBaseline ? [{ icon: "🙋", text: "お店の状況を聞く", where: "本店" }] : []),
    ...((!g.seenStaffEvent && g.seenBaseline && g.month > g.baselineMonth) ? [{ icon: "🙋", text: "スタッフから相談がある", where: "本店" }] : []),
    ...((!g.seenPromo && g.seenStaffEvent && g.month > g.staffEventMonth) ? [{ icon: "🙋", text: "スタッフから相談がある", where: "本店" }] : []),
  ];

  // ═══════════════════ Title ═══════════════════
  if (screen === "title") return (
    <Shell transitioning={transitioning}>
      <div className="text-center pt-8">
        <Player size={88} mood="worried" gender={g.gender} />
        <h1 className="text-xl font-medium text-stone-800 mt-2">継承（仮）</h1>
        <p className="text-sm text-stone-500">ある日突然、社長になった。</p>
      </div>
      <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200 text-[14px] text-stone-600 leading-relaxed">
        父が急逝し、{COMPANY_NAME}（{STORE_NAME}ほか）を継ぐことになった。
        葬儀もそこそこに、顧問の公認会計士・税理士、志村さんから決算書を渡されたが、正直、何が書いてあるのかさっぱり分からない――。
      </div>
      {saveInfo && (
        <button onClick={continueGame}
          className="w-full bg-white border border-amber-400 rounded-xl py-3 mt-3 text-sm text-amber-800">
          つづきから（{saveInfo.month}ヶ月目）
        </button>
      )}
      <Btn onClick={() => setScreen("select")}>{saveInfo ? "はじめから" : "はじめる →"}</Btn>
    </Shell>
  );

  // ═══════════════════ 性別選択 ═══════════════════
  if (screen === "select") return (
    <Shell transitioning={transitioning}>
      <div className="text-center pt-8">
        <h2 className="text-lg font-medium text-stone-800">あなたは？</h2>
        <p className="text-sm text-stone-500 mt-1">先代の子として、会社を継ぎます</p>
      </div>
      <div className="flex gap-3 mt-5">
        {["son", "daughter"].map(gd => (
          <button key={gd} onClick={() => beginGame(gd)}
            className="flex-1 bg-white border border-stone-200 rounded-xl p-4 text-center hover:border-amber-400 transition-colors">
            <Player size={72} gender={gd} />
            <div className="mt-2 text-sm font-medium text-stone-700">{gd === "son" ? "息子" : "娘"}</div>
          </button>
        ))}
      </div>
    </Shell>
  );

  // ═══════════════════ 導入（母） ═══════════════════
  if (screen === "intro") return (
    <Shell transitioning={transitioning}>
      <div className="text-center pt-4"><Mother size={80} mood="worried" /></div>
      <TalkBox name="母" avatar={<Mother size={52} />}>
        あなたに継いでもらうしかないの。お父さんも、まさかこんなに急だなんて思ってなかったでしょうけど……。
        会社のお金のことは、私もよく分からなくて。銀行からの借入もいくらかあるとは聞いているんだけど、詳しいことは私には……。志村さんに相談しながら、やっていくしかないわね。
      </TalkBox>
      <TalkBox name="母" avatar={<Mother size={52} />}>
        あなたの役員報酬は、とりあえず今は父の代の水準のままにしてあるわ。会社の経費になる話だから、あとで志村さんと相談しながら見直していきましょう。
      </TalkBox>
      <TalkBox name="母" avatar={<Mother size={52} />}>まずは志村さんのところに行ってきて。</TalkBox>
      <Btn onClick={() => setScreen("taxFirstVisit")}>会社を継ぐ →</Btn>
    </Shell>
  );

  // ═══════════════════ 志村・初回訪問 ═══════════════════
  if (screen === "taxFirstVisit") return (
    <Shell transitioning={transitioning}>
      <div className="text-center pt-4"><Shimura size={80} /></div>
      <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
        初めまして。先代からずっと顧問をさせていただいております、公認会計士・税理士の志村と申します。
      </TalkBox>
      <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
        この度は、突然のことで……心よりお悔やみ申し上げます。
      </TalkBox>
      <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
        ようこそ。まずは簡単に、会社の状況をお話ししますね。
      </TalkBox>
      <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
        売上はまずまずですが、銀行への返済も控えています。油断せず、数字を見ながら経営していきましょう。
      </TalkBox>

      {g.introExplainChoice === null && (
        <>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
            前期（先代最後の1年間）の決算書を見ながら、決算書の見方を先に説明しておきましょうか？
          </TalkBox>
          <div className="flex gap-2 mt-2">
            <button onClick={() => patch({ introExplainChoice: "yes", lessonsRead: [...new Set([...g.lessonsRead, "kessansho", "pl", "bs"])] })}
              className="flex-1 bg-white border border-stone-200 rounded-xl py-3 text-sm hover:border-amber-400">お願いします</button>
            <button onClick={() => patch({ introExplainChoice: "no" })}
              className="flex-1 bg-white border border-stone-200 rounded-xl py-3 text-sm hover:border-amber-400">また今度で</button>
          </div>
        </>
      )}

      {g.introExplainChoice === "yes" && (
        <>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>{TAX_TOPICS.find(t => t.key === "kessansho").answer}</TalkBox>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>{TAX_TOPICS.find(t => t.key === "pl").answer()}</TalkBox>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>{TAX_TOPICS.find(t => t.key === "bs").answer()}</TalkBox>
        </>
      )}

      {g.introExplainChoice !== null && (
        <>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
            そうそう、近いうちに銀行の剱持さんもご挨拶にいらっしゃると思いますよ。
          </TalkBox>
          <Btn onClick={() => setScreen("bankFirstVisit")}>事務所を出る →</Btn>
        </>
      )}
    </Shell>
  );

  // ═══════════════════ 銀行・初回訪問 ═══════════════════
  if (screen === "bankFirstVisit") return (
    <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
      <div className="text-center pt-6"><Banker size={80} mood="stern" /></div>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} mood="stern" />}>
        初めまして。{BANK_NAME}の剱持と申します。
      </TalkBox>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} mood="stern" />}>
        この度は、突然のことで……心よりお悔やみ申し上げます。先代とは長いお付き合いでしたが、{g.gender === "daughter" ? "娘さん" : "息子さん"}のことはまだ何も存じ上げません。
      </TalkBox>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} mood="stern" />}>
        失礼を承知で申し上げますが、正直まだ、経営者としてどんな方かは分かりかねています。まずは引き継ぎのご挨拶と、融資の状況だけ確認させてください。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <Row label="借入残高" val={yen(g.loanBalance)} bold />
        <Row label="金利（年率）" val={((g.annualRate ?? ANNUAL_RATE) * 100).toFixed(1) + "%"} />
        <Row label="毎月の元本返済額" val={yen(PRINCIPAL_PAYMENT)} />
      </div>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} mood="stern" />}>
        毎月の元本と利息のお支払い、よろしくお願いします。数字をきちんと見ながら経営していただけるか、しばらく様子を見させていただきますね。
        {IS_DEMO ? `それでは、また${DEMO_MONTHS}ヶ月後にご挨拶に伺います。` : "また折を見てご挨拶に伺います。"}
      </TalkBox>
      <Btn onClick={() => setScreen("hub")}>経営を始める →</Btn>
    </Shell>
  );

  // ═══════════════════ 今月の出来事（イベント受信箱） ═══════════════════
  if (screen === "events") {
    const item = g.inbox[inboxIdx];
    // 受信箱が空でこの画面に来た場合の保険。ここで routeAfterMonth を呼ぶと
    // レンダー中に setState することになるので、ボタンとして出す。
    if (!item) return (
      <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
        <Btn onClick={() => routeAfterMonth(g)}>本社に戻る →</Btn>
      </Shell>
    );
    const Avatar = item.who?.startsWith("志村") ? Shimura : item.who?.startsWith("剱持") ? Banker : item.who === "母" ? Mother : Staff;
    return (
      <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">{item.title ?? "お知らせ"}</span>
          <span className="text-sm text-stone-500">{g.month}ヶ月目</span>
        </div>
        <div className="text-center pt-4"><Avatar size={80} /></div>
        <TalkBox name={item.who} avatar={<Avatar size={52} />}>{item.text}</TalkBox>
        {item.storeName && <div className="text-[12px] text-stone-400 text-center">（{item.storeName}）</div>}
        {item.kind === "omen" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2 text-[13px] text-amber-800">
            まだ何か起きたわけではありません。ただ、備えておく時間はありそうです。
          </div>
        )}
        <Btn onClick={() => {
          if (inboxIdx + 1 < g.inbox.length) setInboxIdx(inboxIdx + 1);
          else routeAfterMonth(g);
        }}>
          {inboxIdx + 1 < g.inbox.length ? "次へ →" : "本社に戻る →"}
        </Btn>
      </Shell>
    );
  }

  // ═══════════════════ ハブ（本社） ═══════════════════
  if (screen === "hub") {
    const showDash = g.chapter >= 2 && g.history.length > 0;
    const storeHasNews = !g.seenBaseline
      || (!g.seenStaffEvent && g.month > g.baselineMonth)
      || (!g.seenPromo && g.seenStaffEvent && g.month > g.staffEventMonth);
    const taxHasNews = g.pendingReflections.some(r => g.month > r.month)
      || !(g.lessonsRead.length >= TAX_TOPICS.length || g.readThisMonth >= READS_PER_MONTH);
    return (
      <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">本社</span>
          <span className="text-sm text-stone-500">
            {g.month}ヶ月目<span className="text-stone-300 ml-1.5 text-xs">{CHAPTER_LABEL[g.chapter]}</span>
          </span>
        </div>

        {showDash ? (
          <div className="mt-2">
            <Dashboard g={g} derivedVals={d} expandedStore={expandedStore} setExpandedStore={setExpandedStore}
              pendingList={pendingList} compact={g.chapter < 3} />
          </div>
        ) : (
          <div className="text-center pt-3"><Player size={64} mood={g.cash < 500000 ? "worried" : "normal"} gender={g.gender} /></div>
        )}

        <div className="flex flex-col gap-2 mt-3">
          {g.chapter >= 2 && (
            <LocationCard icon="🎯" title="施策を打つ" subtitle="自分から手を打つ" onClick={() => { setActionResult(null); setScreen("actions"); }} />
          )}
          <LocationCard icon="🏠" title={g.stores.length > 1 && g.chapter >= 3 ? "店舗を見る" : STORE_NAME} subtitle="現場の様子を見る" onClick={goStore} muted={!storeHasNews} />
          <LocationCard icon="📋" title="志村公認会計士・税理士事務所" subtitle="決算書を見る・経営の話を相談する" onClick={goTax} muted={!taxHasNews} />
          {g.chapter >= 3 && (
            <LocationCard icon="🏦" title={BANK_NAME} subtitle="返済の状況を確かめる" onClick={() => setScreen("bankVisit")} />
          )}
          <LocationCard icon="👩" title="母に相談する" subtitle="困ったときのヒント" onClick={() => setScreen("mother")} />
          <LocationCard icon="📔" title="ノートを見返す" subtitle="これまで分かったことを振り返る" onClick={() => { setNoteOpenKey(null); setScreen("notebook"); }} />
        </div>

        {g.history.length === 0 && (
          <div className="text-[12px] text-stone-400 text-center mt-2">まずは本店の様子を見に行ってみましょう</div>
        )}

        <Btn onClick={advanceMonth}>今月の営業を締めて、次の月へ →</Btn>
      </Shell>
    );
  }

  // ═══════════════════ 施策メニュー ═══════════════════
  if (screen === "actions") {
    if (actionResult) {
      return (
        <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
          <div className="text-center pt-4"><Staff size={72} /></div>
          <TalkBox name="店長" avatar={<Staff size={52} />}>
            承知しました。「{actionResult.label}」ですね。さっそく取りかかります。
          </TalkBox>
          <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500">
            結果はまた来月以降、志村さんのところで一緒に確かめましょう。
            {actionResult.delayed && <><br />※効果が出るまで少し時間がかかります。</>}
          </div>
          <Btn onClick={() => { setActionResult(null); setScreen("hub"); }}>← 本社に戻る</Btn>
        </Shell>
      );
    }
    return (
      <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">施策を打つ</span>
          <span className="text-sm text-stone-500">{g.month}ヶ月目</span>
        </div>
        <div className="mt-3">
          <ActionMenu g={g} selectedStore={actionStore} setSelectedStore={setActionStore}
            onRun={(a, store) => {
              setG(prev => runAction(prev, a.id, store?.id));
              setActionResult({ label: a.label, delayed: !!a.delayedPatch });
            }}
            onBack={() => setScreen("hub")} />
        </div>
      </Shell>
    );
  }

  // ═══════════════════ 店舗 ═══════════════════
  if (screen === "store") {
    // 第1〜2章の物語イベントは本店で起きる。第3章では店舗を選んで見に行ける。
    const storyMode = storeMode === "baseline" || storeMode === "staffEvent" || storeMode === "promo";
    const honten = (storyMode ? g.stores[0] : (storeById(g, activeStoreId) ?? g.stores[0]));
    const hontenNow = deriveStore(honten, g.effects, g.month);
    const baselineAskedAll = g.baselineAsked.length === BASELINE_QUESTIONS.length;
    const askedAll = g.staffAsked.length === STAFF_QUESTIONS.length;
    const promoAskedAll = g.promoAsked.length === PROMO_QUESTIONS.length;
    const findRes = (h) => h?.storeResults?.find(r => r.id === honten.id) ?? null;
    const lastH = g.history.length ? findRes(g.history[g.history.length - 1]) : null;
    const prevH = g.history.length >= 2 ? findRes(g.history[g.history.length - 2]) : null;
    const utilization = Math.round((Math.min(hontenNow.demand, hontenNow.capacity) / hontenNow.capacity) * 100);
    const lastUtil = lastH ? Math.round((lastH.customers / lastH.capacity) * 100) : null;

    return (
      <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">{honten.name}</span>
          <span className="text-sm text-stone-500">{g.month}ヶ月目</span>
        </div>

        {/* 第3章では店舗を選んで見に行ける（物語イベント中は本店に固定） */}
        {!storyMode && g.chapter >= 3 && g.stores.length > 1 && (
          <div className="flex gap-2 mt-2">
            {g.stores.map(s => (
              <button key={s.id} onClick={() => setActiveStoreId(s.id)}
                className={"px-3 py-1.5 rounded-lg text-[13px] border " +
                  (s.id === honten.id ? "bg-amber-700 text-white border-amber-700" : "bg-white text-stone-600 border-stone-200")}>
                {s.name.replace("サロン・ドゥ・フルール ", "")}
              </button>
            ))}
          </div>
        )}

        {lastH && storeMode !== "baseline" && (
          <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">先月（{g.month - 1}ヶ月目）の実績<span className="text-stone-400">（）内は前月比</span></div>
            <StatRow label="客数" val={`${lastH.customers}人`} diff={prevH ? `（${signedNum(lastH.customers - prevH.customers, "人")}）` : ""} />
            <StatRow label="客単価" val={yen(lastH.unitPrice)} diff={prevH ? `（${signedYen(lastH.unitPrice - prevH.unitPrice)}）` : ""} />
            <StatRow label="売上（客数×客単価）" val={yen(lastH.sales)} bold diff={prevH ? `（${signedYen(lastH.sales - prevH.sales)}）` : ""} />
          </div>
        )}

        {storeMode !== "baseline" && (
          <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">お店の今の状態<span className="text-stone-400">（）内は先月の値</span></div>
            <StatRow label="👥 スタイリスト数" val={`${honten.staffCount}人`} diff={lastH ? `（${lastH.staffCount}人）` : ""} />
            <StatRow label="⏱ 一人あたり接客時間" val={`${hontenNow.serviceHours.toFixed(2)}時間`} diff={lastH ? `（${lastH.serviceHours.toFixed(2)}時間）` : ""} />
            <StatRow label="📐 対応可能人数（上限）" val={`${hontenNow.capacity}人/月`} diff={lastH ? `（${lastH.capacity}人）` : ""} />
            <StatRow label="🙋 潜在需要（来たいお客様）" val={`${hontenNow.demand}人/月`} red={hontenNow.demand > hontenNow.capacity} diff={lastH ? `（${lastH.demand}人）` : ""} />
            <StatRow label="📊 稼働率（需要÷上限）" val={`${utilization}%`} red={utilization >= 100} diff={lastUtil !== null ? `（${lastUtil}%）` : ""} />
          </div>
        )}

        {storeMode === "baseline" && (
          <>
            <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} />}>
              まだ営業を始めたばかりですね。まずはお店の状況を聞いてみましょうか。
            </TalkBox>
            <div className="flex flex-col gap-2 mt-2">
              {BASELINE_QUESTIONS.map(q => (
                g.baselineAsked.includes(q.key)
                  ? <TalkBox key={q.key} name="チーフスタイリスト" avatar={<Staff size={44} />}>{q.a}</TalkBox>
                  : <button key={q.key} onClick={() => patch({ baselineAsked: [...g.baselineAsked, q.key] })}
                      className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">{q.q}</button>
              ))}
            </div>
            {baselineAskedAll && (
              <>
                <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} />}>これで一通り、お店の状況が分かりましたね。</TalkBox>
                <button onClick={() => patch({ seenBaseline: true, baselineMonth: g.month })} className="text-[13px] text-amber-700 mt-2 block ml-auto">わかった →</button>
              </>
            )}
          </>
        )}

        {storeMode === "recap" && (
          <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200 text-sm text-stone-600">
            特に変わったことはなく、スタッフたちが元気にお店を切り盛りしています。損益など詳しい数字は志村さんの事務所へ。
          </div>
        )}

        {storeMode === "staffEvent" && (
          <>
            <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} />}>
              {g.staffEventChoice === null && <>お客様からの要望も多いんです。<b>トリートメントメニュー</b>、始めてみませんか？</>}
              {g.staffEventChoice === "hire" && <>ありがとうございます！さっそく準備してみますね。</>}
              {g.staffEventChoice === "reckless" && <>分かりました、このまま始めてみますね。</>}
              {g.staffEventChoice === "hold" && <>そうですか。また考えが変わったら言ってください。</>}
            </TalkBox>

            {g.staffEventChoice === null && !staffQAOpen && !staffDecisionOpen && (
              <div className="flex flex-col gap-2 mt-2">
                <Btn onClick={() => setStaffDecisionOpen(true)}>やってみる →</Btn>
                <button onClick={() => setStaffQAOpen(true)} className="text-[13px] text-amber-700 mt-1 block ml-auto">質問する</button>
              </div>
            )}

            {g.staffEventChoice === null && staffQAOpen && (
              <>
                <div className="flex flex-col gap-2 mt-2">
                  {STAFF_QUESTIONS.map(q => (
                    g.staffAsked.includes(q.key)
                      ? <TalkBox key={q.key} name="チーフスタイリスト" avatar={<Staff size={44} />}>{q.a}</TalkBox>
                      : <button key={q.key} onClick={() => patch({ staffAsked: [...g.staffAsked, q.key] })}
                          className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">{q.q}</button>
                  ))}
                </div>
                <button onClick={() => setStaffQAOpen(false)} className="text-[13px] text-amber-700 mt-2 block ml-auto">← 戻る</button>
              </>
            )}

            {g.staffEventChoice === null && staffDecisionOpen && (
              <>
                {!askedAll && (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500">
                    まだ詳しく聞いていないので、判断材料が少ない状態です。このまま決めることもできますが、先に「質問する」で状況を聞いておくと安心です。
                  </div>
                )}
                <div className="text-[12px] text-stone-400 mt-1">迷ったら志村先生（公認会計士・税理士）に相談してみるのもいいかもしれません。</div>
                <div className="flex flex-col gap-2 mt-2">
                  <button onClick={() => chooseStaffEvent("hire")} className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">
                    スタッフを1人増やして始める {askedAll && <span className="text-stone-400">（人件費 +{manYen(TREATMENT.hireWage)}/月）</span>}
                  </button>
                  <button onClick={() => chooseStaffEvent("reckless")} className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">
                    人を増やさずにそのまま始めてみる
                  </button>
                  <button onClick={() => chooseStaffEvent("hold")} className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">
                    今回は見送る
                  </button>
                </div>
                <button onClick={() => setStaffDecisionOpen(false)} className="text-[13px] text-amber-700 mt-2 block ml-auto">← 戻る</button>
              </>
            )}

            {g.staffEventChoice !== null && (
              <>
                {g.staffEventChoice !== "hold" && (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500">結果はまた来月、詳しく教えますね。</div>
                )}
                <button onClick={() => patch({ seenStaffEvent: true, staffEventMonth: g.staffEventMonth ?? g.month })} className="text-[13px] text-amber-700 mt-2 block ml-auto">わかった →</button>
              </>
            )}
          </>
        )}

        {storeMode === "promo" && (
          <>
            <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} />}>
              {g.promoChoice === null && <>近くの美容室が<b>新規客向けのクーポン</b>を配ってるみたいで、うちもやってみませんか？</>}
              {g.promoChoice === "run" && <>ありがとうございます！さっそく配ってみますね。</>}
              {g.promoChoice === "hold" && <>そうですか。また考えが変わったら言ってください。</>}
            </TalkBox>

            {g.promoChoice === null && !promoQAOpen && !promoDecisionOpen && (
              <div className="flex flex-col gap-2 mt-2">
                <Btn onClick={() => setPromoDecisionOpen(true)}>やってみる →</Btn>
                <button onClick={() => setPromoQAOpen(true)} className="text-[13px] text-amber-700 mt-1 block ml-auto">質問する</button>
              </div>
            )}

            {g.promoChoice === null && promoQAOpen && (
              <>
                <div className="flex flex-col gap-2 mt-2">
                  {PROMO_QUESTIONS.map(q => (
                    g.promoAsked.includes(q.key)
                      ? <TalkBox key={q.key} name="チーフスタイリスト" avatar={<Staff size={44} />}>{q.a}</TalkBox>
                      : <button key={q.key} onClick={() => patch({ promoAsked: [...g.promoAsked, q.key] })}
                          className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">{q.q}</button>
                  ))}
                </div>
                <button onClick={() => setPromoQAOpen(false)} className="text-[13px] text-amber-700 mt-2 block ml-auto">← 戻る</button>
              </>
            )}

            {g.promoChoice === null && promoDecisionOpen && (
              <>
                {!promoAskedAll && (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500">
                    まだ詳しく聞いていないので、判断材料が少ない状態です。このまま決めることもできますが、先に「質問する」で状況を聞いておくと安心です。
                  </div>
                )}
                <div className="text-[12px] text-stone-400 mt-1">迷ったら志村先生（公認会計士・税理士）に相談してみるのもいいかもしれません。</div>
                <div className="flex flex-col gap-2 mt-2">
                  <button onClick={() => choosePromo("run")} className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">クーポンを配布してみる</button>
                  <button onClick={() => choosePromo("hold")} className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">今回は見送る</button>
                </div>
                <button onClick={() => setPromoDecisionOpen(false)} className="text-[13px] text-amber-700 mt-2 block ml-auto">← 戻る</button>
              </>
            )}

            {g.promoChoice !== null && (
              <>
                {g.promoChoice !== "hold" && (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500">結果はまた来月、詳しく教えますね。</div>
                )}
                <button onClick={() => patch({ seenPromo: true })} className="text-[13px] text-amber-700 mt-2 block ml-auto">わかった →</button>
              </>
            )}
          </>
        )}

        <Btn onClick={() => setScreen("hub")}>← 本社に戻る</Btn>
      </Shell>
    );
  }

  // ═══════════════════ 志村事務所 ═══════════════════
  if (screen === "tax") {
    const prev = g.history.length >= 2 ? g.history[g.history.length - 2] : null;
    const historyAt = (m, sid) => { const h = g.history.find(x => x.m === m); return h ? h.storeResults.find(r => r.id === sid) : null; };

    // 振り返り待ちのうち、翌月以降になったものを1件だけ処理する
    const pend = g.pendingReflections.find(r => g.month > r.month
      && historyAt(r.month, r.storeId) && historyAt(r.month - 1, r.storeId));
    const before = pend ? historyAt(pend.month - 1, pend.storeId) : null;
    const after = pend ? historyAt(pend.month, pend.storeId) : null;
    const reflection = pend ? buildReflection(pend.kind, before, after, pend.label) : null;
    const finishReflection = () => {
      setG(p => ({ ...p, pendingReflections: p.pendingReflections.filter(r => r !== pend) }));
      setReflectStep(0); setReflectAnswer(null);
    };

    if (taxMode === "menu") return (
      <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">志村公認会計士・税理士事務所</span>
          <span className="text-sm text-stone-500">{g.month}ヶ月目</span>
        </div>
        <div className="text-center pt-3"><Shimura size={72} /></div>

        {reflection && (
          <>
            <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
              先月、{pend.kind === "hire" ? "スタッフを増やしてトリートメントを始めましたね" :
                pend.kind === "reckless" ? "増員せずにトリートメントを始めましたね" :
                pend.kind === "promo" ? "新規客クーポンを配りましたね" :
                `「${pend.label}」を実行しましたね`}。数字を一緒に振り返ってみましょう。
            </TalkBox>

            {reflectStep < reflection.steps.length ? (
              <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
                <div className="text-sm text-stone-700 mb-2">{reflection.steps[reflectStep].q}</div>
                {reflectAnswer === null ? (
                  <div className="flex flex-col gap-2">
                    {reflection.steps[reflectStep].choices.map(c => (
                      <button key={c.key} onClick={() => setReflectAnswer(c.key)}
                        className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">{c.label}</button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className={"text-[13px] font-medium " + (reflectAnswer === reflection.steps[reflectStep].correct ? "text-green-700" : "text-red-600")}>
                      {reflectAnswer === reflection.steps[reflectStep].correct ? "正解です！" : "実は違いました。"}
                    </div>
                    <div className="text-[13px] text-stone-600 mt-1 leading-relaxed">{reflection.steps[reflectStep].reveal}</div>
                    <button onClick={() => { setReflectStep(s => s + 1); setReflectAnswer(null); }}
                      className="text-[13px] text-amber-700 mt-2 block ml-auto">次へ →</button>
                  </>
                )}
              </div>
            ) : (
              <>
                <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>{reflection.summary}</TalkBox>
                <button onClick={finishReflection} className="text-[13px] text-amber-700 mt-2 mb-1 block ml-auto">わかった →</button>
              </>
            )}
          </>
        )}

        {!reflection && (
          <>
            <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
              ようこそ。決算書を見ますか？　それとも、何か相談したいことがありますか？
            </TalkBox>
            <div className="flex flex-col gap-2 mt-3">
              <LocationCard icon="📊" title="決算書を見る" subtitle="損益計算書・貸借対照表を確認する" onClick={() => setTaxMode("statements")} />
              <LocationCard icon="💬" title="相談する" subtitle="経営の話をいろいろ聞く" onClick={() => setTaxMode("qa")} />
              <LocationCard icon="💴" title="役員報酬を見直す" subtitle="社長の報酬を変えると数字がどう動くか" onClick={() => setTaxMode("draw")} />
            </div>
          </>
        )}
        <Btn onClick={() => setScreen("hub")}>← 事務所を出る</Btn>
      </Shell>
    );

    if (taxMode === "draw") {
      const sim = calcMonth({ loanBalance: g.loanBalance, executiveComp: g.draw, stores: g.stores, effects: g.effects, month: g.month });
      return (
        <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">役員報酬の見直し</span>
            <span className="text-sm text-stone-500">{g.month}ヶ月目</span>
          </div>
          <div className="text-center pt-3"><Shimura size={64} /></div>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
            社長の役員報酬は<b>会社の経費</b>です。スライダーを動かすと、来月の決算書と現金がどう変わるか試算できますよ。
          </TalkBox>
          <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
            <div className="flex justify-between text-sm text-stone-600">
              <span>役員報酬（月額）</span><span className="font-medium">{yen(g.draw)}</span>
            </div>
            <input type="range" min={DRAW_MIN} max={DRAW_MAX} step={DRAW_STEP} value={g.draw}
              onChange={e => patch({ draw: parseInt(e.target.value) })} className="w-full mt-1" />
            <div className="flex justify-between text-[13px] text-stone-400"><span>切り詰める</span><span>父の代の水準</span></div>
          </div>
          <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">この報酬にした場合の来月の試算</div>
            <MoneyRow label="当期純利益" cur={sim.netProfit} red={sim.netProfit < 0} showDiff={false} />
            <MoneyRow label="現金の増減" cur={sim.cashChange} red={sim.cashChange < 0} showDiff={false} />
            <div className="text-[12px] text-stone-500 mt-2 leading-relaxed">
              {sim.netProfit > 0 && sim.cashChange < 0
                ? <><b className="text-amber-700">利益は出ているのに現金は減っています。</b>元本返済がPLに出ないためです（＝利益とお金は別物）。報酬を下げると現金の減りが和らぎます。</>
                : sim.netProfit <= 0
                  ? <>この報酬だと<b className="text-red-600">赤字</b>です。報酬を下げると黒字に近づきます。</>
                  : <>この報酬なら利益も現金も増えます。ただし社長の生活費とのバランスも大切です。</>}
            </div>
          </div>
          <div className="text-[11px] text-stone-400 mt-2 leading-relaxed">
            ※本来、役員報酬は期の途中で自由に変えられません（<b>定期同額給与</b>。原則、期首から3ヶ月以内に決めて1年間同額）。
            ここでは学習のため、いつでも見直せるようにしています。
          </div>
          <Btn onClick={() => setTaxMode("menu")}>← この報酬で決定する</Btn>
        </Shell>
      );
    }

    if (taxMode === "statements") {
      const PL_FIELDS = ["sales", "cogs", "gross", "rent", "labor", "executiveComp", "otherFixed", "depreciation", "operating", "interest", "ordinary", "extraordinaryLoss", "netProfit"];
      const cumulative = g.history.reduce((acc, h) => { PL_FIELDS.forEach(f => { acc[f] = (acc[f] || 0) + (h[f] ?? 0); }); return acc; }, {});
      const last = g.history[g.history.length - 1];
      const plSource = plViewMode === "month" ? last : cumulative;
      const plPrev = (f) => plViewMode === "month" ? (prev ? prev[f] : null) : null;
      const showDiff = plViewMode === "month";
      const canSegment = g.chapter >= 2 && g.stores.length > 1;

      return (
        <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">決算書</span>
            <span className="text-sm text-stone-500">{g.month}ヶ月目</span>
          </div>

          {g.history.length === 0 && (
            <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200 text-sm text-stone-600">
              まだ今月の実績はありません。まずは経営してみましょう。
            </div>
          )}

          {canSegment && last && (
            <div className="flex gap-1 text-[11px] mt-3">
              <button onClick={() => setPlScope("company")}
                className={"px-2.5 py-1 rounded-full border " + (plScope === "company" ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-500 bg-white")}>全社</button>
              <button onClick={() => setPlScope("segment")}
                className={"px-2.5 py-1 rounded-full border " + (plScope === "segment" ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-500 bg-white")}>店舗別</button>
            </div>
          )}

          {last && plScope === "segment" && canSegment && (
            <div className="mt-2">
              <div className="text-xs text-stone-500 mb-1.5">先月（{g.month - 1}ヶ月目）の店舗別損益</div>
              <SegmentPL result={last} stores={g.stores} />
              <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200 text-[12.5px] text-stone-600 leading-relaxed">
                店舗の列は<b>本社経費を負担する前</b>で止めています。役員報酬も利息も、店舗が生み出したものではないからです。
                赤字の店を見つけても、すぐ閉めると決めないでください。閉めたときに<b>本当に消えるコストはどれか</b>——
                人を辞めさせず異動させるなら人件費は会社に残りますし、本社経費は店を閉めても消えません。
              </div>
            </div>
          )}

          {last && plScope === "company" && (
            <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-stone-500">
                  {plViewMode === "month" ? `先月（${g.month - 1}ヶ月目）の損益計算書` : `累計（${g.history.length}ヶ月間）の損益計算書`}
                </div>
                <div className="flex gap-1 text-[11px]">
                  <button onClick={() => setPlViewMode("month")}
                    className={"px-2 py-0.5 rounded-full border " + (plViewMode === "month" ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-500")}>単月</button>
                  <button onClick={() => setPlViewMode("cumulative")}
                    className={"px-2 py-0.5 rounded-full border " + (plViewMode === "cumulative" ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-500")}>累計</button>
                </div>
              </div>
              {showDiff && <div className="text-[11px] text-stone-400 mb-1">（）内は前月比</div>}
              <MoneyRow label="売上高" cur={plSource.sales} prev={plPrev("sales")} showDiff={showDiff} />
              <MoneyRow label="売上原価" cur={plSource.cogs} prev={plPrev("cogs")} showDiff={showDiff} negative />
              <div className="border-t border-stone-300 my-1" />
              <MoneyRow label="売上総利益" cur={plSource.gross} prev={plPrev("gross")} showDiff={showDiff} bold />
              <MoneyRow label="家賃" cur={plSource.rent} prev={plPrev("rent")} showDiff={showDiff} negative />
              <MoneyRow label="人件費" cur={plSource.labor} prev={plPrev("labor")} showDiff={showDiff} negative />
              <MoneyRow label="役員報酬" cur={plSource.executiveComp} prev={plPrev("executiveComp")} showDiff={showDiff} negative />
              <MoneyRow label="その他固定費" cur={plSource.otherFixed} prev={plPrev("otherFixed")} showDiff={showDiff} negative />
              <MoneyRow label="減価償却費" cur={plSource.depreciation} prev={plPrev("depreciation")} showDiff={showDiff} negative />
              <div className="border-t border-stone-300 my-1" />
              <MoneyRow label="営業利益" cur={plSource.operating} prev={plPrev("operating")} showDiff={showDiff} bold red={plSource.operating < 0} />
              <MoneyRow label="支払利息" cur={plSource.interest} prev={plPrev("interest")} showDiff={showDiff} negative />
              <div className="border-t border-stone-300 my-1" />
              <MoneyRow label="経常利益" cur={plSource.ordinary} prev={plPrev("ordinary")} showDiff={showDiff} bold red={plSource.ordinary < 0} />
              {(plSource.extraordinaryLoss ?? 0) > 0 && (
                <>
                  <MoneyRow label="特別損失" cur={plSource.extraordinaryLoss} showDiff={false} negative red />
                  <div className="text-[11.5px] text-stone-500 leading-relaxed mt-1 mb-1 bg-amber-50 border border-amber-200 rounded p-2">
                    特別損失は、災害や設備の除却のような<b>その期かぎりの出来事</b>です。経常利益までが本業の実力で、
                    最終赤字でも経常利益が黒字なら、稼ぐ力そのものは落ちていません。
                  </div>
                </>
              )}
              <div className="border-t border-stone-300 my-1" />
              <MoneyRow label="当期純利益" cur={plSource.netProfit} prev={plPrev("netProfit")} showDiff={showDiff} bold red={plSource.netProfit < 0} />
              <PLDiagram cogs={plSource.cogs}
                sga={plSource.rent + plSource.labor + plSource.executiveComp + plSource.otherFixed + plSource.depreciation}
                interest={plSource.interest} sales={plSource.sales}
                extraordinaryLoss={plSource.extraordinaryLoss ?? 0} />
            </div>
          )}

          {last && plScope === "company" && (() => {
            const prevAccumDep = d.accumDep - last.depreciation;
            const prevRetained = d.retainedEarnings - last.netProfit;
            const prevFixedBook = Math.max(0, FIXED_ASSETS - prevAccumDep);
            const pCash = g.cash - last.cashChange;
            const prevLoan = g.loanBalance + last.principal;
            return (
              <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
                <div className="text-xs text-stone-500 mb-1">貸借対照表（簡易版）</div>
                <div className="text-[11px] text-stone-400 mb-1">（）内は前月比</div>
                <MoneyRow label="現金" cur={g.cash} prev={pCash} />
                <MoneyRow label="固定資産（什器・敷金など）" cur={d.fixedAssetsBook} prev={prevFixedBook} />
                <div className="border-t border-stone-300 my-1" />
                <MoneyRow label="資産合計" cur={d.totalAssets} prev={pCash + prevFixedBook} bold />
                <div className="mt-2" />
                <MoneyRow label="借入金" cur={g.loanBalance} prev={prevLoan} />
                <div className="border-t border-stone-300 my-1" />
                <MoneyRow label="負債合計" cur={g.loanBalance} prev={prevLoan} bold />
                <div className="mt-2" />
                <MoneyRow label="資本金" cur={CAPITAL_STOCK} prev={CAPITAL_STOCK} />
                <MoneyRow label="利益剰余金" cur={d.retainedEarnings} prev={prevRetained} red={d.retainedEarnings < 0} />
                <div className="border-t border-stone-300 my-1" />
                <MoneyRow label="純資産合計" cur={d.totalEquity} prev={CAPITAL_STOCK + prevRetained} bold />
                <div className="border-t border-stone-300 my-1" />
                <MoneyRow label="負債・純資産合計" cur={g.loanBalance + d.totalEquity} prev={prevLoan + CAPITAL_STOCK + prevRetained} bold />
                <BSDiagram totalAssets={d.totalAssets} liabilities={g.loanBalance} equity={d.totalEquity} ratio={d.equityRatio} />
                <div className="border-t border-stone-200 my-3" />
                <div className="text-xs text-stone-500 mb-1">現金はこう動いた</div>
                <MoneyRow label="当期純利益" cur={last.netProfit} showDiff={false} />
                <MoneyRow label="減価償却費（現金は減らない）" cur={last.depreciation} showDiff={false} />
                <MoneyRow label="銀行への元本返済（PLには出ない）" cur={last.principal} negative red showDiff={false} />
                {(last.capex ?? 0) > 0 && (
                  <MoneyRow label="設備投資（費用ではなく資産）" cur={last.capex} negative red showDiff={false} />
                )}
                <div className="border-t border-stone-200 my-1" />
                <MoneyRow label="現金の増減" cur={last.cashChange - (last.capex ?? 0)} bold red={last.cashChange - (last.capex ?? 0) < 0} showDiff={false} />
                <div className="text-[12px] text-stone-500 mt-2 leading-relaxed">
                  銀行への返済のうち「元本」はPL（損益計算書）には出てきません。利息だけが費用として計上されます。
                  だから利益が出ていても、元本の返済の分だけ現金は減っていくんです（逆に減価償却費は、PL上は費用でも現金は減りません）。
                </div>
              </div>
            );
          })()}

          <Btn onClick={() => setTaxMode("menu")}>← 戻る</Btn>
        </Shell>
      );
    }

    // taxMode === "qa"
    const nextIndex = g.lessonsRead.length;
    const capReached = g.readThisMonth >= READS_PER_MONTH;
    const readSet = new Set(g.lessonsRead);
    const visibleCount = Math.min(nextIndex + 1, TAX_TOPICS.length);
    const visibleTopics = TAX_TOPICS.slice(0, visibleCount);
    const selected = TAX_TOPICS.find(t => t.key === taxTopic);
    const lockedRemaining = TAX_TOPICS.length - visibleCount;
    const ctx = {
      totalAssets: d.totalAssets, liabilities: g.loanBalance, equity: d.totalEquity, ratio: d.equityRatio,
      lastResult: g.history[g.history.length - 1] ?? null,
      honten: deriveStore(g.stores[0], g.effects, g.month), seenBaseline: g.seenBaseline,
    };
    const openTopic = (topic, isNew) => {
      if (isNew) patch({ lessonsRead: [...g.lessonsRead, topic.key], readThisMonth: g.readThisMonth + 1 });
      setTaxTopic(topic.key);
    };

    return (
      <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">志村さんに相談</span>
          <span className="text-sm text-stone-500">今月あと{Math.max(0, READS_PER_MONTH - g.readThisMonth)}件</span>
        </div>
        <div className="text-center pt-3"><Shimura size={64} /></div>

        {!selected && (
          <>
            <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>何でも聞いてください。</TalkBox>
            <div className="flex flex-col gap-2 mt-3">
              {visibleTopics.map((t, i) => {
                const isRead = readSet.has(t.key);
                const isNext = i === nextIndex;
                if (!isRead && isNext && capReached) {
                  return <div key={t.key} className="bg-stone-100 border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-stone-400">🔒 {t.label}（今月はここまで。また来月）</div>;
                }
                return (
                  <button key={t.key} onClick={() => openTopic(t, !isRead)}
                    className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400 flex items-center justify-between">
                    <span>{t.label}</span>{isRead && <span className="text-green-600 text-xs ml-2">✓</span>}
                  </button>
                );
              })}
            </div>
            {lockedRemaining > 0 && <div className="text-[12px] text-stone-400 text-center mt-2">まだ他にも聞きたいことが出てくるかもしれません（残り{lockedRemaining}件）</div>}
          </>
        )}

        {selected && (
          <>
            <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
              {typeof selected.answer === "function" ? selected.answer(ctx) : selected.answer}
            </TalkBox>
            <button onClick={() => setTaxTopic(null)} className="text-[13px] text-amber-700 mt-2 block ml-auto">他の質問をする</button>
          </>
        )}

        <Btn onClick={() => setTaxMode("menu")}>← 戻る</Btn>
      </Shell>
    );
  }

  // ═══════════════════ ノート ═══════════════════
  if (screen === "notebook") {
    const knownBaseline = BASELINE_QUESTIONS.filter(q => g.baselineAsked.includes(q.key));
    const knownMenu = STAFF_QUESTIONS.filter(q => g.staffAsked.includes(q.key));
    const readTopics = g.lessonsRead.map(k => TAX_TOPICS.find(t => t.key === k)).filter(Boolean);
    const nothingYet = knownBaseline.length === 0 && knownMenu.length === 0 && readTopics.length === 0 && g.history.length === 0;
    const hontenNote = g.seenBaseline ? deriveStore(g.stores[0], g.effects, g.month) : null;
    const ctx = {
      totalAssets: d.totalAssets, liabilities: g.loanBalance, equity: d.totalEquity, ratio: d.equityRatio,
      lastResult: g.history[g.history.length - 1] ?? null, honten: hontenNote, seenBaseline: g.seenBaseline,
    };
    const toggle = (key) => setNoteOpenKey(k => (k === key ? null : key));

    return (
      <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">ノート</span>
          <span className="text-sm text-stone-500">{g.month}ヶ月目</span>
        </div>

        {nothingYet && (
          <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200 text-sm text-stone-600">
            まだ何もメモがありません。お店や志村さんのところで、いろいろ聞いてみましょう。
          </div>
        )}

        {knownBaseline.length > 0 && (
          <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">📌 お店について分かっていること</div>
            {knownBaseline.map(q => <Row key={q.key} label={q.q.replace("を聞く", "")} val={q.a} />)}
          </div>
        )}

        {hontenNote && (
          <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">📌 本店の数字（売上の因数分解）</div>
            <div className="text-[13px] text-stone-600 leading-relaxed">
              売上 ＝ <b>客数</b> × <b>客単価</b><br />客数は「対応可能人数（上限）」で頭打ちになる：
            </div>
            <div className="mt-1">
              <Row label="対応可能人数（上限）" val={`${hontenNote.capacity}人/月`} />
              <Row label="潜在需要" val={`${hontenNote.demand}人/月`} />
              <Row label="実際の客数 ＝ min(需要, 上限)" val={`${hontenNote.customers}人/月`} />
              <Row label="客単価" val={yen(hontenNote.unitPrice)} />
            </div>
            <div className="text-[12px] text-stone-400 mt-1">上限＝スタッフ数×営業時間×日数÷一人あたり接客時間</div>
          </div>
        )}

        {knownMenu.length > 0 && (
          <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">📌 新メニューの相談で聞いたこと</div>
            {knownMenu.map(q => <Row key={q.key} label={q.q.replace("を聞く", "")} val={q.a} />)}
            {g.staffEventChoice && (
              <div className="text-sm text-stone-600 mt-1 pt-1 border-t border-stone-100">
                決めたこと：{g.staffEventChoice === "hire" && "スタッフを1人増やして始めた"}
                {g.staffEventChoice === "reckless" && "人を増やさずにそのまま始めた"}
                {g.staffEventChoice === "hold" && "今回は見送った"}
              </div>
            )}
          </div>
        )}

        {g.actionLog.length > 0 && (
          <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">📌 打ってきた手</div>
            {g.actionLog.slice().reverse().map((a, i) => (
              <Row key={i} label={`${a.month}ヶ月目`} val={a.label} />
            ))}
          </div>
        )}

        {g.history.length > 0 && (
          <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">📌 利益とキャッシュについて</div>
            <div className="text-sm text-stone-600 leading-relaxed">
              銀行への返済のうち「元本」はPL（損益計算書）には出てこない。利息だけが費用として計上される。だから利益が出ていても、元本の返済の分だけ現金は減っていく。
            </div>
          </div>
        )}

        {readTopics.length > 0 && (
          <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">📌 志村さんに教わったこと</div>
            <div className="flex flex-col gap-1.5">
              {readTopics.map(t => (
                <div key={t.key}>
                  <button onClick={() => toggle(t.key)} className="w-full text-left text-sm text-stone-700 py-1 flex items-center justify-between">
                    <span>{t.label}</span><span className="text-stone-400 text-xs">{noteOpenKey === t.key ? "▲" : "▼"}</span>
                  </button>
                  {noteOpenKey === t.key && (
                    <div className="text-sm text-stone-600 leading-relaxed pb-2 pl-1">
                      {typeof t.answer === "function" ? t.answer(ctx) : t.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Btn onClick={() => setScreen("hub")}>← 本社に戻る</Btn>
      </Shell>
    );
  }

  // ═══════════════════ 母 ═══════════════════
  if (screen === "mother") return (
    <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
      <div className="text-center pt-4"><Mother size={80} /></div>
      <TalkBox name="母" avatar={<Mother size={52} />}>{motherMessage()}</TalkBox>
      <Btn onClick={() => setScreen("hub")}>← 本社に戻る</Btn>
    </Shell>
  );

  // ═══════════════════ 卒業（母からの一言） ═══════════════════
  if (screen === "graduation") return (
    <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
      <div className="text-center pt-6"><Mother size={80} /></div>
      <h2 className="text-lg font-medium text-stone-800 text-center mt-2">一年が過ぎて</h2>
      <TalkBox name="母" avatar={<Mother size={52} />}>
        あんた、そろそろ慣れてきたみたいね。お父さんも最初の1年は、毎晩帳簿とにらめっこしてたわ。
      </TalkBox>
      <TalkBox name="母" avatar={<Mother size={52} />}>
        ……ここから先は、思うようにやってみたら？　私はもう、口を出さないから。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <div className="text-xs text-stone-500 mb-1">この一年でできるようになったこと</div>
        {grad.required.map(r => <Row key={r.key} label={r.label} val="✓" />)}
        {grad.optional.filter(o => o.ok).map(o => <Row key={o.key} label={o.label} val="✓" />)}
      </div>
      <div className="bg-stone-800 text-white rounded-xl p-4 mt-3 text-sm leading-relaxed">
        <div className="text-amber-300 text-xs mb-1">第三章 経営</div>
        ここからは<b>自分から施策を打てる</b>ようになります。銀行にも自分の足で相談に行けます。
        外の環境も動きます。数字を見ながら、思うように育ててください。
      </div>
      <Btn onClick={() => { setG(p => ({ ...p, graduated: true, chapter: 3 })); setScreen("hub"); }}>やってみる →</Btn>
    </Shell>
  );

  // ═══════════════════ 銀行（自分から訪問／第3章） ═══════════════════
  if (screen === "bankVisit") {
    const good = d.equityRatio >= EQUITY_RATIO_TARGET;
    return (
      <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">{BANK_NAME}</span>
          <span className="text-sm text-stone-500">{g.month}ヶ月目</span>
        </div>
        <div className="text-center pt-4"><Banker size={72} mood={good ? "normal" : "stern"} /></div>
        <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} mood={good ? "normal" : "stern"} />}>
          {good
            ? <>いつもありがとうございます。財務も安定してきましたね。新規出店などのご相談があれば、いつでもお声がけください。</>
            : <>ご来店ありがとうございます。自己資本比率が{EQUITY_RATIO_TARGET}%を超えてくると、前向きなご融資のお話もしやすくなります。</>}
        </TalkBox>
        <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
          <Row label="借入残高" val={yen(g.loanBalance)} bold />
          <Row label="金利（年率）" val={((g.annualRate ?? ANNUAL_RATE) * 100).toFixed(2) + "%"} />
          <Row label="毎月の元本返済額" val={yen(PRINCIPAL_PAYMENT)} />
          <Row label="自己資本比率" val={d.equityRatio.toFixed(1) + "%"} red={!good} />
        </div>
        <Btn onClick={() => setScreen("hub")}>← 本社に戻る</Btn>
      </Shell>
    );
  }

  // ═══════════════════ 銀行からの融資打診 ═══════════════════
  if (screen === "bankFinancingOffer") return (
    <Shell cash={g.cash} cashLabel={CASH_LABEL} cashDiff={cashDiff} transitioning={transitioning}>
      <div className="text-center pt-6"><Banker size={80} /></div>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} />}>剱持です。実は数字を拝見していてご相談が。</TalkBox>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} />}>
        自己資本比率が{EQUITY_RATIO_TARGET}%を{EQUITY_STREAK_TARGET}ヶ月連続で超えていますね。財務が安定してきた証拠です。
        もしよろしければ、新規出店など前向きな投資に向けた追加融資も、ご相談に乗れますよ。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <Row label="自己資本比率" val={d.equityRatio.toFixed(1) + "%"} bold />
      </div>
      <Btn onClick={() => setScreen("hub")}>ありがとうございます →</Btn>
    </Shell>
  );

  // ═══════════════════ 銀行の再訪問（デモ終了） ═══════════════════
  if (screen === "bankReview") {
    const good = g.cash >= 900000;
    const lastProfit = g.history.length ? g.history[g.history.length - 1].netProfit : 0;
    const chartData = [{ m: 0, v: START_CASH }, ...g.history.map(h => ({ m: h.m, v: h.cash }))];
    return (
      <Shell transitioning={transitioning}>
        <div className="text-center pt-6"><Banker size={80} mood={good ? "normal" : "stern"} /></div>
        <h2 className="text-lg font-medium text-stone-800 text-center mt-2">銀行の再訪問</h2>
        <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} mood={good ? "normal" : "stern"} />}>
          お約束通り、また参りました。{" "}
          {good
            ? <>数字をきちんと見ながら経営されている印象です。このペースなら、当面の融資継続には問題ないでしょう。</>
            : lastProfit > 0
              ? <>利益は出ていますが、現金の減り方が速いですね。元本返済は利益に出てこない分、こうして現金だけ減っていきます。役員報酬や資金繰りを一度見直された方がいい。</>
              : <>足元は赤字で、現金の減り方も速いですね。このままだと資金繰りが厳しくなります。役員報酬を含めた費用のバランスを見直された方がいい。</>}
        </TalkBox>
        <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
          <Row label="引き継ぎ時の現預金" val={yen(START_CASH)} />
          <Row label="現在の現預金" val={yen(g.cash)} bold red={!good} />
          <Row label="借入残高" val={yen(g.loanBalance)} />
        </div>
        <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
          <div className="text-xs text-stone-500 mb-1">現金の推移</div>
          <Spark data={chartData} color={good ? "#16a34a" : "#dc2626"} />
        </div>
        <div className="bg-stone-800 text-white rounded-xl p-4 mt-3 text-sm leading-relaxed">
          <div className="text-amber-300 text-xs mb-1">つづく…</div>
          これはまだ最初の{DEMO_MONTHS}ヶ月分の体験版です。この先、赤字店舗の判断や新規出店の検証、自己資本比率の改善など、
          経営の課題はまだまだ続きます。
        </div>
        <Btn onClick={restart}>もう一度プレイする ↺</Btn>
      </Shell>
    );
  }

  // ═══════════════════ 資金ショート ═══════════════════
  if (screen === "gameover") return (
    <Shell transitioning={transitioning}>
      <div className="text-center pt-6"><Banker size={80} mood="stern" /></div>
      <h2 className="text-lg font-medium text-stone-800 text-center mt-2">資金ショート…</h2>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} mood="stern" />}>
        会社の現預金が尽きてしまいました。利益が出ていても、銀行への元本返済の分だけ現金は減っていきます。
        役員報酬を含めた費用のバランスを、もう一度見直してみましょう。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
        <Row label="最終的な現預金" val={yen(g.cash)} bold red />
        <Row label="借入残高" val={yen(g.loanBalance)} />
        <Row label="続けた月数" val={`${g.month - 1}ヶ月`} />
      </div>
      <Btn onClick={restart}>もう一度プレイする ↺</Btn>
    </Shell>
  );

  return null;
}

function LocationCard({ icon, title, subtitle, onClick, muted }) {
  return (
    <button onClick={onClick}
      className={"flex items-center gap-3 border rounded-xl p-3 text-left transition-colors " +
        (muted ? "bg-stone-100 border-stone-200 opacity-60 hover:border-stone-300" : "bg-white border-stone-200 hover:border-amber-400")}>
      <span className={"text-2xl " + (muted ? "grayscale" : "")}>{icon}</span>
      <div>
        <div className={"text-sm font-medium " + (muted ? "text-stone-500" : "text-stone-700")}>{title}</div>
        <div className="text-[12px] text-stone-400">{subtitle}</div>
      </div>
    </button>
  );
}
