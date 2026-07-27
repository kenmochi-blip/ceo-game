// 「継承」：進行の保存（localStorage）
//
// 12ヶ月以上のプレイを前提にするため、ブラウザを閉じても続きから再開できるようにする。
// 保存対象は「シミュレーション状態」だけ。画面遷移やパネルの開閉といったUIの状態は保存しない。

import { MODE } from "./config";

const KEY = `inherit-save-${MODE.key}`;
export const SAVE_VERSION = 1;

export function saveGame(game) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, savedAt: Date.now(), game }));
    return true;
  } catch {
    return false; // プライベートモード等で書けない場合は黙って諦める（プレイは続行できる）
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.v !== SAVE_VERSION) return null; // 仕様変更時は古いセーブを捨てる
    return parsed.game ?? null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

export function hasSave() {
  try { return localStorage.getItem(KEY) != null; } catch { return false; }
}

export function savedMeta() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.v !== SAVE_VERSION) return null;
    return { month: p.game?.month ?? 1, savedAt: p.savedAt };
  } catch {
    return null;
  }
}
