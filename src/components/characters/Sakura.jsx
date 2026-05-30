// 佐倉正隆のSVGキャラクター（mood: normal / happy / worried）
export default function Sakura({ size = 64, mood = "normal" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#fef3e2"/>
      <rect x="43" y="58" width="14" height="12" fill="#e8b98f"/>
      <path d="M30 95 Q30 70 50 68 Q70 70 70 95 Z" fill="#8a5a3b"/>
      <rect x="44" y="68" width="12" height="20" fill="#a06b45"/>
      <circle cx="50" cy="44" r="20" fill="#f3c79b"/>
      <path d="M30 42 Q30 22 50 22 Q70 22 70 42 Q70 32 50 30 Q30 32 30 42 Z" fill="#3b2a20"/>
      <circle cx="43" cy="44" r="2.4" fill="#2a2118"/>
      <circle cx="57" cy="44" r="2.4" fill="#2a2118"/>
      {mood==="happy"?<path d="M44 52 Q50 58 56 52" stroke="#7a4a2a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      :mood==="worried"?<path d="M44 54 Q50 50 56 54" stroke="#7a4a2a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      :<path d="M45 53 L55 53" stroke="#7a4a2a" strokeWidth="2" fill="none" strokeLinecap="round"/>}
      <path d="M40 38 L46 39" stroke="#3b2a20" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M54 39 L60 38" stroke="#3b2a20" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
