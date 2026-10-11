export type Kind='stocks'|'strategies'|'matches'|'watchlists'|'trades'|'journal';
export type Page='overview'|Kind;
export type Row={id:string;createdAt?:string;updatedAt?:string;[key:string]:unknown};
export const kinds:Kind[]=['stocks','strategies','matches','watchlists','trades','journal'];
export type Field={key:string;label:string;type?:'text'|'number'|'date'|'select'|'textarea'|'tags'|'symbols'|'boolean'|'strategy'|'symbol'|'url';options?:string[];required?:boolean;wide?:boolean;placeholder?:string;help?:string};
export type Config={title:string;singular:string;description:string;columns:string[];fields:Field[]};
const s=(key:string,label:string,options:string[]):Field=>({key,label,type:'select',options});
const t=(key:string,label:string,wide=true):Field=>({key,label,type:'textarea',wide});
const n=(key:string,label:string,required=false):Field=>({key,label,type:'number',required});
const tags:Field={key:'tags',label:'Tags (comma-separated)',type:'tags',wide:true};
const sym:Field={key:'symbol',label:'Ticker',type:'symbol',required:true,placeholder:'RELIANCE'};
const strat:Field={key:'strategyId',label:'Strategy',type:'strategy',required:true};
const date:Field={key:'date',label:'Date',type:'date',required:true};
const regime=()=>s('regime','Market regime',['any','bullish','bearish','sideways']);
const evidence=()=>s('source','Evidence source',['hypothesis','backtest','paper','live']);
const out:Field={key:'outOfSample',label:'Out-of-sample tested',type:'boolean',wide:true};
export const config:Record<Kind,Config>={
stocks:{title:'Stock Universe',singular:'Stock',description:'Stock profiles, recorded indicators and research context.',columns:['symbol','name','sector','trend','changePct','rvol','observedAt','status'],fields:[
sym,{key:'name',label:'Company name',required:true},{key:'sector',label:'Sector'},{key:'industry',label:'Industry'},
s('exchange','Exchange',['NSE','BSE','OTHER']),s('cap','Market cap',['unknown','large','mid','small','micro']),
s('trend','Trend',['unknown','bullish','bearish','sideways']),s('status','Status',['watch','active','paused','archived']),
n('lastPrice','Recorded price (₹)'),n('changePct','Recorded change (%)'),n('rvol','Relative volume (×)'),n('rsi','RSI'),{key:'observedAt',label:'Snapshot date (manual)',type:'date',help:'Date the displayed price and indicators were observed.'},tags,t('notes','Research notes')
]},
strategies:{title:'Strategy Library',singular:'Strategy',description:'Playbooks, entry / exit rules, setup behavior and evidence.',columns:['name','style','timeframe','regime','evidence','sampleSize','status'],fields:[
{key:'name',label:'Strategy name',required:true,wide:true},s('style','Period',['intraday','swing','short-term','long-term']),s('direction','Direction',['long','short','both']),
{key:'timeframe',label:'Timeframe'},regime(),{key:'stockType',label:'Best stock types',wide:true},
t('setup','Setup'),t('entryRules','Entry rules'),t('exitRules','Exit rules'),t('riskRules','Risk rules'),
s('evidence','Research stage',['idea','backtest','paper','live']),n('sampleSize','Tested trades',true),out,
s('status','Status',['testing','active','archived']),tags,t('notes','Failures, observations and lessons')
]},
matches:{title:'Strategy × Stock',singular:'Match',description:'Find where strategies work, fail, or need testing.',columns:['symbol','strategyId','regime','sampleSize','winRate','verdict','source'],fields:[
sym,strat,{key:'timeframe',label:'Timeframe'},regime(),evidence(),n('sampleSize','Sample size',true),
n('winRate','Win rate (%)'),n('avgReturnPct','Average net return (%)'),n('maxDrawdownPct','Max drawdown (%)'),out,
s('verdict','Your conclusion',['untested','working','mixed','failing']),tags,t('notes','Why this works or fails')
]},
watchlists:{title:'Smart Watchlists',singular:'Watchlist',description:'Curate breakout, momentum, volume and other candidate lists.',columns:['name','focus','symbols','tags'],fields:[
{key:'name',label:'Watchlist name',required:true},s('focus','Focus',['custom','momentum','breakout','relative-strength','volume','reversal']),
{key:'symbols',label:'Tickers (comma-separated)',type:'symbols',wide:true},t('description','Description'),tags,t('notes','Notes')
]},
trades:{title:'Trade & Backtest Log',singular:'Result',description:'Record trade outcomes. Charts reflect only saved net returns.',columns:['date','symbol','strategyId','netReturnPct','rMultiple','source','regime'],fields:[
date,sym,strat,s('direction','Direction',['long','short']),s('source','Source',['backtest','paper','live']),
s('regime','Regime',['unknown','bullish','bearish','sideways']),n('netReturnPct','Net return (%)',true),
n('rMultiple','R multiple'),t('notes','Execution and outcome notes')
]},
journal:{title:'Research Journal',singular:'Entry',description:'Capture discoveries, screenshots, observations and lessons.',columns:['date','title','symbol','category','regime','screenshotUrl','notes'],fields:[
{key:'title',label:'Title',required:true,wide:true},date,{...sym,required:false},{...strat,required:false},
s('category','Category',['observation','discovery','review','failure','lesson']),
s('regime','Regime',['unknown','bullish','bearish','sideways']),
{key:'screenshotUrl',label:'Hosted screenshot URL',type:'url',wide:true},tags,{...t('notes','Research notes'),required:true}
]}
};
export const label=(x:string)=>x.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/Id$/,'').replace(/\b\w/g,c=>c.toUpperCase());
