import { useState } from "react";
import { yen } from "../../constants";

// 貸借対照表グラフ（資産の柱 vs 負債・純資産の柱）
export default function BSChart({ cash, other, drawCum, capital, retained }) {
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
