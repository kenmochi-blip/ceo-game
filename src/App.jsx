import { useState, useEffect, useRef } from "react";

const START_CASH = 4200000;
const TARGET_PROFIT = 1500000;
const MONTHS = 12;
const SETUP_TOTAL = 3300000;
const SETUP_ASSET = 1100000;
const RENT = 150000, LEASE = 30000, UTILITY = 40000;
const FOOD_INVEST_COST = 200000;
const yen = n => "¥" + Math.round(n).toLocaleString();
const MOS = [4,5,6,7,8,9,10,11,12,1,2,3];

function useAnimNum(target, dur = 700) {
  const [v, setV] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const from = ref.current, to = target;
    if (from === to) return;
    let raf; const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else { setV(to); ref.current = to; }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  ref.current = v;
  return v;
}
function AN({ value, className }) {
  return <span className={className}>{yen(useAnimNum(value))}</span>;
}

// ===== Characters =====
function Sakura({ size = 64, mood = "normal" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#fef3e2"/>
      <rect x="43" y="58" width="14" height="12" fill="#e8b98f"/>
      <path d="M30 95 Q30 70 50 68 Q70 70 70 95 Z" fill="#8a5a3b"/>
      <rect x="44" y="68" width="12" height="20" fill="#a06b45"/>
      <circle cx="50" cy="44" r="20" fill="#f3c79b"/>
      <path d="M30 42 Q30 22 50 22 Q70 22 70 42 Q70 32 50 30 Q30 32 30 42 Z" fill="#3b2a20"/>
      <circle cx="43" cy="44" r="2.4" fill="#2a2118"/>
      <circle cx="57" cy="44" r="2.4" fill="#2a2118"/>
      {mood==="happy"?<path d="M44 52 Q50 58 56 52" stroke="#7a4a2a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      :mood==="worried"?<path d="M44 54 Q50 50 56 54" stroke="#7a4a2a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      :<path d="M45 53 L55 53" stroke="#7a4a2a" strokeWidth="2" fill="none" strokeLinecap="round"/>}
      <path d="M40 38 L46 39" stroke="#3b2a20" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M54 39 L60 38" stroke="#3b2a20" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function Hotta({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#e8eef5"/>
      <rect x="43" y="58" width="14" height="12" fill="#d8a87a"/>
      <path d="M28 95 Q28 70 50 68 Q72 70 72 95 Z" fill="#3a4256"/>
      <path d="M46 68 L50 80 L54 68 Z" fill="#fff"/>
      <rect x="48.5" y="68" width="3" height="20" fill="#7a8aa0"/>
      <circle cx="50" cy="44" r="20" fill="#e6c096"/>
      <path d="M30 40 Q31 23 50 23 Q69 23 70 40 Q66 30 50 30 Q34 30 30 40 Z" fill="#4a4036"/>
      <circle cx="43" cy="45" r="6" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
      <circle cx="57" cy="45" r="6" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
      <line x1="49" y1="45" x2="51" y2="45" stroke="#2a2a2a" strokeWidth="1.5"/>
      <circle cx="43" cy="45" r="1.8" fill="#2a2118"/>
      <circle cx="57" cy="45" r="1.8" fill="#2a2118"/>
      <path d="M45 54 Q50 56 55 54" stroke="#6a4a2a" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
function Talk({ who, children }) {
  return (
    <div className="flex items-end gap-2 mt-3">
      <div className="shrink-0">{who==="hotta"?<Hotta size={52}/>:<Sakura size={52}/>}</div>
      <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm p-3 text-[13px] text-stone-700 leading-relaxed flex-1">
        <div className="text-[10px] text-stone-400 mb-0.5">{who==="hotta"?"堀田（会計士）":"佐倉"}</div>
        {children}
      </div>
    </div>
  );
}

// ===== BS Chart =====
function BSChart({ cash, other, drawCum, capital, retained }) {
  const total = cash + other + drawCum;
  const max = Math.max(total, capital, 1);
  const H = 200, px = v => (Math.max(0,v)/max)*H;
  const pos = retained >= 0;
  const [tip, setTip] = useState(null);
  return (
    <div className="relative">
      <div className="flex gap-3 justify-center">
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full rounded-lg overflow-hidden bg-stone-100 flex flex-col" style={{height:H}}>
            <Seg h={px(cash)} c="#3b82f6" label="現金（店）" v={cash} st={setTip}/>
            <Seg h={px(drawCum)} c="#fbbf24" label="事業主貸" v={drawCum} st={setTip}/>
            <Seg h={px(other)} c="#93c5fd" label="什器・敷金" v={other} st={setTip}/>
          </div>
          <span className="text-xs text-stone-500 mt-1.5 font-medium">資産</span>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full rounded-lg overflow-hidden bg-stone-100 flex flex-col" style={{height:H}}>
            {pos?(<>
              <Seg h={px(retained)} c="#6ee7b7" label="利益剰余" v={retained} st={setTip}/>
              <Seg h={px(capital)} c="#10b981" label="元手（開業時）" v={capital} st={setTip}/>
            </>):(<>
              <Seg h={px(Math.abs(retained))} c="#cbd5e1" label="欠損" v={retained} st={setTip}/>
              <Seg h={px(capital+retained)} c="#10b981" label="元手の残り" v={capital+retained} st={setTip}/>
            </>)}
          </div>
          <span className="text-xs text-stone-500 mt-1.5 font-medium">負債・純資産</span>
        </div>
      </div>
      {tip&&<div className="absolute left-1/2 -translate-x-1/2 top-0 bg-stone-800 text-white text-[11px] rounded-lg px-3 py-1.5 shadow pointer-events-none whitespace-nowrap z-20">{tip.label}：{yen(tip.v)}</div>}
    </div>
  );
}
function Seg({ h, c, label, v, st }) {
  const show = h > 28;
  return (
    <div style={{height:h,background:c,width:"100%",transition:"height 0.7s cubic-bezier(0.22,1,0.36,1)",borderTop:h>0?"1px solid rgba(255,255,255,0.7)":"none"}}
      className="flex flex-col items-center justify-center overflow-hidden shrink-0 cursor-pointer select-none"
      onMouseEnter={()=>st({label,v})} onMouseLeave={()=>st(null)}
      onTouchStart={()=>st({label,v})} onTouchEnd={()=>st(null)}>
      {show&&<><span className="text-[11px] font-medium text-white/95 leading-tight px-1 text-center">{label}</span><span className="text-[10px] text-white/90">{yen(v)}</span></>}
    </div>
  );
}

// ===== Spark =====
function Spark({ data, color, height=44 }) {
  if (!data||data.length===0) return null;
  const w=280,h=height,pad=4;
  const max=Math.max(...data.map(d=>d.v),1), min=Math.min(...data.map(d=>d.v),0);
  const range=max-min||1, n=data.length;
  const x=i=>n<=1?w/2:pad+(i*(w-pad*2))/(n-1);
  const y=v=>h-pad-((v-min)/range)*(h-pad*2);
  const pts=data.map((d,i)=>`${x(i)},${y(d.v)}`).join(" ");
  const last=data[data.length-1];
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{height}}>
        {n>1&&<polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
        {data.map((d,i)=><circle key={i} cx={x(i)} cy={y(d.v)} r={i===n-1?3.5:2} fill={color}/>)}
      </svg>
      <div className="flex justify-between text-[9px] text-stone-400 px-1"><span>{data[0].m}月</span><span>{last.m}月</span></div>
    </div>
  );
}

// ===== UI parts =====
function Shell({ children, cash }) {
  return (
    <div className="min-h-screen bg-stone-100 flex justify-center p-3" style={{fontFamily:"system-ui,sans-serif"}}>
      <div className="w-full max-w-md pb-8">
        {cash!==undefined&&<TopCash cash={cash}/>}
        {children}
      </div>
    </div>
  );
}
function TopCash({ cash }) {
  return (
    <div className="sticky top-0 z-10 bg-stone-900 text-white rounded-xl px-4 py-2.5 mb-2 flex items-center justify-between shadow">
      <span className="text-xs text-stone-300 flex items-center gap-1.5"><span className="text-base">💰</span>お店の現金</span>
      <AN value={cash} className={"text-xl font-medium "+(cash<500000?"text-red-400":"text-white")}/>
    </div>
  );
}
function StepHeader({ month, label }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">個人事業主</span>
      <span className="text-sm text-stone-500">{label}（{month}/{MONTHS}）</span>
    </div>
  );
}
function Btn({ children, onClick }) {
  return <button onClick={onClick} className="w-full mt-4 bg-amber-700 hover:bg-amber-800 text-white rounded-xl py-3 text-sm font-medium transition-colors">{children}</button>;
}
function Row({ label, val, bold, red }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-stone-500">{label}</span>
      <span className={"text-sm "+(bold?"font-medium ":"")+(red?"text-red-600":"text-stone-700")}>{val}</span>
    </div>
  );
}
function Choice({ label, value, setValue, opts }) {
  return (
    <div className="mb-3">
      <div className="text-sm text-stone-600 mb-1">{label}</div>
      <div className="flex gap-1">
        {opts.map((o,i)=>(
          <button key={i} onClick={()=>setValue(i+1)}
            className={"flex-1 text-[11px] leading-tight rounded-lg py-2 px-1 border transition-colors "+(value===i+1?"bg-amber-700 text-white border-amber-700":"bg-white text-stone-600 border-stone-200")}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
function Diff({ cur, prev, unit }) {
  const d=cur-prev;
  if(d===0) return <span className="text-stone-300">(±0)</span>;
  const v=unit?Math.abs(d)+unit:yen(Math.abs(d));
  return <span className={d>0?"text-green-600":"text-red-500"}>({d>0?"+":"−"}{v})</span>;
}
function PL2({ label, m, pm, y, bold, sub, indent, indent2, redNeg, topline, orange }) {
  const pad=indent2?"pl-4":indent?"pl-2":"";
  const fmt=v=>(v<0?"△":"")+yen(Math.abs(v));
  const valCol=v=>orange?"text-amber-700":redNeg&&v<0?"text-red-600":v<0?"text-stone-400":"text-stone-700";
  let diff=null;
  if(pm!==null&&pm!==undefined){
    const d=m-pm, sign=d>0?"+":d<0?"−":"±";
    diff=<span className={"text-[9px] "+(d===0?"text-stone-300":"text-stone-400")}> ({sign}{yen(Math.abs(d))})</span>;
  }
  const rc=(sub?"border-t border-stone-100 ":"")+(topline?"border-t border-stone-300 ":"");
  const lc=bold?"font-medium text-stone-700":sub?"text-stone-600":"text-stone-500";
  return (
    <tr className={rc}>
      <td className={"py-1 "+pad+" "+lc}>{label}</td>
      <td className={"py-1 text-right whitespace-nowrap "+(bold?"font-medium ":"")+valCol(m)}>{fmt(m)}{diff}</td>
      <td className={"py-1 text-right "+(bold?"font-medium ":"")+valCol(y)}>{fmt(y)}</td>
    </tr>
  );
}

// ===== Main =====
export default function App() {
  const [step, setStep] = useState("title");
  const [month, setMonth] = useState(1);
  const [cash, setCash] = useState(START_CASH);
  const [otherAsset, setOtherAsset] = useState(0);
  const [drawCum, setDrawCum] = useState(0);
  const [yearSales, setYearSales] = useState(0);
  const [yearCost, setYearCost] = useState(0);
  const [yearRent, setYearRent] = useState(0);
  const [yearLease, setYearLease] = useState(0);
  const [yearUtil, setYearUtil] = useState(0);
  const [yearAd, setYearAd] = useState(0);
  const [yearFoodInvest, setYearFoodInvest] = useState(0);
  const [retained, setRetained] = useState(0);
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
  const [food, setFood] = useState(0);
  const [foodInvested, setFoodInvested] = useState(false);

  const capital = START_CASH;
  const yearFixed = yearRent+yearLease+yearUtil+yearAd+yearFoodInvest;
  const yearProfit = yearSales-yearCost-yearFixed;
  const totalAsset = cash+otherAsset+drawCum;
  const netEquity = capital+retained;
  const bsMax = Math.max(totalAsset, capital, 1);

  const doSetup = () => {
    setCash(START_CASH-SETUP_TOTAL);
    setOtherAsset(SETUP_ASSET);
    setRetained(-(SETUP_TOTAL-SETUP_ASSET));
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
    // フード効果
    const foodAdd=[0,100,200][food];
    const cogsRate=[0.32,0.36,0.40][food];
    let foodInvThisMonth=0;
    if(food>0&&!foodInvested){ foodInvThisMonth=FOOD_INVEST_COST; setFoodInvested(true); }
    const effPrice=py+foodAdd;
    const sales=customers*effPrice;
    const cogs=Math.round(sales*cogsRate);
    const adCost=[0,50000,120000][ad];
    const fixed=RENT+LEASE+UTILITY+adCost+foodInvThisMonth;
    const profit=sales-cogs-fixed;
    const flow=profit-draw;
    const unit=customers>0?Math.round(sales/customers):0;
    setPrev(cur);
    setCur({sales,cogs,rent:RENT,lease:LEASE,util:UTILITY,ad:adCost,foodInvest:foodInvThisMonth,fixed,profit,gross:sales-cogs,customers,unit});
    setHistory(h=>[...h,{m:season,sales,customers,unit}]);
    setCash(c=>c+flow);
    setYearSales(y=>y+sales); setYearCost(y=>y+cogs);
    setYearRent(y=>y+RENT); setYearLease(y=>y+LEASE); setYearUtil(y=>y+UTILITY);
    setYearAd(y=>y+adCost); setYearFoodInvest(y=>y+foodInvThisMonth);
    setRetained(r=>r+profit); setDrawCum(d=>d+draw);
    setLastFlow(flow); setLastProfit(profit); setLastDraw(draw);
    setStep("reveal");
  };

  const afterSheets = () => {
    if(cash<0||month>=MONTHS){ setStep("result"); return; }
    setMonth(m=>m+1); setStep("plan");
  };

  const restart = () => {
    setStep("title"); setMonth(1); setCash(START_CASH); setOtherAsset(0); setDrawCum(0);
    setYearSales(0); setYearCost(0); setYearRent(0); setYearLease(0); setYearUtil(0); setYearAd(0);
    setYearFoodInvest(0); setRetained(0); setCur(null); setPrev(null); setHistory([]);
    setLastFlow(null); setLastProfit(null); setLastDraw(null);
    setStock(2); setPrice(2); setAd(0); setDraw(150000); setFood(0); setFoodInvested(false);
  };

  // ===== Title =====
  if(step==="title") return (
    <Shell>
      <div className="text-center pt-8">
        <Sakura size={88} mood="happy"/>
        <h1 className="text-xl font-medium text-stone-800 mt-2">朝のラテ</h1>
        <p className="text-sm text-stone-500">ステージ1 ― 個人事業主編</p>
      </div>
      <Talk who="sakura">会社を辞めて、念願のカフェを開くんだ。貯金は<b>{yen(START_CASH)}</b>。うまくやっていけるかな…。一緒に経営してくれよ。</Talk>
      <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200 text-[12px] text-stone-500 leading-relaxed">
        ・現金が尽きたらゲームオーバー<br/>
        ・1年で <b className="text-stone-700">年間利益 {yen(TARGET_PROFIT)}</b> 達成でクリア<br/>
        ・毎月の判断でPL・BSが動きます
      </div>
      <Btn onClick={()=>setStep("setup")}>開業の準備をする →</Btn>
    </Shell>
  );

  // ===== Setup =====
  if(step==="setup") {
    const pvC=START_CASH-SETUP_TOTAL, pvO=SETUP_ASSET, pvR=-(SETUP_TOTAL-SETUP_ASSET);
    const pvE=START_CASH+pvR, pvMax=Math.max(pvC+pvO,START_CASH,1);
    return (
      <Shell>
        <h2 className="text-lg font-medium text-stone-800 pt-2">開業準備</h2>
        <Talk who="hotta">はじめまして、会計士の堀田です。物件は居抜き、マシンはリース。<b>大きな買い物をせずに始めるのは賢い</b>ですよ。</Talk>
        <div className="bg-stone-50 rounded-xl p-3 mt-3 border border-stone-200">
          <Row label="開業前の貯金" val={yen(START_CASH)}/>
          <Row label="初期費用（支払い）" val={"−"+yen(SETUP_TOTAL)} red/>
          <div className="border-t border-stone-200 my-1"></div>
          <Row label="開業後の現金" val={yen(pvC)} bold/>
        </div>
        <div className="bg-white rounded-xl p-3 mt-3 border border-stone-200">
          <div className="text-xs text-stone-500 mb-2">開業直後のBS（貸借対照表）</div>
          <BSChart cash={pvC} other={pvO} drawCum={0} capital={START_CASH} retained={pvR}/>
          <p className="text-[11px] text-stone-500 leading-relaxed mt-2">左の柱（資産）と右の柱（純資産）の高さは<b>必ず釣り合います</b>。</p>
        </div>
        <Talk who="hotta">BSの<b>現金はお店の現金</b>、<b>元手は開業時から不変</b>です。生活費の引き出しは「事業主貸」として記録されます。黒字でも生活費を取りすぎればお店の現金は減る。ここ、つまずきやすいですからね。</Talk>
        <Btn onClick={doSetup}>開業する →</Btn>
      </Shell>
    );
  }

  // ===== Plan（佐倉コメント＋作戦を1画面に） =====
  if(step==="plan") {
    const foodFirstTime = food>0&&!foodInvested;
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

          {/* フードメニュー */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-stone-600">フードメニュー</span>
              {foodFirstTime&&(
                <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                  初回¥20万の先行投資
                </span>
              )}
              {foodInvested&&<span className="text-[11px] text-green-600 font-medium">✓ 導入済み</span>}
            </div>
            <div className="flex gap-1">
              {[
                {label:"なし",sub:"ドリンクのみ"},
                {label:"軽食",sub:"+¥100/客\n原価率36%"},
                {label:"フルメニュー",sub:"+¥200/客\n原価率40%"},
              ].map((o,i)=>(
                <button key={i} onClick={()=>setFood(i)}
                  className={"flex-1 rounded-lg py-2 px-1 border transition-colors text-center "+(food===i?"bg-amber-700 text-white border-amber-700":"bg-white text-stone-600 border-stone-200")}>
                  <div className="text-[12px] font-medium leading-tight">{o.label}</div>
                  <div className="text-[10px] leading-tight mt-0.5 opacity-80 whitespace-pre-line">{o.sub}</div>
                </button>
              ))}
            </div>
            {foodFirstTime&&(
              <div className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2 border border-amber-100">
                この月に¥{(FOOD_INVEST_COST/10000).toFixed(0)}万の導入費が発生し、PLの費用として計上されます。来月以降の客単価・粗利改善で回収できます。
              </div>
            )}
          </div>

          <div className="mt-1">
            <div className="flex justify-between text-sm text-stone-600">
              <span>今月の生活費（事業主貸）</span>
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

  // ===== Reveal（結果＋堀田コメント） =====
  if(step==="reveal") {
    let msg;
    if(cash<0) msg=<>現金が尽きました…。利益が出ていても現金が回らなければ事業は止まる。これが最初の壁です。</>;
    else if(cur.foodInvest>0) msg=<>フードメニューの導入費¥{yen(FOOD_INVEST_COST)}を今月のPLに計上しました。今月は大きな出費になりますが、来月から<b>客単価と粗利率が改善</b>します。何ヶ月で回収できるか、意識してみましょう。</>;
    else if(month===1) msg=<>売上から原価・固定費を引いたのが<b>利益</b>。生活費はお店から引き出すと<b>「事業主貸」</b>として資産に振り替わります。BSの黄色がそれ。お店の現金が個人へ流れた記録です。</>;
    else if(lastProfit>0&&lastFlow<0) msg=<>今月は<b>黒字なのに現金が減りました</b>。生活費の取りすぎです。黒字でも油断は禁物ですよ。</>;
    else if(cash<500000) msg=<>現金が心細い。来月の固定費は待ってくれません。生活費を抑えるか、売上を伸ばす手を打ちましょう。</>;
    else if(cur.profit>0) msg=<>いい調子です。この調子で年間目標を目指しましょう。</>;
    else msg=<>今月は赤字でしたね。価格・仕入れ・広告・フードのバランスを見直してみましょう。</>;
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
          <Row label="生活費（事業主貸）" val={"−"+yen(lastDraw)} red/>
          <div className="border-t border-stone-200 my-1"></div>
          <Row label="現金の増減" val={(lastFlow>=0?"+":"−")+yen(Math.abs(lastFlow))} bold red={lastFlow<0}/>
        </div>
        <Talk who="hotta">{msg}</Talk>
        <Btn onClick={()=>setStep("sheets")}>決算書を見る →</Btn>
      </Shell>
    );
  }

  // ===== Sheets（PL上・BS下） =====
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
            {(cur.foodInvest>0||yearFoodInvest>0)&&(
              <PL2 label="フード導入費（先行投資）" m={-cur.foodInvest} pm={null} y={-yearFoodInvest} indent2 orange/>
            )}
            <PL2 label="当期純利益" m={cur.profit} pm={prev?prev.profit:null} y={yearProfit} bold redNeg topline/>
          </tbody>
        </table>
      </div>
      {/* 進捗 */}
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <div className="flex justify-between text-xs text-stone-500">
          <span>年間利益クリア目標</span>
          <span><AN value={yearProfit} className={yearProfit>=TARGET_PROFIT?"text-green-600 font-medium":"text-stone-700 font-medium"}/> / {yen(TARGET_PROFIT)}</span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{width:Math.max(0,Math.min(100,yearProfit/TARGET_PROFIT*100))+"%"}}></div>
        </div>
      </div>
      {/* BS */}
      <div className="bg-white rounded-xl p-3 mt-2 border border-stone-200">
        <div className="text-xs text-stone-500 mb-2">BS 貸借対照表（店の財産）</div>
        <BSChart cash={cash} other={otherAsset} drawCum={drawCum} capital={capital} retained={retained}/>
        <p className="text-[10px] text-stone-400 text-center mt-1">タップ／ホバーで科目と金額を確認できます</p>
      </div>
      <Btn onClick={afterSheets}>{month>=MONTHS?"結果を見る →":`${MOS[month%12]}月へ進む →`}</Btn>
    </Shell>
  );

  // ===== Result =====
  const cleared=cash>=0&&yearProfit>=TARGET_PROFIT;
  const bankrupt=cash<0;
  const incomeTax=!bankrupt?Math.max(0,Math.round(yearProfit*0.15)):0;
  return (
    <Shell>
      <div className="text-center pt-6">
        <Sakura size={88} mood={bankrupt?"worried":"happy"}/>
        <h2 className="text-lg font-medium text-stone-800 mt-2">
          {bankrupt?"資金ショート…":cleared?"1年目クリア！":"1年を生き延びた"}
        </h2>
      </div>
      <div className="bg-white rounded-xl p-4 mt-4 border border-stone-200">
        <Row label="年間売上" val={yen(yearSales)}/>
        <Row label="年間利益" val={yen(yearProfit)} bold red={yearProfit<0}/>
        <Row label="最終現金（店）" val={yen(cash)} red={cash<0}/>
        <Row label="純資産" val={yen(netEquity)}/>
      </div>
      {!bankrupt&&<Talk who="hotta">確定申告です。今年の税金（概算）は<b>約{yen(incomeTax)}</b>。所得税・住民税・国保・国民年金など。<b>稼ぐほど累進で重くなります。</b></Talk>}
      <Talk who={bankrupt?"hotta":"sakura"}>
        {bankrupt?<>現金が尽きました。もう一度、挑戦しましょう。</>
        :cleared?<>やった、目標達成だ！…でも税金、けっこう重いな。堀田さん、会社にしたら変わるって本当?</>
        :<>潰れずに1年やりきった。来年こそ目標を狙うぞ。</>}
      </Talk>
      {cleared&&(
        <div className="bg-stone-800 text-white rounded-xl p-4 mt-3 text-sm leading-relaxed">
          <div className="text-amber-300 text-xs mb-1">🔓 NEXT STAGE</div>
          ステージ2「法人成り」が見えてきた。<br/>
          <span className="text-stone-300 text-xs">資本金・役員報酬・法人税…新しい世界が始まる。</span>
        </div>
      )}
      <Btn onClick={restart}>もう一度プレイする ↺</Btn>
    </Shell>
  );
}
