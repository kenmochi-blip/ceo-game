import { useState } from "react";
import {
  COMPANY_NAME, STORE_NAME, START_CASH, LOAN_START, ANNUAL_RATE,
  PRINCIPAL_PAYMENT, DRAW_DEFAULT, DRAW_MIN, DRAW_MAX, DRAW_STEP,
  DEMO_MONTHS, yen, calcMonth,
  STAFF_COUNT, SERVICE_HOURS_BASE, SERVICE_HOURS_TREATMENT, CURRENT_CUSTOMERS, capacity,
  HOURS_PER_DAY, DAYS_PER_MONTH, FIXED_ASSETS, CAPITAL_STOCK,
} from "./data";
import { TAX_TOPICS } from "./taxTopics";
import { Player, Mother, Banker, Staff } from "./characters";
import Shimura from "../../components/characters/Shimura";
import TalkBox from "./TalkBox";
import Shell from "../../components/ui/Shell";
import Btn from "../../components/ui/Btn";
import Row from "../../components/ui/Row";
import Spark from "../../components/charts/Spark";

const READS_PER_MONTH = 3;

// 「継承」オープンワールド型デモ：本社をハブに、店舗（現場の相談）・志村税理士事務所（決算書・解説）・
// 母（ヒント）を自由に訪ねながら進める。銀行は定期面談ではなく、区切りの月に向こうから訪ねてくる。
export default function InheritDemo() {
  const [screen, setScreen] = useState("title");
  const [gender, setGender] = useState("son");

  const [month, setMonth] = useState(1);
  const [cash, setCash] = useState(START_CASH);
  const [loanBalance, setLoanBalance] = useState(LOAN_START);
  const [draw, setDraw] = useState(DRAW_DEFAULT);
  const [history, setHistory] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [seenCashLesson, setSeenCashLesson] = useState(false);
  const [prediction, setPrediction] = useState(null);

  const [storeMode, setStoreMode] = useState(null);
  const [staffCount, setStaffCount] = useState(STAFF_COUNT);
  const [extraSales, setExtraSales] = useState(0);
  const [extraLabor, setExtraLabor] = useState(0);
  const [seenStaffEvent, setSeenStaffEvent] = useState(false);
  const [staffEventChoice, setStaffEventChoice] = useState(null);

  const [taxMode, setTaxMode] = useState("menu");
  const [taxTopic, setTaxTopic] = useState(null);
  const [lessonsRead, setLessonsRead] = useState([]);
  const [readThisMonth, setReadThisMonth] = useState(0);

  const monthsUntilReview = DEMO_MONTHS - month + 1;
  const retainedEarnings = history.reduce((sum, h) => sum + h.netProfit, 0);
  const totalAssets = cash + FIXED_ASSETS;
  const totalEquity = CAPITAL_STOCK + retainedEarnings;
  const equityRatio = totalAssets > 0 ? (totalEquity / totalAssets) * 100 : 0;

  const goStore = () => {
    if (history.length === 0) setStoreMode("setup");
    else if (!seenStaffEvent) setStoreMode("staffEvent");
    else setStoreMode("recap");
    setScreen("store");
  };

  const goTax = () => { setTaxMode("menu"); setTaxTopic(null); setScreen("tax"); };

  const advanceMonth = () => {
    const result = calcMonth(loanBalance, draw, extraSales, extraLabor);
    const newCash = cash + result.cashChange;
    setHistory(h => [...h, { m: month, cash: newCash, ...result }]);
    setLastResult(result);
    setCash(newCash);
    setLoanBalance(result.newLoanBalance);
    setReadThisMonth(0);
    if (newCash < 0) { setScreen("gameover"); return; }
    if (month === 1) { setMonth(m => m + 1); setScreen("bankFirstVisit"); return; }
    if (month >= DEMO_MONTHS) { setMonth(m => m + 1); setScreen("bankReview"); return; }
    setMonth(m => m + 1);
    setScreen("hub");
  };

  const restart = () => {
    setScreen("title"); setMonth(1); setCash(START_CASH); setLoanBalance(LOAN_START);
    setDraw(DRAW_DEFAULT); setHistory([]); setLastResult(null);
    setSeenCashLesson(false); setPrediction(null); setStoreMode(null);
    setStaffCount(STAFF_COUNT); setExtraSales(0); setExtraLabor(0);
    setSeenStaffEvent(false); setStaffEventChoice(null);
    setTaxMode("menu"); setTaxTopic(null); setLessonsRead([]); setReadThisMonth(0);
  };

  const chooseStaffEvent = (choice) => {
    setStaffEventChoice(choice);
    if (choice === "hire") { setStaffCount(STAFF_COUNT + 1); setExtraSales(300000); setExtraLabor(150000); }
    else if (choice === "reckless") { setExtraSales(50000); setExtraLabor(0); }
  };

  const motherMessage = () => {
    if (history.length === 0) return <>まずは<b>{STORE_NAME}</b>に一度顔を出してみたら？志村さんの事務所にも決算書があるはずよ。</>;
    if (!seenStaffEvent) return <>お店のスタッフさん、何か相談したいことがあるみたいだったけど。</>;
    if (!seenCashLesson) return <>志村さんの事務所で、決算書をちゃんと見てみた？</>;
    if (draw === DRAW_DEFAULT) return <>役員報酬、お父さんの頃のままにしてない？一度、本当に必要な額か見直してみたら。</>;
    return <>数字をちゃんと見ていれば、大きく間違えることはないから。その調子よ。分からないことがあれば志村さんの事務所にも顔を出してみて。</>;
  };

  // ===== Title =====
  if (screen === "title") return (
    <Shell>
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
    <Shell>
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

  // ===== 導入（母から引き継ぎ） =====
  if (screen === "intro") return (
    <Shell>
      <div className="text-center pt-4"><Mother size={80} mood="worried" /></div>
      <TalkBox name="母" avatar={<Mother size={52} />}>
        あなたに継いでもらうしかないの。お父さんも、まさかこんなに急だなんて思ってなかったでしょうけど……。
        会社のお金のことは、私もよく分からなくて。志村さんに相談しながら、やっていくしかないわね。
      </TalkBox>
      <div className="bg-stone-50 rounded-xl p-3 mt-3 border border-stone-200">
        <Row label="会社の現金" val={yen(START_CASH)} bold />
        <Row label="銀行からの借入残高" val={yen(LOAN_START)} red />
      </div>
      <TalkBox name="母" avatar={<Mother size={52} />}>
        {gender === "daughter" ? "あなたなら大丈夫。" : "頼りにしてるから。"}まずは会社がどうなっているのか、
        自分の目で確かめてみて。
      </TalkBox>
      <Btn onClick={() => setScreen("hub")}>経営を引き継ぐ →</Btn>
    </Shell>
  );

  // ===== ハブ（本社） =====
  if (screen === "hub") return (
    <Shell cash={cash}>
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">本社</span>
        <span className="text-sm text-stone-500">{month}ヶ月目</span>
      </div>
      <div className="text-center pt-3"><Player size={64} mood={cash < 500000 ? "worried" : "normal"} gender={gender} /></div>
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-500 text-center">
        銀行の剱持さんが次にいらっしゃるまで、あと <b className="text-stone-700">{monthsUntilReview}</b> ヶ月
      </div>

      <div className="flex flex-col gap-2 mt-3">
        <LocationCard icon="🏠" title={STORE_NAME} subtitle="現場の様子を見る・役員報酬を決める" onClick={goStore} />
        <LocationCard icon="📋" title="志村税理士事務所" subtitle="決算書を見る・経営の話を相談する" onClick={goTax} />
        <LocationCard icon="👩" title="母に相談する" subtitle="困ったときのヒント" onClick={() => setScreen("mother")} />
      </div>

      {history.length === 0 && (
        <div className="text-[12px] text-stone-400 text-center mt-2">まずは本店の様子を見に行ってみましょう</div>
      )}

      <Btn onClick={advanceMonth}>今月の営業を締めて、次の月へ →</Btn>
    </Shell>
  );

  // ===== 店舗（現場の相談） =====
  if (screen === "store") {
    const baseCapacity = capacity(staffCount, SERVICE_HOURS_BASE);
    const treatmentCapacity = capacity(staffCount, SERVICE_HOURS_TREATMENT);
    const treatmentCapacityWithHire = capacity(staffCount + 1, SERVICE_HOURS_TREATMENT);
    return (
      <Shell cash={cash}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">{STORE_NAME}</span>
          <span className="text-sm text-stone-500">{month}ヶ月目</span>
        </div>

        {storeMode === "setup" && (
          <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200 text-sm text-stone-600">
            まだ営業を始めたばかりです。スタッフたちが迎えてくれました。
          </div>
        )}

        {storeMode === "recap" && (
          <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200 text-sm text-stone-600">
            特に変わったことはなく、スタッフたちが元気にお店を切り盛りしています。数字が気になったら志村さんの事務所へ。
          </div>
        )}

        {storeMode === "staffEvent" && (
          <>
            <TalkBox name="チーフスタイリスト" avatar={<Staff size={52} mood={staffEventChoice === "reckless" ? "worried" : "normal"} />}>
              {staffEventChoice === null && <>お客様からの要望も多いんです。<b>トリートメントメニュー</b>、始めてみませんか？単価が上がると思います。</>}
              {staffEventChoice === "hire" && <>ありがとうございます！これで無理なく対応できます。</>}
              {staffEventChoice === "reckless" && <>すみません……お客様を待たせてしまって、何人か次回予約をキャンセルされました。</>}
              {staffEventChoice === "hold" && <>そうですか。また考えが変わったら言ってください。</>}
            </TalkBox>

            {staffEventChoice === null && (
              <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-600 leading-relaxed">
                <div className="text-stone-500 mb-1">今の客数の上限を計算してみると――</div>
                現在：スタイリスト{staffCount}人 × {HOURS_PER_DAY}時間 × {DAYS_PER_MONTH}日 ÷ 平均{SERVICE_HOURS_BASE}時間 = <b>月{baseCapacity}人</b>まで対応可能（今のお客様は月{CURRENT_CUSTOMERS}人）
                <div className="border-t border-stone-200 my-2" />
                トリートメント込みだと平均施術時間が{SERVICE_HOURS_TREATMENT}時間に伸びるため、上限は<b>月{treatmentCapacity}人</b>に。
                {treatmentCapacity < CURRENT_CUSTOMERS
                  ? <> 今のお客様（{CURRENT_CUSTOMERS}人）より<b className="text-red-600">少なくなってしまいます</b>。</>
                  : <> 今のお客様（{CURRENT_CUSTOMERS}人）は何とか対応できそうです。</>}
              </div>
            )}

            {staffEventChoice === null && (
              <div className="flex flex-col gap-2 mt-2">
                <button onClick={() => chooseStaffEvent("hire")}
                  className="bg-white border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-left hover:border-amber-400">
                  スタッフを1人増やして始める <span className="text-stone-400">（人件費 +¥150,000/月、上限は月{treatmentCapacityWithHire}人に）</span>
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
            )}

            {staffEventChoice !== null && (
              <>
                <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200 text-[13px] text-stone-600">
                  {staffEventChoice === "hire" && <>スタッフを増やしたことで、来月から売上が<b>+{yen(300000)}</b>、人件費が<b>−{yen(150000)}</b>見込みです（差し引き+{yen(150000)}）。</>}
                  {staffEventChoice === "reckless" && <>捌ききれずお客様が離れてしまい、見込んでいたほどの上乗せにはならず、来月の売上は<b>+{yen(50000)}</b>にとどまりそうです。因数分解してから決めるべきでしたね。</>}
                  {staffEventChoice === "hold" && <>今回は現状維持です。数字がもう少し落ち着いてから、また検討しましょう。</>}
                </div>
                <button onClick={() => setSeenStaffEvent(true)} className="text-[13px] text-amber-700 mt-2">わかった →</button>
              </>
            )}
          </>
        )}

        <div className="bg-stone-50 rounded-xl p-3 mt-3 border border-stone-200">
          <div className="flex justify-between text-sm text-stone-600">
            <span>来月の役員報酬</span>
            <span className="font-medium">{yen(draw)}</span>
          </div>
          <input type="range" min={DRAW_MIN} max={DRAW_MAX} step={DRAW_STEP} value={draw}
            onChange={e => setDraw(parseInt(e.target.value))} className="w-full mt-1" />
          <div className="flex justify-between text-[13px] text-stone-400"><span>切り詰める</span><span>父の代のまま</span></div>
        </div>

        <Btn onClick={() => setScreen("hub")}>本社に戻る →</Btn>
      </Shell>
    );
  }

  // ===== 志村税理士事務所 =====
  if (screen === "tax") {
    if (taxMode === "menu") return (
      <Shell cash={cash}>
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
        <Btn onClick={() => setScreen("hub")}>事務所を出る →</Btn>
      </Shell>
    );

    if (taxMode === "statements") {
      const showQuiz = history.length > 0 && !seenCashLesson && prediction === null;
      const showReveal = history.length > 0 && (seenCashLesson || prediction !== null);
      return (
        <Shell cash={cash}>
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
              <div className="text-xs text-stone-500 mb-1">先月（{month - 1}ヶ月目）の損益計算書</div>
              <Row label="売上高" val={yen(lastResult.sales)} />
              <Row label="売上原価" val={"−" + yen(lastResult.cogs)} />
              <Row label="売上総利益" val={yen(lastResult.gross)} />
              <Row label="家賃" val={"−" + yen(lastResult.rent)} />
              <Row label="人件費" val={"−" + yen(lastResult.labor)} />
              <Row label="役員報酬" val={"−" + yen(lastResult.executiveComp)} />
              <Row label="その他固定費" val={"−" + yen(lastResult.otherFixed)} />
              <Row label="支払利息" val={"−" + yen(lastResult.interest)} />
              <div className="border-t border-stone-200 my-1" />
              <Row label="当期純利益" val={yen(lastResult.netProfit)} bold red={lastResult.netProfit < 0} />
            </div>
          )}

          {showQuiz && (
            <>
              <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
                先月の当期純利益は<b>{yen(lastResult.netProfit)}</b>でした。さて、お店の現金は増えたと思いますか？減ったと思いますか？
              </TalkBox>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setPrediction("up")}
                  className="flex-1 bg-white border border-stone-200 rounded-xl py-3 text-sm hover:border-amber-400">増えたと思う</button>
                <button onClick={() => setPrediction("down")}
                  className="flex-1 bg-white border border-stone-200 rounded-xl py-3 text-sm hover:border-amber-400">減ったと思う</button>
              </div>
            </>
          )}

          {showReveal && (
            <>
              <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
                <div className="text-xs text-stone-500 mb-1">現金はこう動いた</div>
                <Row label="当期純利益（役員報酬・利息は控除済み）" val={(lastResult.netProfit >= 0 ? "+" : "−") + yen(Math.abs(lastResult.netProfit))} />
                <Row label="銀行への元本返済（PLには出ない）" val={"−" + yen(lastResult.principal)} red />
                <div className="border-t border-stone-200 my-1" />
                <Row label="現金の増減" val={(lastResult.cashChange >= 0 ? "+" : "−") + yen(Math.abs(lastResult.cashChange))} bold red={lastResult.cashChange < 0} />
              </div>
              {!seenCashLesson && (
                <>
                  <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
                    {prediction === "up" && lastResult.cashChange < 0 && <>予想は外れましたね。</>}
                    {prediction === "down" && lastResult.cashChange < 0 && <>正解です。</>}
                    {lastResult.cashChange >= 0 && <>今月はプラスでした。</>}
                    {" "}
                    <b>銀行への返済のうち「元本」はPL（損益計算書）には出てきません。</b>
                    利息だけが費用として計上されます。
                    {lastResult.netProfit >= 0
                      ? <>だから<b>利益が出ていても</b>、元本の返済の分だけ、現金は減っていくんです。</>
                      : <>今月は当期純利益もマイナスなので、そこに元本の返済も重なって、現金がさらに減っています。役員報酬を見直して、まずは黒字にすることから考えましょう。</>}
                  </TalkBox>
                  <button onClick={() => setSeenCashLesson(true)} className="text-[13px] text-amber-700 mt-2">わかった →</button>
                </>
              )}
            </>
          )}

          {lastResult && seenCashLesson && (
            <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
              <div className="text-xs text-stone-500 mb-1">貸借対照表（簡易版）</div>
              <Row label="現金" val={yen(cash)} />
              <Row label="固定資産（什器・敷金など）" val={yen(FIXED_ASSETS)} />
              <div className="border-t border-stone-200 my-1" />
              <Row label="資産合計" val={yen(totalAssets)} bold />
              <div className="mt-2" />
              <Row label="借入金" val={yen(loanBalance)} />
              <Row label="資本金" val={yen(CAPITAL_STOCK)} />
              <Row label="利益剰余金" val={yen(retainedEarnings)} red={retainedEarnings < 0} />
              <div className="border-t border-stone-200 my-1" />
              <Row label="負債・純資産合計" val={yen(loanBalance + CAPITAL_STOCK + retainedEarnings)} bold />
              <div className="border-t border-stone-200 my-1" />
              <Row label="自己資本比率" val={equityRatio.toFixed(1) + "%"} bold />
            </div>
          )}

          <Btn onClick={() => setTaxMode("menu")}>戻る →</Btn>
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
      <Shell cash={cash}>
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
            <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>{selected.answer}</TalkBox>
            <button onClick={() => setTaxTopic(null)} className="text-[13px] text-amber-700 mt-2">他の質問をする</button>
          </>
        )}

        <Btn onClick={() => setTaxMode("menu")}>戻る →</Btn>
      </Shell>
    );
  }

  // ===== 母に相談 =====
  if (screen === "mother") return (
    <Shell cash={cash}>
      <div className="text-center pt-4"><Mother size={80} /></div>
      <TalkBox name="母" avatar={<Mother size={52} />}>{motherMessage()}</TalkBox>
      <Btn onClick={() => setScreen("hub")}>本社に戻る →</Btn>
    </Shell>
  );

  // ===== 銀行の初回訪問（1ヶ月目終了直後・スクリプトイベント） =====
  if (screen === "bankFirstVisit") return (
    <Shell cash={cash}>
      <div className="text-center pt-6"><Banker size={80} /></div>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} />}>
        この度は、突然のことで……心よりお悔やみ申し上げます。
      </TalkBox>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} />}>
        さっそくで恐縮ですが、融資の状況を確認させてください。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <Row label="借入残高" val={yen(loanBalance)} bold />
        <Row label="金利（年率）" val={(ANNUAL_RATE * 100).toFixed(1) + "%"} />
        <Row label="毎月の元本返済額" val={yen(PRINCIPAL_PAYMENT)} />
      </div>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} />}>
        毎月の元本と利息のお支払い、よろしくお願いします。それでは、また{DEMO_MONTHS - 1}ヶ月後にご挨拶に伺いますね。
      </TalkBox>
      <Btn onClick={() => setScreen("hub")}>本社に戻る →</Btn>
    </Shell>
  );

  // ===== 銀行の再訪問（デモ終了） =====
  if (screen === "bankReview") {
    const good = cash >= 900000;
    const chartData = [{ m: 0, v: START_CASH }, ...history.map(h => ({ m: h.m, v: h.cash }))];
    return (
      <Shell>
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
          <Row label="引き継ぎ時の現金" val={yen(START_CASH)} />
          <Row label="現在の現金" val={yen(cash)} bold red={!good} />
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
    <Shell>
      <div className="text-center pt-6"><Banker size={80} mood="stern" /></div>
      <h2 className="text-lg font-medium text-stone-800 text-center mt-2">資金ショート…</h2>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} mood="stern" />}>
        会社の現金が尽きてしまいました。利益が出ていても、銀行への元本返済の分だけ現金は減っていきます。
        役員報酬を含めた費用のバランスを、もう一度見直してみましょう。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
        <Row label="最終的な現金" val={yen(cash)} bold red />
        <Row label="借入残高" val={yen(loanBalance)} />
      </div>
      <Btn onClick={restart}>もう一度プレイする ↺</Btn>
    </Shell>
  );

  return null;
}

function LocationCard({ icon, title, subtitle, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-3 text-left hover:border-amber-400 transition-colors">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-sm font-medium text-stone-700">{title}</div>
        <div className="text-[12px] text-stone-400">{subtitle}</div>
      </div>
    </button>
  );
}
