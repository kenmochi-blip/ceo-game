// 画面下部のメインアクションボタン
export default function Btn({ children, onClick }) {
  return <button onClick={onClick} className="w-full mt-4 bg-amber-700 hover:bg-amber-800 text-white rounded-xl py-3 text-sm font-medium transition-colors">{children}</button>;
}
