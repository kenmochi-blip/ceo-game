// 「継承」：施策メニュー（レバー別）
//
// 業務分類ではなく「どのレバーを動かすか」で並べる。メニューを開くたびに
// 「売上を上げたい → 客数か客単価か」を目にすることになり、UIそのものが教材になる。

import { ACTION_GROUPS, ACTIONS, canRun } from "./actions";
import { manYen } from "./data";

export default function ActionMenu({ g, selectedStore, setSelectedStore, onRun, onBack }) {
  const store = g.stores.find(s => s.id === selectedStore) ?? g.stores[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white rounded-xl p-3 border border-stone-200">
        <div className="text-xs text-stone-500 mb-1.5">どの店で打ちますか？</div>
        <div className="flex gap-2 flex-wrap">
          {g.stores.map(s => (
            <button key={s.id} onClick={() => setSelectedStore(s.id)}
              className={"px-3 py-1.5 rounded-lg text-[13px] border " +
                (s.id === store.id ? "bg-amber-700 text-white border-amber-700" : "bg-white text-stone-600 border-stone-200")}>
              {s.name.replace("サロン・ドゥ・フルール ", "")}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[12px] text-stone-500 px-1">
        売上 ＝ <b>客数</b> × <b>客単価</b>。どの数字を動かしたいかで選びましょう。
      </div>

      {ACTION_GROUPS.map(grp => {
        const list = ACTIONS.filter(a => a.group === grp.key);
        if (list.length === 0) return null;
        return (
          <div key={grp.key} className="bg-white rounded-xl p-3 border border-stone-200">
            <div className="flex items-baseline gap-2 border-b border-stone-100 pb-1.5 mb-2">
              <span className="text-[10px] text-amber-700 tracking-wider tabular-nums">{grp.lv}</span>
              <span className="text-[14px] font-medium text-stone-700">{grp.name}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {list.map(a => {
                const target = a.scope === "company" ? null : store;
                const c = canRun(a, g, target);
                return (
                  <button key={a.id} disabled={!c.ok}
                    onClick={() => onRun(a, target)}
                    className={"text-left rounded-lg border px-3 py-2 " +
                      (c.ok ? "bg-white border-stone-200 hover:border-amber-400" : "bg-stone-50 border-stone-200 opacity-60")}>
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-[13px] text-stone-700">{a.label}</span>
                      {a.initialCost > 0 && (
                        <span className="text-[11px] text-stone-400 tabular-nums whitespace-nowrap">{manYen(a.initialCost)}</span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-stone-400 mt-0.5">{a.desc}</div>
                    {!c.ok && <div className="text-[11px] text-red-500 mt-1">{c.reason}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <button onClick={onBack} className="text-[13px] text-amber-700 mt-1 block ml-auto">← 戻る</button>
    </div>
  );
}
