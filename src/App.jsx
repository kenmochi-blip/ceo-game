import { useState } from "react";
import Stage1 from "./stages/Stage1";
import InheritDemo from "./stages/inherit/InheritDemo";

// ステージのルーティング（今後ステージが増えたらここで切り替える）
export default function App() {
  const [demo, setDemo] = useState("inherit");
  return (
    <div>
      <div className="fixed bottom-2 right-2 z-50 flex gap-1 bg-white/90 backdrop-blur rounded-lg border border-stone-200 p-1 text-[11px] shadow">
        <button onClick={() => setDemo("inherit")}
          className={"px-2 py-1 rounded " + (demo === "inherit" ? "bg-amber-700 text-white" : "text-stone-500")}>継承(新)</button>
        <button onClick={() => setDemo("stage1")}
          className={"px-2 py-1 rounded " + (demo === "stage1" ? "bg-amber-700 text-white" : "text-stone-500")}>朝のラテ(旧)</button>
      </div>
      {demo === "inherit" ? <InheritDemo /> : <Stage1 />}
    </div>
  );
}
