import { useState } from "react";
import {
  COMPANY_NAME, STORE_NAME, START_CASH, LOAN_START, ANNUAL_RATE,
  PRINCIPAL_PAYMENT, DRAW_DEFAULT, DRAW_MIN, DRAW_MAX, DRAW_STEP,
  DEMO_MONTHS, EQUITY_RATIO_TARGET, EQUITY_STREAK_TARGET, yen, manYen, calcMonth,
  STAFF_COUNT, SERVICE_HOURS_BASE, SERVICE_HOURS_TREATMENT, CURRENT_CUSTOMERS, AVG_TICKET,
  INTEREST_RATIO, capacity, blendedServiceHours,
  HOURS_PER_DAY, DAYS_PER_MONTH, FIXED_ASSETS, CAPITAL_STOCK, RETAINED_EARNINGS_INIT,
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

// メニュー提案の追加ヒアリング（③の因数分解を対話の中で引き出すため、数字はここでだけ明かす）
const STAFF_QUESTIONS = [
  { key: "cost", q: "追加コストを聞く", a: "スタッフを1人増やすなら、社会保険等も込みで人件費は月30万円ほど増えそうです。" },
  { key: "timeIncrease", q: "接客時間の伸びを聞く", a: `1人あたりの施術時間が、通常${SERVICE_HOURS_BASE}時間からトリートメント込みで${SERVICE_HOURS_TREATMENT}時間に伸びるみたいです。` },
  { key: "interestRatio", q: "興味がありそうな客の比率を聞く", a: `肌感ですが、だいたい${Math.round(INTEREST_RATIO * 100)}%くらいのお客様が興味を持ちそうです。` },
];

// 販促キャンペーン（新規客クーポン）の追加ヒアリング
const PROMO_QUESTIONS = [
  { key: "cost", q: "配布コストを聞く", a: "印刷費やSNS広告費で、月2万円ほどかかりそうです。" },
  { key: "reach", q: "新規客がどれくらい増えそうか聞く", a: "近くのお店の例だと、月20人前後の新規のお客様が増えるみたいです。" },
  { key: "discount", q: "客単価への影響を聞く", a: "初回20%オフのクーポンなので、新規のお客様の客単価は少し下がりそうです。" },
];

// 「継承」オープンワールド型デモ：本社をハブに、店舗（現場の相談）・志村税理士事務所（決算書・解説）・
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

  const [storeMode, setStoreMode] = useState(null);
  const [staffCount, setStaffCount] = useState(STAFF_COUNT);
  const [extraSales, setExtraSales] = useState(0);
  const [extraLabor, setExtraLabor] = useState(0);
  const [extraOther, setExtraOther] = useState(0);
  const [extraCustomers, setExtraCustomers] = useState(0);
  const [seenStaffEvent, setSeenStaffEvent] = useState(false);
  const [staffEventChoice, setStaffEventChoice] = useState(null);
  const [staffAsked, setStaffAsked] = useState([]);
  const [staffQAOpen, setStaffQAOpen] = useState(false);
  const [staffDecisionOpen, setStaffDecisionOpen] = useState(false);
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

  const advanceMonth = () => {
    setTransitioning(true);
    setTimeout(() => {
      const result = calcMonth(loanBalance, draw, extraSales, extraLabor, extraOther);
      const newCash = cash + result.cashChange;
      setHistory(h => [...h, { m: month, cash: newCash, ...result }]);
      setLastResult(result);
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
    setStoreMode(null);
    setStaffCount(STAFF_COUNT); setExtraSales(0); setExtraLabor(0); setExtraOther(0); setExtraCustomers(0);
    setSeenStaffEvent(false); setStaffEventChoice(null); setStaffAsked([]);
    setStaffQAOpen(false); setStaffDecisionOpen(false);
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
    if (choice === "hire") { setStaffCount(STAFF_COUNT + 1); setExtraSales(s => s + 400000); setExtraLabor(l => l + 300000); setExtraCustomers(c => c + 80); }
    else if (choice === "reckless") { setExtraSales(s => s + 50000); setExtraCustomers(c => c + 10); }
  };

  const choosePromo = (choice) => {
    setPromoChoice(choice);
    if (choice === "hold") return;
    setPromoMonth(month);
    setPromoResultPending(true);
    if (choice === "run") { setExtraSales(s => s + 80000); setExtraOther(o => o + 20000); setExtraCustomers(c => c + 20); }
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
        葬儀もそこそこに、顧問税理士の志村さんから決算書を渡されたが、正直、何が書いてあるのかさっぱり分からない――。
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
        まず、あなたの役員報酬を決めておきましょう。会社の役員報酬は、個人事業主の生活費と違って、一度決めたら期の途中では簡単に変えられないものだから。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <div className="flex justify-between text-sm text-stone-600">
          <span>あなたの役員報酬（月額）</span>
          <span className="font-medium">{yen(draw)}</span>
        </div>
        <input type="range" min={DRAW_MIN} max={DRAW_MAX} step={DRAW_STEP} value={draw}
          onChange={e => setDraw(parseInt(e.target.value))} className="w-full mt-1" />
        <div className="flex justify-between text-[13px] text-stone-400"><span>切り詰める</span><span>父の代のまま</span></div>
      </div>
      <TalkBox name="母" avatar={<Mother size={52} />}>
        決まったら、まずは志村さんのところに行ってきて。
      </TalkBox>
      <Btn onClick={() => setScreen("taxFirstVisit")}>この報酬で引き継ぐ →</Btn>
    </Shell>
  );

  // ===== 志村税理士事務所（初回・スクリプトイベント） =====
  if (screen === "taxFirstVisit") return (
    <Shell transitioning={transitioning}>
      <div className="text-center pt-4"><Shimura size={80} /></div>
      <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
        ようこそ。まずは簡単に、会社の状況をお話ししますね。
      </TalkBox>
      <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
        売上はまずまずですが、銀行への返済も控えています。油断せず、数字を見ながら経営していきましょう。
      </TalkBox>

      {introExplainChoice === null && (
        <>
          <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
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
          <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
            {TAX_TOPICS.find(t => t.key === "kessansho").answer}
          </TalkBox>
          <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
            {TAX_TOPICS.find(t => t.key === "pl").answer()}
          </TalkBox>
          <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
            {TAX_TOPICS.find(t => t.key === "bs").answer()}
          </TalkBox>
        </>
      )}

      {introExplainChoice !== null && (
        <>
          <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
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
        <LocationCard icon="📋" title="志村税理士事務所" subtitle="決算書を見る・経営の話を相談する" onClick={goTax}
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
    const baselineAskedAll = baselineAsked.length === BASELINE_QUESTIONS.length;
    const askedAll = staffAsked.length === STAFF_QUESTIONS.length;
    const avgServiceHours = blendedServiceHours(INTEREST_RATIO);
    const baseCapacity = capacity(staffCount, SERVICE_HOURS_BASE);
    const treatmentCapacity = capacity(staffCount, avgServiceHours);
    const treatmentCapacityWithHire = capacity(staffCount + 1, avgServiceHours);
    return (
      <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">{STORE_NAME}</span>
          <span className="text-sm text-stone-500">{month}ヶ月目</span>
        </div>

        {lastResult && storeMode !== "baseline" && (
          <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
            <div className="text-xs text-stone-500 mb-1">先月（{month - 1}ヶ月目）の実績</div>
            <Row label="客数" val={`${CURRENT_CUSTOMERS + extraCustomers}人`} />
            <Row label="客単価" val={yen(Math.round(lastResult.sales / (CURRENT_CUSTOMERS + extraCustomers)))} />
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
            {staffEventResultPending && month > staffEventMonth && (
              <>
                <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} mood={staffEventChoice === "reckless" ? "worried" : "normal"} />}>
                  {staffEventChoice === "hire" && <>スタッフを増やしたことで、売上が<b>+{yen(400000)}</b>、人件費が<b>−{yen(300000)}</b>になりました（差し引き+{yen(100000)}）。</>}
                  {staffEventChoice === "reckless" && <>やっぱり捌ききれずお客様が離れてしまい、見込んでいたほどの上乗せにはならず、売上は<b>+{yen(50000)}</b>にとどまりました。因数分解してから決めるべきでしたね。</>}
                </TalkBox>
                <button onClick={() => setStaffEventResultPending(false)} className="text-[13px] text-amber-700 mt-2 mb-1">わかった →</button>
              </>
            )}
            {promoResultPending && month > promoMonth && (
              <>
                <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} />}>
                  {promoChoice === "run" && <>クーポンで新規のお客様が増えて、売上が<b>+{yen(80000)}</b>ほど伸びました。ただし配布コストで<b>−{yen(20000)}</b>ほど経費もかかっています。</>}
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
                {askedAll ? (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-600 leading-relaxed">
                    <div className="text-stone-500 mb-1">聞いた話を数字にしてみると――</div>
                    現在：スタイリスト{staffCount}人 × {HOURS_PER_DAY}時間 × {DAYS_PER_MONTH}日 ÷ 平均{SERVICE_HOURS_BASE}時間 = <b>月{baseCapacity}人</b>まで対応可能（今のお客様は月{CURRENT_CUSTOMERS}人）
                    <div className="border-t border-stone-200 my-2" />
                    興味を持ちそうな{Math.round(INTEREST_RATIO * 100)}%のお客様の施術時間が{SERVICE_HOURS_TREATMENT}時間に伸びるとすると、平均は{avgServiceHours.toFixed(2)}時間。上限は<b>月{treatmentCapacity}人</b>に。
                    {treatmentCapacity < CURRENT_CUSTOMERS
                      ? <> 今のお客様（{CURRENT_CUSTOMERS}人）より<b className="text-red-600">少なくなってしまいます</b>。</>
                      : <> 今のお客様（{CURRENT_CUSTOMERS}人）は何とか対応できそうです。</>}
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500">
                    まだ詳しく聞いていないので、判断材料が少ない状態です。このまま決めることもできますが、先に「質問する」で状況を聞いておくと安心です。
                  </div>
                )}
                <div className="flex flex-col gap-2 mt-2">
                  <button onClick={() => chooseStaffEvent("hire")}
                    className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">
                    スタッフを1人増やして始める {askedAll && <span className="text-stone-400">（人件費 +¥300,000/月、上限は月{treatmentCapacityWithHire}人に）</span>}
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
                {promoAsked.length === PROMO_QUESTIONS.length ? (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-600 leading-relaxed">
                    <div className="text-stone-500 mb-1">聞いた話を数字にしてみると――</div>
                    新規客20人 × 割引後客単価{yen(AVG_TICKET * 0.8)} = 売上<b>+{yen(20 * AVG_TICKET * 0.8)}</b>ほど見込めそうですが、
                    配布コストで<b>−{yen(20000)}</b>ほどの経費もかかります。
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500">
                    まだ詳しく聞いていないので、判断材料が少ない状態です。このまま決めることもできますが、先に「質問する」で状況を聞いておくと安心です。
                  </div>
                )}
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

  // ===== 志村税理士事務所 =====
  if (screen === "tax") {
    const prev = history.length >= 2 ? history[history.length - 2] : null;

    if (taxMode === "menu") return (
      <Shell cash={cash} cashLabel={CASH_LABEL} transitioning={transitioning}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">志村税理士事務所</span>
          <span className="text-sm text-stone-500">{month}ヶ月目</span>
        </div>
        <div className="text-center pt-3"><Shimura size={72} /></div>
        <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
          ようこそ。決算書を見ますか？　それとも、何か相談したいことがありますか？
        </TalkBox>
        <div className="flex flex-col gap-2 mt-3">
          <LocationCard icon="📊" title="決算書を見る" subtitle="損益計算書・貸借対照表を確認する" onClick={() => setTaxMode("statements")} />
          <LocationCard icon="💬" title="相談する" subtitle="経営の話をいろいろ聞く" onClick={() => setTaxMode("qa")} />
        </div>
        <Btn onClick={() => setScreen("hub")}>← 事務所を出る</Btn>
      </Shell>
    );

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
            <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>何でも聞いてください。</TalkBox>
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
            <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
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
            : <>利益は出ていますが、現金の減り方が速いですね。このままだと、あと1〜2ヶ月で資金繰りが厳しくなります。役員報酬や資金繰りを一度見直された方がいい。</>}
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
