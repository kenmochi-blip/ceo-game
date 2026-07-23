import { manYen } from "./data";

// BSの面積図（資産＝負債＋純資産、自己資本比率がどの部分かを直感的に示す）
export default function BSDiagram({ totalAssets, liabilities, equity, ratio }) {
  const safeTotal = totalAssets > 0 ? totalAssets : 1;
  const liabFlex = Math.max((liabilities / safeTotal) * 100, 2);
  const equityFlex = Math.max((equity / safeTotal) * 100, 2);
  return (
    <div className="mt-2">
      <div className="flex border border-stone-300 rounded overflow-hidden" style={{ height: 140 }}>
        <div className="w-1/2 flex items-center justify-center text-center text-[12px] leading-tight p-1"
          style={{ backgroundColor: "#cdeaf7" }}>
          <div>資産合計①<br /><b>{manYen(totalAssets)}</b></div>
        </div>
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-center text-center text-[12px] leading-tight p-1"
            style={{ backgroundColor: "#f6cdf3", flexGrow: liabFlex, flexBasis: 0 }}>
            <div>負債合計②<br /><b>{manYen(liabilities)}</b></div>
          </div>
          <div className="flex items-center justify-center text-center text-[12px] leading-tight p-1"
            style={{ backgroundColor: "#d9bdf5", flexGrow: equityFlex, flexBasis: 0 }}>
            <div>純資産合計③<br /><b>{manYen(equity)}</b></div>
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-1.5 text-[13px] text-stone-600">
        <span>自己資本比率　③÷①</span>
        <span className="font-medium text-stone-800">{ratio.toFixed(1)}%</span>
      </div>
    </div>
  );
}
