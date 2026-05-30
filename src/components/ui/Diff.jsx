import { yen } from "../../constants";

// 前月比などの増減表示
export default function Diff({ cur, prev, unit }) {
  const d=cur-prev;
  if(d===0) return <span className="text-stone-300">(±0)</span>;
  const v=unit?Math.abs(d)+unit:yen(Math.abs(d));
  return <span className={d>0?"text-green-600":"text-red-500"}>({d>0?"+":"−"}{v})</span>;
}
