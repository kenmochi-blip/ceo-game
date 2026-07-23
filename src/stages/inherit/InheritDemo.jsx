import { useState } from "react";
import {
  COMPANY_NAME, STORE_NAME, START_CASH, LOAN_START, ANNUAL_RATE,
  PRINCIPAL_PAYMENT, DRAW_DEFAULT, DRAW_MIN, DRAW_MAX, DRAW_STEP,
  DEMO_MONTHS, yen, calcMonth,
} from "./data";
import { Player, Mother, Banker } from "./characters";
import Shimura from "../../components/characters/Shimura";
import TalkBox from "./TalkBox";
import Shell from "../../components/ui/Shell";
import Btn from "../../components/ui/Btn";
import Row from "../../components/ui/Row";
import AN from "../../components/ui/AnimNum";
import Spark from "../../components/charts/Spark";

// 「継承」オープンワールド型デモ：本社をハブに、店舗・銀行・母を自由に訪ねながら
// 「黒字なのに現金が減る」（元本 vs 利息）を自分のペースで発見する垂直スライス。
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

  const monthsUntilReview = DEMO_MONTHS - month + 1;

  const goStore = () => { setPrediction(null); setScreen("store"); };

  const advanceMonth = () => {
    const result = calcMonth(loanBalance, draw);
    const newCash = cash + result.cashChange;
    setHistory(h => [...h, { m: month, cash: newCash, ...result }]);
    setLastResult(result);
    setCash(newCash);
    setLoanBalance(result.newLoanBalance);
    if (newCash < 0) { setScreen("gameover"); return; }
    if (month >= DEMO_MONTHS) { setMonth(m => m + 1); setScreen("bankReview"); return; }
    setMonth(m => m + 1);
    setScreen("hub");
  };

  const restart = () => {
    setScreen("title"); setMonth(1); setCash(START_CASH); setLoanBalance(LOAN_START);
    setDraw(DRAW_DEFAULT); setHistory([]); setLastResult(null);
    setSeenCashLesson(false); setPrediction(null);
  };

  const motherMessage = () => {
    if (history.length === 0) return <>まずは<b>{STORE_NAME}</b>に一度顔を出してみたら？志村さんが遺してくれた資料もあるはずよ。</>;
    if (!seenCashLesson) return <>お店の数字、ちゃんと見てみた？先月の分、まだ確認してないんじゃない？</>;
    if (draw === DRAW_DEFAULT) return <>生活費、お父さんの頃のままにしてない？一度、本当に必要な額か見直してみたら。</>;
    if (month >= DEMO_MONTHS) return <>そろそろ銀行の剱持さんとの面談ね。準備はいい？</>;
    return <>数字をちゃんと見ていれば、大きく間違えることはないから。その調子よ。</>;
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
        次の銀行面談まで、あと <b className="text-stone-700">{monthsUntilReview}</b> ヶ月
      </div>

      <div className="flex flex-col gap-2 mt-3">
        <LocationCard icon="🏠" title={STORE_NAME} subtitle="今月の様子を確認する・生活費を決める" onClick={goStore} />
        <LocationCard icon="🏦" title="銀行" subtitle="借入の状況を確認する" onClick={() => setScreen("bank")} />
        <LocationCard icon="👩" title="母に相談する" subtitle="困ったときのヒント" onClick={() => setScreen("mother")} />
      </div>

      {history.length === 0 && (
        <div className="text-[12px] text-stone-400 text-center mt-2">まずは本店の様子を見に行ってみましょう</div>
      )}

      <Btn onClick={advanceMonth}>今月の営業を締めて、次の月へ →</Btn>
    </Shell>
  );

  // ===== 店舗 =====
  if (screen === "store") {
    const showQuiz = history.length > 0 && !seenCashLesson && prediction === null;
    const showReveal = history.length > 0 && (seenCashLesson || prediction !== null);
    return (
      <Shell cash={cash}>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">{STORE_NAME}</span>
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
            <Row label="その他固定費" val={"−" + yen(lastResult.otherFixed)} />
            <Row label="支払利息" val={"−" + yen(lastResult.interest)} />
            <div className="border-t border-stone-200 my-1" />
            <Row label="当期純利益" val={yen(lastResult.netProfit)} bold />
          </div>
        )}

        {showQuiz && (
          <>
            <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
              先月は<b>{yen(lastResult.netProfit)}の黒字</b>でした。さて、お店の現金は増えたと思いますか？減ったと思いますか？
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
              <Row label="当期純利益" val={(lastResult.netProfit >= 0 ? "+" : "−") + yen(Math.abs(lastResult.netProfit))} />
              <Row label="銀行への元本返済（PLには出ない）" val={"−" + yen(lastResult.principal)} red />
              <Row label="生活費（役員報酬）" val={"−" + yen(lastResult.draw)} red />
              <div className="border-t border-stone-200 my-1" />
              <Row label="現金の増減" val={(lastResult.cashChange >= 0 ? "+" : "−") + yen(Math.abs(lastResult.cashChange))} bold red={lastResult.cashChange < 0} />
            </div>
            {prediction !== null && !seenCashLesson && (
              <TalkBox name="志村（顧問税理士）" avatar={<Shimura size={52} />}>
                {prediction === "up" && lastResult.cashChange < 0 && <>予想は外れましたね。黒字＝現金が増える、ではないんです。</>}
                {prediction === "down" && lastResult.cashChange < 0 && <>正解です。</>}
                {lastResult.cashChange >= 0 && <>今月はプラスでした。</>}
                {" "}
                <b>銀行への返済のうち「元本」はPL（損益計算書）には出てきません。</b>
                利息だけが費用として計上されます。だから利益が出ていても、元本の返済と生活費の分だけ、現金は減っていくんです。
              </TalkBox>
            )}
            {prediction !== null && !seenCashLesson && (
              <button onClick={() => setSeenCashLesson(true)} className="text-[13px] text-amber-700 mt-2">わかった →</button>
            )}
          </>
        )}

        <div className="bg-stone-50 rounded-xl p-3 mt-3 border border-stone-200">
          <div className="flex justify-between text-sm text-stone-600">
            <span>来月の生活費（役員報酬）</span>
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

  // ===== 銀行 =====
  if (screen === "bank") return (
    <Shell cash={cash}>
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">銀行</span>
        <span className="text-sm text-stone-500">{month}ヶ月目</span>
      </div>
      <div className="text-center pt-3"><Banker size={72} /></div>
      <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} />}>
        先代からお付き合いさせていただいております。融資の状況、いつでも確認にいらしてください。
      </TalkBox>
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <Row label="借入残高" val={yen(loanBalance)} bold />
        <Row label="金利（年率）" val={(ANNUAL_RATE * 100).toFixed(1) + "%"} />
        <Row label="毎月の元本返済額" val={yen(PRINCIPAL_PAYMENT)} />
        <Row label="次回面談まで" val={`あと${monthsUntilReview}ヶ月`} />
      </div>
      <Btn onClick={() => setScreen("hub")}>本社に戻る →</Btn>
    </Shell>
  );

  // ===== 母に相談 =====
  if (screen === "mother") return (
    <Shell cash={cash}>
      <div className="text-center pt-4"><Mother size={80} /></div>
      <TalkBox name="母" avatar={<Mother size={52} />}>{motherMessage()}</TalkBox>
      <Btn onClick={() => setScreen("hub")}>本社に戻る →</Btn>
    </Shell>
  );

  // ===== 銀行面談（デモ終了） =====
  if (screen === "bankReview") {
    const good = cash >= 900000;
    const chartData = [{ m: 0, v: START_CASH }, ...history.map(h => ({ m: h.m, v: h.cash }))];
    return (
      <Shell>
        <div className="text-center pt-6"><Banker size={80} mood={good ? "normal" : "stern"} /></div>
        <h2 className="text-lg font-medium text-stone-800 text-center mt-2">銀行との定例面談</h2>
        <TalkBox name="剱持（銀行担当者）" avatar={<Banker size={52} mood={good ? "normal" : "stern"} />}>
          {good
            ? <>数字をきちんと見ながら経営されている印象です。このペースなら、当面の融資継続には問題ないでしょう。</>
            : <>利益は出ていますが、現金の減り方が速いですね。このままだと、あと1〜2ヶ月で資金繰りが厳しくなります。生活費や資金繰りを一度見直された方がいい。</>}
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
        会社の現金が尽きてしまいました。利益は出ていても、銀行への元本返済と生活費が重なると、こういうことが起こります。
        もう一度、数字を見ながらやり直してみましょう。
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
