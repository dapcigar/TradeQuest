import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, ShieldCheck, Target } from 'lucide-react';

export type WeeklyPlan = { week: string; target: number; completedDates: string[] };
const storageKey = 'tradequest-weekly-practice-plan-v1';

export function weekKey(date: Date): string {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy.toISOString().slice(0, 10);
}

export function normaliseWeeklyPlan(value: unknown, currentWeek: string): WeeklyPlan {
  const fallback: WeeklyPlan = { week: currentWeek, target: 3, completedDates: [] };
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as Partial<WeeklyPlan>;
  if (candidate.week !== currentWeek) return fallback;
  const target = candidate.target;
  if (typeof target !== 'number' || ![3, 5, 7].includes(target)) return fallback;
  const completedDates = Array.isArray(candidate.completedDates)
    ? [...new Set(candidate.completedDates.filter((date): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)))].slice(0, 7)
    : [];
  return { week: currentWeek, target, completedDates };
}

function readPlan(currentWeek: string): WeeklyPlan {
  try { return normaliseWeeklyPlan(JSON.parse(localStorage.getItem(storageKey) ?? 'null'), currentWeek); }
  catch { return normaliseWeeklyPlan(null, currentWeek); }
}

export default function WeeklyPracticePlan() {
  const currentWeek = useMemo(() => weekKey(new Date()), []);
  const [plan, setPlan] = useState<WeeklyPlan>(() => readPlan(currentWeek));
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const complete = plan.completedDates.includes(today);
  const progress = Math.min(100, Math.round((plan.completedDates.length / plan.target) * 100));

  function persist(next: WeeklyPlan) {
    setPlan(next);
    setSaved(false);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSaved(true); } catch { setSaved(false); }
  }

  return <div className="weekly-plan-page">
    <div className="page-intro">
      <div className="eyebrow"><span className="eyebrow-line" /> CONSISTENCY OVER INTENSITY</div>
      <h1>A plan you can <span>keep.</span></h1>
      <p>Set a realistic weekly learning target, practise in short sessions, and review what you learned. This tracks learning activity—not trading skill or future results.</p>
    </div>
    <section className="panel weekly-plan-card">
      <div className="weekly-plan-heading"><div className="weekly-plan-icon"><CalendarDays size={22} /></div><div><div className="eyebrow">THIS WEEK</div><h2>Your practice commitment</h2><p>Choose a target that fits your week. You can change it at any time.</p></div></div>
      <div className="weekly-target-options" role="group" aria-label="Weekly practice target">
        {[3, 5, 7].map(target => <button key={target} className={plan.target === target ? 'weekly-target selected' : 'weekly-target'} aria-pressed={plan.target === target} onClick={() => persist({ ...plan, target })}><strong>{target}</strong><span>sessions</span><small>{target === 3 ? 'A gentle start' : target === 5 ? 'Steady rhythm' : 'Frequent practice'}</small></button>)}
      </div>
      <div className="weekly-progress-label"><span>Sessions recorded</span><strong>{plan.completedDates.length} of {plan.target}</strong></div>
      <div className="weekly-progress-track" role="progressbar" aria-label="Weekly practice progress" aria-valuemin={0} aria-valuemax={plan.target} aria-valuenow={Math.min(plan.completedDates.length, plan.target)}><span style={{ width: progress + '%' }} /></div>
      <div className="weekly-plan-actions">
        <button className="btn-primary" disabled={complete} onClick={() => persist({ ...plan, completedDates: [...plan.completedDates, today] })}>{complete ? <><CheckCircle2 size={16} /> Session recorded today</> : <><Target size={16} /> Record today’s session</>}</button>
        {complete && <button className="btn-outline" onClick={() => persist({ ...plan, completedDates: plan.completedDates.filter(date => date !== today) })}>Undo today</button>}
      </div>
      <p className="form-footnote" role="status">{saved ? 'Saved on this device.' : 'Your plan is stored only in this browser. Clearing browser data removes it.'} Sessions are self-recorded; TradeQuest does not verify time spent.</p>
    </section>
    <section className="panel weekly-plan-checklist">
      <div className="weekly-plan-heading"><div className="weekly-plan-icon"><ShieldCheck size={22} /></div><div><h2>A useful 10-minute session</h2><p>Use a simple routine rather than chasing a score.</p></div></div>
      <ul>
        <li><Circle size={17} /><span><strong>Choose one skill</strong><small>Use Adaptive Practice or the Spaced Review Queue to pick a topic.</small></span></li>
        <li><Circle size={17} /><span><strong>Explain the decision</strong><small>State the evidence, invalidation condition, and risk limit in your own words.</small></span></li>
        <li><Circle size={17} /><span><strong>Reflect honestly</strong><small>Record one lesson in your private Decision Journal, including when passing is appropriate.</small></span></li>
      </ul>
      <div className="weekly-plan-note"><CheckCircle2 size={17} /><span>A skipped session is not a failure. Keep the target realistic and focus on deliberate practice.</span></div>
    </section>
    <p className="weekly-plan-footnote">Educational tool only. Synthetic exercises do not predict real-world trading performance. No live market data, broker connection, or trade execution is used.</p>
  </div>;
}
