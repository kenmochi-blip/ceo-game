import Sakura from "./Sakura";
import Shimura from "./Shimura";

// 吹き出しコンポーネント（who: "shimura" / それ以外は佐倉）
export default function Talk({ who, children }) {
  return (
    <div className="flex items-end gap-2 mt-3">
      <div className="shrink-0">{who==="shimura"?<Shimura size={52}/>:<Sakura size={52}/>}</div>
      <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm p-3 text-[15px] text-stone-700 leading-relaxed flex-1">
        <div className="text-[12px] text-stone-400 mb-0.5">{who==="shimura"?"志村（会計士）":"佐倉"}</div>
        {children}
      </div>
    </div>
  );
}
