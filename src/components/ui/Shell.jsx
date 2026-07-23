import AN from "./AnimNum";

// 画面の外枠（上部に現金バー）
export default function Shell({ children, cash, cashLabel, transitioning }) {
  return (
    <div className="min-h-screen bg-stone-100 flex justify-center p-3" style={{fontFamily:"system-ui,sans-serif"}}>
      <div className="w-full max-w-md pb-8">
        {cash!==undefined&&<TopCash cash={cash} label={cashLabel}/>}
        {children}
      </div>
      <div className={"fixed inset-0 z-[100] bg-black pointer-events-none transition-opacity duration-300 "+(transitioning?"opacity-100":"opacity-0")}/>
    </div>
  );
}

function TopCash({ cash, label }) {
  return (
    <div className="sticky top-0 z-10 bg-stone-900 text-white rounded-xl px-4 py-2.5 mb-2 flex items-center justify-between shadow">
      <span className="text-xs text-stone-300 flex items-center gap-1.5"><span className="text-base">💰</span>{label||"お店の現金"}</span>
      <AN value={cash} className={"text-xl font-medium "+(cash<500000?"text-red-400":"text-white")}/>
    </div>
  );
}
