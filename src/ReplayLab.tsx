import { useEffect, useState } from 'react';
import { CircleHelp, LoaderCircle, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { describeReplayCheckpoint, summariseReplayCheckpoints, type ReplayCheckpointChoice } from './replayCheckpoint';
import type { Session } from '@supabase/supabase-js';

type Candle={index:number;open:number;high:number;low:number;close:number};
type ReplayStep={scenarioId:string;label:string;index:number;totalCandles:number;candle:Candle;nextCursorToken:string|null;complete:boolean};
export default function ReplayLab({session}:{session:Session|null}){
 const [candles,setCandles]=useState<Candle[]>([]);
 const [token,setToken]=useState<string|null>(null);
 const [complete,setComplete]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [label,setLabel]=useState('Synthetic replay · fictional units');
 const [checkpointChoice,setCheckpointChoice]=useState<ReplayCheckpointChoice|''>('');
 const [checkpointNote,setCheckpointNote]=useState('');
 const [lastCheckpoint,setLastCheckpoint]=useState<{choice:ReplayCheckpointChoice;note:string;revealedIndex:number}|null>(null);
 const [checkpointHistory,setCheckpointHistory]=useState<Array<{choice:ReplayCheckpointChoice;note:string;revealedIndex:number}>>([]);
 const base=import.meta.env.VITE_TRADEQUEST_API_URL||'http://localhost:4000';
 async function requestStep(nextToken?:string|null,reset=false){
  if(!session)return;
  setBusy(true);setError('');
  try{
   const url=base+'/v1/replay/synthetic-basics'+(nextToken?'?token='+encodeURIComponent(nextToken):'');
   const response=await fetch(url,{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
   const body=await response.json() as ReplayStep|{error?:string};
   if(!response.ok||!('candle'in body))throw new Error(('error'in body&&body.error)||'Replay could not be loaded.');
   setCandles(previous=>reset?[body.candle]:[...previous,body.candle]);
   if(!reset&&candles.length>0&&checkpointChoice){const checkpoint={choice:checkpointChoice,note:checkpointNote.trim(),revealedIndex:body.candle.index};setLastCheckpoint(checkpoint);setCheckpointHistory(previous=>[...previous,checkpoint]);setCheckpointChoice('');setCheckpointNote('');}
   setToken(body.nextCursorToken);setComplete(body.complete);setLabel(body.label);
  }catch(e){setError(e instanceof Error?e.message:'Replay could not be loaded.');}
  finally{setBusy(false);}
 }
 useEffect(()=>{setCandles([]);setToken(null);setComplete(false);setError('');setCheckpointChoice('');setCheckpointNote('');setLastCheckpoint(null);setCheckpointHistory([]);if(session)void requestStep(null,true);},[session?.access_token]);
 const values=candles.flatMap(c=>[c.low,c.high]);const min=Math.min(...values,95);const max=Math.max(...values,115);const y=(value:number)=>12+(max-value)/(max-min||1)*160;
 if(!session)return <div className="candle-literacy-page"><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line"/> PRACTICE LAB · REPLAY</div><h1>Reveal the chart, <span>one candle at a time.</span></h1><p>Sign in to use this server-controlled synthetic replay. Future candles are not sent to the browser before each reveal.</p></div><p className="candle-disclaimer"><ShieldCheck size={15}/> Fictional educational data only. No live or historical prices and no trading execution.</p></div>;
 return <div className="candle-literacy-page"><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line"/> PRACTICE LAB · REPLAY</div><h1>Reveal the chart, <span>one candle at a time.</span></h1><p>Observe what is known at each step before seeing what happens next. This is synthetic practice data, not market history.</p></div>
 <section className="panel candle-lesson-card" aria-labelledby="replay-title"><div className="candle-lesson-heading"><div><div className="eyebrow">SYNTHETIC REPLAY</div><h2 id="replay-title">Observe before revealing</h2><p>{label} · Candle {candles.length} of {candles.length?12:'—'}</p></div><span className="candle-data-label">NO FUTURE CANDLES PRELOADED</span></div>
 {candles.length>0&&<svg viewBox="0 0 520 205" role="img" aria-label={'Synthetic candlestick replay showing '+candles.length+' revealed candles only'} style={{width:'100%',height:'auto',display:'block'}}>{[35,75,115,155].map(line=><line key={line} x1="12" y1={line} x2="508" y2={line} className="chart-grid"/>)}{candles.map((c,i)=>{const x=28+i*40;const top=Math.min(y(c.open),y(c.close));const h=Math.max(3,Math.abs(y(c.open)-y(c.close)));const up=c.close>=c.open;return <g key={c.index}><line x1={x} y1={y(c.high)} x2={x} y2={y(c.low)} className={up?'wick up':'wick down'}/><rect x={x-7} y={top} width="14" height={h} rx="1.5" className={up?'candle up':'candle down'}/><text x={x} y="196" textAnchor="middle" className="chart-label">{c.index+1}</text></g>;})}<text x="12" y="10" className="chart-label">FICTIONAL PRICE UNITS · REVEALED DATA ONLY</text></svg>}
 {candles.length===0&&<p role="status">No candles revealed yet.</p>}
 {lastCheckpoint&&<div className="replay-checkpoint-feedback" role="status"><strong>Checkpoint reflection · candle {lastCheckpoint.revealedIndex+1}</strong><p>{describeReplayCheckpoint(lastCheckpoint.choice)}</p>{lastCheckpoint.note&&<p><span className="muted">Your note:</span> {lastCheckpoint.note}</p>}<small>This is a reflection prompt, not a score. A candle moving in either direction does not prove a decision was good or bad.</small></div>}
 {complete&&<section className="replay-process-debrief" aria-labelledby="replay-debrief-title"><div className="eyebrow">SESSION REVIEW</div><h3 id="replay-debrief-title">Review your decision process</h3><p>These counts describe the choices you recorded, not whether you predicted the sequence. There is no best choice count and no performance score.</p>{(()=>{const summary=summariseReplayCheckpoints(checkpointHistory);return <><dl className="replay-process-counts"><div><dt>Observe</dt><dd>{summary.counts.observe}</dd></div><div><dt>Plan</dt><dd>{summary.counts.plan}</dd></div><div><dt>Pass</dt><dd>{summary.counts.pass}</dd></div><div><dt>Checkpoints</dt><dd>{summary.total}</dd></div></dl><p className="replay-process-prompt">{summary.reflection}</p></>;})()}</section>}
 {error&&<p className="candle-disclaimer" role="alert"><CircleHelp size={15}/>{error} {error.toLowerCase().includes('temporarily unavailable')?'Configure REPLAY_CURSOR_SECRET on the API deployment.':''}</p>}
 {candles.length>0&&!complete&&<fieldset className="replay-checkpoint"><legend>Before the next reveal: choose your process</legend><p>There is no direction to predict. What is the most defensible next step with the evidence currently visible?</p><label><input type="radio" name="replay-checkpoint" value="observe" checked={checkpointChoice==='observe'} onChange={()=>setCheckpointChoice('observe')}/> Keep observing; the evidence is still incomplete</label><label><input type="radio" name="replay-checkpoint" value="plan" checked={checkpointChoice==='plan'} onChange={()=>setCheckpointChoice('plan')}/> Define what would support or invalidate a hypothesis</label><label><input type="radio" name="replay-checkpoint" value="pass" checked={checkpointChoice==='pass'} onChange={()=>setCheckpointChoice('pass')}/> Pass; no decision is required without a clear plan</label><label className="replay-note-label" htmlFor="replay-checkpoint-note">Optional note: what evidence would change your view?</label><textarea id="replay-checkpoint-note" rows={2} maxLength={240} value={checkpointNote} onChange={event=>setCheckpointNote(event.target.value)} placeholder="Record an observation, not a price prediction."/><small>{checkpointNote.length}/240 characters · kept only in this open replay session</small></fieldset>}
 <div className="candle-result"><div><strong>{complete?'Replay complete':candles.length?'What do you observe so far?':'Ready to begin'}</strong><p>{complete?'You have seen the complete synthetic sequence. Restart to practise observing without prior knowledge.':'Before revealing the next candle, note the current range and what evidence would change your interpretation.'}</p></div>{complete?<button className="btn-outline" onClick={()=>{setCandles([]);setToken(null);setComplete(false);setCheckpointChoice('');setCheckpointNote('');setLastCheckpoint(null);setCheckpointHistory([]);void requestStep(null,true);}} disabled={busy}><RotateCcw size={15}/> Restart</button>:<button className="btn-primary" onClick={()=>void requestStep(token)} disabled={busy||(!candles.length&&!!error)||(!token&&candles.length>0)||(candles.length>0&&!checkpointChoice)}>{busy?<LoaderCircle size={15}/>:<Play size={15}/>} {candles.length?'Reveal next candle':'Load replay'}</button>}</div>
 </section><p className="candle-disclaimer"><ShieldCheck size={15}/> Educational only. All candles are synthetic. The API reveals one candle per signed, learner-bound step; this is not a trading signal and does not predict live market outcomes.</p></div>;
}
