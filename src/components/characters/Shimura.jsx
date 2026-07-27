// 志村遥（公認会計士・税理士、中年女性）のSVGキャラクター
export default function Shimura({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#e8eef5"/>
      <rect x="43" y="58" width="14" height="12" fill="#d8a87a"/>
      <path d="M27 96 Q27 70 50 68 Q73 70 73 96 Z" fill="#6b4a5a"/>
      <path d="M45 68 L50 78 L55 68 Z" fill="#fff"/>
      <rect x="44" y="68" width="12" height="20" fill="#7d5c6c"/>
      <circle cx="50" cy="44" r="20" fill="#e6c096"/>
      {/* 後ろでまとめた髪（お団子）、少し白髪交じりで中年らしさを出す */}
      <circle cx="50" cy="26" r="7" fill="#6a5f57"/>
      <path d="M29 44 Q28 24 50 23 Q72 24 71 44 Q70 32 50 30 Q30 32 29 44 Z" fill="#6a5f57"/>
      <path d="M32 36 Q34 32 38 31" stroke="#b3a89e" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <path d="M64 33 Q67 30 70 33" stroke="#b3a89e" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <circle cx="43" cy="45" r="6" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
      <circle cx="57" cy="45" r="6" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
      <line x1="49" y1="45" x2="51" y2="45" stroke="#2a2a2a" strokeWidth="1.5"/>
      <circle cx="43" cy="45" r="1.8" fill="#2a2118"/>
      <circle cx="57" cy="45" r="1.8" fill="#2a2118"/>
      <path d="M45 54 Q50 56 55 54" stroke="#8a5a3a" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      {/* 小さなイヤリング */}
      <circle cx="34" cy="52" r="1.4" fill="#d8a04a"/>
      <circle cx="66" cy="52" r="1.4" fill="#d8a04a"/>
    </svg>
  );
}
