import { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, ShieldCheck, Sparkles, Target } from 'lucide-react';

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

const storageKey = 'tradequest-adaptive-practice-v1';
function readAttempts(): Attempt[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is Attempt => !!item && typeof item.variantId === 'string' && typeof item.skill === 'string' && typeof item.positive === 'boolean' && typeof item.at === 'string') : [];
  } catch { return []; }
}
function chooseNext(attempts: Attempt[]): Variant {
  const counts = new Map<Skill, number>();
  for (const attempt of attempts) counts.set(attempt.skill, (counts.get(attempt.skill) ?? 0) + 1);
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

export default function AdaptivePractice() {
  const [attempts, setAttempts] = useState<Attempt[]>(readAttempts);
  const [variant, setVariant] = useState<Variant>(() => chooseNext(readAttempts()));
  const [choice, setChoice] = useState('');
  const [feedback, setFeedback] = useState<{ positive: boolean; explanation: string } | null>(null);
  const next = useMemo(() => chooseNext(attempts), [attempts]);
  const skills: Array<{ id: Skill; label: string }> = [{ id: 'risk-definition', label: 'Define risk' }, { id: 'evidence-patience', label: 'Wait for evidence' }, { id: 'risk-budget', label: 'Respect the budget' }];
  const answered = attempts.filter(item => item.skill === variant.skill);
  function submit() {
    if (!choice || feedback) return;
    const result = assessAdaptiveAnswer(variant.id, choice);
    const attempt: Attempt = { variantId: variant.id, skill: variant.skill, positive: result.positive, at: new Date().toISOString() };
    const updated = [...attempts, attempt];
    setAttempts(updated); setFeedback(result);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch { /* in-memory practice remains available */ }
  }
  function moveNext() { setVariant(next); setChoice(''); setFeedback(null); }
  return <><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> ADAPTIVE PRACTICE · SYNTHETIC SCENARIOS</div><h1>Can you apply it <span>somewhere new?</span></h1><p>Practice adapts to your observed gaps. New scenario variants test transfer—not just remembering an answer. All cases are fictional teaching exercises.</p></div>
    <div className="panel" style={{ padding: 24, marginBottom: 20 }}><div className="panel-heading"><div className="panel-heading-icon"><Sparkles size={19} /></div><div><h2>Your next challenge</h2><p>Recommendations favour the least evidenced skill, then its unseen variant.</p></div></div><span className="tag tag-mint">UNSEEN VARIANT · {variant.id.toUpperCase()}</span><h2 style={{ marginTop: 14 }}>{variant.title}</h2><p>{variant.context}</p><div className="scenario-options">{variant.choices.map(item => <button key={item.id} className={choice === item.id ? 'scenario-option selected' : 'scenario-option'} onClick={() => setChoice(item.id)} disabled={Boolean(feedback)}><span className="scenario-radio">{choice === item.id ? <span /> : null}</span>{item.label}</button>)}</div>{!feedback ? <button className="btn-primary" onClick={submit} disabled={!choice}>Check reasoning <ArrowRight size={15} /></button> : <div className="scenario-feedback" role="status"><ShieldCheck size={18} /><div><strong>{feedback.positive ? 'Risk-first reasoning recognised' : 'Review the decision process'}</strong><p>{feedback.explanation}</p><button className="btn-primary" onClick={moveNext}>Next adaptive scenario <ArrowRight size={15} /></button></div></div>}</div>
    <section className="panel" style={{ padding: 24 }}><div className="panel-heading"><div className="panel-heading-icon"><Target size={19} /></div><div><h2>Recall versus application</h2><p>Recall means a previously encountered variant; application means the unfamiliar variant. Small samples are not proof of mastery.</p></div></div><div className="mastery-skill-list">{skills.map(skill => { const evidence = adaptiveEvidence(attempts, skill.id); return <div className="mastery-skill-row" key={skill.id}><div><strong>{skill.label}</strong><p>{evidence.confidence === 'too-few-to-judge' ? 'Transfer evidence is still too limited to judge.' : 'Early transfer signal only; continue practising across contexts.'}</p></div><dl className="mastery-evidence"><div><dt>Recall</dt><dd>{evidence.recallPositive} / {evidence.recallAttempts} positive</dd></div><div><dt>Application / transfer</dt><dd>{evidence.transferPositive} / {evidence.transferAttempts} positive</dd></div></dl></div>; })}</div><p className="form-footnote">Local practice history is saved in this browser only. It is not synced to your learner account. Results are educational signals and do not predict real trading outcomes.</p></section>
  </>;
}
