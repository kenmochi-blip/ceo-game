// 「継承」デモ用のSVGキャラクター（Sakura/Shimuraと同じ画風で新規追加）

// 主人公（息子／娘、mood: normal / happy / worried）
export function Player({ size = 64, mood = "normal", gender = "son" }) {
  const isDaughter = gender === "daughter";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill={isDaughter ? "#fdeef2" : "#eaf3fb"} />
      <rect x="43" y="58" width="14" height="12" fill="#e8b98f" />
      {isDaughter ? (
        <path d="M26 96 Q26 68 50 68 Q74 68 74 96 Z" fill="#5a4a63" />
      ) : (
        <path d="M30 96 Q30 70 50 68 Q70 70 70 96 Z" fill="#38507a" />
      )}
      <rect x="44" y="68" width="12" height="20" fill={isDaughter ? "#6b5a75" : "#4a648c"} />
      <circle cx="50" cy="44" r="20" fill="#f3c79b" />
      {isDaughter ? (
        <>
          {/* 長めの髪：両サイドに肩まで流れる */}
          <path d="M28 46 Q26 78 34 90 L40 88 Q34 70 32 44 Z" fill="#3b2a30" />
          <path d="M72 46 Q74 78 66 90 L60 88 Q66 70 68 44 Z" fill="#3b2a30" />
          <path d="M29 42 Q30 21 50 21 Q70 21 71 42 Q70 30 50 28 Q30 30 29 42 Z" fill="#3b2a30" />
        </>
      ) : (
        <path d="M30 42 Q30 22 50 22 Q70 22 70 42 Q70 32 50 30 Q30 32 30 42 Z" fill="#2e2a28" />
      )}
      <circle cx="43" cy="44" r="2.4" fill="#2a2118" />
      <circle cx="57" cy="44" r="2.4" fill="#2a2118" />
      {mood === "happy" ? (
        <path d="M44 52 Q50 58 56 52" stroke="#7a4a2a" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : mood === "worried" ? (
        <path d="M44 54 Q50 50 56 54" stroke="#7a4a2a" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M45 53 L55 53" stroke="#7a4a2a" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
      <path d="M40 38 L46 39" stroke="#2e2a28" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M54 39 L60 38" stroke="#2e2a28" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// 母（先代の妻）
export function Mother({ size = 64, mood = "normal" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#f6f0e6" />
      <rect x="43" y="58" width="14" height="12" fill="#e0ac82" />
      <path d="M27 96 Q27 68 50 68 Q73 68 73 96 Z" fill="#8c7a6a" />
      <rect x="44" y="68" width="12" height="20" fill="#a08d78" />
      <circle cx="50" cy="44" r="20" fill="#eec49a" />
      {/* 後ろでまとめた髪＋お団子 */}
      <circle cx="50" cy="27" r="7" fill="#5a5450" />
      <path d="M29 44 Q28 24 50 23 Q72 24 71 44 Q70 33 50 31 Q30 33 29 44 Z" fill="#5a5450" />
      <circle cx="43" cy="45" r="2.2" fill="#2a2118" />
      <circle cx="57" cy="45" r="2.2" fill="#2a2118" />
      {mood === "worried" ? (
        <path d="M44 55 Q50 51 56 55" stroke="#8a5a3a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M44 53 Q50 57 56 53" stroke="#8a5a3a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      )}
      <path d="M40 39 Q43 37 46 39" stroke="#5a5450" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M54 39 Q57 37 60 39" stroke="#5a5450" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// 剱持（銀行担当者）
export function Banker({ size = 64, mood = "normal" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#eceef2" />
      <rect x="43" y="58" width="14" height="12" fill="#d8a87a" />
      <path d="M28 96 Q28 70 50 68 Q72 70 72 96 Z" fill="#25304a" />
      <path d="M46 68 L50 80 L54 68 Z" fill="#fff" />
      <rect x="48.5" y="68" width="3" height="20" fill="#8a2f3a" />
      <circle cx="50" cy="44" r="20" fill="#dcb488" />
      <path d="M30 40 Q31 24 50 24 Q69 24 70 40 Q68 30 50 29 Q32 30 30 40 Z" fill="#4a4a4a" />
      {/* 角ばった銀縁メガネ */}
      <rect x="37" y="40" width="12" height="9" rx="1.5" fill="none" stroke="#2a2a2a" strokeWidth="1.6" />
      <rect x="51" y="40" width="12" height="9" rx="1.5" fill="none" stroke="#2a2a2a" strokeWidth="1.6" />
      <line x1="49" y1="44" x2="51" y2="44" stroke="#2a2a2a" strokeWidth="1.6" />
      <circle cx="43" cy="45" r="1.6" fill="#2a2118" />
      <circle cx="57" cy="45" r="1.6" fill="#2a2118" />
      {mood === "stern" ? (
        <path d="M45 55 L55 55" stroke="#6a4a2a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M45 54 Q50 56 55 54" stroke="#6a4a2a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
