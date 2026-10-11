import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Pencil, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

type Decision = 'considered' | 'waited' | 'passed' | 'simulated';
type Entry = {
  id: string; title: string; scenarioId: string | null; decision: Decision;
  thesis: string; invalidation: string; riskPlan: string; reflection: string; lessonLearned: string;
  createdAt: string; updatedAt?: string;
};
type Draft = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>;
const emptyDraft: Draft = { title: '', scenarioId: null, decision: 'waited', thesis: '', invalidation: '', riskPlan: '', reflection: '', lessonLearned: '' };
const demoKey = 'tradequest-decision-journal-v1';
const labels: Record<Decision, string> = { considered: 'Considered a setup', waited: 'Waited for evidence', passed: 'Passed / no trade', simulated: 'Synthetic scenario review' };
const apiBase = () => (import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000');

function fromApi(row: Record<string, unknown>): Entry {
  return {
    id: String(row.id), title: String(row.title ?? ''), scenarioId: typeof row.scenario_id === 'string' ? row.scenario_id : null,
    decision: row.decision as Decision, thesis: String(row.thesis ?? ''), invalidation: String(row.invalidation ?? ''),
    riskPlan: String(row.risk_plan ?? ''), reflection: String(row.reflection ?? ''), lessonLearned: String(row.lesson_learned ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()), updatedAt: String(row.updated_at ?? ''),
  };
}
function toApi(draft: Draft) {
  return { title: draft.title.trim(), scenarioId: draft.scenarioId, decision: draft.decision, thesis: draft.thesis.trim(),
    invalidation: draft.invalidation.trim(), riskPlan: draft.riskPlan.trim(), reflection: draft.reflection.trim(), lessonLearned: draft.lessonLearned.trim() };
}
function writeDemo(entries: Entry[]) { try { localStorage.setItem(demoKey, JSON.stringify(entries)); } catch { /* local demo remains usable in memory */ } }
function readDemo(): Entry[] {
  try { const raw = localStorage.getItem(demoKey); const value = raw ? JSON.parse(raw) as unknown : []; return Array.isArray(value) ? value as Entry[] : []; }
  catch { return []; }
}

export default function JournalView({ session, scenarioId }: { session: Session | null; scenarioId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    if (!session) { setEntries(readDemo().sort((a,b) => b.createdAt.localeCompare(a.createdAt))); return; }
    try {
      const response = await fetch(apiBase() + '/v1/decision-journal', { headers: { Authorization: 'Bearer ' + session.access_token } });
      const body = await response.json() as { entries?: Record<string, unknown>[]; error?: string };
      if (!response.ok) throw new Error(body.error || 'Journal entries could not be loaded.');
      setEntries((body.entries ?? []).map(fromApi));
    } catch (e) { setError(e instanceof Error ? e.message : 'Journal entries could not be loaded.'); }
  }, [session]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!session) { try { localStorage.setItem(demoKey, JSON.stringify(entries)); } catch { /* local demo remains usable in memory */ } } }, [entries, session]);

  function beginNew() {
    setEditingId(null); setDraft({ ...emptyDraft, scenarioId: /^TQ-SYN-[0-9]{3}$/.test(scenarioId) ? scenarioId : null });
    setMessage(''); setError('');
  }
  function beginEdit(entry: Entry) {
    setEditingId(entry.id);
    setDraft({ title: entry.title, scenarioId: entry.scenarioId, decision: entry.decision, thesis: entry.thesis,
      invalidation: entry.invalidation, riskPlan: entry.riskPlan, reflection: entry.reflection, lessonLearned: entry.lessonLearned });
    setMessage(''); setError('');
  }
  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(current => ({ ...current, [key]: value })); }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) { setError('Give this reflection a short title.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      if (!session) {
        const now = new Date().toISOString();
        const entry: Entry = { ...toApi(draft), id: editingId ?? crypto.randomUUID(), createdAt: editingId ? entries.find(e => e.id === editingId)?.createdAt ?? now : now, updatedAt: now };
        setEntries(current => { const next = editingId ? current.map(e => e.id === editingId ? entry : e) : [entry, ...current]; writeDemo(next); return next; });
      } else {
        const url = apiBase() + '/v1/decision-journal' + (editingId ? '/' + encodeURIComponent(editingId) : '');
        const response = await fetch(url, { method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
          body: JSON.stringify(toApi(draft)) });
        const body = await response.json() as { entry?: Record<string, unknown>; error?: string };
        if (!response.ok || !body.entry) throw new Error(body.error || 'Journal entry could not be saved.');
        const entry = fromApi(body.entry);
        setEntries(current => editingId ? current.map(e => e.id === editingId ? entry : e) : [entry, ...current]);
      }
      setDraft(emptyDraft); setEditingId(null); setMessage('Reflection saved. Review the process, not just the outcome.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Journal entry could not be saved.'); }
    finally { setBusy(false); }
  }

  async function remove(entry: Entry) {
    if (!window.confirm('Delete this private journal entry? This cannot be undone.')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (session) {
        const response = await fetch(apiBase() + '/v1/decision-journal/' + encodeURIComponent(entry.id), { method: 'DELETE', headers: { Authorization: 'Bearer ' + session.access_token } });
        if (!response.ok) { const body = await response.json() as { error?: string }; throw new Error(body.error || 'Entry could not be deleted.'); }
      }
      setEntries(current => { const next = current.filter(item => item.id !== entry.id); if (!session) writeDemo(next); return next; });
      if (editingId === entry.id) { setEditingId(null); setDraft(emptyDraft); }
      setMessage('Journal entry deleted.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Entry could not be deleted.'); }
    finally { setBusy(false); }
  }

  return <><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> REFLECT · LEARN · REPEAT</div><h1>Your decision <span>journal.</span></h1><p>Record the reasoning behind a decision, what would invalidate it, and what you learned. A good process can end with no trade.</p></div>
    {!session && <div className="data-notice"><div className="notice-icon"><BookOpen size={17} /></div><div><strong>Browser-only demo journal</strong><p>These entries stay in this browser and are not synced to an account. Sign in to keep your journal with your learner account.</p></div></div>}
    {session && <div className="data-notice"><div className="notice-icon"><ShieldCheck size={17} /></div><div><strong>Private to your learner account</strong><p>Journal entries are private and are not published to profiles, challenges, or leaderboards.</p></div></div>}
    <div className="journal-layout">
      <section className="panel journal-editor"><div className="panel-heading"><div className="panel-heading-icon"><BookOpen size={19} /></div><div><h2>{editingId ? 'Edit reflection' : 'Capture a decision'}</h2><p>Use this to practise a repeatable process, not to predict outcomes.</p></div></div>
        <form onSubmit={save}>
          <label className="field-label" htmlFor="journal-title">Reflection title</label><input id="journal-title" className="journal-input" maxLength={120} required value={draft.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Waited because the level was unclear" />
          <label className="field-label" htmlFor="journal-decision">Decision</label><select id="journal-decision" className="journal-input" value={draft.decision} onChange={e => update('decision', e.target.value as Decision)}>{Object.entries(labels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select>
          <label className="field-label" htmlFor="journal-scenario">Related synthetic scenario (optional)</label><input id="journal-scenario" className="journal-input" pattern="TQ-SYN-[0-9]{3}" value={draft.scenarioId ?? ''} onChange={e => update('scenarioId', e.target.value ? e.target.value.toUpperCase() : null)} placeholder="TQ-SYN-001" />
          <label className="field-label" htmlFor="journal-thesis">What evidence supports the idea?</label><textarea id="journal-thesis" className="journal-input journal-textarea" maxLength={2000} rows={3} value={draft.thesis} onChange={e => update('thesis', e.target.value)} placeholder="Describe observable evidence, not a prediction." />
          <label className="field-label" htmlFor="journal-invalidation">What would invalidate it?</label><textarea id="journal-invalidation" className="journal-input journal-textarea" maxLength={1000} rows={2} value={draft.invalidation} onChange={e => update('invalidation', e.target.value)} placeholder="Name a condition that would prove the idea wrong." />
          <label className="field-label" htmlFor="journal-risk">Risk plan / reason to stand aside</label><textarea id="journal-risk" className="journal-input journal-textarea" maxLength={1000} rows={2} value={draft.riskPlan} onChange={e => update('riskPlan', e.target.value)} placeholder="What is the limit? When would no trade be the better decision?" />
          <label className="field-label" htmlFor="journal-reflection">After reviewing, what happened in your reasoning?</label><textarea id="journal-reflection" className="journal-input journal-textarea" maxLength={2000} rows={3} value={draft.reflection} onChange={e => update('reflection', e.target.value)} placeholder="Focus on the decision process, not only the outcome." />
          <label className="field-label" htmlFor="journal-lesson">What will you carry into the next practice?</label><textarea id="journal-lesson" className="journal-input journal-textarea" maxLength={1000} rows={2} value={draft.lessonLearned} onChange={e => update('lessonLearned', e.target.value)} placeholder="One specific improvement or reminder." />
          {error && <p className="feedback" role="alert">{error}</p>}{message && <p className="feedback good" role="status">{message}</p>}
          <div className="journal-form-actions"><button className="btn-primary" type="submit" disabled={busy}><Save size={15} /> {busy ? 'Saving…' : editingId ? 'Update reflection' : 'Save reflection'} <ArrowRight size={15} /></button><button className="btn-outline" type="button" onClick={beginNew} disabled={busy}><Plus size={15} /> New entry</button></div>
        </form>
      </section>
      <section className="journal-list"><div className="section-heading compact"><div><div className="eyebrow small-eyebrow">YOUR PRIVATE NOTES</div><h2>Reflection history</h2></div><span className="journal-count">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span></div>
        {entries.length === 0 ? <div className="journal-empty"><BookOpen size={24} /><h3>Your first reflection starts here</h3><p>Capture the evidence, define invalidation, and record why you waited, acted in a simulation, or passed.</p></div> : entries.map(entry => <article className="journal-entry" key={entry.id}><div className="journal-entry-top"><div><span className="tag tag-mint">{labels[entry.decision]}</span><h3>{entry.title}</h3><time>{new Date(entry.createdAt).toLocaleString()}</time></div><div className="journal-entry-actions"><button className="icon-button" aria-label={'Edit ' + entry.title} title="Edit entry" onClick={() => beginEdit(entry)} disabled={busy}><Pencil size={15} /></button><button className="icon-button" aria-label={'Delete ' + entry.title} title="Delete entry" onClick={() => void remove(entry)} disabled={busy}><Trash2 size={15} /></button></div></div>
          {entry.scenarioId && <p className="journal-scenario">Scenario · {entry.scenarioId}</p>}
          {entry.thesis && <div className="journal-note"><strong>Evidence</strong><p>{entry.thesis}</p></div>}{entry.invalidation && <div className="journal-note"><strong>Invalidation</strong><p>{entry.invalidation}</p></div>}{entry.riskPlan && <div className="journal-note"><strong>Risk / no-trade plan</strong><p>{entry.riskPlan}</p></div>}{entry.reflection && <div className="journal-note"><strong>Reflection</strong><p>{entry.reflection}</p></div>}{entry.lessonLearned && <div className="journal-note"><strong>Takeaway</strong><p>{entry.lessonLearned}</p></div>}
          </article>)}
      </section>
    </div>
    <div className="practice-disclaimer"><ShieldCheck size={17} /><span>Educational reflection only. Journal entries do not predict performance or constitute financial advice.</span></div>
  </>;
}
