// 「継承」：ダッシュボード（卒業後のハブ上部に常設。第2章では簡易版）
//
// ■原則：ここは「何が起きたか」だけを見せ、「なぜ・どうするか」は人に会いに行かせる。
//   数字の一覧を出すと、ゲームは容易に表計算ソフトになる。この作品の魅力は
//   人を訪ねて話を聞くところにあるので、解釈も判断もここには置かない。
//
// ■稼働率バーがこの画面の主役。
//   バーの長さが実際の稼働、縦線マーカーが需要の位置。需要が上限を超えたら「取りこぼし」。
//   客数＝min(需要,上限) という式を、言葉なしで毎月見せ続けることになる。

import { deriveStore, calcStoreMonth, yen, manYen } from "./data";
import { healthOf } from "./game";
import { activeEffects, remainingMonths } from "./effects";

function UtilBar({ customers, capacity, demand }) {
  const util = capacity > 0 ? customers / capacity : 0;
  const pct = Math.round(util * 100);
  const over = demand > capacity;
  const tone = over ? "bg-red-500" : util < 0.7 ? "bg-amber-500" : "bg-emerald-600";
  // 需要マーカーの位置（上限を超えている場合は右端に貼りつく）
  const demandPct = capacity > 0 ? Math.min(100, Math.round((demand / capacity) * 100)) : 0;
  return (
    <div className="mt-1.5">
      <div className="relative h-2.5 bg-stone-100 border border-stone-200 rounded-full">
        <div className={"h-full rounded-full " + tone} style={{ width: `${Math.min(100, pct)}%` }} />
        <div className="absolute -top-1 w-0.5 h-4 bg-stone-800 rounded" style={{ left: `${demandPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-stone-400 tabular-nums mt-1.5">
        <span>稼働 {pct}%</span>
        <span>客数 {customers} / 上限 {capacity}</span>
      </div>
      {over && (
        <div className="inline-block text-[10.5px] text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 mt-1">
          {demand - capacity}人 取りこぼしています
        </div>
      )}
      {!over && util < 0.7 && (
        <div className="inline-block text-[10.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-1">
          手が空いています（人件費に対して客数が少なめ）
        </div>
      )}
    </div>
  );
}

const HChip = ({ level, children }) => {
  const tone = level === "ok" ? "text-emerald-700 border-emerald-300 bg-emerald-50"
    : level === "warn" ? "text-amber-700 border-amber-300 bg-amber-50"
    : "text-red-600 border-red-300 bg-red-50";
  return <span className={"text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap " + tone}>{children}</span>;
};

const KItem = ({ k, v, d }) => (
  <div className="flex justify-between items-baseline text-[11.5px]">
    <span className="text-stone-500">{k}</span>
    <span className="tabular-nums text-stone-700">{v}{d != null && <span className="text-[9.5px] text-stone-400 ml-1">{d}</span>}</span>
  </div>
);

function StoreCard({ store, g, last, prev, expanded, onToggle }) {
  const now = deriveStore(store, g.effects, g.month);
  const h = healthOf(store, g);
  const sim = calcStoreMonth(store, g.effects, g.month);
  const op = last ? last.storeOperating : sim.storeOperating;
  const dNum = (a, b, unit = "") => (b == null ? null : `${a - b >= 0 ? "+" : "−"}${Math.abs(a - b).toLocaleString()}${unit}`);

  return (
    <div className="border-b border-stone-100 last:border-b-0 pb-2.5 mb-2.5 last:pb-0 last:mb-0">
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex justify-between items-baseline">
          <span className="text-[13px] font-medium text-stone-700">
            {store.name.replace("サロン・ドゥ・フルール ", "")}
            {(h.strain.level === "crit" || h.wage.level === "crit") && (
              <span className="ml-1.5 text-[10px] text-red-600 border border-red-300 bg-red-50 rounded px-1">要対応</span>
            )}
          </span>
          <span className={"text-[12px] tabular-nums " + (op < 0 ? "text-red-600" : "text-emerald-700")}>
            営業利益 {manYen(op)}
          </span>
        </div>
      </button>

      <UtilBar customers={now.customers} capacity={now.capacity} demand={now.demand} />

      <div className="flex flex-wrap gap-1 mt-2">
        <HChip level={h.wage.level}>💪 {h.wage.label}</HChip>
        <HChip level={h.edu.level}>🎓 {h.edu.label}</HChip>
        <HChip level={h.equip.level}>🔧 {h.equip.label}</HChip>
        {store.strainMonths > 0 && <HChip level={h.strain.level}>😰 {h.strain.label}</HChip>}
      </div>

      {expanded && (
        <>
          <div className="text-[9.5px] text-stone-400 tracking-wider mt-3 pt-2 border-t border-dashed border-stone-200 mb-1">結果 ── 起きたこと</div>
          <div className="grid grid-cols-2 gap-x-3">
            <KItem k="🙋 客数" v={`${last ? last.customers : now.customers}人`} d={last && prev ? dNum(last.customers, prev.customers, "人") : null} />
            <KItem k="📈 売上" v={manYen(last ? last.sales : sim.sales)} d={last && prev ? `${last.sales - prev.sales >= 0 ? "+" : "−"}${manYen(Math.abs(last.sales - prev.sales))}` : null} />
            <KItem k="📊 稼働率" v={`${Math.round((last ? last.utilization : now.customers / now.capacity) * 100)}%`} />
            <KItem k="💰 営業利益" v={manYen(op)} d={last && prev ? `${last.storeOperating - prev.storeOperating >= 0 ? "+" : "−"}${manYen(Math.abs(last.storeOperating - prev.storeOperating))}` : null} />
          </div>

          <div className="text-[9.5px] text-stone-400 tracking-wider mt-3 pt-2 border-t border-dashed border-stone-200 mb-1">打ち手 ── いまの設定</div>
          <div className="grid grid-cols-2 gap-x-3">
            <KItem k="👥 スタイリスト" v={`${store.staffCount}人`} d={`上限${store.maxStaff}`} />
            <KItem k="⏱ 接客時間" v={`${now.serviceHours.toFixed(2)}h`} />
            <KItem k="💴 客単価" v={yen(now.unitPrice)} />
            <KItem k="📦 原価率" v={`${(now.cogsRate * 100).toFixed(1)}%`} d={now.cogsExternal ? `市況${now.cogsExternal > 0 ? "+" : "−"}${Math.abs(now.cogsExternal * 100).toFixed(1)}pt` : null} />
          </div>
          <div className="text-[10px] text-stone-400 mt-2">
            打ち手はどれも一長一短です。上げるべきか下げるべきかは、お店や志村さんと相談して決めましょう。
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard({ g, derivedVals, expandedStore, setExpandedStore, pendingList, compact }) {
  const last = g.history[g.history.length - 1];
  const prev = g.history.length >= 2 ? g.history[g.history.length - 2] : null;
  const lastOf = (id) => last?.storeResults?.find(r => r.id === id) ?? null;
  const prevOf = (id) => prev?.storeResults?.find(r => r.id === id) ?? null;

  // 進行中の外部イベント（ダッシュボードの「いま起きていること」）
  const running = activeEffects(g.effects, g.month)
    .filter(e => !e.hidden && e.source)
    .reduce((acc, e) => {
      const k = e.source;
      if (!acc[k]) acc[k] = { source: k, remain: remainingMonths(e, g.month), category: e.category };
      return acc;
    }, {});
  const runningList = Object.values(running);

  return (
    <div className="flex flex-col gap-2">
      {!compact && last && (
        <div className="bg-white rounded-xl p-3 border border-stone-200">
          <div className="text-[10px] text-stone-400 tracking-wider mb-1">会社ぜんたい</div>
          <KItem k="経常利益" v={manYen(last.ordinary)} d={prev ? `${last.ordinary - prev.ordinary >= 0 ? "+" : "−"}${manYen(Math.abs(last.ordinary - prev.ordinary))}` : null} />
          {last.extraordinaryLoss > 0 && (
            <KItem k="特別損失" v={manYen(last.extraordinaryLoss)} />
          )}
          <KItem k="当期純利益" v={manYen(last.netProfit)} />
          <KItem k="借入残高" v={manYen(g.loanBalance)} />
          <KItem k="自己資本比率" v={`${derivedVals.equityRatio.toFixed(1)}%`} />
        </div>
      )}

      <div className="bg-white rounded-xl p-3 border border-stone-200">
        <div className="text-[10px] text-stone-400 tracking-wider mb-2">店舗{!compact && <span className="text-stone-300 ml-1">（タップで詳しく）</span>}</div>
        {g.stores.map(s => (
          <StoreCard
            key={s.id} store={s} g={g}
            last={lastOf(s.id)} prev={prevOf(s.id)}
            expanded={expandedStore === s.id}
            onToggle={() => setExpandedStore(expandedStore === s.id ? null : s.id)}
          />
        ))}
      </div>

      {runningList.length > 0 && (
        <div className="bg-white rounded-xl p-3 border border-stone-200">
          <div className="text-[10px] text-stone-400 tracking-wider mb-1.5">いま起きていること</div>
          {runningList.map((r, i) => (
            <div key={i} className="flex items-baseline gap-2 text-[12.5px] py-0.5">
              <span className="text-stone-600 flex-1">{r.source}</span>
              <span className="text-[10.5px] text-stone-400 tabular-nums whitespace-nowrap">
                {r.remain == null ? "続いている" : `残り${r.remain}ヶ月`}
              </span>
            </div>
          ))}
        </div>
      )}

      {pendingList && pendingList.length > 0 && (
        <div className="bg-white rounded-xl p-3 border border-stone-200">
          <div className="text-[10px] text-stone-400 tracking-wider mb-1.5">待っている判断</div>
          {pendingList.map((p, i) => (
            <div key={i} className="flex items-baseline gap-2 text-[12.5px] py-0.5">
              <span className="w-4">{p.icon}</span>
              <span className="text-stone-600 flex-1">{p.text}</span>
              <span className="text-[10.5px] text-stone-400 whitespace-nowrap">{p.where}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
