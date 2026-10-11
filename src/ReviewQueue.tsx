import { ArrowRight, CalendarClock, CheckCircle2, CircleHelp, RefreshCw, ShieldCheck } from 'lucide-react';

type ReviewSkill = {
  skillId: string;
  scenarioId: string;
  label: string;
  description: string;
  attempts: number;
  lastPractisedAt: string | null;
  reviewStatus: string;
  retentionStatus: string;
  distinctScenarios: number;
  scenariosAvailable: number;
};

type Mastery = {
  skills: ReviewSkill[];
  recommendation: { scenarioId: string; title: string; reason: string; reviewStatus: string };
  note: string;
};

type Props = {
  signedIn: boolean;
  mastery: Mastery | null;
  message: string;
  onPractice: (scenarioId: string) => void;
  onSignIn: () => void;
};

const priority: Record<string, number> = {
  'review-due': 0,
  'not-yet-practised': 1,
  'date-unavailable': 2,
  'recently-practised': 3,
};

function statusLabel(skill: ReviewSkill) {
  if (skill.reviewStatus === 'review-due') return 'Review due';
  if (skill.retentionStatus === 'needs-reinforcement') return 'Reinforcement suggested';
  if (skill.reviewStatus === 'not-yet-practised') return 'Not practised yet';
  if (skill.reviewStatus === 'recently-practised') return 'Practised recently';
  return 'Practice date unavailable';
}

function relativeDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'No reliable practice date';
  const elapsedDays = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86_400_000));
  if (elapsedDays === 0) return 'Last practised today';
  if (elapsedDays === 1) return 'Last practised yesterday';
  return `Last practised ${elapsedDays} days ago`;
}

export default function ReviewQueue({ signedIn, mastery, message, onPractice, onSignIn }: Props) {
  const skills = [...(mastery?.skills ?? [])].sort((a, b) => {
    const aPriority = a.retentionStatus === 'needs-reinforcement' ? 0 : (priority[a.reviewStatus] ?? 4);
    const bPriority = b.retentionStatus === 'needs-reinforcement' ? 0 : (priority[b.reviewStatus] ?? 4);
    return aPriority - bPriority || a.attempts - b.attempts || a.label.localeCompare(b.label);
  });
  const dueCount = skills.filter(skill => skill.reviewStatus === 'review-due' || skill.retentionStatus === 'needs-reinforcement').length;
  const untouchedCount = skills.filter(skill => skill.reviewStatus === 'not-yet-practised').length;

  return <>
    <div className="page-intro">
      <div className="eyebrow"><span className="eyebrow-line" /> SPACED PRACTICE · LEARN AT YOUR PACE</div>
      <h1>Make learning <span>stick.</span></h1>
      <p>Return to ideas after a gap, strengthen weak spots, and try unfamiliar synthetic scenarios. A correct answer once is not proof of mastery.</p>
    </div>

    {!signedIn ? <section className="review-gate panel">
      <div className="review-gate-icon"><CalendarClock size={23} /></div>
      <div><h2>Your personal review queue</h2><p>Sign in to build a queue from your saved Chart Dojo practice history. Your journal and learning records stay private to your account.</p><button className="btn-primary" onClick={onSignIn}>Sign in to review <ArrowRight size={15} /></button></div>
      <div className="review-demo-note"><ShieldCheck size={16} /><span>You can still try a sample exercise without signing in.</span><button className="btn-outline" onClick={() => onPractice('TQ-SYN-001')}>Try a demo scenario</button></div>
    </section> : <>
      {message && <div className="data-notice" role="status"><CircleHelp size={17} /><div><strong>Review queue could not fully load</strong><p>{message}</p></div></div>}
      {!mastery && !message && <div className="panel review-loading" role="status"><RefreshCw size={18} /> Building your review queue from saved practice…</div>}
      {mastery && <>
        <section className="review-summary-grid" aria-label="Review summary">
          <div className="review-summary-card"><span>NEEDS A RETURN VISIT</span><strong>{dueCount}</strong><p>Due or needing reinforcement</p></div>
          <div className="review-summary-card"><span>NEW SKILLS TO EXPLORE</span><strong>{untouchedCount}</strong><p>Not practised yet</p></div>
          <div className="review-summary-card"><span>YOUR NEXT SESSION</span><strong>10 min</strong><p>One focused scenario at a time</p></div>
        </section>
        <section className="panel review-featured">
          <div className="review-featured-icon"><CalendarClock size={21} /></div>
          <div className="review-featured-copy"><span className="tag tag-mint">{mastery.recommendation.reviewStatus === 'review-due' ? 'SPACED REVIEW DUE' : 'SUGGESTED NEXT STEP'}</span><h2>{mastery.recommendation.title}</h2><p>{mastery.recommendation.reason}</p></div>
          <button className="btn-primary" onClick={() => onPractice(mastery.recommendation.scenarioId)}>Start suggested review <ArrowRight size={15} /></button>
        </section>
        <div className="review-list-heading"><div><h2>Your practice queue</h2><p>Ordered by review need, reinforcement signals, then skills you have not tried.</p></div><span>{skills.length} skills</span></div>
        <div className="review-queue-list">
          {skills.map(skill => <article className="review-queue-item" key={skill.skillId}>
            <div className="review-item-icon">{skill.reviewStatus === 'review-due' || skill.retentionStatus === 'needs-reinforcement' ? <RefreshCw size={18} /> : skill.reviewStatus === 'not-yet-practised' ? <CircleHelp size={18} /> : <CheckCircle2 size={18} />}</div>
            <div className="review-item-main"><div className="review-item-top"><h3>{skill.label}</h3><span className={skill.reviewStatus === 'review-due' || skill.retentionStatus === 'needs-reinforcement' ? 'review-status due' : 'review-status'}>{statusLabel(skill)}</span></div><p>{skill.description}</p><div className="review-item-meta"><span>{relativeDate(skill.lastPractisedAt)}</span><span>{skill.attempts} attempt{skill.attempts === 1 ? '' : 's'}</span><span>{skill.distinctScenarios}/{skill.scenariosAvailable} scenarios explored</span></div></div>
            <button className="btn-outline review-item-action" onClick={() => onPractice(skill.scenarioId)}>{skill.reviewStatus === 'review-due' ? 'Review' : skill.attempts === 0 ? 'Start' : 'Practise'} <ArrowRight size={14} /></button>
          </article>)}
        </div>
        <p className="form-footnote review-footnote"><ShieldCheck size={14} /> {mastery.note} Recommendations use practice history only; they do not predict trading outcomes.</p>
      </>}
    </>}
  </>;
}
