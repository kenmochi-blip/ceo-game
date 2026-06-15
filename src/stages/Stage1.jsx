import { useState } from "react";
import {
  START_CASH, TARGET_PROFIT, MONTHS, SETUP_TOTAL,
  RENT, LEASE, UTILITY, MOS, yen,
} from "../constants";
import Sakura from "../components/characters/Sakura";
import Talk from "../components/characters/Talk";
import Spark from "../components/charts/Spark";
import AN from "../components/ui/AnimNum";
import Shell from "../components/ui/Shell";
import StepHeader from "../components/ui/StepHeader";
import Btn from "../components/ui/Btn";
import Row from "../components/ui/Row";
import Choice from "../components/ui/Choice";
import Diff from "../components/ui/Diff";
import PL2 from "../components/ui/PL2";

// ステージ1：個人事業主編
export default function Stage1() {
  const [step, setStep] = useState("title");
  const [month, setMonth] = useState(1);
  const [cash, setCash] = useState(START_CASH);
  const [yearSales, setYearSales] = useState(0);
  const [yearCost, setYearCost] = useState(0);
  const [yearRent, setYearRent] = useState(0);
  const [yearLease, setYearLease] = useState(0);
  const [yearUtil, setYearUtil] = useState(0);
  const [yearAd, setYearAd] = useState(0);
  const [cur, setCur] = useState(null);
  const [prev, setPrev] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastFlow, setLastFlow] = useState(null);
  const [lastProfit, setLastProfit] = useState(null);
  const [lastDraw, setLastDraw] = useState(null);
  const [stock, setStock] = useState(2);
  const [price, setPrice] = useState(2);
  const [ad, setAd] = useState(0);
  const [draw, setDraw] = useState(150000);

  const yearFixed = yearRent+yearLease+yearUtil+yearAd;
  const yearProfit = yearSales-yearCost-yearFixed;

  const doSetup = () => {
    setCash(START_CASH-SETUP_TOTAL);
    setStep("plan");
  };

  const settleMonth = () => {
    const pf=[1.25,1.0,0.78][price-1], py=[400,500,650][price-1];
    const ab=[1.0,1.15,1.32][ad], sc=[0.7,1.0,1.25][stock-1];
    const season=MOS[month-1];
    let sf=1.0;
    if([12,1,2].includes(season)) sf=0.9;
    if([7,8].includes(season)) sf=1.1;
    const customers=Math.round(600*pf*ab*sf*sc);
    const sales=customers*py;
    const cogs=Math.round(sales*0.32);
    const adCost=[0,50000,120000][ad];
    const fixed=RENT+LEASE+UTILITY+adCost;
    const profit=sales-cogs-fixed;
    const flow=profit-draw;
    const unit=customers>0?Math.round(sales/customers):0;
    setPrev(cur);
    setCur({sales,cogs,rent:RENT,lease:LEASE,util:UTILITY,ad:adCost,fixed,profit,gross:sales-cogs,customers,unit});
    setHistory(h=>[...h,{m:season,sales,customers,unit}]);
    setCash(c=>c+flow);
    setYearSales(y=>y+sales); setYearCost(y=>y+cogs);
    setYearRent(y=>y+RENT); setYearLease(y=>y+LEASE); setYearUtil(y=>y+UTILITY);
    setYearAd(y=>y+adCost);
    setLastFlow(flow); setLastProfit(profit); setLastDraw(draw);
    setStep("reveal");
  };

  const afterSheets = () => {
    if(cash<0||month>=MONTHS){ setStep("result"); return; }
    setMonth(m=>m+1); setStep("plan");
  };

  const restart = () => {
    setStep("title"); setMonth(1); setCash(START_CASH);
    setYearSales(0); setYearCost(0); setYearRent(0); setYearLease(0); setYearUtil(0); setYearAd(0);
    setCur(null); setPrev(null); setHistory([]);
    setLastFlow(null); setLastProfit(null); setLastDraw(null);
    setStock(2); setPrice(2); setAd(0); setDraw(150000);
  };

  // ===== Title =====
  if(step==="title") return (
    <Shell>
      <div className="text-center pt-8">
        <Sakura size={88} mood="happy"/>
        <h1 className="text-xl font-medium text-stone-800 mt-2">朝のラテ</h1>
        <p className="text-sm text-stone-500">ステージ1 ― 個人事業主編</p>
      </div>
      <Talk who="sakura">会社を辞めて、念願のカフェ「<b>ラ・ブリーズ</b>」を開くんだ。貯金は<b>{yen(START_CASH)}</b>（うち100万は両親からの開業祝い）。うまくやっていけるかな…。一緒に経営してくれよ。</Talk>
      <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200 text-[12px] text-stone-500 leading-relaxed">
        ・<b className="text-stone-700">資金ショートせず1年（12ヶ月）を生き延びればクリア</b><br/>
        ・年間利益で評価が★1〜★3に上がります<br/>
        ・毎月の判断で売上・利益が動きます
      </div>
      <Btn onClick={()=>setStep("setup")}>開業の準備をする →</Btn>
    </Shell>
  );

  // ===== Setup =====
  if(step==="setup") {
    const pvC=START_CASH-SETUP_TOTAL;
    return (
      <Shell>
        <h2 className="text-lg font-medium text-stone-800 pt-2">開業準備</h2>
        <Talk who="shimura">創業セミナーでお会いした会計士の志村です。物件は居抜き、マシンはリース。<b>大きな買い物をせずに始めるのは賢い</b>ですよ。</Talk>
        <div className="bg-stone-50 rounded-xl p-3 mt-3 border border-stone-200">
          <Row label="開業前の貯金" val={yen(START_CASH)}/>
          <Row label="初期費用（支払い）" val={"−"+yen(SETUP_TOTAL)} red/>
          <div className="border-t border-stone-200 my-1"></div>
          <Row label="開業後の現金" val={yen(pvC)} bold/>
        </div>
        <Talk who="shimura">これが、お店のスタート資金です。ここから毎月、売上が入り、家賃や仕入れ、あなたの生活費が出ていく。<b>黒字でも、生活費を取りすぎればお店の現金は減ります</b>。まずは利益と現金を、しっかり見ていきましょう。</Talk>
        <Btn onClick={doSetup}>開業する →</Btn>
      </Shell>
    );
  }

  // ===== Plan（佐倉コメント＋作戦を1画面に） =====
  if(step==="plan") {
    return (
      <Shell cash={cash}>
        <StepHeader month={month} label={`${MOS[month-1]}月 作戦`}/>
        <Talk who="sakura">
          {month===1?<>いよいよ開店だ！最初の作戦を決めよう。</>
          :cash<500000?<>うっ、現金が心細い…今月は慎重にいかないと。</>
          :<>{MOS[month-1]}月だ。今月はどう攻めようか。</>}
        </Talk>
        <div className="bg-white rounded-xl p-4 mt-3 border border-stone-200">
          <Choice label="仕入れ量" value={stock} setValue={setStock} opts={["少なめ","ふつう","多め"]}/>
          <Choice label="価格設定" value={price} setValue={setPrice} opts={["安め¥400","ふつう¥500","強気¥650"]}/>
          <Choice label="広告" value={ad+1} setValue={v=>setAd(v-1)} opts={["出さない","¥5万(+15%)","¥12万(+32%)"]}/>

          <div className="mt-1">
            <div className="flex justify-between text-sm text-stone-600">
              <span>今月の生活費（自分の取り分）</span>
              <span className="font-medium">{yen(draw)}</span>
            </div>
            <input type="range" min="50000" max="350000" step="50000" value={draw}
              onChange={e=>setDraw(parseInt(e.target.value))} className="w-full mt-1"/>
            <div className="flex justify-between text-[11px] text-stone-400"><span>切り詰める</span><span>余裕</span></div>
          </div>
        </div>
        <Btn onClick={settleMonth}>{MOS[month-1]}月を営業する →</Btn>
      </Shell>
    );
  }

  // ===== Reveal（結果＋志村コメント） =====
  if(step==="reveal") {
    let msg;
    if(cash<0) msg=<>現金が尽きました…。利益が出ていても現金が回らなければ事業は止まる。これが最初の壁です。</>;
    else if(month===1) msg=<>売上から原価・固定費を引いたのが<b>利益</b>です。そして生活費は、お店の現金から<b>あなた個人の財布へ引き出す</b>もの。だから利益が出ていても、生活費を取りすぎればお店の現金は減ります。<b>売上・利益・現金は、それぞれ別物</b>なんですよ。</>;
    else if(lastProfit>0&&lastFlow<0) msg=<>今月は<b>黒字なのに現金が減りました</b>。生活費の取りすぎです。黒字でも油断は禁物ですよ。</>;
    else if(cash<500000) msg=<>現金が心細い。来月の固定費は待ってくれません。生活費を抑えるか、売上を伸ばす手を打ちましょう。</>;
    else if(cur.profit>0) msg=<>いい調子です。この調子で年間目標を目指しましょう。</>;
    else msg=<>今月は赤字でしたね。価格・仕入れ・広告のバランスを見直してみましょう。</>;
    return (
      <Shell cash={cash}>
        <StepHeader month={month} label={`${MOS[month-1]}月 結果`}/>
        <div className="text-center pt-2"><Sakura size={64} mood={cur.profit>=0?"happy":"worried"}/></div>
        <div className="bg-white rounded-xl p-4 mt-2 border border-stone-200">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-stone-500">{MOS[month-1]}月の売上高</span>
            <span className="text-xs">{prev&&<Diff cur={cur.sales} prev={prev.sales}/>}</span>
          </div>
          <AN value={cur.sales} className="text-3xl font-medium text-stone-800 block"/>
          <div className="mt-2"><Spark data={history.map(h=>({m:h.m,v:h.sales}))} color="#16a34a"/></div>
          <div className="text-[10px] text-stone-400 text-center -mt-1">売上高の推移</div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-white rounded-xl p-3 border border-stone-200">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-stone-500">客数</span>
              <span className="text-[10px]">{prev&&<Diff cur={cur.customers} prev={prev.customers} unit="人"/>}</span>
            </div>
            <div className="text-xl font-medium text-stone-800">{cur.customers}<span className="text-xs text-stone-500">人</span></div>
            <Spark data={history.map(h=>({m:h.m,v:h.customers}))} color="#0ea5e9" height={32}/>
          </div>
          <div className="bg-white rounded-xl p-3 border border-stone-200">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-stone-500">平均客単価</span>
              <span className="text-[10px]">{prev&&<Diff cur={cur.unit} prev={prev.unit}/>}</span>
            </div>
            <div className="text-xl font-medium text-stone-800">{yen(cur.unit)}</div>
            <Spark data={history.map(h=>({m:h.m,v:h.unit}))} color="#f59e0b" height={32}/>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 mt-2 border border-stone-200">
          <div className="text-xs text-stone-500 mb-2">現金はこう動いた</div>
          <Row label="利益（売上−原価−固定費）" val={(cur.profit>=0?"+":"−")+yen(Math.abs(cur.profit))}/>
          <Row label="生活費（自分の取り分）" val={"−"+yen(lastDraw)} red/>
          <div className="border-t border-stone-200 my-1"></div>
          <Row label="現金の増減" val={(lastFlow>=0?"+":"−")+yen(Math.abs(lastFlow))} bold red={lastFlow<0}/>
        </div>
        <Talk who="shimura">{msg}</Talk>
        <Btn onClick={()=>setStep("sheets")}>決算書を見る →</Btn>
      </Shell>
    );
  }

  // ===== Sheets（PLのみ。BSは法人成り以降で登場） =====
  if(step==="sheets") return (
    <Shell cash={cash}>
      <StepHeader month={month} label={`${MOS[month-1]}月 決算書`}/>
      {/* PL */}
      <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
        <div className="text-xs text-stone-500 mb-2">損益計算書（報告式）</div>
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="text-[10px] text-stone-400 border-b border-stone-100">
              <th className="text-left font-normal pb-1">科目</th>
              <th className="text-right font-normal pb-1 w-[38%]">単月（前月比）</th>
              <th className="text-right font-normal pb-1 w-[22%]">累計</th>
            </tr>
          </thead>
          <tbody>
            <PL2 label="売上高" m={cur.sales} pm={prev?prev.sales:null} y={yearSales} bold/>
            <PL2 label="売上原価" m={-cur.cogs} pm={prev?-prev.cogs:null} y={-yearCost} indent/>
            <PL2 label="売上総利益" m={cur.gross} pm={prev?prev.gross:null} y={yearSales-yearCost} sub/>
            <tr><td colSpan={3} className="text-[10px] text-stone-400 pt-1">販売費及び一般管理費</td></tr>
            <PL2 label="家賃" m={-cur.rent} pm={prev?-prev.rent:null} y={-yearRent} indent2/>
            <PL2 label="リース料" m={-cur.lease} pm={prev?-prev.lease:null} y={-yearLease} indent2/>
            <PL2 label="水道光熱費" m={-cur.util} pm={prev?-prev.util:null} y={-yearUtil} indent2/>
            <PL2 label="広告宣伝費" m={-cur.ad} pm={prev?-prev.ad:null} y={-yearAd} indent2/>
            <PL2 label="当期純利益" m={cur.profit} pm={prev?prev.profit:null} y={yearProfit} bold redNeg topline/>
          </tbody>
        </table>
      </div>
      {/* 進捗（年間利益は★評価。クリア条件ではない） */}
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <div className="flex justify-between text-xs text-stone-500">
          <span>年間利益（★評価・おまけ）</span>
          <span><AN value={yearProfit} className={yearProfit>=TARGET_PROFIT?"text-green-600 font-medium":"text-stone-700 font-medium"}/> / {yen(TARGET_PROFIT)}</span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{width:Math.max(0,Math.min(100,yearProfit/TARGET_PROFIT*100))+"%"}}></div>
        </div>
        <div className="text-[10px] text-stone-400 mt-1.5">クリア条件は「資金ショートせず12ヶ月完走」。利益は★の数に反映されます。</div>
      </div>
      <Btn onClick={afterSheets}>{month>=MONTHS?"結果を見る →":`${MOS[month%12]}月へ進む →`}</Btn>
    </Shell>
  );

  // ===== Result =====
  // クリア条件は「資金ショートせず12ヶ月完走」。利益は★1〜3の評価（おまけ）。
  const bankrupt=cash<0;
  const cleared=!bankrupt;
  // ★評価：完走=★1、年間黒字=★2、目標利益達成=★3
  const stars=bankrupt?0:yearProfit>=TARGET_PROFIT?3:yearProfit>0?2:1;
  const incomeTax=!bankrupt?Math.max(0,Math.round(yearProfit*0.15)):0;
  return (
    <Shell>
      <div className="text-center pt-6">
        <Sakura size={88} mood={bankrupt?"worried":"happy"}/>
        <h2 className="text-lg font-medium text-stone-800 mt-2">
          {bankrupt?"資金ショート…":"1年目クリア！"}
        </h2>
        {!bankrupt&&(
          <div className="text-2xl mt-1 tracking-widest" aria-label={`星${stars}つ`}>
            <span className="text-amber-400">{"★".repeat(stars)}</span>
            <span className="text-stone-300">{"★".repeat(3-stars)}</span>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl p-4 mt-4 border border-stone-200">
        <Row label="年間売上" val={yen(yearSales)}/>
        <Row label="年間利益" val={yen(yearProfit)} bold red={yearProfit<0}/>
        <Row label="最終現金（店）" val={yen(cash)} red={cash<0}/>
      </div>
      {!bankrupt&&(
        <div className="bg-stone-50 rounded-xl p-3 mt-2 border border-stone-200 text-[11px] text-stone-500 leading-relaxed">
          <div className="text-stone-600 font-medium mb-1">★評価のしくみ</div>
          ★ 12ヶ月を生き延びた（クリア）<br/>
          ★★ 年間黒字を達成<br/>
          ★★★ 年間利益 {yen(TARGET_PROFIT)} を達成
        </div>
      )}
      {!bankrupt&&<Talk who="shimura">確定申告です。今年の税金（概算）は<b>約{yen(incomeTax)}</b>。所得税・住民税・国保・国民年金など。<b>稼ぐほど累進で重くなります。</b></Talk>}
      <Talk who={bankrupt?"shimura":"sakura"}>
        {bankrupt?<>現金が尽きました。もう一度、挑戦しましょう。</>
        :stars===3?<>やった、目標達成だ！…でも税金、けっこう重いな。志村さん、会社にしたら変わるって本当?</>
        :stars===2?<>潰れずに黒字でやりきった！次は利益{yen(TARGET_PROFIT)}の★★★を狙いたいな。</>
        :<>なんとか1年、生き延びた…！次はちゃんと利益を残すぞ。</>}
      </Talk>
      {cleared&&(
        <div className="bg-stone-800 text-white rounded-xl p-4 mt-3 text-sm leading-relaxed">
          <div className="text-amber-300 text-xs mb-1">🔓 NEXT STAGE</div>
          ステージ2「1年目を生き延びる」「先行投資と回収」を経て、やがて「法人成り」へ。<br/>
          <span className="text-stone-300 text-xs">会社の財産を映す「BS（貸借対照表）」は、法人成りで初めて姿を現す。</span>
        </div>
      )}
      <Btn onClick={restart}>もう一度プレイする ↺</Btn>
    </Shell>
  );
}
