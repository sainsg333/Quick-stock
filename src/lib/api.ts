import type {Kind,Row} from '../types';
export async function request<T>(path:string,opts:RequestInit={}):Promise<T>{
const res=await fetch('/api'+path,{...opts,credentials:'same-origin',headers:{'Content-Type':'application/json',...(opts.headers||{})}});
const json=await res.json().catch(()=>({error:'Invalid server response'}));
if(!res.ok)throw new Error(String(json.error||'Request failed'));
return json as T;
}
export async function loadKind(kind:Kind):Promise<Row[]>{
const rows:Row[]=[];
for(let page=1;page<=100;page++){
const result=await request<{items:Row[];total:number}>('/data/'+kind+'?limit=1000&page='+page);
rows.push(...result.items);
if(rows.length>=result.total||result.items.length===0)break;
}
return rows;
}
