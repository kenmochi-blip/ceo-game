// 「継承」：店舗別損益（マトリクス）
//
// 通常のPLを店舗ごとに横に並べ、横に合計すると全社PLになる形。
// 店舗の列は「本社経費を負担する前の営業利益」までで終わり、そこから下は会社の話。
// 配賦は行わない（配賦基準の取り方で店の評価が変わってしまい、基準の恣意性という
// 別の論点を持ち込むことになるため。この game で教えたいことではない）。
//
// スマホ幅では、項目列と全社列を左右に固定し、店舗列だけが横スクロールする。

import { man } from "./data";

const Cell = ({ v, dash, neg, total, bold }) => (
  <td className={
    "px-2 py-1 text-right tabular-nums whitespace-nowrap text-[12px] border-b border-stone-100 " +
    (total ? "sticky right-0 bg-stone-50 border-l border-stone-300 font-medium " : "") +
    (bold ? "font-medium " : "") +
    (neg ? "text-red-600" : "text-stone-700")
  }>
    {dash ? <span className="text-stone-300">—</span> : v}
  </td>
);

const ItemCell = ({ children, bold, gold }) => (
  <td className={
    "px-2 py-1 text-left whitespace-nowrap text-[12px] sticky left-0 z-10 border-b border-stone-100 min-w-[104px] " +
    (gold ? "bg-amber-50 " : "bg-white ") + (bold ? "font-medium text-stone-800" : "text-stone-600")
  }>
    {children}
  </td>
);

export default function SegmentPL({ result, stores }) {
  if (!result) return null;
  const sr = result.storeResults;

  // 店舗行：全店に数字が入り、横に合計すると全社になる
  const rows = [
    { label: "売上高", f: "sales" },
    { label: "売上原価", f: "cogs" },
    { label: "売上総利益", f: null, calc: (r) => r.sales - r.cogs, sub: true },
    { label: "家賃", f: "rent" },
    { label: "人件費", f: "labor" },
    { label: "その他固定費", f: "otherFixed" },
    { label: "減価償却費", f: "depreciation" },
  ];

  const val = (r, row) => (row.calc ? row.calc(r) : r[row.f]);
  const totalOf = (row) => sr.reduce((a, r) => a + val(r, row), 0);

  // 列数に応じた最小幅。店舗が2つのうちは横スクロールなしで全列が収まり、
  // 増えたときだけスクロールする（固定した全社列が本社列を覆い隠さないように）。
  const minWidth = 104 + (sr.length + 2) * 58;

  return (
    <div>
      <div className="overflow-x-auto border border-stone-200 rounded-xl bg-white">
        <table className="w-full border-separate border-spacing-0" style={{ minWidth }}>
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-[10px] text-stone-400 sticky left-0 bg-white z-10 border-b border-stone-300 font-normal">（単位：万円）</th>
              {sr.map(r => (
                <th key={r.id} className="px-2 py-1.5 text-right text-[10px] text-stone-400 whitespace-nowrap border-b border-stone-300 font-normal">
                  {r.name.replace("サロン・ドゥ・フルール ", "")}
                </th>
              ))}
              <th className="px-2 py-1.5 text-right text-[10px] text-stone-400 whitespace-nowrap border-b border-stone-300 font-normal">本社</th>
              <th className="px-2 py-1.5 text-right text-[10px] text-stone-500 whitespace-nowrap sticky right-0 bg-stone-50 border-l border-stone-300 border-b font-normal">全社</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <ItemCell bold={row.sub}>{row.label}</ItemCell>
                {sr.map(r => <Cell key={r.id} v={man(val(r, row))} bold={row.sub} neg={val(r, row) < 0} />)}
                <Cell dash />
                <Cell v={man(totalOf(row))} total bold={row.sub} />
              </tr>
            ))}

            {/* 店舗の稼ぎ。ここが各店の責任範囲の終わり */}
            <tr>
              <ItemCell bold gold>店舗営業利益</ItemCell>
              {sr.map(r => (
                <td key={r.id} className="px-2 py-1 text-right tabular-nums text-[12px] font-bold bg-amber-50 border-b border-stone-100 border-t border-stone-300">
                  <span className={r.storeOperating < 0 ? "text-red-600" : "text-stone-800"}>{man(r.storeOperating)}</span>
                </td>
              ))}
              <td className="px-2 py-1 text-right text-[12px] bg-amber-50 border-b border-stone-100 border-t border-stone-300"><span className="text-stone-300">—</span></td>
              <td className="px-2 py-1 text-right tabular-nums text-[12px] font-bold sticky right-0 bg-amber-50 border-l border-stone-300 border-b border-stone-100 border-t">
                {man(result.storeOperatingTotal)}
              </td>
            </tr>

            {/* 二重線から下＝店舗では背負っていない会社の費用 */}
            <tr>
              <ItemCell>本社経費（役員報酬）</ItemCell>
              {sr.map(r => <td key={r.id} className="px-2 py-1 text-right text-[12px] border-b border-stone-100" style={{ borderTop: "3px double #a8a29e" }}><span className="text-stone-300">—</span></td>)}
              <td className="px-2 py-1 text-right tabular-nums text-[12px] text-stone-700 border-b border-stone-100" style={{ borderTop: "3px double #a8a29e" }}>{man(result.hqCost)}</td>
              <td className="px-2 py-1 text-right tabular-nums text-[12px] font-medium sticky right-0 bg-stone-50 border-l border-stone-300 border-b border-stone-100" style={{ borderTop: "3px double #a8a29e" }}>{man(result.hqCost)}</td>
            </tr>

            {[
              { label: "営業利益", v: result.operating, sub: true, hq: null },
              { label: "支払利息", v: result.interest, hq: result.interest },
              { label: "経常利益", v: result.ordinary, sub: true, hq: null },
              ...(result.extraordinaryLoss > 0 ? [{ label: "特別損失", v: result.extraordinaryLoss, hq: result.extraordinaryLoss }] : []),
              { label: "当期純利益", v: result.netProfit, sub: true, hq: null },
            ].map((r, i) => (
              <tr key={i}>
                <ItemCell bold={r.sub}>{r.label}</ItemCell>
                {sr.map(s => <Cell key={s.id} dash />)}
                {r.hq != null ? <Cell v={man(r.hq)} /> : <Cell dash />}
                <Cell v={man(r.v)} total bold={r.sub} neg={r.v < 0} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-2">
        <span className="inline-block w-6" style={{ borderTop: "3px double #a8a29e" }} />
        この二重線から下が、店舗では背負っていない会社の費用です
      </div>
    </div>
  );
}
