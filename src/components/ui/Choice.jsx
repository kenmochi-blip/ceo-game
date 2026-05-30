// 横並びの選択肢ボタン群（1始まりの値を返す）
export default function Choice({ label, value, setValue, opts }) {
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
