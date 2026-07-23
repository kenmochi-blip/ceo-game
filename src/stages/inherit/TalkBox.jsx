// 汎用の吹き出しコンポーネント（avatarとnameを直接渡す版）
export default function TalkBox({ name, avatar, children }) {
  return (
    <div className="flex items-end gap-2 mt-3">
      <div className="shrink-0">{avatar}</div>
      <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm p-3 text-[15px] text-stone-700 leading-relaxed flex-1">
        <div className="text-[12px] text-stone-400 mb-0.5">{name}</div>
        {children}
      </div>
    </div>
  );
}
