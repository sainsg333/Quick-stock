import {useState,type FormEvent} from 'react';
import {X,Save,FlaskConical} from 'lucide-react';
import {config,type Kind,type Row,type Field} from '../types';
import {request} from '../lib/api';

type Props={kind:Kind;row:Row|null;strategies:Row[];stocks:Row[];onClose:()=>void;onSaved:()=>void};
const today=()=>new Date().toISOString().slice(0,10);
function defaults(kind:Kind){
const obj:Record<string,unknown>={};
config[kind].fields.forEach(f=>{
if(f.type==='select')obj[f.key]=f.options?.[0]??'';
else if(f.type==='tags'||f.type==='symbols')obj[f.key]=[];
else if(f.type==='boolean')obj[f.key]=false;
else if(f.type==='number')obj[f.key]=f.required?0:null;
else if(f.type==='date')obj[f.key]=f.key==='observedAt'?'':today();
else obj[f.key]='';
});
return obj;
}
function parseList(value:unknown){return (Array.isArray(value)?value.join(','):String(value||'')).split(',').map(x=>x.trim()).filter(Boolean);}
export default function Editor({kind,row,strategies,stocks,onClose,onSaved}:Props){
const c=config[kind];
const [values,setValues]=useState<Record<string,unknown>>(()=>row?Object.fromEntries(c.fields.map(f=>[f.key,row[f.key]])):defaults(kind));
const [busy,setBusy]=useState(false);
const [error,setError]=useState('');
const set=(key:string,value:unknown)=>setValues(prev=>({...prev,[key]:value}));
const save=async(e:FormEvent)=>{
e.preventDefault();setBusy(true);setError('');
try{
const body:Record<string,unknown>={};
for(const f of c.fields){
const val=values[f.key];
if(f.type==='tags')body[f.key]=parseList(val);
else if(f.type==='symbols')body[f.key]=[...new Set(parseList(val).map(x=>x.toUpperCase()))];
else if(f.type==='symbol')body[f.key]=String(val||'').trim().toUpperCase();
else if(f.type==='number')body[f.key]=val===''||val===undefined?null:val;
else body[f.key]=val??(f.type==='boolean'?false:'');
}
await request('/data/'+kind+(row?'/'+row.id:''),{method:row?'PUT':'POST',body:JSON.stringify(body)});
onSaved();
}catch(e){setError(e instanceof Error?e.message:'Could not save');}
finally{setBusy(false);}
};
function field(f:Field){
const val=values[f.key];
const stringValue=Array.isArray(val)?val.join(', '):String(val??'');
if(f.type==='boolean')return <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#334249] bg-[#0b171c] p-4"><input type="checkbox" checked={val===true} onChange={e=>set(f.key,e.target.checked)} className="h-4 w-4 accent-[#b4f272]"/><span className="text-sm">{f.label}</span></label>;
if(f.type==='strategy')return <select className="input" required={f.required} value={stringValue} onChange={e=>set(f.key,e.target.value)}><option value="">No strategy selected</option>{strategies.map(x=><option key={x.id} value={x.id}>{String(x.name)}</option>)}</select>;
if(f.type==='select')return <select className="input" value={stringValue} onChange={e=>set(f.key,e.target.value)}>{f.options?.map(x=><option key={x} value={x}>{x}</option>)}</select>;
if(f.type==='textarea'||f.type==='symbols')return <textarea className="input min-h-28 resize-y" rows={f.type==='symbols'?3:4} placeholder={f.placeholder} required={f.required} value={stringValue} onChange={e=>set(f.key,e.target.value)}/>;
return <><input className="input" list={f.type==='symbol'?'saved-tickers':undefined} type={f.type==='number'?'number':f.type==='date'?'date':f.type==='url'?'url':'text'} step={f.type==='number'?'any':undefined} required={f.required} placeholder={f.placeholder} value={stringValue} onChange={e=>set(f.key,f.type==='number'?(e.target.value===''?null:Number(e.target.value)):e.target.value)}/>{f.type==='symbol'&&<datalist id="saved-tickers">{stocks.map(x=><option key={x.id} value={String(x.symbol)}/>)}</datalist>}</>;
}
return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#02090c]/80 p-3 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true" aria-label={(row?'Edit ':'New ')+c.singular} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
<div className="surface my-auto w-full max-w-3xl overflow-hidden">
<div className="flex items-center justify-between border-b border-[#28373d] px-5 py-5 sm:px-7">
<div><p className="eyebrow mb-2">{row?'Edit existing record':'Create new record'}</p><h2 className="text-2xl font-bold">{row?'Edit ':'Add '}{c.singular}</h2></div>
<button type="button" className="btn-ghost" onClick={onClose} aria-label="Close"><X size={20}/></button>
</div>
<form onSubmit={save}>
<div className="grid max-h-[65vh] grid-cols-1 gap-5 overflow-y-auto p-5 sm:grid-cols-2 sm:p-7">
{c.fields.map(f=><div key={f.key} className={f.wide?'sm:col-span-2':''}>
{f.type!=='boolean'&&<label className="label" htmlFor={'f-'+f.key}>{f.label}{f.required&&<span className="text-[#b4f272]"> *</span>}</label>}
<div id={'f-'+f.key}>{field(f)}</div>
{f.help&&<p className="mt-2 text-xs text-[#84979b]">{f.help}</p>}
</div>)}
{(kind==='strategies'||kind==='matches')&&<div className="sm:col-span-2 flex items-start gap-2 rounded-xl border border-[#465034] bg-[#20291a] p-3 text-xs text-[#c7d5b6]"><FlaskConical size={16} className="shrink-0"/>Evidence is self-reported. “Evidence-backed*” requires 30+ samples and an out-of-sample flag; it is not independent verification.</div>}
{error&&<p role="alert" className="sm:col-span-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
</div>
<div className="flex justify-end gap-3 border-t border-[#28373d] px-5 py-4 sm:px-7"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy} type="submit"><Save size={16}/>{busy?'Saving...':'Save record'}</button></div>
</form></div></div>;
}
