// 折れ線スパークライン（推移グラフ）
export default function Spark({ data, color, height=44 }) {
  if (!data||data.length===0) return null;
  const w=280,h=height,pad=4;
  // 実データの範囲に合わせる。0を強制的に含めると、数百万円のうち数十万円の増減が
  // ほぼ水平線に潰れてしまい、「現金が減っている」という肝心の変化が読み取れなくなる。
  const vals=data.map(d=>d.v);
  const rawMax=Math.max(...vals), rawMin=Math.min(...vals);
  const span=rawMax-rawMin;
  const padV=span===0?Math.max(1,Math.abs(rawMax)*0.1):span*0.15;
  const max=rawMax+padV, min=rawMin-padV;
  const range=max-min||1, n=data.length;
  const x=i=>n<=1?w/2:pad+(i*(w-pad*2))/(n-1);
  const y=v=>h-pad-((v-min)/range)*(h-pad*2);
  const pts=data.map((d,i)=>`${x(i)},${y(d.v)}`).join(" ");
  const last=data[data.length-1];
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{height}}>
        {n>1&&<polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
        {data.map((d,i)=><circle key={i} cx={x(i)} cy={y(d.v)} r={i===n-1?3.5:2} fill={color}/>)}
      </svg>
      <div className="flex justify-between text-[11px] text-stone-400 px-1"><span>{data[0].m}月</span><span>{last.m}月</span></div>
    </div>
  );
}
