import {describe,it,expect} from 'vitest';
import {evidenceLevel,tradeMetrics,uniqueTickers} from './stats';
describe('research and performance calculations',()=>{
it('does not elevate untested ideas',()=>{expect(evidenceLevel({id:'1',source:'hypothesis',sampleSize:500,outOfSample:true})).toBe('Untested');});
it('requires sufficient out-of-sample evidence',()=>{
expect(evidenceLevel({id:'1',source:'backtest',sampleSize:29,outOfSample:true})).toBe('Researching');
expect(evidenceLevel({id:'1',source:'backtest',sampleSize:30,outOfSample:false})).toBe('Researching');
expect(evidenceLevel({id:'1',source:'backtest',sampleSize:30,outOfSample:true})).toBe('Evidence-backed*');
});
it('uses compounded net returns for equity curve and drawdown',()=>{
const r=tradeMetrics([{id:'1',date:'2026-01-01',netReturnPct:10},{id:'2',date:'2026-01-02',netReturnPct:-10}]);
expect(r.count).toBe(2);expect(r.returnPct).toBeCloseTo(-1);expect(r.maxDrawdown).toBeCloseTo(10);expect(r.winRate).toBe(50);
});
it('never invents outcomes for empty sets',()=>{expect(tradeMetrics([])).toMatchObject({count:0,winRate:0,returnPct:0});});
it('deduplicates watchlist symbols',()=>{expect(uniqueTickers([{id:'1',symbols:['TCS','INFY']},{id:'2',symbols:['TCS']}])).toBe(2);});
});
