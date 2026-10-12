import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, ShieldCheck, Sparkles, Target } from 'lucide-react';

type Skill = 'risk-definition' | 'evidence-patience' | 'risk-budget';
type Variant = { id: string; skill: Skill; title: string; context: string; choices: Array<{ id: string; label: string }>; answer: string; explanation: string };
type Attempt = { variantId: string; skill: Skill; positive: boolean; at: string };

const variants: Variant[] = [
  { id: 'risk-definition-a', skill: 'risk-definition', title: 'The plan has a missing piece', context: 'A fictional asset has moved steadily higher. A learner has a possible entry idea, but cannot explain where the idea would be invalidated or what loss would be acceptable.', choices: [{ id: 'define', label: 'Define invalidation and acceptable loss before deciding' }, { id: 'enter', label: 'Enter now because the move looks orderly' }, { id: 'follow', label: 'Copy another learner’s entry and work out risk later' }], answer: 'define', explanation: 'A setup is incomplete until the thesis, invalidation condition, and acceptable loss are clear. A smooth-looking move does not remove uncertainty.' },
  { id: 'risk-definition-b', skill: 'risk-definition', title: 'A confident thesis, no exit condition', context: 'In a new fictional scenario, the written thesis is detailed and the learner feels confident. They have not identified what evidence would show the thesis is wrong.', choices: [{ id: 'define', label: 'Write an observable invalidation condition before proceeding' }, { id: 'enter', label: 'Treat confidence as enough evidence to proceed' }, { id: 'follow', label: 'Use the most recent candle as the only exit rule' }], answer: 'define', explanation: 'Confidence is not a risk control. An invalidation condition should be explicit and linked to the thesis, not improvised from one candle.' },
  { id: 'evidence-patience-a', skill: 'evidence-patience', title: 'The unfinished signal', context: 'A synthetic chart reaches a level watched by the learner, but the illustrative candle has not closed. There is no confirmed break in this teaching scenario.', choices: [{ id: 'wait', label: 'Wait for the planned evidence; reassess if it never appears' }, { id: 'chase', label: 'Act immediately so the move is not missed' }, { id: 'predict', label: 'Assume the next candle will confirm the idea' }], answer: 'wait', explanation: 'A potential signal is not confirmed evidence. Waiting or passing is a valid decision; even a completed candle cannot guarantee what happens next.' },
  { id: 'evidence-patience-b', skill: 'evidence-patience', title: 'News creates urgency', context: 'A fictional headline causes a sharp move in an illustrative chart. The learner’s checklist requires a calm review, but they feel pressure to act before others do.', choices: [{ id: 'wait', label: 'Return to the checklist and pass if evidence is insufficient' }, { id: 'chase', label: 'Enter quickly because urgency suggests opportunity' }, { id: 'predict', label: 'Assume the first move will continue' }], answer: 'wait', explanation: 'Urgency and fear of missing out are not evidence. Apply the same checklist under pressure, and accept no-trade when requirements are not met.' },
  { id: 'risk-budget-a', skill: 'risk-budget', title: 'The loss exceeds the limit', context: 'A hypothetical plan has a planned loss of £180, while the learner’s stated maximum for this exercise is £75. The thesis may be plausible, but the figures do not fit.', choices: [{ id: 'resize', label: 'Recalculate size or reject the plan if it cannot fit the limit' }, { id: 'accept', label: 'Accept the larger loss because the thesis seems strong' }, { id: 'hide', label: 'Ignore the limit and focus on the possible upside' }], answer: 'resize', explanation: 'The risk budget is a constraint, not a target to exceed when confidence rises. Resize using valid assumptions or do not proceed.' },
  { id: 'risk-budget-b', skill: 'risk-budget', title: 'Two plans, one budget', context: 'A fictional exercise sets a maximum loss of 1% of virtual equity. Plan A would risk 0.7%; Plan B would risk 1.6%, before any omitted costs.', choices: [{ id: 'choose-a', label: 'Treat A as within the stated limit and review omitted costs' }, { id: 'choose-b', label: 'Choose B because a wider risk can capture more movement' }, { id: 'average', label: 'Average the two losses to make both acceptable' }], answer: 'choose-a', explanation: 'Compare the planned loss with the explicit limit and remember omitted costs or gaps can increase realised loss. The exercise is educational, not a trade recommendation.' },
];


const serverScenarioIds: Record<string, string> = {
  'risk-definition-a': 'TQ-SYN-019', 'risk-definition-b': 'TQ-SYN-020',
  'evidence-patience-a': 'TQ-SYN-021', 'evidence-patience-b': 'TQ-SYN-022',
  'risk-budget-a': 'TQ-SYN-023', 'risk-budget-b': 'TQ-SYN-024',
};
const localVariantIds = Object.fromEntries(Object.entries(serverScenarioIds).map(([localId, serverId]) => [serverId, localId])) as Record<string, string>;
const positiveOutcomes: Record<Skill, string> = { 'risk-definition': 'disciplined', 'evidence-patience': 'evidence-led', 'risk-budget': 'risk-aware' };
function skillFor(id: string): Skill {
  if (id.startsWith('risk-definition')) return 'risk-definition';
  if (id.startsWith('evidence-patience')) return 'evidence-patience';
  return 'risk-budget';
}
type ServerScenario = { scenarioId: string; title: string; prompt: string; choices: Array<{ id: string; label: string }> };
export type AdaptiveAttemptSummary = { scenarioId: string; attemptCount: number; positiveCount: number; lastSubmittedAt: string | null };

const storageKey = 'tradequest-adaptive-practice-v1';
function readAttempts(): Attempt[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is Attempt => !!item && typeof item.variantId === 'string' && typeof item.skill === 'string' && typeof item.positive === 'boolean' && typeof item.at === 'string') : [];
  } catch { return []; }
}
function chooseNext(attempts: Attempt[]): Variant {
  const skills: Skill[] = ['risk-definition', 'evidence-patience', 'risk-budget'];
  const weakest = [...skills].sort((a, b) => {
    const aa = attempts.filter(item => item.skill === a);
    const bb = attempts.filter(item => item.skill === b);
    const aRate = aa.length ? aa.filter(item => item.positive).length / aa.length : -1;
    const bRate = bb.length ? bb.filter(item => item.positive).length / bb.length : -1;
    return aRate - bRate || aa.length - bb.length;
  })[0];
  const seen = new Set(attempts.filter(item => item.skill === weakest).map(item => item.variantId));
  return variants.find(item => item.skill === weakest && !seen.has(item.id)) ?? variants.find(item => !attempts.some(attempt => attempt.variantId === item.id)) ?? variants[0];
}

export function assessAdaptiveAnswer(variantId: string, choiceId: string): { positive: boolean; explanation: string } {
  const variant = variants.find(item => item.id === variantId);
  if (!variant) throw new Error('Unknown adaptive practice scenario.');
  if (!variant.choices.some(choice => choice.id === choiceId)) throw new Error('Choose an available answer.');
  return { positive: choiceId === variant.answer, explanation: variant.explanation };
}
export function nextAdaptiveVariant(attempts: Attempt[]): Variant { return chooseNext(attempts); }

export function nextAdaptiveVariantFromSummary(summaries: AdaptiveAttemptSummary[]): Variant {
  const byScenario = new Map(summaries.map(item => [item.scenarioId, item]));
  const skills: Skill[] = ['risk-definition', 'evidence-patience', 'risk-budget'];
  const stats = skills.map(skill => {
    const ids = variants.filter(item => item.skill === skill).map(item => serverScenarioIds[item.id]);
    const matching = ids.map(id => byScenario.get(id)).filter((item): item is AdaptiveAttemptSummary => Boolean(item));
    const count = matching.reduce((sum, item) => sum + item.attemptCount, 0);
    const positive = matching.reduce((sum, item) => sum + item.positiveCount, 0);
    return { skill, count, rate: count ? positive / count : -1 };
  }).sort((a, b) => a.rate - b.rate || a.count - b.count);
  const weakest = stats[0]?.skill ?? skills[0];
  const seen = new Set(variants.filter(item => (byScenario.get(serverScenarioIds[item.id])?.attemptCount ?? 0) > 0).map(item => item.id));
  return variants.find(item => item.skill === weakest && !seen.has(item.id))
    ?? variants.find(item => !seen.has(item.id))
    ?? variants[0];
}

export function adaptiveEvidenceFromSummary(summaries: AdaptiveAttemptSummary[], skill: Skill) {
  const byScenario = new Map(summaries.map(item => [item.scenarioId, item]));
  const variantsForSkill = variants.filter(item => item.skill === skill);
  const recall = variantsForSkill.filter(item => item.id.endsWith('-a')).map(item => byScenario.get(serverScenarioIds[item.id]));
  const transfer = variantsForSkill.filter(item => item.id.endsWith('-b')).map(item => byScenario.get(serverScenarioIds[item.id]));
  const recallAttempts = recall.reduce((sum, item) => sum + (item?.attemptCount ?? 0), 0);
  const recallPositive = recall.reduce((sum, item) => sum + (item?.positiveCount ?? 0), 0);
  const transferAttempts = transfer.reduce((sum, item) => sum + (item?.attemptCount ?? 0), 0);
  const transferPositive = transfer.reduce((sum, item) => sum + (item?.positiveCount ?? 0), 0);
  return { recallAttempts, recallPositive, transferAttempts, transferPositive, confidence: transferAttempts < 2 ? 'too-few-to-judge' : 'early-signal' };
}

export function recordAdaptiveSummaryAttempt(
  summaries: AdaptiveAttemptSummary[],
  scenarioId: string,
  positive: boolean,
  submittedAt: string,
): AdaptiveAttemptSummary[] {
  let found = false;
  const updated = summaries.map(item => {
    if (item.scenarioId !== scenarioId) return item;
    found = true;
    return { ...item, attemptCount: item.attemptCount + 1, positiveCount: item.positiveCount + Number(positive), lastSubmittedAt: submittedAt };
  });
  return found ? updated : [...updated, { scenarioId, attemptCount: 1, positiveCount: Number(positive), lastSubmittedAt: submittedAt }];
}
export function adaptiveEvidence(attempts: Attempt[], skill: Skill) {
  const skillAttempts = attempts.filter(item => item.skill === skill);
  const recalled = skillAttempts.filter(item => item.variantId.endsWith('-a'));
  const transfer = skillAttempts.filter(item => item.variantId.endsWith('-b'));
  return {
    recallAttempts: recalled.length,
    recallPositive: recalled.filter(item => item.positive).length,
    transferAttempts: transfer.length,
    transferPositive: transfer.filter(item => item.positive).length,
    confidence: transfer.length < 2 ? 'too-few-to-judge' : 'early-signal',
  };
}

export default function AdaptivePractice({ session }: { session: Session | null }) {
  const [attempts, setAttempts] = useState<Attempt[]>(() => session ? [] : readAttempts());
  const [accountSummary, setAccountSummary] = useState<AdaptiveAttemptSummary[]>([]);
  const [variant, setVariant] = useState<Variant>(() => chooseNext(session ? [] : readAttempts()));
  const [serverVariants, setServerVariants] = useState<Record<string, Variant>>({});
  const [choice, setChoice] = useState('');
  const [feedback, setFeedback] = useState<{ positive: boolean; explanation: string } | null>(null);
  const [loading, setLoading] = useState(Boolean(session));
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const next = useMemo(() => session ? nextAdaptiveVariantFromSummary(accountSummary) : chooseNext(attempts), [session, accountSummary, attempts]);
  const skills: Array<{ id: Skill; label: string }> = [{ id: 'risk-definition', label: 'Define risk' }, { id: 'evidence-patience', label: 'Wait for evidence' }, { id: 'risk-budget', label: 'Respect the budget' }];

  useEffect(() => {
    let cancelled = false;
    if (!session) {
      const local = readAttempts();
      setAttempts(local); setAccountSummary([]); setVariant(chooseNext(local)); setServerVariants({}); setServerError(''); setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true); setServerError(''); setAttempts([]); setAccountSummary([]); setServerVariants({});
    const base = import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000';
    const headers = { Authorization: 'Bearer ' + session.access_token };
    Promise.all([
      fetch(base + '/v1/chart-dojo/scenarios', { headers, cache: 'no-store' }),
      fetch(base + '/v1/chart-dojo/attempts/adaptive-summary', { headers, cache: 'no-store' }),
    ]).then(async ([scenarioResponse, summaryResponse]) => {
      if (!scenarioResponse.ok || !summaryResponse.ok) throw new Error('Account-backed adaptive practice could not load. Confirm the API and adaptive scenario migration are available.');
      const scenarioBody = await scenarioResponse.json() as { scenarios?: ServerScenario[] };
      const summaryBody = await summaryResponse.json() as { summaries?: AdaptiveAttemptSummary[]; historyComplete?: boolean; error?: string };
      const mapped: Record<string, Variant> = {};
      for (const scenario of scenarioBody.scenarios ?? []) {
        const localId = localVariantIds[scenario.scenarioId];
        if (!localId) continue;
        mapped[localId] = { id: localId, skill: skillFor(localId), title: scenario.title, context: scenario.prompt, choices: scenario.choices, answer: '', explanation: '' };
      }
      if (Object.keys(mapped).length !== Object.keys(serverScenarioIds).length) throw new Error('Adaptive scenarios are missing. Apply the adaptive-practice scenario migration, then retry.');
      const summaries = Array.isArray(summaryBody.summaries) ? summaryBody.summaries : [];
      if (summaryBody.historyComplete !== true || summaries.length !== Object.keys(serverScenarioIds).length) throw new Error('Complete adaptive practice evidence is missing. Retry loading the practice set.');
      if (cancelled) return;
      setServerVariants(mapped); setAttempts([]); setAccountSummary(summaries); setVariant(mapped[nextAdaptiveVariantFromSummary(summaries).id]);
    }).catch(error => {
      if (!cancelled) setServerError(error instanceof Error ? error.message : 'Account-backed adaptive practice could not load.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.access_token, reloadKey]);

  async function submit() {
    if (!choice || feedback || busy) return;
    if (session) {
      const scenarioId = serverScenarioIds[variant.id];
      if (!scenarioId || !serverVariants[variant.id]) { setServerError('This server-scored scenario is not ready. Retry loading the practice set.'); return; }
      setBusy(true); setServerError('');
      try {
        const response = await fetch((import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000') + '/v1/chart-dojo/attempts', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
          body: JSON.stringify({ attemptId: crypto.randomUUID(), scenarioId, choiceId: choice }),
        });
        const body = await response.json() as { result?: { outcome: string; feedback: string }; error?: string };
        if (!response.ok || !body.result) throw new Error(body.error || 'Your answer could not be saved.');
        const result = { positive: body.result.outcome === positiveOutcomes[variant.skill], explanation: body.result.feedback };
        const submittedAt = new Date().toISOString();
        setAccountSummary(previous => recordAdaptiveSummaryAttempt(previous, scenarioId, result.positive, submittedAt));
        setFeedback(result);
      } catch (error) { setServerError(error instanceof Error ? error.message : 'Your answer could not be saved.'); }
      finally { setBusy(false); }
      return;
    }
    const result = assessAdaptiveAnswer(variant.id, choice);
    const updated = [...attempts, { variantId: variant.id, skill: variant.skill, positive: result.positive, at: new Date().toISOString() }];
    setAttempts(updated); setFeedback(result);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch { /* in-memory practice remains available */ }
  }
  function moveNext() {
    const nextLocal = next;
    setVariant(session ? (serverVariants[nextLocal.id] ?? nextLocal) : nextLocal);
    setChoice(''); setFeedback(null); setServerError('');
  }
  return <><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> ADAPTIVE PRACTICE · SYNTHETIC SCENARIOS</div><h1>Can you apply it <span>somewhere new?</span></h1><p>Practice adapts to your observed gaps. New scenario variants test transfer—not just remembering an answer. All cases are fictional teaching exercises.</p></div>
    {loading && <p role="status" className="feedback">Loading your account-backed practice history…</p>}
    {serverError && <div className="feedback" role="alert"><p>{serverError}</p>{session && <button className="btn-outline" type="button" onClick={() => setReloadKey(value => value + 1)} disabled={loading}>Retry loading practice</button>}</div>}
    <div className="panel" style={{ padding: 24, marginBottom: 20 }}><div className="panel-heading"><div className="panel-heading-icon"><Sparkles size={19} /></div><div><h2>Your next challenge</h2><p>Recommendations favour the least evidenced skill, then its unseen variant.</p></div></div><span className="tag tag-mint">{session ? 'SERVER-SCORED VARIANT' : 'UNSEEN VARIANT'} · {variant.id.toUpperCase()}</span><h2 style={{ marginTop: 14 }}>{variant.title}</h2><p>{variant.context}</p><div className="scenario-options">{variant.choices.map(item => <button key={item.id} className={choice === item.id ? 'scenario-option selected' : 'scenario-option'} onClick={() => setChoice(item.id)} disabled={Boolean(feedback)}><span className="scenario-radio">{choice === item.id ? <span /> : null}</span>{item.label}</button>)}</div>{!feedback ? <button className="btn-primary" onClick={() => void submit()} disabled={!choice || busy || loading || Boolean(session && !serverVariants[variant.id])}>{busy ? 'Saving…' : 'Check reasoning'} <ArrowRight size={15} /></button> : <div className="scenario-feedback" role="status"><ShieldCheck size={18} /><div><strong>{feedback.positive ? 'Risk-first reasoning recognised' : 'Review the decision process'}</strong><p>{feedback.explanation}</p><button className="btn-primary" onClick={moveNext}>Next adaptive scenario <ArrowRight size={15} /></button></div></div>}</div>
    <section className="panel" style={{ padding: 24 }}><div className="panel-heading"><div className="panel-heading-icon"><Target size={19} /></div><div><h2>Recall versus application</h2><p>Recall means a previously encountered variant; application means the unfamiliar variant. Small samples are not proof of mastery.</p></div></div><div className="mastery-skill-list">{skills.map(skill => { const evidence = session ? adaptiveEvidenceFromSummary(accountSummary, skill.id) : adaptiveEvidence(attempts, skill.id); return <div className="mastery-skill-row" key={skill.id}><div><strong>{skill.label}</strong><p>{evidence.confidence === 'too-few-to-judge' ? 'Transfer evidence is still too limited to judge.' : 'Early transfer signal only; continue practising across contexts.'}</p></div><dl className="mastery-evidence"><div><dt>Recall</dt><dd>{evidence.recallPositive} / {evidence.recallAttempts} positive</dd></div><div><dt>Application / transfer</dt><dd>{evidence.transferPositive} / {evidence.transferAttempts} positive</dd></div></dl></div>; })}</div><p className="form-footnote">{session ? 'Your answers and feedback are scored and saved by the server to your learner account. Recommendations use unseen variants; small samples are not proof of mastery.' : 'Local practice history is saved in this browser only. It is not synced to your learner account.'} Results are educational signals and do not predict real trading outcomes.</p></section>
  </>;
}
