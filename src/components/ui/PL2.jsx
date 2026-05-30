import { yen } from "../../constants";

// 報告式PLの1行（単月＋前月比＋累計）
export default function PL2({ label, m, pm, y, bold, sub, indent, indent2, redNeg, topline, orange }) {
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
