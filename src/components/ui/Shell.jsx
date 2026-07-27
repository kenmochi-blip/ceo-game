import AN from "./AnimNum";

// 画面の外枠（上部に現金バー）
export default function Shell({ children, cash, cashLabel, cashDiff, transitioning }) {
  return (
    <div className="min-h-screen bg-stone-100 flex justify-center p-3" style={{fontFamily:"system-ui,sans-serif"}}>
      <div className="w-full max-w-md pb-8">
        {cash!==undefined&&<TopCash cash={cash} label={cashLabel} diff={cashDiff}/>}
        {children}
      </div>
      <div className={"fixed inset-0 z-[100] bg-black pointer-events-none transition-opacity duration-300 "+(transitioning?"opacity-100":"opacity-0")}/>
    </div>
  );
}

function TopCash({ cash, label, diff }) {
  const hasDiff = diff !== undefined && diff !== null;
  return (
    <div className="sticky top-0 z-10 bg-stone-900 text-white rounded-xl px-4 py-2.5 mb-2 flex items-center justify-between shadow">
      <span className="text-xs text-stone-300 flex items-center gap-1.5"><span className="text-base">💰</span>{label||"お店の現金"}</span>
      <span className="flex items-baseline gap-1.5">
        <AN value={cash} className={"text-xl font-medium "+(cash<500000?"text-red-400":"text-white")}/>
        {hasDiff && (
          <span className={"text-[11px] tabular-nums "+(diff<0?"text-red-300":"text-emerald-300")}>
            （{diff===0?"±0":(diff>0?"+":"−")+"¥"+Math.abs(diff).toLocaleString()}）
          </span>
        )}
      </span>
    </div>
  );
}
