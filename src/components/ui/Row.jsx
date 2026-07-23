// ラベルと値の1行表示
export default function Row({ label, val, bold, red }) {
  return (
    <div className="flex justify-between py-1">
      <span className={"text-sm "+(bold?"font-medium text-stone-700":"text-stone-500")}>{label}</span>
      <span className={"text-sm "+(bold?"font-medium ":"")+(red?"text-red-600":"text-stone-700")}>{val}</span>
    </div>
  );
}
