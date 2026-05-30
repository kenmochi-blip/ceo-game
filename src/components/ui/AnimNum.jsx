import { useState, useEffect, useRef } from "react";
import { yen } from "../../constants";

// 目標値までカウントアップするフック
export function useAnimNum(target, dur = 700) {
  const [v, setV] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const from = ref.current, to = target;
    if (from === to) return;
    let raf; const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else { setV(to); ref.current = to; }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  ref.current = v;
  return v;
}

// カウントアップ表示（円フォーマット）
export default function AN({ value, className }) {
  return <span className={className}>{yen(useAnimNum(value))}</span>;
}
