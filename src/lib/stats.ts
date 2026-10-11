import type {Row} from '../types';
export function evidenceLevel(x:Row):'Evidence-backed*'|'Researching'|'Untested'{
const src=String(x.source||x.evidence||'idea'),n=Number(x.sampleSize||0);
if(n>=30&&x.outOfSample===true&&['backtest','paper','live'].includes(src))return 'Evidence-backed*';
if(n>0&&['backtest','paper','live'].includes(src))return 'Researching';
return 'Untested';
}
export function tradeMetrics(rows:Row[]){
const t=[...rows].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
let equity=100,peak=100,dd=0,wins=0,sum=0,valid=0;
const curve=[{index:0,date:'Start',equity:100},...t.map((r,i)=>{
const p=typeof r.netReturnPct==='number'?r.netReturnPct:NaN;
if(Number.isFinite(p)){valid++;sum+=p;wins+=Number(p>0);equity*=1+p/100;peak=Math.max(peak,equity);dd=Math.max(dd,(peak-equity)/peak*100);}
return{index:i+1,date:String(r.date||''),equity:Number(equity.toFixed(3))};
})];
return{count:valid,winRate:valid?wins/valid*100:0,avg:valid?sum/valid:0,returnPct:equity-100,maxDrawdown:dd,curve};
}
export function sectorCounts(rows:Row[]){
const m=new Map<string,number>();
rows.forEach(x=>{const s=String(x.sector||'Unclassified');m.set(s,(m.get(s)||0)+1);});
return [...m].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,8);
}
export function uniqueTickers(rows:Row[]){
return new Set(rows.flatMap(x=>Array.isArray(x.symbols)?x.symbols.map(String):[])).size;
}
