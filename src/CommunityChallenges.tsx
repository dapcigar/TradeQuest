import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AlertTriangle, CheckCircle2, Flag, LockKeyhole, Send, ShieldCheck, Trash2, Users } from 'lucide-react';

type Challenge = { challengeId: string; scenarioId: string; title: string; description: string; rubric: string; positiveOutcome: string; estimatedMinutes: number };
type Attempt = { attemptId: string; scenarioId: string; choiceId: string; outcome: string; feedback: string; submittedAt: string };
type Entry = { entryId: string; challengeId: string; scenarioId: string; outcome: string; rubricMet: boolean; reflection: string; isPublic: boolean; moderationStatus: string; createdAt: string };
type PublicEntry = { entryId: string; challengeId: string; title: string; handle: string; displayName: string; reflection: string; rubricMet: boolean; createdAt: string };
type QueueEntry = { entryId: string; challengeId: string; title: string; handle: string; displayName: string; reflection: string; rubricMet: boolean; createdAt: string };
type Report = { reportId: string; entryId: string; category: string; details: string; createdAt: string; handle: string; entryReflection: string };
type ModerationQueue = { entries: QueueEntry[]; reports: Report[] };
type ModerationAction = { actionId: string; entryId: string; action: 'approve' | 'hide' | 'remove'; previousStatus: string | null; newStatus: string; reason: string; createdAt: string };
type EditorialChallenge = { challengeId: string; scenarioId: string; title: string; description: string; rubric: string; sourceReference: string; contentVersion: number; editorialStatus: string; published: boolean; reviewedAt: string | null; reviewReason: string | null };
type EditorialReviewAction = { reviewId: string; challengeId: string; decision: 'approve' | 'revision-needed' | 'retire'; previousStatus: string; newStatus: string; previousPublished: boolean; newPublished: boolean; contentVersion: number; reason: string; createdAt: string };
type ChallengeProposal = { challengeId: string; scenarioId: string; title: string; description: string; rubric: string; positiveOutcome: string; estimatedMinutes: number; contentVersion: number; editorialStatus: string; published: boolean; reviewedAt: string | null; reviewReason: string | null; createdAt: string };
type Profile = { isPublic: boolean };
const apiBase = () => import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000';
const categories = [
  { value: 'spam', label: 'Spam or repeated promotion' },
  { value: 'harassment', label: 'Harassment or abusive content' },
  { value: 'personal-information', label: 'Personal information' },
  { value: 'unsafe-advice', label: 'Unsafe or misleading advice' },
  { value: 'copyright', label: 'Copyright concern' },
  { value: 'other', label: 'Other concern' },
];

export default function CommunityChallenges({ session }: { session: Session | null }) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [publicEntries, setPublicEntries] = useState<PublicEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [editorialQueue, setEditorialQueue] = useState<EditorialChallenge[]>([]);
  const [editorialHistory, setEditorialHistory] = useState<EditorialReviewAction[]>([]);
  const [proposals, setProposals] = useState<ChallengeProposal[]>([]);
  const [proposalError, setProposalError] = useState('');
  const [proposalScenarioId, setProposalScenarioId] = useState('TQ-SYN-001');
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalRubric, setProposalRubric] = useState('');
  const [proposalMinutes, setProposalMinutes] = useState('8');
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [queue, setQueue] = useState<ModerationQueue>({ entries: [], reports: [] });
  const [moderationHistory, setModerationHistory] = useState<ModerationAction[]>([]);
  const [challengeId, setChallengeId] = useState('QUEST-001');
  const [attemptId, setAttemptId] = useState('');
  const [reflection, setReflection] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [reportingEntry, setReportingEntry] = useState<string | null>(null);
  const [reportCategory, setReportCategory] = useState('other');
  const [reportDetails, setReportDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedChallenge = challenges.find(item => item.challengeId === challengeId) ?? challenges[0];
  const proposalScenarios = [...new Map(challenges.map(item => [item.scenarioId, item])).values()];
  const selectedProposalScenario = proposalScenarios.find(item => item.scenarioId === proposalScenarioId) ?? proposalScenarios[0];
  const eligibleAttempts = useMemo(() => selectedChallenge ? attempts.filter(item => item.scenarioId === selectedChallenge.scenarioId) : [], [attempts, selectedChallenge]);
  const selectedAttempt = eligibleAttempts.find(item => item.attemptId === attemptId) ?? eligibleAttempts[0];

  const headers = useMemo(() => session ? { Authorization: 'Bearer ' + session.access_token } : null, [session]);

  const load = useCallback(async () => {
    if (!headers) return;
    setLoading(true); setError('');
    try {
      const [challengeRes, attemptsRes, mineRes, publicRes, profileRes, moderatorRes, editorialRes] = await Promise.all([
        fetch(apiBase() + '/v1/community/challenges', { headers, cache: 'no-store' }),
        fetch(apiBase() + '/v1/chart-dojo/attempts', { headers, cache: 'no-store' }),
        fetch(apiBase() + '/v1/community/challenges/entries/mine', { headers, cache: 'no-store' }),
        fetch(apiBase() + '/v1/community/challenges/entries', { headers, cache: 'no-store' }),
        fetch(apiBase() + '/v1/community/profile', { headers, cache: 'no-store' }),
        fetch(apiBase() + '/v1/community/moderation/me', { headers, cache: 'no-store' }),
        fetch(apiBase() + '/v1/community/editorial/me', { headers, cache: 'no-store' }),
      ]);
      const [challengeBody, attemptsBody, mineBody, publicBody, profileBody, moderatorBody, editorialBody] = await Promise.all([
        challengeRes.json(), attemptsRes.json(), mineRes.json(), publicRes.json(), profileRes.json(), moderatorRes.json(), editorialRes.json(),
      ]) as [
        { challenges?: Challenge[]; error?: string }, { attempts?: Attempt[]; error?: string },
        { entries?: Entry[]; error?: string }, { entries?: PublicEntry[]; error?: string },
        { profile?: Profile | null; error?: string }, { isModerator?: boolean; error?: string },
        { isEditor?: boolean; error?: string }
      ];
      for (const [response, body] of [[challengeRes, challengeBody], [attemptsRes, attemptsBody], [mineRes, mineBody], [publicRes, publicBody], [profileRes, profileBody], [moderatorRes, moderatorBody], [editorialRes, editorialBody]] as const) {
        if (!response.ok) throw new Error(body.error || 'Community challenges could not be loaded.');
      }
      setChallenges(Array.isArray(challengeBody.challenges) ? challengeBody.challenges : []);
      setAttempts(Array.isArray(attemptsBody.attempts) ? attemptsBody.attempts : []);
      setEntries(Array.isArray(mineBody.entries) ? mineBody.entries : []);
      setPublicEntries(Array.isArray(publicBody.entries) ? publicBody.entries : []);
      setProfile(profileBody.profile ?? null);
      setIsModerator(moderatorBody.isModerator === true);
      setIsEditor(editorialBody.isEditor === true);
      if (moderatorBody.isModerator === true) {
        const [queueResponse, historyResponse] = await Promise.all([
          fetch(apiBase() + '/v1/community/moderation/queue', { headers, cache: 'no-store' }),
          fetch(apiBase() + '/v1/community/moderation/history', { headers, cache: 'no-store' }),
        ]);
        const [queueBody, historyBody] = await Promise.all([
          queueResponse.json() as Promise<{ queue?: ModerationQueue; error?: string }>,
          historyResponse.json() as Promise<{ actions?: ModerationAction[]; error?: string }>,
        ]);
        if (!queueResponse.ok) throw new Error(queueBody.error || 'Moderation queue could not be loaded.');
        if (!historyResponse.ok) throw new Error(historyBody.error || 'Moderation history could not be loaded.');
        setQueue(queueBody.queue ?? { entries: [], reports: [] });
        setModerationHistory(Array.isArray(historyBody.actions) ? historyBody.actions : []);
      } else {
        setQueue({ entries: [], reports: [] });
        setModerationHistory([]);
      }
      if (editorialBody.isEditor === true) {
        const [editorialResponse, historyResponse] = await Promise.all([
          fetch(apiBase() + '/v1/community/editorial/queue', { headers, cache: 'no-store' }),
          fetch(apiBase() + '/v1/community/editorial/history', { headers, cache: 'no-store' }),
        ]);
        const [editorialResult, historyResult] = await Promise.all([
          editorialResponse.json() as Promise<{ challenges?: EditorialChallenge[]; error?: string }>,
          historyResponse.json() as Promise<{ reviews?: EditorialReviewAction[]; error?: string }>,
        ]);
        if (!editorialResponse.ok) throw new Error(editorialResult.error || 'Editorial review queue could not be loaded.');
        if (!historyResponse.ok) throw new Error(historyResult.error || 'Editorial review history could not be loaded.');
        setEditorialQueue(Array.isArray(editorialResult.challenges) ? editorialResult.challenges : []);
        setEditorialHistory(Array.isArray(historyResult.reviews) ? historyResult.reviews : []);
      } else {
        setEditorialQueue([]);
        setEditorialHistory([]);
      }
      // Proposal support is migration-gated; keep the existing community experience
      // usable and surface a local proposal error if that optional endpoint is unavailable.
      try {
        setProposalError('');
        const proposalsResponse = await fetch(apiBase() + '/v1/community/challenges/proposals/mine', { headers, cache: 'no-store' });
        const proposalsBody = await proposalsResponse.json() as { proposals?: ChallengeProposal[]; error?: string };
        if (!proposalsResponse.ok || !Array.isArray(proposalsBody.proposals)) {
          throw new Error(proposalsBody.error || 'Your proposals could not be loaded. The challenge proposal migration may not be applied yet.');
        }
        setProposals(proposalsBody.proposals);
      } catch (proposalLoadError) {
        setProposals([]);
        setProposalError(proposalLoadError instanceof Error ? proposalLoadError.message : 'Your challenge proposals are temporarily unavailable.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Community challenges could not be loaded.');
    } finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (eligibleAttempts.length && !eligibleAttempts.some(item => item.attemptId === attemptId)) setAttemptId(eligibleAttempts[0].attemptId);
    if (!eligibleAttempts.length) setAttemptId('');
  }, [eligibleAttempts, attemptId]);

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!headers || !selectedChallenge || !selectedAttempt) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(apiBase() + '/v1/community/challenges/entries', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: selectedChallenge.challengeId, attemptId: selectedAttempt.attemptId, reflection: reflection.trim(), isPublic }),
      });
      const body = await response.json() as { entry?: Entry; error?: string };
      if (!response.ok || !body.entry) throw new Error(body.error || 'Challenge entry could not be saved.');
      setReflection('');
      setMessage(body.entry.isPublic ? 'Entry saved and queued for moderator review. It will not appear publicly until approved.' : 'Private challenge reflection saved. Your rubric result is based on the server-scored attempt.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Challenge entry could not be saved.'); }
    finally { setBusy(false); }
  }

  async function deleteEntry(entryId: string) {
    if (!headers || !window.confirm('Delete this challenge entry? Your original practice attempt will remain in your learning history.')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(apiBase() + '/v1/community/challenges/entries/' + entryId, { method: 'DELETE', headers });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        throw new Error(body.error || 'Entry could not be deleted.');
      }
      setMessage('Challenge entry deleted. Your practice attempt remains unchanged.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Entry could not be deleted.'); }
    finally { setBusy(false); }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!headers || !reportingEntry) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(apiBase() + '/v1/community/challenges/entries/' + reportingEntry + '/report', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: reportCategory, details: reportDetails.trim() }),
      });
      const body = await response.json() as { report?: unknown; error?: string };
      if (!response.ok) throw new Error(body.error || 'Report could not be submitted.');
      setReportingEntry(null); setReportDetails('');
      setMessage('Report sent to the moderation team. Reports are private.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Report could not be submitted.'); }
    finally { setBusy(false); }
  }

  async function moderate(entryId: string, action: 'approve' | 'hide' | 'remove') {
    if (!headers) return;
    const reason = window.prompt('Record a short moderation reason (required).');
    if (!reason || reason.trim().length < 3) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(apiBase() + '/v1/community/moderation/entries/' + entryId + '/action', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: reason.trim() }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Moderation action could not be recorded.');
      setMessage('Moderation action recorded in the audit trail.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Moderation action could not be recorded.'); }
    finally { setBusy(false); }
  }

  async function reviewEditorial(challengeId: string, decision: 'approve' | 'revision-needed' | 'retire') {
    if (!headers || !isEditor) return;
    const reason = window.prompt('Record the editorial rationale (required).');
    if (!reason || reason.trim().length < 3) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(apiBase() + '/v1/community/editorial/' + challengeId + '/review', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: reason.trim() }),
      });
      const body = await response.json() as { review?: { editorialStatus: string }; error?: string };
      if (!response.ok || !body.review) throw new Error(body.error || 'Editorial review could not be saved.');
      setMessage('Editorial decision recorded. Status: ' + body.review.editorialStatus + '.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Editorial review could not be saved.'); }
    finally { setBusy(false); }
  }

  if (!session) return null;

  return <section className="community-challenges-section">
    <div className="community-section-heading"><div className="community-icon"><Users size={20}/></div><div><h2>Community challenges</h2><p>Reflect on server-scored practice; public entries require explicit opt-in and moderator approval.</p></div></div>
    {error && <div className="data-notice" role="alert"><AlertTriangle size={17}/><div><strong>Community challenges</strong><p>{error}</p></div></div>}
    {message && <div className="data-notice" role="status"><CheckCircle2 size={17}/><div><strong>Update saved</strong><p>{message}</p></div></div>}
    {loading ? <div className="panel" role="status">Loading challenges…</div> : <>
      <div className="community-challenge-layout">
        <section className="panel community-challenge-editor">
          {challenges.length === 0 ? <div className="community-empty"><LockKeyhole size={23}/><h3>Challenges awaiting publication</h3><p>Curated challenges appear after editorial approval. Existing learning and private journal features remain available.</p></div> : <>
          <span className="tag tag-mint">PROCESS · NOT P/L</span>
          <h3>Submit a learning reflection</h3>
          <p className="community-challenge-intro">Choose a saved attempt for the challenge scenario and explain your reasoning. TradeQuest derives the rubric result from the original server-scored attempt; you cannot submit or edit your own score.</p>
          <form onSubmit={submitEntry}>
            <label className="community-label" htmlFor="community-challenge">Challenge</label>
            <select className="community-input" id="community-challenge" value={selectedChallenge?.challengeId ?? ''} onChange={e => setChallengeId(e.target.value)} required>
              {challenges.map(item => <option key={item.challengeId} value={item.challengeId}>{item.title}</option>)}
            </select>
            {selectedChallenge && <div className="community-challenge-rubric"><strong>{selectedChallenge.estimatedMinutes} min · Process rubric</strong><p>{selectedChallenge.rubric}</p><p>{selectedChallenge.description}</p></div>}
            <label className="community-label" htmlFor="community-attempt">Saved practice attempt</label>
            <select className="community-input" id="community-attempt" value={selectedAttempt?.attemptId ?? ''} onChange={e => setAttemptId(e.target.value)} disabled={!eligibleAttempts.length} required>
              {eligibleAttempts.map(item => <option key={item.attemptId} value={item.attemptId}>{new Date(item.submittedAt).toLocaleString('en-GB')} · {item.outcome}</option>)}
            </select>
            {selectedAttempt ? <p className="community-help">Server feedback: {selectedAttempt.feedback}</p> : <p className="community-help">No saved attempt for this challenge yet. Complete its synthetic scenario in Chart Dojo first.</p>}
            <label className="community-label" htmlFor="community-reflection">What did you learn?</label>
            <textarea className="community-input community-textarea" id="community-reflection" rows={4} minLength={10} maxLength={1000} value={reflection} onChange={e => setReflection(e.target.value)} placeholder="Describe the evidence you used, the risk you considered, or why waiting was appropriate." required/>
            <p className="community-help">{reflection.length}/1000 characters. Do not include personal or financial details.</p>
            <label className="community-visibility">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} disabled={!profile?.isPublic}/>
              <span><strong>Submit for public community review</strong><small>{profile?.isPublic ? 'Your entry and reflection will be visible only after a moderator approves it.' : 'Make your community profile public first. Private entries remain visible only to you.'}</small></span>
            </label>
            <div className="community-actions"><button className="btn-primary" type="submit" disabled={busy || !selectedAttempt || !selectedChallenge || reflection.trim().length < 10}><Send size={15}/>{busy ? 'Submitting…' : 'Save reflection'}</button></div>
          </form>
          </>}
        </section>
        <section className="community-challenge-side">
          <div className="community-section-heading"><div className="community-icon"><ShieldCheck size={20}/></div><div><h3>Your entries</h3><p>Private by default; public entries wait for moderation.</p></div></div>
          {entries.length === 0 ? <div className="community-empty"><LockKeyhole size={23}/><h3>No entries yet</h3><p>Your saved challenge reflections and rubric results will appear here.</p></div> : <div className="community-entry-list">{entries.map(entry => <article className="panel community-entry-card" key={entry.entryId}>
            <div className="community-entry-heading"><span className={`tag ${entry.rubricMet ? 'tag-mint' : 'tag-violet'}`}>{entry.rubricMet ? 'RUBRIC MET' : 'REFLECTION NEEDED'}</span><span className="community-help">{entry.isPublic ? 'Public submission' : 'Private'}</span></div>
            <h4>{challenges.find(item => item.challengeId === entry.challengeId)?.title ?? entry.challengeId}</h4><p>{entry.reflection}</p>
            <div className="community-entry-status"><span>{entry.moderationStatus === 'pending' ? 'Awaiting moderator review' : entry.moderationStatus === 'approved' ? 'Saved' : entry.moderationStatus === 'hidden' ? 'Hidden by moderation' : 'Removed by moderation'}</span><small>{new Date(entry.createdAt).toLocaleDateString('en-GB')}</small></div>
            <button className="btn-outline" type="button" disabled={busy} onClick={() => void deleteEntry(entry.entryId)}><Trash2 size={14}/>Delete entry</button>
          </article>)}</div>}
        </section>
      </div>
      <section className="community-public-feed">
        <div className="community-section-heading"><div className="community-icon"><Users size={20}/></div><div><h3>Approved community reflections</h3><p>Only entries approved by a moderator and attached to an opted-in public profile appear here.</p></div></div>
        {publicEntries.length === 0 ? <div className="community-empty"><Users size={23}/><h3>No approved public entries yet</h3><p>Public submissions remain hidden until reviewed. No leaderboard or profit ranking is used.</p></div> : <div className="community-entry-list">{publicEntries.map(entry => <article className="panel community-entry-card" key={entry.entryId}>
          <div className="community-entry-heading"><span className={`tag ${entry.rubricMet ? 'tag-mint' : 'tag-violet'}`}>{entry.rubricMet ? 'RUBRIC MET' : 'REFLECTION TO REVIEW'}</span><span className="community-handle">@{entry.handle}</span></div>
          <h4>{entry.title} · {entry.displayName}</h4><p>{entry.reflection}</p><div className="community-entry-status"><span>Process-based result</span><small>{new Date(entry.createdAt).toLocaleDateString('en-GB')}</small></div>
          <button className="btn-outline" type="button" disabled={busy} onClick={() => {setReportingEntry(entry.entryId);setReportCategory('other');setReportDetails('');}}><Flag size={14}/>Report entry</button>
          {reportingEntry === entry.entryId && <form className="community-report-form" onSubmit={submitReport}>
            <label className="community-label" htmlFor={'report-category-' + entry.entryId}>Reason for report</label><select className="community-input" id={'report-category-' + entry.entryId} value={reportCategory} onChange={e => setReportCategory(e.target.value)}>{categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <label className="community-label" htmlFor={'report-details-' + entry.entryId}>Details <span>(optional)</span></label><textarea className="community-input" id={'report-details-' + entry.entryId} rows={2} maxLength={1000} value={reportDetails} onChange={e => setReportDetails(e.target.value)}/>
            <div className="community-actions"><button className="btn-primary" type="submit" disabled={busy}>Send private report</button><button className="btn-outline" type="button" onClick={() => setReportingEntry(null)}>Cancel</button></div>
          </form>}
        </article>)}</div>}
      </section>
      {isEditor && <section className="community-moderation panel">
        <div className="community-section-heading"><div className="community-icon"><ShieldCheck size={20}/></div><div><h3>Editorial review queue</h3><p>Review source provenance, version and process rubric before approving a challenge for learner use. Every decision and reason is audited.</p></div></div>
        {editorialQueue.length === 0 ? <p className="community-help">No challenges require editorial review.</p> : editorialQueue.map(item => <article className="community-moderation-item" key={item.challengeId}>
          <div className="community-entry-heading"><strong>{item.challengeId} · {item.title}</strong><span className="tag tag-violet">{item.editorialStatus.toUpperCase()}</span></div>
          <p>{item.description}</p><p><strong>Rubric:</strong> {item.rubric}</p>
          <p className="community-help">Source: {item.sourceReference} · Content version {item.contentVersion} · Published: {item.published ? 'yes' : 'no'}</p>
          {item.reviewReason && <p className="community-help">Previous review: {item.reviewReason}</p>}
          <div className="community-actions"><button className="btn-primary" disabled={busy} onClick={() => void reviewEditorial(item.challengeId,'approve')}>Approve &amp; publish</button><button className="btn-outline" disabled={busy} onClick={() => void reviewEditorial(item.challengeId,'revision-needed')}>Request revision</button><button className="btn-outline" disabled={busy} onClick={() => void reviewEditorial(item.challengeId,'retire')}>Retire challenge</button></div>
        </article>)}
        <div className="community-moderation-history">
          <h4>Recent editorial decisions</h4>
          {editorialHistory.length === 0
            ? <p className="community-help">No editorial decisions have been recorded yet.</p>
            : <ol aria-label="Recent editorial decision history">{editorialHistory.map(item => <li key={item.reviewId}>
                <strong>{item.challengeId} · {item.decision.replace('-', ' ').toUpperCase()}</strong>
                <p>{item.reason}</p>
                <small>Version {item.contentVersion} · {item.previousStatus} → {item.newStatus} · {item.previousPublished ? 'published' : 'unpublished'} → {item.newPublished ? 'published' : 'unpublished'} · {new Date(item.createdAt).toLocaleString('en-GB')}</small>
              </li>)}</ol>}
        </div>
      </section>}
      {isModerator && <section className="community-moderation panel">
        <div className="community-section-heading"><div className="community-icon"><ShieldCheck size={20}/></div><div><h3>Moderator queue</h3><p>Every action requires a reason and is recorded in an audit trail.</p></div></div>
        {queue.entries.length === 0 && queue.reports.length === 0 ? <p className="community-help">No pending entries or reports.</p> : <>
          {queue.entries.map(entry => <article className="community-moderation-item" key={entry.entryId}><strong>{entry.title} · @{entry.handle}</strong><p>{entry.reflection}</p><div className="community-actions"><button className="btn-primary" disabled={busy} onClick={() => void moderate(entry.entryId,'approve')}>Approve</button><button className="btn-outline" disabled={busy} onClick={() => void moderate(entry.entryId,'hide')}>Hide</button><button className="btn-outline" disabled={busy} onClick={() => void moderate(entry.entryId,'remove')}>Remove</button></div></article>)}
          {queue.reports.map(report => <article className="community-moderation-item" key={report.reportId}><strong>Report: {report.category} · @{report.handle}</strong><p>{report.details || 'No additional details supplied.'}</p><blockquote>{report.entryReflection}</blockquote><div className="community-actions"><button className="btn-primary" disabled={busy} onClick={() => void moderate(report.entryId,'hide')}>Hide reported entry</button><button className="btn-outline" disabled={busy} onClick={() => void moderate(report.entryId,'remove')}>Remove entry</button><button className="btn-outline" disabled={busy} onClick={() => void moderate(report.entryId,'approve')}>Dismiss / approve</button></div></article>)}
        </>}
        <div className="community-moderation-history">
          <h4>Recent moderation history</h4>
          {moderationHistory.length === 0
            ? <p className="community-help">No moderation actions have been recorded yet.</p>
            : <ol aria-label="Recent moderation audit history">{moderationHistory.map(item => <li key={item.actionId}>
                <strong>{item.action.toUpperCase()} · {item.previousStatus ?? 'unreviewed'} → {item.newStatus}</strong>
                <p>{item.reason}</p>
                <small>Entry {item.entryId} · {new Date(item.createdAt).toLocaleString('en-GB')}</small>
              </li>)}</ol>}
        </div>
      </section>}
    </>}
  </section>;
}
