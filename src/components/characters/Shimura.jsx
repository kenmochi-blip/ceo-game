// 志村遥（公認会計士・税理士）のSVGキャラクター
export default function Shimura({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#e8eef5"/>
      <rect x="43" y="58" width="14" height="12" fill="#d8a87a"/>
      <path d="M28 95 Q28 70 50 68 Q72 70 72 95 Z" fill="#3a4256"/>
      <path d="M46 68 L50 80 L54 68 Z" fill="#fff"/>
      <rect x="48.5" y="68" width="3" height="20" fill="#7a8aa0"/>
      <circle cx="50" cy="44" r="20" fill="#e6c096"/>
      <path d="M30 40 Q31 23 50 23 Q69 23 70 40 Q66 30 50 30 Q34 30 30 40 Z" fill="#4a4036"/>
      <circle cx="43" cy="45" r="6" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
      <circle cx="57" cy="45" r="6" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
      <line x1="49" y1="45" x2="51" y2="45" stroke="#2a2a2a" strokeWidth="1.5"/>
      <circle cx="43" cy="45" r="1.8" fill="#2a2118"/>
      <circle cx="57" cy="45" r="1.8" fill="#2a2118"/>
      <path d="M45 54 Q50 56 55 54" stroke="#6a4a2a" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
