import { MONTHS } from "../../constants";

// 各ステップの見出し（ステージ名＋進捗）
export default function StepHeader({ month, label }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">個人事業主</span>
      <span className="text-sm text-stone-500">{label}（{month}/{MONTHS}）</span>
    </div>
  );
}
