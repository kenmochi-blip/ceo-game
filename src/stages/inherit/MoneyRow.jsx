import { manYen, manYenDiff } from "./data";

// PL/BS用の金額行。万円の位置と（前月比）の位置を、行ごとに幅を固定して揃える。
export default function MoneyRow({ label, cur, prev, negative, bold, red, showDiff = true }) {
  const mainText = (negative ? "−" : "") + manYen(cur);
  const hasDiff = showDiff && prev !== undefined && prev !== null;
  return (
    <div className="flex justify-between py-1">
      <span className={"text-sm " + (bold ? "font-medium text-stone-700" : "text-stone-500")}>{label}</span>
      <span className="flex items-baseline justify-end">
        <span className={"text-sm tabular-nums text-right w-24 shrink-0 " + (bold ? "font-medium " : "") + (red ? "text-red-600" : "text-stone-700")}>
          {mainText}
        </span>
        <span className="text-[10px] text-stone-400 text-right w-16 shrink-0 ml-1 tabular-nums">
          {hasDiff ? `（${manYenDiff(cur - prev)}）` : ""}
        </span>
      </span>
    </div>
  );
}
