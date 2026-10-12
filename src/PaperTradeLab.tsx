import { useEffect, useState } from 'react';
import { CircleHelp, LoaderCircle, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

type Candle = { index: number; open: number; high: number; low: number; close: number };
type PaperResponse = {
  sessionId: string; version: number; currentIndex: number; scenarioId: string; label: string; candle: Candle; candles: Candle[]; totalCandles: number; complete: boolean;
  position: { direction: 'long' | 'short'; entry: number; stop: number; target: number; units: number; riskBudget: number; virtualEquity: number };
  outcome: { exitPrice: number; reason: 'stop' | 'target' | 'ambiguous-stop-first' | 'sequence-end'; pnl: number; virtualEquityAfter: number } | null;
  policy: string;
};
type SavedSession = { sessionId: string; direction: 'long' | 'short'; currentIndex: number; status: 'open' | 'closed'; pnl: number | null; exitReason: string | null; createdAt: string; closedAt: string | null; version: number };
type LedgerEvent = { eventId: string; eventType: 'session_started' | 'candle_revealed' | 'session_closed'; version: number; candleIndex: number; payload: { status?: string; exitReason?: string | null; pnl?: number | null; virtualEquity?: number; virtualEquityAfter?: number | null; exitPrice?: number | null }; createdAt: string };
type PaperFill = { fillId: string; sequence: number; type: 'entry' | 'exit'; side: 'buy' | 'sell'; price: number | string; units: number | string; realizedPnl: number | string | null; reason: string | null; filledAt: string };
const money = (value: number) => value.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 });

export default function PaperTradeLab({ session }: { session: Session | null }) {
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [equity, setEquity] = useState('10000');
  const [riskPercent, setRiskPercent] = useState('1');
  const [entry, setEntry] = useState('103');
  const [stop, setStop] = useState('98');
  const [target, setTarget] = useState('108');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [result, setResult] = useState<PaperResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([]);
  const [ledgerError, setLedgerError] = useState('');
  const [fills, setFills] = useState<PaperFill[]>([]);
  const [fillsError, setFillsError] = useState('');
  const base = import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000';

  useEffect(() => {
    let cancelled = false;
    setCandles([]); setResult(null); setLedgerEvents([]); setLedgerError(''); setFills([]); setFillsError(''); setError(''); setBusy(false);
    if (!session) { setSavedSessions([]); setLoadingSessions(false); return () => { cancelled = true; }; }
    setLoadingSessions(true);
    fetch(base + '/v1/paper-lab/sessions', { headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store' })
      .then(async response => {
        const body = await response.json() as { sessions?: SavedSession[]; error?: string };
        if (!response.ok || !Array.isArray(body.sessions)) throw new Error(body.error || 'Saved sessions could not load. Apply the paper trade ledger migration.');
        if (!cancelled) setSavedSessions(body.sessions);
      }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Saved sessions could not load.'); })
      .finally(() => { if (!cancelled) setLoadingSessions(false); });
    return () => { cancelled = true; };
  }, [session?.access_token]);

  async function refreshSessions() {
    if (!session) return;
    const response = await fetch(base + '/v1/paper-lab/sessions', { headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store' });
    const body = await response.json() as { sessions?: SavedSession[]; error?: string };
    if (!response.ok || !Array.isArray(body.sessions)) throw new Error(body.error || 'Saved sessions could not load.');
    setSavedSessions(body.sessions);
  }

  async function refreshLedger(sessionId: string) {
    if (!session) return;
    setLedgerError('');
    try {
      const response = await fetch(base + '/v1/paper-lab/sessions/' + sessionId + '/ledger', {
        headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store',
      });
      const body = await response.json() as { events?: LedgerEvent[]; error?: string };
      if (!response.ok || !Array.isArray(body.events)) throw new Error(body.error || 'Session ledger could not load.');
      setLedgerEvents(body.events);
    } catch (error) {
      setLedgerEvents([]);
      setLedgerError(error instanceof Error ? error.message : 'Session ledger could not load.');
    }
  }

  async function refreshFills(sessionId: string) {
    if (!session) return;
    setFillsError('');
    try {
      const response = await fetch(base + '/v1/paper-lab/sessions/' + sessionId + '/fills', {
        headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store',
      });
      const body = await response.json() as { fills?: PaperFill[]; error?: string };
      if (!response.ok || !Array.isArray(body.fills)) throw new Error(body.error || 'Simulated fills could not load.');
      setFills(body.fills);
    } catch (error) {
      setFills([]);
      setFillsError(error instanceof Error ? error.message : 'Simulated fills could not load.');
    }
  }

  async function openSavedSession(sessionId: string) {
    if (!session) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(base + '/v1/paper-lab/sessions/' + sessionId, { headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store' });
      const body = await response.json() as PaperResponse | { error?: string };
      if (!response.ok || !('candle' in body) || !Array.isArray(body.candles)) throw new Error(('error' in body && body.error) || 'Saved session could not be opened.');
      setResult(body); setCandles(body.candles); await refreshLedger(sessionId); await refreshFills(sessionId);
    } catch (error) { setError(error instanceof Error ? error.message : 'Saved session could not be opened.'); }
    finally { setBusy(false); }
  }

  async function start() {
    if (!session) return;
    setBusy(true); setError(''); setCandles([]); setResult(null);
    try {
      const response = await fetch(base + '/v1/paper-lab/synthetic-basics/start', {
        method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, equity: Number(equity), riskPercent: Number(riskPercent), entry: Number(entry), stop: Number(stop), target: Number(target) }), cache: 'no-store',
      });
      const body = await response.json() as PaperResponse | { error?: string };
      if (!response.ok || !('candle' in body) || !Array.isArray(body.candles)) throw new Error(('error' in body && body.error) || 'Paper trade could not start.');
      setResult(body); setCandles(body.candles); await refreshSessions(); await refreshLedger(body.sessionId); await refreshFills(body.sessionId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Paper trade could not start.'); }
    finally { setBusy(false); }
  }

  async function revealNext() {
    if (!session || !result?.sessionId || result.complete) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(base + '/v1/paper-lab/synthetic-basics/step', {
        method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: result.sessionId, expectedVersion: result.version }), cache: 'no-store',
      });
      const body = await response.json() as PaperResponse | { error?: string };
      if (!response.ok || !('candle' in body) || !Array.isArray(body.candles)) throw new Error(('error' in body && body.error) || 'Paper trade could not continue.');
      setCandles(body.candles); setResult(body); await refreshSessions(); await refreshLedger(body.sessionId); await refreshFills(body.sessionId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Paper trade could not continue.'); }
    finally { setBusy(false); }
  }

  if (!session) return <div className="candle-literacy-page"><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> PRACTICE LAB · PAPER TRADING</div><h1>Practise a plan, <span>one candle at a time.</span></h1><p>Sign in to use the server-controlled synthetic paper trade lab. Only the next candle is revealed on each step.</p></div><p className="candle-disclaimer"><ShieldCheck size={15} /> Fictional educational data only. No live prices, real orders, broker integration, or persistent account balance.</p></div>;

  const values = candles.flatMap(c => [c.low, c.high]);
  const min = Math.min(...values, 95); const max = Math.max(...values, 115);
  const y = (value: number) => 12 + (max - value) / (max - min || 1) * 150;
  return <div className="candle-literacy-page">
    <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> PRACTICE LAB · PAPER TRADING</div><h1>Practise a plan, <span>one candle at a time.</span></h1><p>Set a hypothetical entry, stop and target, then observe how the plan behaves as synthetic candles are revealed. This is a learning exercise, not a performance prediction.</p></div>
    <p className="candle-disclaimer"><ShieldCheck size={15} /> Synthetic scenario only · no live or historical prices · no real orders or saved account balance.</p>
    <div className="paper-lab-layout">
      <section className="panel paper-lab-form" aria-labelledby="paper-plan-title"><div className="panel-heading"><div className="panel-heading-icon"><ShieldCheck size={19} /></div><div><h2 id="paper-plan-title">Define the plan</h2><p>Virtual equity and simplified fictional price units.</p></div></div>
        <label className="field-label" htmlFor="paper-direction">Hypothetical direction</label><select id="paper-direction" value={direction} onChange={e => setDirection(e.target.value as 'long' | 'short')}><option value="long">Long — benefit if price rises</option><option value="short">Short — benefit if price falls</option></select>
        <label className="field-label" htmlFor="paper-equity">Virtual account equity (£)</label><input id="paper-equity" type="number" min="1" max="1000000000" value={equity} onChange={e => setEquity(e.target.value)} />
        <label className="field-label" htmlFor="paper-risk">Risk budget (%)</label><input id="paper-risk" type="number" min="0.01" max="5" step="0.1" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} />
        <div className="field-pair"><div><label className="field-label" htmlFor="paper-entry">Entry</label><input id="paper-entry" type="number" min="0.01" step="0.1" value={entry} onChange={e => setEntry(e.target.value)} /></div><div><label className="field-label" htmlFor="paper-stop">Stop</label><input id="paper-stop" type="number" min="0.01" step="0.1" value={stop} onChange={e => setStop(e.target.value)} /></div></div>
        <label className="field-label" htmlFor="paper-target">Target</label><input id="paper-target" type="number" min="0.01" step="0.1" value={target} onChange={e => setTarget(e.target.value)} />
        <button className="btn-primary full-button" type="button" onClick={() => void start()} disabled={busy}>{busy ? <LoaderCircle size={15} /> : <Play size={15} />} Start synthetic session</button>
        {error && <p className="feedback" role="alert">{error}</p>}
        <div className="paper-lab-saved"><h3>Saved sessions</h3>{loadingSessions ? <p role="status">Loading saved sessions…</p> : savedSessions.length === 0 ? <p>No saved sessions yet.</p> : <ul>{savedSessions.map(item => <li key={item.sessionId}><button type="button" className="text-link" onClick={() => void openSavedSession(item.sessionId)} disabled={busy}>{item.direction.toUpperCase()} · {item.status === 'open' ? 'In progress' : (item.exitReason || 'Completed')} · {new Date(item.createdAt).toLocaleDateString('en-GB')}{item.pnl !== null ? ' · ' + money(item.pnl) : ''}</button></li>)}</ul>}</div>
        <p className="form-footnote"><CircleHelp size={14} /> This exercise assumes an immediate fill at your entry. It excludes fees, spread and ordinary slippage; adverse gaps are modelled at the candle open. Same-candle stop/target ambiguity resolves conservatively, stop first.</p>
      </section>
      <section className="panel paper-lab-chart" aria-labelledby="paper-chart-title"><div className="candle-lesson-heading"><div><div className="eyebrow">SYNTHETIC PAPER TRADE</div><h2 id="paper-chart-title">Reveal the sequence</h2><p>{result ? result.label + ' · Candle ' + (result.candle.index + 1) + ' of ' + result.totalCandles : 'Start a plan to reveal the first candle.'}</p></div><span className="candle-data-label">NO FUTURE CANDLES PRELOADED</span></div>
        {candles.length > 0 ? <svg viewBox="0 0 520 190" role="img" aria-label={'Synthetic paper trade chart showing ' + candles.length + ' revealed candles only'} style={{ width: '100%', height: 'auto', display: 'block' }}>{[35,75,115,155].map(line => <line key={line} x1="12" y1={line} x2="508" y2={line} className="chart-grid" />)}{candles.map(c => { const x = 28 + c.index * 40; const top = Math.min(y(c.open), y(c.close)); const h = Math.max(3, Math.abs(y(c.open) - y(c.close))); const up = c.close >= c.open; return <g key={c.index}><line x1={x} y1={y(c.high)} x2={x} y2={y(c.low)} className={up ? 'wick up' : 'wick down'} /><rect x={x - 7} y={top} width="14" height={h} rx="1.5" className={up ? 'candle up' : 'candle down'} /><text x={x} y="184" textAnchor="middle" className="chart-label">{c.index + 1}</text></g>; })}<text x="12" y="10" className="chart-label">FICTIONAL PRICE UNITS · REVEALED DATA ONLY</text></svg> : <p role="status">No candles revealed yet.</p>}
        {result && <div className="paper-lab-position"><h3>Plan snapshot</h3><dl><div><dt>Direction</dt><dd>{result.position.direction}</dd></div><div><dt>Estimated size*</dt><dd>{result.position.units.toLocaleString('en-GB', { maximumFractionDigits: 4 })} units</dd></div><div><dt>Risk budget*</dt><dd>{money(result.position.riskBudget)}</dd></div><div><dt>Entry / stop / target</dt><dd>{result.position.entry} / {result.position.stop} / {result.position.target}</dd></div></dl></div>}
        {result?.complete && result.outcome && <div className="paper-lab-outcome" role="status"><div className="eyebrow">SESSION RESULT · SIMULATED ONLY</div><h3>{result.outcome.reason === 'target' ? 'Target reached' : result.outcome.reason === 'ambiguous-stop-first' ? 'Stop assumed first' : result.outcome.reason === 'stop' ? 'Stop reached' : 'Sequence ended'}</h3><p>Exit price: {result.outcome.exitPrice.toLocaleString('en-GB', { maximumFractionDigits: 4 })}</p><p>Simulated P/L: <strong>{money(result.outcome.pnl)}</strong></p><p>Virtual equity after: <strong>{money(result.outcome.virtualEquityAfter)}</strong></p><small>{result.policy}</small><button className="btn-outline" type="button" onClick={() => { setCandles([]); setResult(null); setLedgerEvents([]); setFills([]); setFillsError(''); setError(''); }}><RotateCcw size={15} /> New session</button></div>}
        {result && !result.complete && <div className="candle-result"><div><strong>What does the evidence show?</strong><p>The outcome is not known in advance. Reveal only the next candle and review the plan as new information appears.</p></div><button className="btn-primary" type="button" onClick={() => void revealNext()} disabled={busy || result.complete}>{busy ? <LoaderCircle size={15} /> : <Play size={15} />} Reveal next candle</button></div>}
        {result && <div className="paper-lab-position paper-lab-ledger"><h3>Session event ledger</h3><p className="form-footnote">Recorded server-side as the synthetic session advances. This is an educational state-transition history, not a broker statement.</p>{ledgerError&&<p className="weekly-import-error" role="alert">{ledgerError}</p>}{ledgerEvents.length===0&&!ledgerError?<p role="status">No ledger events are available yet.</p>:ledgerEvents.length>0&&<ol aria-label="Paper trade session ledger events">{ledgerEvents.map(event=><li key={event.eventId}><strong>{event.eventType==='session_started'?'Session started':event.eventType==='session_closed'?'Session closed':'Candle '+(event.candleIndex+1)+' revealed'}</strong><span> · Version {event.version} · {new Date(event.createdAt).toLocaleString('en-GB')}</span>{event.payload.status&&<span> · {event.payload.status}</span>}{event.payload.exitReason&&<span> · {event.payload.exitReason}</span>}{typeof event.payload.pnl==='number'&&<span> · Simulated P/L {money(event.payload.pnl)}</span>}{typeof event.payload.virtualEquityAfter==='number'&&event.eventType==='session_closed'&&<span> · Virtual equity after {money(event.payload.virtualEquityAfter)}</span>}</li>)}</ol>}</div>}
        {result && <div className="paper-lab-position paper-lab-ledger"><h3>Simulated fill ledger</h3><p className="form-footnote">Append-only entry/exit records created by the server. Prices and fills are fictional and exclude spread, fees and ordinary slippage.</p>{fillsError&&<p className="weekly-import-error" role="alert">{fillsError}</p>}{fills.length===0&&!fillsError?<p role="status">No simulated fills are available yet.</p>:fills.length>0&&<ol aria-label="Simulated paper trade fills">{fills.map(fill=><li key={fill.fillId}><strong>{fill.type==='entry'?'Entry fill':'Exit fill'} · {fill.side.toUpperCase()}</strong><span> · Price {Number(fill.price).toLocaleString('en-GB',{maximumFractionDigits:6})} · Units {Number(fill.units).toLocaleString('en-GB',{maximumFractionDigits:4})} · {new Date(fill.filledAt).toLocaleString('en-GB')}</span>{fill.reason&&<span> · Reason: {fill.reason}</span>}{fill.realizedPnl!==null&&<span> · Realised simulated P/L {money(Number(fill.realizedPnl))}</span>}</li>)}</ol>}</div>}
        <p className="form-footnote">* Simplified position sizing assumes one unit of account-currency P/L per fictional price unit. Saved sessions belong to your learner account; they are not broker records or real trades.</p>
      </section>
    </div>
  </div>;
}
