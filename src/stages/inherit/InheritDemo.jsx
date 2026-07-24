import { useState } from "react";
import {
  COMPANY_NAME, STORE_NAME, START_CASH, LOAN_START, ANNUAL_RATE,
  PRINCIPAL_PAYMENT, DRAW_DEFAULT, DRAW_MIN, DRAW_MAX, DRAW_STEP,
  DEMO_MONTHS, EQUITY_RATIO_TARGET, EQUITY_STREAK_TARGET, yen, manYen, calcMonth,
  STAFF_COUNT, SERVICE_HOURS_BASE, CURRENT_CUSTOMERS, AVG_TICKET,
  HOURS_PER_DAY, DAYS_PER_MONTH, FIXED_ASSETS, CAPITAL_STOCK, RETAINED_EARNINGS_INIT,
  makeStores, deriveStore, capacityOf, calcStoreMonth, TREATMENT, PROMO,
} from "./data";
import { TAX_TOPICS } from "./taxTopics";
import BSDiagram from "./BSDiagram";
import PLDiagram from "./PLDiagram";
import MoneyRow from "./MoneyRow";
import { Player, Mother, Banker, Staff } from "./characters";
import Shimura from "../../components/characters/Shimura";
import TalkBox from "./TalkBox";
import Shell from "../../components/ui/Shell";
import Btn from "../../components/ui/Btn";
import Row from "../../components/ui/Row";
import Spark from "../../components/charts/Spark";

const READS_PER_MONTH = 3;
const CASH_LABEL = "会社の現預金";

// 初回の店舗ヒアリング（現状把握。ここが終わった翌月からメニュー提案イベントが起きる）
const BASELINE_QUESTIONS = [
  { key: "customers", q: "今の客数を聞く", a: `月${CURRENT_CUSTOMERS}人くらいです。` },
  { key: "unitPrice", q: "客単価を聞く", a: `平均${yen(AVG_TICKET)}くらいです。` },
  { key: "staffCount", q: "店員数を聞く", a: `スタイリストは${STAFF_COUNT}人です。` },
  { key: "workDays", q: "営業日数を聞く", a: `月${DAYS_PER_MONTH}日、1日${HOURS_PER_DAY}時間営業しています。` },
  { key: "cutTime", q: "一人当たりのカット時間を聞く", a: `平均${SERVICE_HOURS_BASE}時間くらいです。` },
];

// トリートメント新メニューの追加ヒアリング（③の因数分解を対話で引き出す。数字はここで明かす）
const STAFF_QUESTIONS = [
  { key: "price", q: "客単価がどれくらい上がるか聞く", a: `トリートメントを追加されるお客様が多くて、平均の客単価が${yen(AVG_TICKET)}から${yen(AVG_TICKET + TREATMENT.unitPriceDelta)}くらいに上がりそうです。` },
  { key: "time", q: "接客時間の伸びを聞く", a: `施術時間が、通常${SERVICE_HOURS_BASE}時間から${(SERVICE_HOURS_BASE + TREATMENT.serviceHoursDelta).toFixed(1)}時間に伸びるみたいです。` },
  { key: "cost", q: "スタッフを増やす場合のコストを聞く", a: `スタッフを1人増やすなら、社会保険等も込みで人件費は月${manYen(TREATMENT.hireWage)}ほど増えそうです。` },
];

// 新規客クーポン（販促）の追加ヒアリング。業者の「新規+150人」という触れ込み＝rosyな売上予測の罠
const PROMO_QUESTIONS = [
  { key: "reach", q: "新規客がどれくらい増えそうか聞く", a: `業者さん曰く「このチラシなら新規のお客様が月${PROMO.claimedNewCustomers}人は増えます！」とのことです。` },
  { key: "discount", q: "客単価への影響を聞く", a: `初回${Math.round(PROMO.discountRate * 100)}%オフのクーポンなので、新規のお客様の分だけ平均客単価は少し下がりそうです。` },
  { key: "cost", q: "配布コストを聞く", a: `印刷費やSNS広告費で、月${manYen(PROMO.otherFixedDelta)}ほどかかりそうです。` },
];

// 「継承」オープンワールド型デモ：本社をハブに、店舗（現場の相談）・志村公認会計士・税理士事務所（決算書・解説）・
// 母（ヒント）を自由に訪ねながら進める。銀行は定期面談ではなく、区切りの月に向こうから訪ねてくる。
export default function InheritDemo() {
  const [screen, setScreen] = useState("title");
  const [gender, setGender] = useState("son");
  const [transitioning, setTransitioning] = useState(false);

  const [month, setMonth] = useState(1);
  const [cash, setCash] = useState(START_CASH);
  const [loanBalance, setLoanBalance] = useState(LOAN_START);
  const [draw, setDraw] = useState(DRAW_DEFAULT);
  const [history, setHistory] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  const [stores, setStores] = useState(makeStores);   // 稼働中の店舗（レバー込み）。UIが触るのは stores[0]＝本店
  const [lastStoreResults, setLastStoreResults] = useState(null); // 先月の店舗別実績（本店の客数・売上表示用）

  const [storeMode, setStoreMode] = useState(null);
  const [seenStaffEvent, setSeenStaffEvent] = useState(false);
  const [staffEventChoice, setStaffEventChoice] = useState(null);
  const [staffAsked, setStaffAsked] = useState([]);
  const [staffQAOpen, setStaffQAOpen] = useState(false);
  const [staffDecisionOpen, setStaffDecisionOpen] = useState(false);
  const [staffPredict, setStaffPredict] = useState(null); // ⑤ 予想（"enough"/"short"）してから答え合わせ
  const [staffEventMonth, setStaffEventMonth] = useState(null);
  const [staffEventResultPending, setStaffEventResultPending] = useState(false);
  const [seenBaseline, setSeenBaseline] = useState(false);
  const [baselineAsked, setBaselineAsked] = useState([]);
  const [baselineMonth, setBaselineMonth] = useState(null);

  const [seenPromo, setSeenPromo] = useState(false);
  const [promoChoice, setPromoChoice] = useState(null);
  const [promoAsked, setPromoAsked] = useState([]);
  const [promoQAOpen, setPromoQAOpen] = useState(false);
  const [promoDecisionOpen, setPromoDecisionOpen] = useState(false);
  const [promoMonth, setPromoMonth] = useState(null);
  const [promoResultPending, setPromoResultPending] = useState(false);

  const [introExplainChoice, setIntroExplainChoice] = useState(null);
  const [noteOpenKey, setNoteOpenKey] = useState(null);
  const [plViewMode, setPlViewMode] = useState("month");

  const [taxMode, setTaxMode] = useState("menu");
  const [taxTopic, setTaxTopic] = useState(null);
  const [lessonsRead, setLessonsRead] = useState([]);
  const [readThisMonth, setReadThisMonth] = useState(0);

  const [equityStreak, setEquityStreak] = useState(0);
  const [financingOffered, setFinancingOffered] = useState(false);

  const accumDep = history.reduce((s, h) => s + h.depreciation, 0);
  const retainedEarnings = RETAINED_EARNINGS_INIT + history.reduce((sum, h) => sum + h.netProfit, 0);
  const fixedAssetsBook = Math.max(0, FIXED_ASSETS - accumDep);
  const totalAssets = cash + fixedAssetsBook;
  const totalEquity = CAPITAL_STOCK + retainedEarnings;
  const equityRatio = totalAssets > 0 ? (totalEquity / totalAssets) * 100 : 0;

  const goStore = () => {
    // 保留中の結果報告（前のイベントの答え合わせ）を、新しい提案より必ず先に見せる
    if (!seenBaseline) setStoreMode("baseline");
    else if (staffEventResultPending && month > staffEventMonth) setStoreMode("recap");
    else if (promoResultPending && month > promoMonth) setStoreMode("recap");
    else if (!seenStaffEvent && month > baselineMonth) setStoreMode("staffEvent");
    else if (!seenPromo && seenStaffEvent && month > staffEventMonth) setStoreMode("promo");
    else setStoreMode("recap");
    setScreen("store");
  };

  const goTax = () => { setTaxMode("menu"); setTaxTopic(null); setScreen("tax"); };

  // 本店（stores[0]）のレバーにパッチを当てる。delta系は加算、staffCountは絶対値の上書き。
  const patchHonten = (patch) => setStores(prev => prev.map((s, i) => {
    if (i !== 0) return s;
    const next = { ...s };
    for (const [k, v] of Object.entries(patch)) {
      if (k === "staffCount") next.staffCount = v;
      else next[k] = (next[k] || 0) + v; // demandDelta / unitPriceDelta / serviceHoursDelta / otherFixedDelta
    }
    return next;
  }));

  const advanceMonth = () => {
    setTransitioning(true);
    setTimeout(() => {
      const result = calcMonth(loanBalance, draw, stores);
      const newCash = cash + result.cashChange;
      setHistory(h => [...h, { m: month, cash: newCash, ...result }]);
      setLastResult(result);
      setLastStoreResults(result.storeResults);
      setCash(newCash);
      setLoanBalance(result.newLoanBalance);
      setReadThisMonth(0);

      const newAccumDep = accumDep + result.depreciation;
      const newRetained = retainedEarnings + result.netProfit;
      const newFab = Math.max(0, FIXED_ASSETS - newAccumDep);
      const newTotalAssets = newCash + newFab;
      const newTotalEquity = CAPITAL_STOCK + newRetained;
      const newRatio = newTotalAssets > 0 ? (newTotalEquity / newTotalAssets) * 100 : 0;
      const newStreak = newRatio >= EQUITY_RATIO_TARGET ? equityStreak + 1 : 0;
      setEquityStreak(newStreak);

      if (newCash < 0) { setScreen("gameover"); setTransitioning(false); return; }
      if (newStreak >= EQUITY_STREAK_TARGET && !financingOffered) {
        setFinancingOffered(true);
        setMonth(m => m + 1);
        setScreen("bankFinancingOffer");
        setTransitioning(false);
        return;
      }
      if (month >= DEMO_MONTHS) { setMonth(m => m + 1); setScreen("bankReview"); setTransitioning(false); return; }
      setMonth(m => m + 1);
      setScreen("hub");
      setTransitioning(false);
    }, 1000);
  };

  const restart = () => {
    setScreen("title"); setMonth(1); setCash(START_CASH); setLoanBalance(LOAN_START);
    setDraw(DRAW_DEFAULT); setHistory([]); setLastResult(null);
    setStores(makeStores()); setLastStoreResults(null);
    setStoreMode(null);
    setSeenStaffEvent(false); setStaffEventChoice(null); setStaffAsked([]);
    setStaffQAOpen(false); setStaffDecisionOpen(false); setStaffPredict(null);
    setStaffEventMonth(null); setStaffEventResultPending(false);
    setSeenPromo(false); setPromoChoice(null); setPromoAsked([]);
    setPromoQAOpen(false); setPromoDecisionOpen(false); setPromoMonth(null); setPromoResultPending(false);
    setSeenBaseline(false); setBaselineAsked([]); setBaselineMonth(null);
    setIntroExplainChoice(null); setNoteOpenKey(null); setPlViewMode("month");
    setTaxMode("menu"); setTaxTopic(null); setLessonsRead([]); setReadThisMonth(0);
    setEquityStreak(0); setFinancingOffered(false);
  };

  const chooseStaffEvent = (choice) => {
    setStaffEventChoice(choice);
    // 「見送る」は数字への影響がなく、翌月に答え合わせすることもないので保留扱いにしない
    if (choice === "hold") return;
    setStaffEventMonth(month);
    setStaffEventResultPending(true);
    // トリートメント：客単価UP＋接客時間UP（cap低下）。増員なら同時にスタッフ+1でcapを取り戻す。
    if (choice === "hire") {
      patchHonten({ unitPriceDelta: TREATMENT.unitPriceDelta, serviceHoursDelta: TREATMENT.serviceHoursDelta, staffCount: stores[0].staffCount + 1 });
    } else if (choice === "reckless") {
      patchHonten({ unitPriceDelta: TREATMENT.unitPriceDelta, serviceHoursDelta: TREATMENT.serviceHoursDelta });
    }
  };

  const choosePromo = (choice) => {
    setPromoChoice(choice);
    if (choice === "hold") return;
    setPromoMonth(month);
    setPromoResultPending(true);
    // クーポン：需要UP（ただし capacityで頭打ち）・客単価やや減・配布コスト
    if (choice === "run") {
      patchHonten({ demandDelta: PROMO.demandDelta, unitPriceDelta: PROMO.unitPriceDelta, otherFixedDelta: PROMO.otherFixedDelta });
    }
  };

  const motherMessage = () => {
    if (history.length === 0) return <>まずは<b>{STORE_NAME}</b>に一度顔を出してみたら？志村さんの事務所にも決算書があるはずよ。</>;
    if (!seenStaffEvent) return <>お店のスタッフさん、何か相談したいことがあるみたいだったけど。</>;
    return <>数字をちゃんと見ていれば、大きく間違えることはないから。その調子よ。分からないことがあれば志村さんの事務所にも顔を出してみて。</>;
  };

  // ===== Title =====
  if (screen === "title") return (
    <Shell transitioning={transitioning}>
      <div className="text-center pt-8">
        <Player size={88} mood="worried" gender={gender} />
        <h1 className="text-xl font-medium text-stone-800 mt-2">継承（仮）</h1>
        <p className="text-sm text-stone-500">ある日突然、社長になった。</p>
      </div>
      <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200 text-[14px] text-stone-600 leading-relaxed">
        父が急逝し、{COMPANY_NAME}（{STORE_NAME}ほか）を継ぐことになった。
        葬儀もそこそこに、顧問の公認会計士・税理士、志村さんから決算書を渡されたが、正直、何が書いてあるのかさっぱり分からない――。
      </div>
      <Btn onClick={() => setScreen("select")}>はじめる →</Btn>
    </Shell>
  );

  // ===== 性別選択 =====
  if (screen === "select") return (
    <Shell transitioning={transitioning}>
      <div className="text-center pt-8">
        <h2 className="text-lg font-medium text-stone-800">あなたは？</h2>
        <p className="text-sm text-stone-500 mt-1">先代の子として、会社を継ぎます</p>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={() => { setGender("son"); setScreen("intro"); }}
          className="flex-1 bg-white border border-stone-200 rounded-xl p-4 text-center hover:border-amber-400 transition-colors">
          <Player size={72} gender="son" />
          <div className="mt-2 text-sm font-medium text-stone-700">息子</div>
        </button>
        <button onClick={() => { setGender("daughter"); setScreen("intro"); }}
          className="flex-1 bg-white border border-stone-200 rounded-xl p-4 text-center hover:border-amber-400 transition-colors">
          <Player size={72} gender="daughter" />
          <div className="mt-2 text-sm font-medium text-stone-700">娘</div>
        </button>
      </div>
    </Shell>
  );

  // ===== 導入（母から引き継ぎ・役員報酬を一度だけ決める） =====
  if (screen === "intro") return (
    <Shell transitioning={transitioning}>
      <div className="text-center pt-4"><Mother size={80} mood="worried" /></div>
      <TalkBox name="母" avatar={<Mother size={52} />}>
        あなたに継いでもらうしかないの。お父さんも、まさかこんなに急だなんて思ってなかったでしょうけど……。
        会社のお金のことは、私もよく分からなくて。志村さんに相談しながら、やっていくしかないわね。
      </TalkBox>
      <div className="bg-stone-50 rounded-xl p-3 mt-3 border border-stone-200">
        <Row label="会社の現預金" val={yen(START_CASH)} bold />
        <Row label="銀行からの借入残高" val={yen(LOAN_START)} red />
      </div>
      <TalkBox name="母" avatar={<Mother size={52} />}>
        まず、あなたの役員報酬を決めておきましょう。会社の役員報酬は、個人事業主の生活費と違って<b>会社の経費</b>になるの。とりあえず今は父の代の水準にしておいて、あとで志村さんと相談しながら見直せばいいわ。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <div className="flex justify-between text-sm text-stone-600">
          <span>あなたの役員報酬（月額）</span>
          <span className="font-medium">{yen(draw)}</span>
        </div>
        <input type="range" min={DRAW_MIN} max={DRAW_MAX} step={DRAW_STEP} value={draw}
          onChange={e => setDraw(parseInt(e.target.value))} className="w-full mt-1" />
        <div className="flex justify-between text-[13px] text-stone-400"><span>切り詰める</span><span>父の代の水準</span></div>
      </div>
      <TalkBox name="母" avatar={<Mother size={52} />}>
        決まったら、まずは志村さんのところに行ってきて。
      </TalkBox>
      <Btn onClick={() => setScreen("taxFirstVisit")}>この報酬で引き継ぐ →</Btn>
    </Shell>
  );

  // ===== 志村公認会計士・税理士事務所（初回・スクリプトイベント） =====
  if (screen === "taxFirstVisit") return (
    <Shell transitioning={transitioning}>
      <div className="text-center pt-4"><Shimura size={80} /></div>
      <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
        ようこそ。まずは簡単に、会社の状況をお話ししますね。
      </TalkBox>
      <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
        売上はまずまずですが、銀行への返済も控えています。油断せず、数字を見ながら経営していきましょう。
      </TalkBox>

      {introExplainChoice === null && (
        <>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
            前期（先代最後の1年間）の決算書を見ながら、決算書の見方を先に説明しておきましょうか？
          </TalkBox>
          <div className="flex gap-2 mt-2">
            <button onClick={() => {
              setIntroExplainChoice("yes");
              setLessonsRead(r => [...new Set([...r, "kessansho", "pl", "bs"])]);
            }} className="flex-1 bg-white border border-stone-200 rounded-xl py-3 text-sm hover:border-amber-400">お願いします</button>
            <button onClick={() => setIntroExplainChoice("no")}
              className="flex-1 bg-white border border-stone-200 rounded-xl py-3 text-sm hover:border-amber-400">また今度で</button>
          </div>
        </>
      )}

      {introExplainChoice === "yes" && (
        <>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
            {TAX_TOPICS.find(t => t.key === "kessansho").answer}
          </TalkBox>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
            {TAX_TOPICS.find(t => t.key === "pl").answer()}
          </TalkBox>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
            {TAX_TOPICS.find(t => t.key === "bs").answer()}
          </TalkBox>
        </>
      )}

      {introExplainChoice !== null && (
        <>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
            そうそう、近いうちに銀行の剱持さんもご挨拶にいらっしゃると思いますよ。
          </TalkBox>
          <Btn onClick={() => setScreen("bankFirstVisit")}>事務所を出る →</Btn>
        </>
      )}
    </Shell>
  );

  // ===== ハブ（本社） =====
  if (screen === "hub") return (
    <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">本社</span>
        <span className="text-sm text-stone-500">{month}ヶ月目</span>
      </div>
      <div className="text-center pt-3"><Player size={64} mood={cash < 500000 ? "worried" : "normal"} gender={gender} /></div>

      <div className="flex flex-col gap-2 mt-3">
        <LocationCard icon="🏠" title={STORE_NAME} subtitle="現場の様子を見る" onClick={goStore}
          muted={!(!seenBaseline ||
            (staffEventResultPending && month > staffEventMonth) ||
            (promoResultPending && month > promoMonth) ||
            (!seenStaffEvent && month > baselineMonth) ||
            (!seenPromo && seenStaffEvent && month > staffEventMonth))} />
        <LocationCard icon="📋" title="志村公認会計士・税理士事務所" subtitle="決算書を見る・経営の話を相談する" onClick={goTax}
          muted={lessonsRead.length >= TAX_TOPICS.length || readThisMonth >= READS_PER_MONTH} />
        <LocationCard icon="👩" title="母に相談する" subtitle="困ったときのヒント" onClick={() => setScreen("mother")} />
        <LocationCard icon="📔" title="ノートを見返す" subtitle="これまで分かったことを振り返る" onClick={() => { setNoteOpenKey(null); setScreen("notebook"); }} />
      </div>

      {history.length === 0 && (
        <div className="text-[12px] text-stone-400 text-center mt-2">まずは本店の様子を見に行ってみましょう</div>
      )}

      <Btn onClick={advanceMonth}>今月の営業を締めて、次の月へ →</Btn>
    </Shell>
  );

  // ===== 店舗（現場の相談） =====
  if (screen === "store") {
    const honten = stores[0];
    const hontenNow = deriveStore(honten);            // 今の 本店（capacity・需要・実客数・客単価）
    const baselineAskedAll = baselineAsked.length === BASELINE_QUESTIONS.length;
    const askedAll = staffAsked.length === STAFF_QUESTIONS.length;
    const promoAskedAll = promoAsked.length === PROMO_QUESTIONS.length;
    // トリートメント検討時の因数分解（素の本店に対して）
    const treatmentHours = SERVICE_HOURS_BASE + TREATMENT.serviceHoursDelta;
    const treatmentCapacity = capacityOf(honten.staffCount, treatmentHours, honten.hoursPerDay, honten.daysPerMonth);
    const treatmentCapacityWithHire = capacityOf(honten.staffCount + 1, treatmentHours, honten.hoursPerDay, honten.daysPerMonth);
    const lastHonten = lastStoreResults ? lastStoreResults[0] : null;
    const utilization = lastHonten ? Math.round((lastHonten.customers / hontenNow.capacity) * 100) : null;
    return (
      <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">{honten.name}</span>
          <span className="text-sm text-stone-500">{month}ヶ月目</span>
        </div>

        {lastHonten && storeMode !== "baseline" && (
          <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">先月（{month - 1}ヶ月目）の本店実績</div>
            <Row label="客数" val={`${lastHonten.customers}人`} />
            <Row label="客単価" val={yen(lastHonten.unitPrice)} />
            <Row label="売上（客数×客単価）" val={yen(lastHonten.sales)} bold />
          </div>
        )}

        {storeMode !== "baseline" && (
          <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">お店の今の状態</div>
            <Row label="👥 スタイリスト数" val={`${honten.staffCount}人`} />
            <Row label="⏱ 一人あたり接客時間" val={`${hontenNow.serviceHours.toFixed(2)}時間`} />
            <Row label="📐 対応可能人数（上限）" val={`${hontenNow.capacity}人/月`} />
            <Row label="🙋 潜在需要（来たいお客様）" val={`${hontenNow.demand}人/月`} red={hontenNow.demand > hontenNow.capacity} />
            {lastHonten && (
              <Row label="📊 稼働率（先月客数÷上限）" val={`${utilization}%`} red={utilization >= 100} />
            )}
          </div>
        )}

        {storeMode === "baseline" && (
          <>
            <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} />}>
              まだ営業を始めたばかりですね。まずはお店の状況を聞いてみましょうか。
            </TalkBox>
            <div className="flex flex-col gap-2 mt-2">
              {BASELINE_QUESTIONS.map(q => (
                baselineAsked.includes(q.key)
                  ? <TalkBox key={q.key} name="チーフスタイリスト" avatar={<Staff size={44} />}>{q.a}</TalkBox>
                  : <button key={q.key} onClick={() => setBaselineAsked(a => [...a, q.key])}
                      className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">{q.q}</button>
              ))}
            </div>
            {baselineAskedAll && (
              <>
                <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} />}>
                  これで一通り、お店の状況が分かりましたね。
                </TalkBox>
                <button onClick={() => { setSeenBaseline(true); setBaselineMonth(month); }} className="text-[13px] text-amber-700 mt-2">わかった →</button>
              </>
            )}
          </>
        )}

        {storeMode === "recap" && (
          <>
            {staffEventResultPending && month > staffEventMonth && lastHonten && (
              <>
                <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} mood={staffEventChoice === "reckless" ? "worried" : "normal"} />}>
                  {staffEventChoice === "hire" && <>スタッフを増やしたので、来られた<b>{lastHonten.customers}人</b>全員にトリートメントを提供でき、客単価は<b>{yen(lastHonten.unitPrice)}</b>に。本店の売上は<b>{yen(lastHonten.sales)}</b>になりました（人件費も増えたので、詳しくは決算書で）。</>}
                  {staffEventChoice === "reckless" && <>客単価は<b>{yen(lastHonten.unitPrice)}</b>に上がったのですが、接客時間が延びて対応できる上限が<b>{lastHonten.capacity}人</b>に下がり、来店希望{CURRENT_CUSTOMERS}人のうち<b className="text-red-600">{lastHonten.customers}人しか対応できませんでした</b>（{CURRENT_CUSTOMERS - lastHonten.customers}人を取りこぼし）。増員していれば全員に提供できました。</>}
                </TalkBox>
                <button onClick={() => setStaffEventResultPending(false)} className="text-[13px] text-amber-700 mt-2 mb-1">わかった →</button>
              </>
            )}
            {promoResultPending && month > promoMonth && lastHonten && (
              <>
                <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} />}>
                  {promoChoice === "run" && <>クーポンで問い合わせは増えたのですが、業者さんの言う「新規+{PROMO.claimedNewCustomers}人」は今の上限<b>{lastHonten.capacity}人</b>では捌ききれず頭打ちで、実際に対応できたのは<b>{lastHonten.customers}人</b>でした。配布コストもかかっています。予測を鵜呑みにせず、まず上限（対応可能人数）と照らし合わせるべきでしたね。</>}
                </TalkBox>
                <button onClick={() => setPromoResultPending(false)} className="text-[13px] text-amber-700 mt-2 mb-1">わかった →</button>
              </>
            )}
            <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200 text-sm text-stone-600">
              特に変わったことはなく、スタッフたちが元気にお店を切り盛りしています。損益など詳しい数字は志村さんの事務所へ。
            </div>
          </>
        )}

        {storeMode === "staffEvent" && (
          <>
            <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} />}>
              {staffEventChoice === null && <>お客様からの要望も多いんです。<b>トリートメントメニュー</b>、始めてみませんか？</>}
              {staffEventChoice === "hire" && <>ありがとうございます！さっそく準備してみますね。</>}
              {staffEventChoice === "reckless" && <>分かりました、このまま始めてみますね。</>}
              {staffEventChoice === "hold" && <>そうですか。また考えが変わったら言ってください。</>}
            </TalkBox>

            {staffEventChoice === null && !staffQAOpen && !staffDecisionOpen && (
              <div className="flex flex-col gap-2 mt-2">
                <Btn onClick={() => setStaffDecisionOpen(true)}>やってみる →</Btn>
                <button onClick={() => setStaffQAOpen(true)} className="text-[13px] text-amber-700 mt-1">質問する</button>
              </div>
            )}

            {staffEventChoice === null && staffQAOpen && (
              <>
                <div className="flex flex-col gap-2 mt-2">
                  {STAFF_QUESTIONS.map(q => (
                    staffAsked.includes(q.key)
                      ? <TalkBox key={q.key} name="チーフスタイリスト" avatar={<Staff size={44} />}>{q.a}</TalkBox>
                      : <button key={q.key} onClick={() => setStaffAsked(a => [...a, q.key])}
                          className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">{q.q}</button>
                  ))}
                </div>
                <button onClick={() => setStaffQAOpen(false)} className="text-[13px] text-amber-700 mt-2">← 戻る</button>
              </>
            )}

            {staffEventChoice === null && staffDecisionOpen && (
              <>
                {!askedAll && (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500">
                    まだ詳しく聞いていないので、判断材料が少ない状態です。このまま決めることもできますが、先に「質問する」で状況を聞いておくと安心です。
                  </div>
                )}

                {/* ⑤ 先に自分で予想 → 答え合わせ（因数分解を自分の頭で通す） */}
                {askedAll && staffPredict === null && (
                  <div className="bg-amber-50 rounded-xl p-3 mt-2 border border-amber-200 text-[13px] text-stone-700 leading-relaxed">
                    <div className="font-medium mb-1">まず予想してみましょう</div>
                    接客時間が{SERVICE_HOURS_BASE}→{treatmentHours.toFixed(1)}時間に伸びると、<b>増員せずに</b>今のお客様（月{CURRENT_CUSTOMERS}人）全員に対応できると思いますか？
                    <div className="flex flex-col gap-2 mt-2">
                      <button onClick={() => setStaffPredict("enough")}
                        className="bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm text-left hover:border-amber-400">対応できると思う</button>
                      <button onClick={() => setStaffPredict("short")}
                        className="bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm text-left hover:border-amber-400">取りこぼしそう</button>
                    </div>
                  </div>
                )}

                {askedAll && staffPredict !== null && (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-600 leading-relaxed">
                    <div className="text-stone-500 mb-1">答え合わせ ― 数字にしてみると</div>
                    現在：{honten.staffCount}人 × {HOURS_PER_DAY}時間 × {DAYS_PER_MONTH}日 ÷ {SERVICE_HOURS_BASE}時間 = <b>月{hontenNow.capacity}人</b>まで対応可能（今のお客様は月{CURRENT_CUSTOMERS}人）
                    <div className="border-t border-stone-200 my-2" />
                    接客時間が{treatmentHours.toFixed(1)}時間に伸びると、上限は<b>月{treatmentCapacity}人</b>に下がり、
                    {treatmentCapacity < CURRENT_CUSTOMERS
                      ? <> 今のお客様（{CURRENT_CUSTOMERS}人）のうち<b className="text-red-600">{CURRENT_CUSTOMERS - treatmentCapacity}人を取りこぼします</b>。</>
                      : <> 今のお客様（{CURRENT_CUSTOMERS}人）は対応できます。</>}
                    増員すると（{honten.staffCount + 1}人）上限は<b>月{treatmentCapacityWithHire}人</b>に戻ります。
                    <div className="mt-2 text-[12px]">
                      あなたの予想は「{staffPredict === "enough" ? "対応できる" : "取りこぼす"}」。
                      {(treatmentCapacity < CURRENT_CUSTOMERS) === (staffPredict === "short")
                        ? <b className="text-green-700"> 正解です！</b>
                        : <b className="text-red-600"> 実は違いました。</b>}
                    </div>
                  </div>
                )}
                <div className="text-[12px] text-stone-400 mt-1">迷ったら志村先生（公認会計士・税理士）に相談してみるのもいいかもしれません。</div>
                <div className="flex flex-col gap-2 mt-2">
                  <button onClick={() => chooseStaffEvent("hire")}
                    className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">
                    スタッフを1人増やして始める {askedAll && <span className="text-stone-400">（人件費 +{manYen(TREATMENT.hireWage)}/月、上限は月{treatmentCapacityWithHire}人に）</span>}
                  </button>
                  <button onClick={() => chooseStaffEvent("reckless")}
                    className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">
                    人を増やさずにそのまま始めてみる
                  </button>
                  <button onClick={() => chooseStaffEvent("hold")}
                    className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">
                    今回は見送る
                  </button>
                </div>
                <button onClick={() => setStaffDecisionOpen(false)} className="text-[13px] text-amber-700 mt-2">← 戻る</button>
              </>
            )}

            {staffEventChoice !== null && (
              <>
                {staffEventChoice !== "hold" && (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500">
                    結果はまた来月、詳しく教えますね。
                  </div>
                )}
                <button onClick={() => setSeenStaffEvent(true)} className="text-[13px] text-amber-700 mt-2">わかった →</button>
              </>
            )}
          </>
        )}

        {storeMode === "promo" && (
          <>
            <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} />}>
              {promoChoice === null && <>近くの美容室が<b>新規客向けのクーポン</b>を配ってるみたいで、うちもやってみませんか？</>}
              {promoChoice === "run" && <>ありがとうございます！さっそく配ってみますね。</>}
              {promoChoice === "hold" && <>そうですか。また考えが変わったら言ってください。</>}
            </TalkBox>

            {promoChoice === null && !promoQAOpen && !promoDecisionOpen && (
              <div className="flex flex-col gap-2 mt-2">
                <Btn onClick={() => setPromoDecisionOpen(true)}>やってみる →</Btn>
                <button onClick={() => setPromoQAOpen(true)} className="text-[13px] text-amber-700 mt-1">質問する</button>
              </div>
            )}

            {promoChoice === null && promoQAOpen && (
              <>
                <div className="flex flex-col gap-2 mt-2">
                  {PROMO_QUESTIONS.map(q => (
                    promoAsked.includes(q.key)
                      ? <TalkBox key={q.key} name="チーフスタイリスト" avatar={<Staff size={44} />}>{q.a}</TalkBox>
                      : <button key={q.key} onClick={() => setPromoAsked(a => [...a, q.key])}
                          className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">{q.q}</button>
                  ))}
                </div>
                <button onClick={() => setPromoQAOpen(false)} className="text-[13px] text-amber-700 mt-2">← 戻る</button>
              </>
            )}

            {promoChoice === null && promoDecisionOpen && (
              <>
                {promoAskedAll ? (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-600 leading-relaxed">
                    <div className="text-stone-500 mb-1">聞いた話を数字にしてみると――</div>
                    業者さんは「新規<b>+{PROMO.claimedNewCustomers}人</b>」と言っていますが、まず上限（対応可能人数）と照らし合わせます。
                    <div className="border-t border-stone-200 my-2" />
                    今の上限は<b>月{hontenNow.capacity}人</b>、すでに<b>{hontenNow.customers}人</b>来ているので、追加で対応できるのは残り<b>{Math.max(0, hontenNow.capacity - hontenNow.customers)}人</b>まで。
                    {hontenNow.customers + PROMO.claimedNewCustomers > hontenNow.capacity
                      ? <> つまり<b className="text-red-600">+{PROMO.claimedNewCustomers}人は上限を超えて頭打ち</b>で、実際に増やせるのは最大+{Math.max(0, hontenNow.capacity - hontenNow.customers)}人。<b>予測を鵜呑みにすると見込み違い</b>になります。</>
                      : <> 上限内なので概ね捌けそうです。</>}
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500">
                    まだ詳しく聞いていないので、判断材料が少ない状態です。このまま決めることもできますが、先に「質問する」で状況を聞いておくと安心です。
                  </div>
                )}
                <div className="text-[12px] text-stone-400 mt-1">迷ったら志村先生（公認会計士・税理士）に相談してみるのもいいかもしれません。</div>
                <div className="flex flex-col gap-2 mt-2">
                  <button onClick={() => choosePromo("run")}
                    className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">
                    クーポンを配布してみる
                  </button>
                  <button onClick={() => choosePromo("hold")}
                    className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">
                    今回は見送る
                  </button>
                </div>
                <button onClick={() => setPromoDecisionOpen(false)} className="text-[13px] text-amber-700 mt-2">← 戻る</button>
              </>
            )}

            {promoChoice !== null && (
              <>
                {promoChoice !== "hold" && (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500">
                    結果はまた来月、詳しく教えますね。
                  </div>
                )}
                <button onClick={() => setSeenPromo(true)} className="text-[13px] text-amber-700 mt-2">わかった →</button>
              </>
            )}
          </>
        )}

        <Btn onClick={() => setScreen("hub")}>← 本社に戻る</Btn>
      </Shell>
    );
  }

  // ===== 志村公認会計士・税理士事務所 =====
  if (screen === "tax") {
    const prev = history.length >= 2 ? history[history.length - 2] : null;

    if (taxMode === "menu") return (
      <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">志村公認会計士・税理士事務所</span>
          <span className="text-sm text-stone-500">{month}ヶ月目</span>
        </div>
        <div className="text-center pt-3"><Shimura size={72} /></div>
        <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
          ようこそ。決算書を見ますか？　それとも、何か相談したいことがありますか？
        </TalkBox>
        <div className="flex flex-col gap-2 mt-3">
          <LocationCard icon="📊" title="決算書を見る" subtitle="損益計算書・貸借対照表を確認する" onClick={() => setTaxMode("statements")} />
          <LocationCard icon="💬" title="相談する" subtitle="経営の話をいろいろ聞く" onClick={() => setTaxMode("qa")} />
          <LocationCard icon="💴" title="役員報酬を見直す" subtitle="社長の報酬を変えると数字がどう動くか" onClick={() => setTaxMode("draw")} />
        </div>
        <Btn onClick={() => setScreen("hub")}>← 事務所を出る</Btn>
      </Shell>
    );

    // ===== 役員報酬の見直し（①の学び：黒字と現金は別物。税理士対話で改定できる）=====
    if (taxMode === "draw") {
      // 「もしこの報酬にしたら」の来月シミュレーション（現在のstoresで試算）
      const sim = calcMonth(loanBalance, draw, stores);
      return (
        <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">役員報酬の見直し</span>
            <span className="text-sm text-stone-500">{month}ヶ月目</span>
          </div>
          <div className="text-center pt-3"><Shimura size={64} /></div>
          <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
            社長の役員報酬は<b>会社の経費</b>です。スライダーを動かすと、来月の決算書と現金がどう変わるか試算できますよ。
          </TalkBox>
          <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
            <div className="flex justify-between text-sm text-stone-600">
              <span>役員報酬（月額）</span>
              <span className="font-medium">{yen(draw)}</span>
            </div>
            <input type="range" min={DRAW_MIN} max={DRAW_MAX} step={DRAW_STEP} value={draw}
              onChange={e => setDraw(parseInt(e.target.value))} className="w-full mt-1" />
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
      const PL_FIELDS = ["sales", "cogs", "gross", "rent", "labor", "executiveComp", "otherFixed", "depreciation", "operating", "interest", "ordinary", "netProfit"];
      const cumulative = history.reduce((acc, h) => {
        PL_FIELDS.forEach(f => { acc[f] = (acc[f] || 0) + h[f]; });
        return acc;
      }, {});
      const plSource = plViewMode === "month" ? lastResult : cumulative;
      const plPrev = (field) => plViewMode === "month" ? (prev ? prev[field] : null) : null;
      const showDiff = plViewMode === "month";
      return (
        <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">決算書</span>
            <span className="text-sm text-stone-500">{month}ヶ月目</span>
          </div>

          {history.length === 0 && (
            <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200 text-sm text-stone-600">
              まだ今月の実績はありません。まずは経営してみましょう。
            </div>
          )}

          {lastResult && (
            <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-stone-500">
                  {plViewMode === "month" ? `先月（${month - 1}ヶ月目）の損益計算書` : `累計（${history.length}ヶ月間）の損益計算書`}
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
              <div className="border-t border-stone-300 my-1" />
              <MoneyRow label="当期純利益" cur={plSource.netProfit} prev={plPrev("netProfit")} showDiff={showDiff} bold red={plSource.netProfit < 0} />
              <PLDiagram
                cogs={plSource.cogs}
                sga={plSource.rent + plSource.labor + plSource.executiveComp + plSource.otherFixed + plSource.depreciation}
                interest={plSource.interest}
                sales={plSource.sales}
              />
            </div>
          )}

          {lastResult && (() => {
            const prevAccumDep = accumDep - lastResult.depreciation;
            const prevRetained = retainedEarnings - lastResult.netProfit;
            const prevFixedBook = Math.max(0, FIXED_ASSETS - prevAccumDep);
            const prevCash = cash - lastResult.cashChange;
            const prevLoan = loanBalance + lastResult.principal;
            const prevTotalAssets = prevCash + prevFixedBook;
            const prevTotalEquity = CAPITAL_STOCK + prevRetained;
            return (
              <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
                <div className="text-xs text-stone-500 mb-1">貸借対照表（簡易版）</div>
                <div className="text-[11px] text-stone-400 mb-1">（）内は前月比</div>
                <MoneyRow label="現金" cur={cash} prev={prevCash} />
                <MoneyRow label="固定資産（什器・敷金など）" cur={fixedAssetsBook} prev={prevFixedBook} />
                <div className="border-t border-stone-300 my-1" />
                <MoneyRow label="資産合計" cur={totalAssets} prev={prevTotalAssets} bold />
                <div className="mt-2" />
                <MoneyRow label="借入金" cur={loanBalance} prev={prevLoan} />
                <div className="border-t border-stone-300 my-1" />
                <MoneyRow label="負債合計" cur={loanBalance} prev={prevLoan} bold />
                <div className="mt-2" />
                <MoneyRow label="資本金" cur={CAPITAL_STOCK} prev={CAPITAL_STOCK} />
                <MoneyRow label="利益剰余金" cur={retainedEarnings} prev={prevRetained} red={retainedEarnings < 0} />
                <div className="border-t border-stone-300 my-1" />
                <MoneyRow label="純資産合計" cur={totalEquity} prev={prevTotalEquity} bold />
                <div className="border-t border-stone-300 my-1" />
                <MoneyRow label="負債・純資産合計" cur={loanBalance + CAPITAL_STOCK + retainedEarnings} prev={prevLoan + CAPITAL_STOCK + prevRetained} bold />
                <BSDiagram totalAssets={totalAssets} liabilities={loanBalance} equity={totalEquity} ratio={equityRatio} />
                <div className="border-t border-stone-200 my-3" />
                <div className="text-xs text-stone-500 mb-1">現金はこう動いた</div>
                <MoneyRow label="当期純利益" cur={lastResult.netProfit} showDiff={false} />
                <MoneyRow label="減価償却費（現金は減らない）" cur={lastResult.depreciation} showDiff={false} />
                <MoneyRow label="銀行への元本返済（PLには出ない）" cur={lastResult.principal} negative red showDiff={false} />
                <div className="border-t border-stone-200 my-1" />
                <MoneyRow label="現金の増減" cur={lastResult.cashChange} bold red={lastResult.cashChange < 0} showDiff={false} />
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
    const nextIndex = lessonsRead.length;
    const capReached = readThisMonth >= READS_PER_MONTH;
    const readSet = new Set(lessonsRead);
    const visibleCount = Math.min(nextIndex + 1, TAX_TOPICS.length);
    const visibleTopics = TAX_TOPICS.slice(0, visibleCount);
    const selected = TAX_TOPICS.find(t => t.key === taxTopic);
    const lockedRemaining = TAX_TOPICS.length - visibleCount;

    const openTopic = (topic, isNew) => {
      if (isNew) { setLessonsRead(r => [...r, topic.key]); setReadThisMonth(c => c + 1); }
      setTaxTopic(topic.key);
    };

    return (
      <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">志村さんに相談</span>
          <span className="text-sm text-stone-500">今月あと{Math.max(0, READS_PER_MONTH - readThisMonth)}件</span>
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
                  return (
                    <div key={t.key} className="bg-stone-100 border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-stone-400">
                      🔒 {t.label}（今月はここまで。また来月）
                    </div>
                  );
                }
                return (
                  <button key={t.key} onClick={() => openTopic(t, !isRead)}
                    className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400 flex items-center justify-between">
                    <span>{t.label}</span>
                    {isRead && <span className="text-green-600 text-xs ml-2">✓</span>}
                  </button>
                );
              })}
            </div>
            {lockedRemaining > 0 && (
              <div className="text-[12px] text-stone-400 text-center mt-2">まだ他にも聞きたいことが出てくるかもしれません（残り{lockedRemaining}件）</div>
            )}
          </>
        )}

        {selected && (
          <>
            <TalkBox name="志村（公認会計士・税理士）" avatar={<Shimura size={52} />}>
              {typeof selected.answer === "function"
                ? selected.answer({ totalAssets, liabilities: loanBalance, equity: totalEquity, ratio: equityRatio, lastResult })
                : selected.answer}
            </TalkBox>
            <button onClick={() => setTaxTopic(null)} className="text-[13px] text-amber-700 mt-2">他の質問をする</button>
          </>
        )}

        <Btn onClick={() => setTaxMode("menu")}>← 戻る</Btn>
      </Shell>
    );
  }

  // ===== ノート（これまで分かったことの振り返り） =====
  if (screen === "notebook") {
    const knownBaseline = BASELINE_QUESTIONS.filter(q => baselineAsked.includes(q.key));
    const knownMenu = STAFF_QUESTIONS.filter(q => staffAsked.includes(q.key));
    const readTopics = lessonsRead.map(key => TAX_TOPICS.find(t => t.key === key)).filter(Boolean);
    const nothingYet = knownBaseline.length === 0 && knownMenu.length === 0 && readTopics.length === 0 && history.length === 0;
    // ⑥ 自店の因数分解（本店）を蓄積表示
    const hontenNote = seenBaseline ? deriveStore(stores[0]) : null;

    const toggle = (key) => setNoteOpenKey(k => (k === key ? null : key));

    return (
      <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">ノート</span>
          <span className="text-sm text-stone-500">{month}ヶ月目</span>
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
              売上 ＝ <b>客数</b> × <b>客単価</b><br />
              客数は「対応可能人数（上限）」で頭打ちになる：
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
            {staffEventChoice && (
              <div className="text-sm text-stone-600 mt-1 pt-1 border-t border-stone-100">
                決めたこと：{staffEventChoice === "hire" && "スタッフを1人増やして始めた"}
                {staffEventChoice === "reckless" && "人を増やさずにそのまま始めた"}
                {staffEventChoice === "hold" && "今回は見送った"}
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
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
                  <button onClick={() => toggle(t.key)}
                    className="w-full text-left text-sm text-stone-700 py-1 flex items-center justify-between">
                    <span>{t.label}</span>
                    <span className="text-stone-400 text-xs">{noteOpenKey === t.key ? "▲" : "▼"}</span>
                  </button>
                  {noteOpenKey === t.key && (
                    <div className="text-sm text-stone-600 leading-relaxed pb-2 pl-1">
                      {typeof t.answer === "function"
                        ? t.answer({ totalAssets, liabilities: loanBalance, equity: totalEquity, ratio: equityRatio, lastResult })
                        : t.answer}
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

  // ===== 母に相談 =====
  if (screen === "mother") return (
    <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
      <div className="text-center pt-4"><Mother size={80} /></div>
      <TalkBox name="母" avatar={<Mother size={52} />}>{motherMessage()}</TalkBox>
      <Btn onClick={() => setScreen("hub")}>← 本社に戻る</Btn>
    </Shell>
  );

  // ===== 銀行の初回訪問（母との引き継ぎ直後・スクリプトイベント） =====
  if (screen === "bankFirstVisit") return (
    <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
      <div className="text-center pt-6"><Banker size={80} /></div>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} />}>
        この度は、突然のことで……心よりお悔やみ申し上げます。
      </TalkBox>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} />}>
        お忙しいところ恐縮ですが、引き継ぎのご挨拶と、融資の状況だけ確認させてください。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <Row label="借入残高" val={yen(loanBalance)} bold />
        <Row label="金利（年率）" val={(ANNUAL_RATE * 100).toFixed(1) + "%"} />
        <Row label="毎月の元本返済額" val={yen(PRINCIPAL_PAYMENT)} />
      </div>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} />}>
        毎月の元本と利息のお支払い、よろしくお願いします。それでは、また{DEMO_MONTHS}ヶ月後にご挨拶に伺いますね。
      </TalkBox>
      <Btn onClick={() => setScreen("hub")}>経営を始める →</Btn>
    </Shell>
  );

  // ===== 銀行からの融資の打診（自己資本比率の目標を一定期間維持した時） =====
  if (screen === "bankFinancingOffer") return (
    <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
      <div className="text-center pt-6"><Banker size={80} /></div>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} />}>
        剱持です。実は数字を拝見していてご相談が。
      </TalkBox>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} />}>
        自己資本比率が{EQUITY_RATIO_TARGET}%を{EQUITY_STREAK_TARGET}ヶ月連続で超えていますね。財務が安定してきた証拠です。
        もしよろしければ、新規出店など前向きな投資に向けた追加融資も、ご相談に乗れますよ。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <Row label="自己資本比率" val={equityRatio.toFixed(1) + "%"} bold />
      </div>
      <Btn onClick={() => setScreen("hub")}>ありがとうございます →</Btn>
    </Shell>
  );

  // ===== 銀行の再訪問（デモ終了） =====
  if (screen === "bankReview") {
    const good = cash >= 900000;
    const lastProfit = lastResult ? lastResult.netProfit : 0;
    const chartData = [{ m: 0, v: START_CASH }, ...history.map(h => ({ m: h.m, v: h.cash }))];
    return (
      <Shell transitioning={transitioning}>
        <div className="text-center pt-6"><Banker size={80} mood={good ? "normal" : "stern"} /></div>
        <h2 className="text-lg font-medium text-stone-800 text-center mt-2">銀行の再訪問</h2>
        <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} mood={good ? "normal" : "stern"} />}>
          お約束通り、また参りました。
          {" "}
          {good
            ? <>数字をきちんと見ながら経営されている印象です。このペースなら、当面の融資継続には問題ないでしょう。</>
            : lastProfit > 0
              ? <>利益は出ていますが、現金の減り方が速いですね。元本返済は利益に出てこない分、こうして現金だけ減っていきます。役員報酬や資金繰りを一度見直された方がいい。</>
              : <>足元は赤字で、現金の減り方も速いですね。このままだと資金繰りが厳しくなります。役員報酬を含めた費用のバランスを見直された方がいい。</>}
        </TalkBox>
        <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
          <Row label="引き継ぎ時の現預金" val={yen(START_CASH)} />
          <Row label="現在の現預金" val={yen(cash)} bold red={!good} />
          <Row label="借入残高" val={yen(loanBalance)} />
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

  // ===== 資金ショート =====
  if (screen === "gameover") return (
    <Shell transitioning={transitioning}>
      <div className="text-center pt-6"><Banker size={80} mood="stern" /></div>
      <h2 className="text-lg font-medium text-stone-800 text-center mt-2">資金ショート…</h2>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} mood="stern" />}>
        会社の現預金が尽きてしまいました。利益が出ていても、銀行への元本返済の分だけ現金は減っていきます。
        役員報酬を含めた費用のバランスを、もう一度見直してみましょう。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
        <Row label="最終的な現預金" val={yen(cash)} bold red />
        <Row label="借入残高" val={yen(loanBalance)} />
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
