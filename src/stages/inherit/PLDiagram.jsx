import { manYen } from "./data";

const MIN_PCT = 6; // 極端に小さい区分でも視認できる最低の高さ(%)

// PLの面積図（費用の積み上げ 対 収益、その差が当期純利益として視覚的にわかる）
export default function PLDiagram({ cogs, sga, interest, sales }) {
  const safeInterest = Math.max(interest, 0);
  const costTotal = cogs + sga + safeInterest;
  const maxVal = Math.max(costTotal, sales, 1);
  const rawPct = v => (Math.max(v, 0) / maxVal) * 100;
  const pct = v => `${v <= 0 ? 0 : Math.max(rawPct(v), MIN_PCT)}%`;

  return (
    <div className="mt-2">
      <div className="flex gap-3" style={{ height: 190 }}>
        <div className="w-1/2 flex flex-col-reverse border border-stone-300 rounded overflow-hidden">
          <div style={{ height: pct(cogs), backgroundColor: "#2f5fa8" }}
            className="flex items-center justify-center text-center text-[11px] text-white leading-tight px-1 overflow-hidden">
            {rawPct(cogs) >= MIN_PCT * 0.8 && <>売上原価<br />{manYen(cogs)}</>}
          </div>
          <div style={{ height: pct(sga), backgroundColor: "#6f9bdb" }}
            className="flex items-center justify-center text-center text-[11px] text-white leading-tight px-1 overflow-hidden">
            {rawPct(sga) >= MIN_PCT * 0.8 && <>販管費<br />{manYen(sga)}</>}
          </div>
          {safeInterest > 0 && (
            <div style={{ height: pct(safeInterest), backgroundColor: "#9b7fd8" }}
              className="flex items-center justify-center text-center text-[9px] text-white leading-none px-1 overflow-hidden">
              支払利息
            </div>
          )}
        </div>
        <div className="w-1/2 flex flex-col-reverse border border-stone-300 rounded overflow-hidden">
          <div style={{ height: pct(sales), backgroundColor: "#e5533d" }}
            className="flex items-center justify-center text-center text-[11px] text-white leading-tight px-1 overflow-hidden">
            売上高<br />{manYen(sales)}
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-1.5 text-[13px] text-stone-600">
        <span>費用</span>
        <span>収益</span>
      </div>
      <div className="text-center text-[12px] text-stone-500 mt-1">
        この2本の高さの差が<b className="text-stone-700">当期純利益</b>です
      </div>
    </div>
  );
}
