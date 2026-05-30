import Sakura from "./Sakura";
import Hotta from "./Hotta";

// 吹き出しコンポーネント（who: "hotta" / それ以外は佐倉）
export default function Talk({ who, children }) {
  return (
    <div className="flex items-end gap-2 mt-3">
      <div className="shrink-0">{who==="hotta"?<Hotta size={52}/>:<Sakura size={52}/>}</div>
      <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm p-3 text-[13px] text-stone-700 leading-relaxed flex-1">
        <div className="text-[10px] text-stone-400 mb-0.5">{who==="hotta"?"堀田（会計士）":"佐倉"}</div>
        {children}
      </div>
    </div>
  );
}
