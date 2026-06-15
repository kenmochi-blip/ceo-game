import { useState } from "react";
import Shimura from "../characters/Shimura";

// 志村の段階解説モーダル。lesson={title, steps:[{heading?, body}], closeLabel?}
export default function Lesson({ lesson, onClose }) {
  const [i, setI] = useState(0);
  if (!lesson) return null;
  const steps = lesson.steps;
  const step = steps[i];
  const last = i >= steps.length - 1;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-4 shadow-xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
          <div className="shrink-0"><Shimura size={42}/></div>
          <div>
            <div className="text-[12px] text-stone-400">志村（会計士）のワンポイント解説</div>
            <div className="text-sm font-medium text-stone-800">{lesson.title}</div>
          </div>
        </div>
        <div className="py-3 text-[15px] text-stone-700 leading-relaxed min-h-[128px]">
          {step.heading && <div className="font-medium text-stone-800 mb-1">{step.heading}</div>}
          {step.body}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5 items-center">
            {steps.map((_, k) => (
              <span key={k} className={"w-1.5 h-1.5 rounded-full transition-colors "+(k===i?"bg-amber-600":"bg-stone-200")}/>
            ))}
            <span className="text-[12px] text-stone-400 ml-1">{i+1}/{steps.length}</span>
          </div>
          <div className="flex gap-2">
            {i>0 && <button onClick={()=>setI(i-1)} className="text-sm text-stone-500 px-3 py-1.5">戻る</button>}
            {!last
              ? <button onClick={()=>setI(i+1)} className="bg-amber-700 hover:bg-amber-800 text-white text-sm rounded-lg px-4 py-1.5 transition-colors">次へ →</button>
              : <button onClick={onClose} className="bg-amber-700 hover:bg-amber-800 text-white text-sm rounded-lg px-4 py-1.5 transition-colors">{lesson.closeLabel||"とじる"}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// 各画面に置く「？解説」ボタン
export function InfoButton({ onClick, label = "解説" }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 hover:bg-amber-100 transition-colors">
      <span className="font-bold">?</span>{label}
    </button>
  );
}
