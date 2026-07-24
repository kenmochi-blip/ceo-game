import BSDiagram from "./BSDiagram";
import PLDiagram from "./PLDiagram";
import {
  PRIOR_YEAR_PL, START_CASH, LOAN_START, FIXED_ASSETS, CAPITAL_STOCK, RETAINED_EARNINGS_INIT, manYen, yen,
} from "./data";

const PRIOR_TOTAL_ASSETS = START_CASH + FIXED_ASSETS;
const PRIOR_TOTAL_EQUITY = CAPITAL_STOCK + RETAINED_EARNINGS_INIT;
const PRIOR_RATIO = (PRIOR_TOTAL_EQUITY / PRIOR_TOTAL_ASSETS) * 100;

// 志村税理士事務所の解説メニュー。順番にアンロックされる（1つ読むと次が選べるようになる）。
// InheritDemo側で「1ヶ月に読めるのは3つまで」の制限をかける。
// answerは通常はJSX固定文だが、今の会社の数字を使いたいものは
// (ctx) => JSX という関数にしている（ctx = {totalAssets, liabilities, equity, ratio, lastResult}）。
export const TAX_TOPICS = [
  {
    key: "kessansho",
    label: "決算書ってなんですか？",
    answer: <>決算書は「会社の通信簿」のようなものですが、実は見方が2種類あります。
      <b>損益計算書（PL）</b>は「この1年（1ヶ月）でどれだけ稼いだか」という<b>期間の成績表</b>。
      <b>貸借対照表（BS）</b>は「今この瞬間、会社に何がどれだけあるか」という<b>ある時点の財産の写真</b>です。
      年収（PL）だけでなく貯金（BS）も見ないとお金持ちかどうか分からないのと同じで、経営もこの2つをセットで見ます。
      まずはこの2つを、それぞれ詳しく聞いてみてください。</>,
  },
  {
    key: "pl",
    label: "決算書（損益計算書）の読み方を教えてください",
    answer: () => (
      <>
        損益計算書は、上から順に引き算していくだけです。<b>売上高</b>から<b>売上原価</b>を引くと<b>売上総利益</b>。
        そこから家賃・人件費・<b>役員報酬</b>などの経費を引くと<b>営業利益</b>。さらに<b>支払利息</b>のような本業以外の費用を引いたものが<b>当期純利益</b>です。
        先代最後の1年間の決算書を見てみましょう。
        <PLDiagram
          cogs={PRIOR_YEAR_PL.cogs}
          sga={PRIOR_YEAR_PL.rent + PRIOR_YEAR_PL.labor + PRIOR_YEAR_PL.executiveComp + PRIOR_YEAR_PL.otherFixed + PRIOR_YEAR_PL.depreciation}
          interest={PRIOR_YEAR_PL.interest}
          sales={PRIOR_YEAR_PL.sales}
        />
        費用の棒の方が収益の棒より高いのが分かりますか？　実は前期は<b className="text-red-600">{manYen(Math.abs(PRIOR_YEAR_PL.netProfit))}の赤字</b>でした。
      </>
    ),
  },
  {
    key: "bs",
    label: "貸借対照表（BS）の見方を教えてください",
    answer: () => (
      <>
        貸借対照表は「会社の財産の一覧表」です。左側が<b>資産</b>（現金や設備など、会社が持っているもの）。
        右側が、そのお金がどこから来たかを示す<b>負債</b>（銀行からの借入など、返す必要があるお金）と<b>純資産</b>（資本金や利益の積み重ねなど、返す必要がないお金）です。
        必ず「資産＝負債＋純資産」という形で釣り合います。これが引き継いだ時点の、うちの会社のBSです。
        <BSDiagram totalAssets={PRIOR_TOTAL_ASSETS} liabilities={LOAN_START} equity={PRIOR_TOTAL_EQUITY} ratio={PRIOR_RATIO} />
      </>
    ),
  },
  {
    key: "ratio",
    label: "自己資本比率について教えてください",
    answer: ({ totalAssets, liabilities, equity, ratio }) => (
      <>
        自己資本比率は、総資産のうち純資産（返さなくていいお金）がどれくらいの割合かを示す指標です。比率が高いほど借金への依存が少なく、
        経営が安定していると見られます。今のフルールさんの数字だと、こんなイメージです。
        <BSDiagram totalAssets={totalAssets} liabilities={liabilities} equity={equity} ratio={ratio} />
        借入がまだ多く残っている分、比率は高くありません。利益を積み上げていくことで、少しずつ改善していきます。
      </>
    ),
  },
  {
    key: "profit_vs_cash",
    label: "利益が出ていればお金は増えるんですよね？",
    answer: ({ lastResult }) => (
      <>
        実はそうとも限らないんです。<b>利益（PL）と現金（BS）は別物</b>だと思ってください。
        理由は主に2つ。①銀行への返済のうち「元本」の部分はPLに出てこないので、利益が出ていても現金はその分減る。
        ②減価償却費は逆に、PL上は費用なのに現金は出ていかない。
        {lastResult ? (
          <>
            先月で言うと、当期純利益は<b>{yen(lastResult.netProfit)}</b>でしたが、
            そこから元本返済<b>−{yen(lastResult.principal)}</b>を引いて、現金を減らさない減価償却費<b>+{yen(lastResult.depreciation)}</b>を足し戻すと、
            現金の増減は<b>{yen(lastResult.cashChange)}</b>になります。利益の数字だけを見ていると、実際の現金の動きを見誤ります。
          </>
        ) : (
          <>まだ実績がないので数字ではお見せできませんが、経営してみるとすぐに体感できると思います。</>
        )}
      </>
    ),
  },
  {
    key: "officer_pay",
    label: "役員報酬と利益の関係について教えてください",
    answer: <>会社になると、社長の取り分は「役員報酬」という<b>会社の経費</b>になります。個人事業主の頃の生活費と違って、
      決算書の利益にそのまま影響するんです。役員報酬を高くとりすぎると、会社としては赤字になってしまうこともあります。</>,
  },
  {
    key: "principal_interest",
    label: "銀行への返済（元本と利息）についてもう一度教えてください",
    answer: <>毎月の返済のうち、<b>元本</b>は貸借対照表の借入残高を減らすだけで、損益計算書には出てきません。
      <b>利息</b>だけが損益計算書の費用になります。だから利益が出ていても、元本の返済の分だけ現金は減っていくんです。</>,
  },
  {
    key: "depreciation",
    label: "減価償却って何ですか？",
    answer: <>お店の内装や設備のような高額なものは、買った月に全額を費用にせず、何年かに分けて少しずつ費用にしていきます。これを減価償却といいます。
      現金は買った時に出ていくのに、費用になるのは後々――という、これも利益と現金がズレる原因の一つです。</>,
  },
  {
    key: "cashflow_table",
    label: "資金繰り表はなぜ必要なんですか？",
    answer: <>損益計算書は「儲かっているか」を見るもの、資金繰り表は「お金が足りるか」を見るものです。
      借入の返済や税金の支払いなど、損益計算書には出てこないお金の動きもあるので、両方を見ないと本当の経営状態は分かりません。</>,
  },
  {
    key: "kurojitou",
    label: "黒字倒産ってどういう意味ですか？",
    answer: <>決算書の上では利益（黒字）が出ているのに、手元の現金が尽きて支払いができなくなり、会社が倒れてしまうことです。
      利益と現金は別物、というのを軽く見ていると起こります。フルールさんも他人事ではありません。</>,
  },
  {
    key: "expense_vs_asset",
    label: "費用と資産の違いが分かりません",
    answer: <>使ってすぐなくなるもの（材料費、家賃など）は<b>費用</b>。長く使えるもの（設備、内装など）は<b>資産</b>として貸借対照表に残ります。
      同じ「お金を払う」でも、決算書での扱われ方がまったく違うんです。</>,
  },
  {
    key: "bank_view",
    label: "銀行は何を見て融資を判断しているんですか？",
    answer: <>自己資本比率のような安定性、利益が出ているか、そして毎月きちんと返済できるだけの現金が回っているか。剱持さんも、
      その3つを中心に見ているはずです。数字を見せられるようになると、銀行との話し合いもぐっと楽になりますよ。</>,
  },
];
