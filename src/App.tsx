import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import {Activity,ArrowDownRight,ArrowRight,ArrowUpRight,BarChart3,BookOpen,ChartCandlestick,Check,ChevronDown,ChevronLeft,ChevronRight,Clock3,Database,FlaskConical,FolderKanban,LayoutDashboard,LogOut,Menu,Plus,RefreshCcw,Search,ShieldCheck,SlidersHorizontal,Target,Trash2,TrendingUp,Wallet,X} from 'lucide-react';
import {CartesianGrid,Line,LineChart,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis,Cell} from 'recharts';
import {config,kinds,label,type Kind,type Page,type Row} from './types';
import {loadKind,request} from './lib/api';
import {evidenceLevel,sectorCounts,tradeMetrics,uniqueTickers} from './lib/stats';
import Editor from './components/Editor';

type Data=Record<Kind,Row[]>;
type AuthState='loading'|'setup'|'login'|'ready';
const nav:[Page,string,typeof LayoutDashboard][]=[
 ['overview','Overview',LayoutDashboard],
 ['stocks','Stock Universe',ChartCandlestick],
 ['strategies','Strategy Library',BookOpen],
 ['matches','Strategy × Stock',Target],
 ['watchlists','Watchlists',FolderKanban],
 ['trades','Trade & Backtest Log',BarChart3],
 ['journal','Research Journal',FlaskConical]
];
const empty=():Data=>({stocks:[],strategies:[],matches:[],watchlists:[],trades:[],journal:[]});
const fmt=(n:number,d=1)=>Number.isFinite(n)?n.toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const val=(x:unknown)=>x===null||x===undefined||x===''?'—':String(x);
const NumberBadge=({n,suffix='%',inverse=false}:{n:unknown;suffix?:string;inverse?:boolean})=>{
 const v=Number(n);
 if(n===null||n===undefined||n===''||!Number.isFinite(v))return <span className="muted">—</span>;
 const good=inverse?v<=0:v>=0;
 return <span className={'inline-flex items-center gap-1 font-semibold '+(good?'text-[#b4f272]':'text-[#f59b91]')}>{v>=0&&!inverse?'+':''}{fmt(v,2)}{suffix}</span>;
};
function Badge({value}:{value:unknown}){
 const v=String(value??'unknown');
 const green=['working','active','bullish','live','Evidence-backed*','momentum'];
 const red=['failing','bearish','archived'];
 const amber=['testing','paper','Researching','mixed','backtest'];
 const cls=green.includes(v)?'border-[#4a6a3b] bg-[#24351f] text-[#c0f38d]':red.includes(v)?'border-[#6c3c39] bg-[#3b2527] text-[#f8b0a9]':amber.includes(v)?'border-[#705936] bg-[#352e20] text-[#edcb8d]':'border-[#3c4b51] bg-[#1e2b30] text-[#a6bbc0]';
 return <span className={'inline-flex max-w-full items-center whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-semibold capitalize '+cls}>{v.replaceAll('-',' ')}</span>;
}
function Empty({title,subtitle,action}:{title:string;subtitle:string;action?:()=>void}){
 return <div className="flex min-h-52 flex-col items-center justify-center px-4 py-12 text-center">
 <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3a4b48] bg-[#223126] text-[#b4f272]"><Database size={21}/></div>
 <p className="font-bold text-[#edf6f3]">{title}</p><p className="mt-2 max-w-sm text-sm leading-6 text-[#8da0a5]">{subtitle}</p>
 {action&&<button onClick={action} className="btn-secondary mt-5"><Plus size={15}/> Add first record</button>}
 </div>;
}
function StatCard({title,value,subtitle,icon:Icon}:{title:string;value:string;subtitle:string;icon:typeof Activity}){
 return <div className="surface p-5"><div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-[#a3b3b8]">{title}</span><span className="rounded-lg border border-[#374941] bg-[#263b29] p-2 text-[#b4f272]"><Icon size={17}/></span></div>
 <div className="mt-4 font-['Space_Grotesk'] text-[32px] font-bold tracking-[-.05em]">{value}</div><p className="mt-1 text-xs text-[#82999e]">{subtitle}</p></div>;
}
function Auth({mode,onDone}:{mode:'setup'|'login';onDone:()=>void}){
 const [pass,setPass]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');
 try{await request('/auth/'+mode,{method:'POST',body:JSON.stringify({password:pass})});onDone();}
 catch(err){setError(err instanceof Error?err.message:'Could not sign in');}
 finally{setBusy(false);}};
 return <div className="flex min-h-screen items-center justify-center bg-[#0a1217] p-5">
 <div className="absolute inset-0 pointer-events-none opacity-30" style={{backgroundImage:'radial-gradient(circle at 50% 20%,#354e3c 0%,transparent 50%)'}}/>
 <div className="surface relative w-full max-w-md p-7 sm:p-9">
 <div className="mb-10 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b9ee79] text-[#122016]"><Activity size={26}/></div><div><div className="display text-xl font-bold tracking-tight">quickstocks<span className="text-[#b4f272]">.</span></div><p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[#81959a]">Research workspace</p></div></div>
 <span className="eyebrow">{mode==='setup'?'Private workspace setup':'Welcome back'}</span>
 <h1 className="mt-2 text-3xl font-bold">{mode==='setup'?'Make it yours.':'Sign in to QuickStocks'}</h1>
 <p className="muted mt-3 text-sm leading-6">{mode==='setup'?'Choose a password (minimum 6 characters) for your private stock research workspace.':'Enter your workspace password to view your research and records.'}</p>
 <form onSubmit={submit} className="mt-8 space-y-5">
 <div><label className="label">Workspace password</label><input className="input" type="password" autoComplete={mode==='setup'?'new-password':'current-password'} minLength={6} maxLength={128} required value={pass} onChange={e=>setPass(e.target.value)} placeholder="At least 6 characters"/></div>
 {error&&<p role="alert" className="rounded-xl border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
 <button className="btn-primary w-full py-3.5" disabled={busy||pass.length<6} type="submit">{busy?'Please wait...':mode==='setup'?'Create workspace':'Sign in'}<ArrowRight size={18}/></button>
 </form>
 <div className="mt-8 flex items-start gap-2 border-t border-[#314046] pt-5 text-xs leading-5 text-[#8ea4a4]"><ShieldCheck size={17} className="shrink-0 text-[#b4f272]"/>Password protected, stored as a bcrypt hash. Sign-in uses an HttpOnly cookie. Your research stays in MongoDB.</div>
 </div></div>;
}
function Overview({data,onNavigate,onNew}:{data:Data;onNavigate:(p:Page)=>void;onNew:(k:Kind)=>void}){
 const m=useMemo(()=>tradeMetrics(data.trades),[data.trades]);
 const sectors=useMemo(()=>sectorCounts(data.stocks),[data.stocks]);
 const supported=data.matches.filter(x=>x.verdict==='working'&&evidenceLevel(x)==='Evidence-backed*');
 const activity=[...kinds.flatMap(kind=>data[kind].map(x=>({...x,kind})))].sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))).slice(0,6);
 const tooltipStyle={background:'#17262b',border:'1px solid #405158',borderRadius:12,color:'#e7f3ef'};
 return <div className="space-y-7 animate-up">
 <div className="rounded-2xl border border-[#4a623d] bg-[linear-gradient(110deg,#1e3529_0%,#182822_50%,#142127_100%)] px-6 py-7 sm:px-9">
 <div className="flex flex-wrap items-center justify-between gap-5">
 <div><span className="eyebrow">Your market command center</span><h2 className="mt-2 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Sharper research.<br/><span className="text-[#b9ee79]">Better decisions.</span></h2>
 <p className="mt-3 max-w-xl text-sm leading-6 text-[#b7c8c2]">Connect the stocks you track with setups, outcomes and the evidence behind each idea. All figures below come from your saved records.</p></div>
 <button className="btn-primary" onClick={()=>onNew('stocks')}><Plus size={16}/> Track a stock</button>
 </div></div>
 <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
 <StatCard title="Tracked stocks" value={String(data.stocks.length)} subtitle="In your research universe" icon={ChartCandlestick}/>
 <StatCard title="Strategies" value={String(data.strategies.length)} subtitle="Playbooks documented" icon={BookOpen}/>
 <StatCard title="Watchlist tickers" value={String(uniqueTickers(data.watchlists))} subtitle="Unique symbols across your lists" icon={Target}/>
 <StatCard title="Evidence-backed matches*" value={String(supported.length)} subtitle="Self-reported validation flags" icon={ShieldCheck}/>
 </div>
 <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
 <section className="surface overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#293940] p-5 sm:p-6"><div><h3 className="text-lg font-bold">Recorded equity curve</h3><p className="muted mt-1 text-xs">Compounded net return from all logged trades, in date order; starting at 100</p></div><Badge value={m.count?m.count+' records':'No trade data'}/></div>
 {m.count?<><div className="grid grid-cols-2 gap-3 px-6 pt-5 md:grid-cols-4">
 {[['Trades',String(m.count)],['Win rate',fmt(m.winRate)+'%'],['Comp. return',fmt(m.returnPct)+'%'],['Max DD',fmt(m.maxDrawdown)+'%']].map(([k,v])=><div key={k}><div className="muted text-[11px]">{k}</div><div className="mt-1 text-lg font-bold">{v}</div></div>)}
 </div><div className="h-64 p-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={m.curve}><CartesianGrid strokeDasharray="3 8" stroke="#2b3a41" vertical={false}/><XAxis dataKey="index" tickLine={false} axisLine={false} stroke="#83989f" fontSize={11}/><YAxis domain={['auto','auto']} tickLine={false} axisLine={false} stroke="#83989f" fontSize={11}/><Tooltip contentStyle={tooltipStyle}/><Line type="monotone" dataKey="equity" name="Equity index" stroke="#b4f272" strokeWidth={3} dot={false} activeDot={{r:5}}/></LineChart></ResponsiveContainer></div></>:<Empty title="Your performance chart starts here" subtitle="Log backtested, paper or live trade outcomes to see a genuine recorded equity curve." action={()=>onNew('trades')}/>}
 </section>
 <section className="surface overflow-hidden"><div className="flex items-start justify-between gap-3 border-b border-[#293940] p-5 sm:p-6"><div><h3 className="text-lg font-bold">Sector coverage</h3><p className="muted mt-1 text-xs">Distribution of researched stocks</p></div><button className="btn-ghost" onClick={()=>onNavigate('stocks')}>View stocks <ArrowRight size={14}/></button></div>
 {sectors.length?<><div className="mx-auto h-48 w-full max-w-[320px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={sectors} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={78} stroke="none" paddingAngle={3}>{sectors.map((_,i)=><Cell key={i} fill={['#b4f272','#6ad3b0','#569ca4','#768fc8','#ba93d2','#d3a37e','#a0b7bc','#485c63'][i]}/>)}</Pie><Tooltip contentStyle={tooltipStyle}/></PieChart></ResponsiveContainer></div>
 <div className="space-y-2 px-6 pb-6">{sectors.map((s,i)=><div key={s.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-[#bfd0ce]"><span className="h-2.5 w-2.5 rounded-full" style={{background:['#b4f272','#6ad3b0','#569ca4','#768fc8','#ba93d2','#d3a37e','#a0b7bc','#485c63'][i]}}/>{s.name}</span><span className="font-semibold">{s.value}</span></div>)}</div></>:<Empty title="No sector data yet" subtitle="Assign sectors to stocks to visualize your universe." action={()=>onNew('stocks')}/>}
 </section></div>
 <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
 <section className="surface overflow-hidden"><div className="flex items-center justify-between border-b border-[#293940] p-5 sm:p-6"><div><h3 className="text-lg font-bold">Strategy health</h3><p className="muted mt-1 text-xs">Based on the evidence you recorded</p></div><button className="btn-ghost" onClick={()=>onNavigate('matches')}>View matches <ArrowRight size={14}/></button></div>
 {data.matches.length?<div className="divide-y divide-[#27383e] px-5">{data.matches.slice(0,6).map(x=><button key={x.id} className="flex w-full items-center justify-between gap-3 py-4 text-left" onClick={()=>onNavigate('matches')}><div className="min-w-0"><p className="truncate font-bold">{val(x.symbol)} <span className="ml-1 text-xs font-normal text-[#869a9f]">{String(data.strategies.find(s=>s.id===x.strategyId)?.name||'Unlinked strategy')}</span></p><p className="mt-1 text-xs text-[#81979c]">{val(x.regime)} · {val(x.sampleSize)} observations</p></div><div className="flex flex-col items-end gap-1"><Badge value={x.verdict}/><span className="text-[11px] text-[#82999e]">{evidenceLevel(x)}</span></div></button>)}</div>:<Empty title="No strategy matches yet" subtitle="Connect a stock and strategy to record what works for a specific market regime." action={()=>onNew('matches')}/>}
 </section>
 <section className="surface overflow-hidden"><div className="flex items-center justify-between border-b border-[#293940] p-5 sm:p-6"><div><h3 className="text-lg font-bold">Recent research</h3><p className="muted mt-1 text-xs">Most recently updated records</p></div><Clock3 size={18} className="text-[#86a096]"/></div>
 {activity.length?<div className="divide-y divide-[#27383e] px-5">{activity.map(x=><button key={x.kind+':'+x.id} onClick={()=>onNavigate(x.kind)} className="flex w-full items-center justify-between gap-3 py-4 text-left hover:text-[#b4f272]"><div className="min-w-0"><p className="truncate text-sm font-semibold">{val(x.name||x.title||x.symbol||x.date)}</p><p className="mt-1 text-xs capitalize text-[#849aa1]">{config[x.kind].singular} · {x.updatedAt?new Date(String(x.updatedAt)).toLocaleDateString('en-IN'):''}</p></div><ArrowRight size={16} className="shrink-0"/></button>)}</div>:<Empty title="No activity recorded" subtitle="Add a stock, strategy, watchlist or journal entry to begin your research." action={()=>onNew('journal')}/>}
 </section></div>
 <div className="rounded-xl border border-[#38483d] bg-[#17241c] p-4 text-xs leading-6 text-[#b4c6b6]"><strong className="text-[#d2e3bf]">Research integrity:</strong> Evidence-backed* is a user-supplied classification requiring at least 30 samples and an out-of-sample checkbox; it does not prove profitability. No live quotes or automated exchange scanning are included. Backtests and live trades are aggregated together only for an overview — filter the trade log to inspect sources separately.</div>
 </div>;
}
function Resource({kind,rows,strategies,onEdit,onNew,onDelete}:{kind:Kind;rows:Row[];strategies:Row[];onEdit:(r:Row)=>void;onNew:()=>void;onDelete:(r:Row)=>void}){
 const cfg=config[kind];
 const [q,setQ]=useState(''),[filter,setFilter]=useState('all'),[sort,setSort]=useState('newest'),[page,setPage]=useState(1);
 const filterKey=kind==='stocks'?'trend':kind==='strategies'?'style':kind==='matches'?'verdict':kind==='watchlists'?'focus':kind==='trades'?'source':'category';
 const filterValues=[...new Set(rows.map(r=>String(r[filterKey]||'')).filter(Boolean))].sort();
 const searched=useMemo(()=>rows.filter(row=>{
 const text=Object.values(row).map(v=>Array.isArray(v)?v.join(' '):typeof v==='object'?'':String(v||'')).join(' ').toLowerCase();
 return text.includes(q.toLowerCase())&&(filter==='all'||String(row[filterKey])===filter);
 }).sort((a,b)=>{
 if(sort==='az')return String(a.symbol||a.name||a.title||'').localeCompare(String(b.symbol||b.name||b.title||''));
 if(sort==='oldest')return String(a.createdAt||'').localeCompare(String(b.createdAt||''));
 if(sort==='performance')return Number(b.changePct??b.netReturnPct??b.winRate??-999)-Number(a.changePct??a.netReturnPct??a.winRate??-999);
 return String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''));
 }),[rows,q,filter,sort,filterKey]);
 const pageSize=12,totalPages=Math.max(1,Math.ceil(searched.length/pageSize)),safePage=Math.min(page,totalPages),visible=searched.slice((safePage-1)*pageSize,safePage*pageSize);
 const display=(r:Row,key:string)=>{
 const v=r[key];
 if(key==='strategyId')return <span className="font-medium text-[#c5d4d6]">{String(strategies.find(x=>x.id===v)?.name||'Unlinked strategy')}</span>;
 if(key==='symbol')return <span className="font-['Space_Grotesk'] font-bold text-[#d7f0ba]">{val(v)}</span>;
 if(key==='changePct'||key==='netReturnPct'||key==='avgReturnPct')return <NumberBadge n={v}/>;
 if(key==='rvol')return v===null||v===undefined?'—':fmt(Number(v),2)+'×';
 if(key==='winRate')return v===null||v===undefined?'—':fmt(Number(v))+'%';
 if(key==='trend'||key==='status'||key==='regime'||key==='verdict'||key==='source'||key==='evidence')return <Badge value={v}/>;
 if(key==='symbols'||key==='tags')return <div className="flex max-w-60 flex-wrap gap-1">{Array.isArray(v)&&v.length?v.slice(0,4).map(s=><span key={String(s)} className="rounded-md border border-[#3a494d] bg-[#263239] px-2 py-1 text-[11px]">{String(s)}</span>):<span className="muted">—</span>}{Array.isArray(v)&&v.length>4&&<span className="muted">+{v.length-4}</span>}</div>;
 return <span className="block max-w-64 truncate" title={val(v)}>{val(v)}</span>;
 };
 return <div className="space-y-6 animate-up">
 <div className="flex flex-wrap items-start justify-between gap-4">
 <div><div className="eyebrow mb-2">RESEARCH / {kind.toUpperCase()}</div><h2 className="text-3xl font-bold tracking-tight">{cfg.title}</h2><p className="muted mt-2 max-w-2xl text-sm leading-6">{cfg.description}</p></div>
 <button className="btn-primary" onClick={onNew}><Plus size={17}/> New {cfg.singular}</button>
 </div>
 <section className="surface overflow-hidden">
 <div className="flex flex-wrap items-center gap-3 border-b border-[#293b42] p-4 sm:p-5">
 <div className="relative min-w-48 flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#83999e]"/><input aria-label="Search records" className="input pl-10" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}} placeholder={'Search '+cfg.title.toLowerCase()+'...'}/></div>
 <div className="relative"><SlidersHorizontal size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8ca4a6]"/><select aria-label="Filter records" className="input min-w-36 pl-9" value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}><option value="all">All {label(filterKey)}</option>{filterValues.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
 <div className="relative"><select aria-label="Sort records" className="input min-w-36" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest updated</option><option value="oldest">Oldest created</option><option value="az">A–Z</option>{['stocks','trades','matches'].includes(kind)&&<option value="performance">Highest performance</option>}</select></div>
 </div>
 <div className="flex items-center justify-between gap-2 border-b border-[#293b42] px-5 py-3 text-xs text-[#899da4]"><span>{searched.length} of {rows.length} records</span><span><Activity size={13} className="mr-1 inline"/> Saved research · not live market data</span></div>
 {rows.length===0?<Empty title={'No '+cfg.title.toLowerCase()+' yet'} subtitle={'Create your first '+cfg.singular.toLowerCase()+' to start building your research library.'} action={onNew}/>:
 searched.length===0?<Empty title="No matching records" subtitle="Change the search query or category filter to see more records."/>:
 <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse"><thead><tr>{cfg.columns.map(key=><th key={key} className="table-header">{key==='strategyId'?'Strategy':label(key)}</th>)}<th className="table-header text-right">Actions</th></tr></thead><tbody>{visible.map(r=><tr key={r.id} className="group transition hover:bg-[#1b2b30]">
 {cfg.columns.map((key,i)=><td key={key} className={'table-cell '+(i===0?'font-semibold text-[#e7f4f0]':'text-[#afc0c3]')}>{display(r,key)}</td>)}
 <td className="table-cell"><div className="flex justify-end gap-1"><button title="Edit record" aria-label="Edit record" className="btn-ghost" onClick={()=>onEdit(r)}>Edit</button><button title="Delete record" aria-label="Delete record" className="btn-ghost text-[#e4a29e] hover:text-red-300" onClick={()=>onDelete(r)}><Trash2 size={16}/></button></div></td>
 </tr>)}</tbody></table></div>}
 {searched.length>pageSize&&<div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#293940] px-5 py-4"><p className="muted text-xs">Page {safePage} of {totalPages}</p><div className="flex gap-2"><button className="btn-secondary" disabled={safePage===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={15}/> Previous</button><button className="btn-secondary" disabled={safePage===totalPages} onClick={()=>setPage(p=>p+1)}>Next <ChevronRight size={15}/></button></div></div>}
 </section>
 {kind==='stocks'&&<div className="surface-soft flex gap-3 p-5"><Clock3 className="shrink-0 text-[#b4f272]" size={19}/><p className="text-xs leading-6 text-[#abc0bb]"><strong>Prices are saved snapshots.</strong> Change %, RVOL and RSI are not synced to the exchange. Use the date and notes fields to document when figures were observed.</p></div>}
 {kind==='matches'&&<div className="surface-soft flex gap-3 p-5"><FlaskConical className="shrink-0 text-[#b4f272]" size={19}/><p className="text-xs leading-6 text-[#abc0bb]">A “working” verdict is your conclusion, not a verified result. Record sample size, market regime and out-of-sample evidence before relying on a pattern.</p></div>}
 </div>;
}
export default function App(){
 const [auth,setAuth]=useState<AuthState>('loading');
 const [data,setData]=useState<Data>(empty);
 const [page,setPage]=useState<Page>('overview');
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[mobile,setMobile]=useState(false);
 const [editor,setEditor]=useState<{kind:Kind;row:Row|null}|null>(null);
 const [confirm,setConfirm]=useState<{kind:Kind;row:Row}|null>(null);
 const [deleting,setDeleting]=useState(false);
 const [refreshKey,setRefreshKey]=useState(0);
 const fetchAll=useCallback(async()=>{setLoading(true);setError('');
 try{const sets=await Promise.all(kinds.map(k=>loadKind(k)));setData(Object.fromEntries(kinds.map((k,i)=>[k,sets[i]])) as Data);}
 catch(e){setError(e instanceof Error?e.message:'Could not load data');}
 finally{setLoading(false);}
 },[]);
 useEffect(()=>{request<{configured:boolean;authenticated:boolean}>('/auth/status').then(r=>setAuth(r.authenticated?'ready':r.configured?'login':'setup')).catch(e=>{setAuth('loading');setError(e instanceof Error?e.message:'Connection failed');});},[refreshKey]);
 useEffect(()=>{if(auth==='ready')void fetchAll();},[auth,fetchAll]);
 const go=(p:Page)=>{setPage(p);setMobile(false);window.scrollTo({top:0,behavior:'smooth'});};
 const saved=()=>{setEditor(null);void fetchAll();};
 const deleteRecord=async()=>{if(!confirm)return;setDeleting(true);
 try{await request('/data/'+confirm.kind+'/'+confirm.row.id,{method:'DELETE'});setConfirm(null);await fetchAll();}
 catch(e){setError(e instanceof Error?e.message:'Delete failed');}finally{setDeleting(false);}};
 const logout=async()=>{try{await request('/auth/logout',{method:'POST'});setAuth('login');setData(empty());setPage('overview');}catch(e){setError(e instanceof Error?e.message:'Logout failed');}};
 if(auth==='loading')return <div className="flex min-h-screen flex-col items-center justify-center gap-5 text-[#b4f272]"><Activity className="animate-pulse" size={40}/><p className="text-sm text-[#afc1c0]">{error||'Connecting to your workspace...'}</p>{error&&<button className="btn-secondary" onClick={()=>{setError('');setRefreshKey(k=>k+1);}}>Retry connection</button>}</div>;
 if(auth!=='ready')return <Auth mode={auth} onDone={()=>setAuth('ready')}/>;
 return <div className="min-h-screen bg-[#0a1217] lg:flex">
 {mobile&&<button className="fixed inset-0 z-30 bg-black/65 lg:hidden" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
 <aside className={'fixed inset-y-0 left-0 z-40 flex w-[265px] flex-col border-r border-[#26363d] bg-[#0e191e] transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 '+(mobile?'translate-x-0':'-translate-x-full')}>
 <div className="flex items-center justify-between px-6 pb-7 pt-7"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b9ee79] text-[#122016]"><Activity size={23}/></div><div><p className="display text-lg font-bold tracking-tight">quickstocks<span className="text-[#b4f272]">.</span></p><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#82979c]">Research workspace</p></div></div><button className="btn-ghost lg:hidden" onClick={()=>setMobile(false)}><X size={18}/></button></div>
 <div className="px-4"><div className="mb-3 px-4 text-[10px] font-bold uppercase tracking-[.2em] text-[#647b82]">Workspace</div><nav className="space-y-1" aria-label="Main navigation">{nav.map(([key,name,Icon])=><button key={key} onClick={()=>go(key)} className={'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[13px] font-semibold transition '+(page===key?'bg-[#293b2b] text-[#b9ee79]':'text-[#94a9ad] hover:bg-[#1c2c32] hover:text-white')}><Icon size={18}/><span>{name}</span>{page===key&&<span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#b4f272]"/>}</button>)}</nav></div>
 <div className="mt-auto space-y-4 p-4"><div className="rounded-xl border border-[#34513a] bg-[#1c2e24] p-4"><div className="mb-2 flex items-center gap-2 text-[#b4f272]"><ShieldCheck size={16}/><span className="text-xs font-bold">Private workspace</span></div><p className="text-xs leading-5 text-[#a9bdb0]">Your notes and tracked outcomes are saved in your MongoDB database.</p></div><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#adbdc0] hover:bg-[#25353a]"><LogOut size={17}/> Sign out</button></div>
 </aside>
 <main className="min-w-0 flex-1">
 <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-[#26363d] bg-[#0a1217]/95 px-4 backdrop-blur-xl sm:px-7 xl:px-10">
 <div className="flex items-center gap-3"><button className="btn-ghost lg:hidden" onClick={()=>setMobile(true)} aria-label="Open navigation"><Menu size={20}/></button><div><div className="text-[11px] text-[#779196]">WORKSPACE / <span className="text-[#b4f272]">{page==='overview'?'OVERVIEW':config[page].title.toUpperCase()}</span></div><div className="mt-0.5 hidden text-xs text-[#b0c1bd] sm:block">Personal stock research & intelligence hub</div></div></div>
 <div className="flex items-center gap-2"><div className="mr-2 hidden items-center gap-2 rounded-full border border-[#3c5440] bg-[#203122] px-3 py-1.5 text-[11px] font-bold text-[#b4f272] md:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#b4f272]"/> RESEARCH MODE</div><button className="btn-ghost" onClick={()=>void fetchAll()} disabled={loading} title="Refresh records" aria-label="Refresh records"><RefreshCcw size={18} className={loading?'animate-spin':''}/></button><button onClick={()=>setEditor({kind:page==='overview'?'stocks':page,row:null})} className="btn-primary"><Plus size={16}/><span className="hidden sm:inline">New record</span></button></div>
 </header>
 <div className="mx-auto w-full max-w-[1660px] px-4 pb-16 pt-7 sm:px-7 xl:px-10">
 {error&&<div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-700/40 bg-red-500/10 p-4 text-sm text-red-200"><span>{error}</span><button className="btn-ghost" onClick={()=>setError('')}><X size={16}/></button></div>}
 {loading?<div className="surface p-16 text-center text-sm text-[#aebdbd]"><Activity size={25} className="mx-auto mb-4 animate-pulse text-[#b4f272]"/>Loading your research...</div>:page==='overview'?<Overview data={data} onNavigate={go} onNew={kind=>setEditor({kind,row:null})}/>:<Resource kind={page} rows={data[page]} strategies={data.strategies} onEdit={row=>setEditor({kind:page,row})} onNew={()=>setEditor({kind:page,row:null})} onDelete={row=>setConfirm({kind:page,row})}/>}
 <footer className="mt-12 flex flex-wrap justify-between gap-3 border-t border-[#26383e] pt-6 text-xs text-[#728c90]"><span>QuickStocks © 2026 · Built for disciplined market research</span><span>Personal records only · Not investment advice</span></footer>
 </div></main>
 {editor&&<Editor key={editor.kind+(editor.row?.id||'new')} kind={editor.kind} row={editor.row} stocks={data.stocks} strategies={data.strategies} onClose={()=>setEditor(null)} onSaved={saved}/>}
 {confirm&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true"><div className="surface w-full max-w-md p-7"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 text-red-300"><Trash2 size={22}/></div><h2 className="text-xl font-bold">Delete {config[confirm.kind].singular}?</h2><p className="muted mt-3 text-sm leading-6">This record will be permanently deleted. Related strategy mappings are not automatically removed, so check for orphaned references afterward.</p><div className="mt-7 flex justify-end gap-3"><button className="btn-secondary" onClick={()=>setConfirm(null)} disabled={deleting}>Cancel</button><button className="rounded-xl bg-[#ad514a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#c96158] disabled:opacity-50" onClick={deleteRecord} disabled={deleting}>{deleting?'Deleting...':'Delete record'}</button></div></div></div>}
 </div>;
}
