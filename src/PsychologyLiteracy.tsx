import { useState } from 'react';
import { CheckCircle2, CircleHelp, RotateCcw, ShieldCheck } from 'lucide-react';
import { assessPsychologyAnswer, psychologyQuestions } from './psychologyLiteracy';

export default function PsychologyLiteracy() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const correct = psychologyQuestions.filter(question => answers[question.id] === question.correctOptionId).length;

  return <div className="candle-literacy-page">
    <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> DECISION SKILLS · LESSON 05</div><h1>Notice the bias, <span>protect the process.</span></h1><p>Learn to recognise common decision traps and use a repeatable review process instead of reacting to fear, frustration, or a single outcome.</p></div>
    <section className="panel candle-lesson-card" aria-labelledby="psychology-title">
      <div className="candle-lesson-heading"><div><div className="eyebrow">THREE COMMON TRAPS</div><h2 id="psychology-title">Thoughts can feel convincing without being evidence</h2><p>Illustrative learning examples · not a diagnostic tool</p></div><span className="candle-data-label">PROCESS FIRST</span></div>
      <div className="candle-definitions psychology-traps">
        <article><span className="candle-term-mark body-mark"/><div><h3>Outcome bias</h3><p>Judging a decision only by whether it won or lost. Review the evidence and plan that were available at the time, not just the final result.</p></div></article>
        <article><span className="candle-term-mark wick-mark"/><div><h3>Fear of missing out</h3><p>Feeling pressure to chase a fast move. If entry, invalidation, and risk are not defined, waiting or passing is a valid decision.</p></div></article>
        <article><span className="candle-term-mark open-mark"/><div><h3>Confirmation bias</h3><p>Noticing supportive evidence while overlooking contradictions. Write down what would prove the idea wrong and deliberately check for it.</p></div></article>
        <article><span className="candle-term-mark range-mark"/><div><h3>After a difficult result</h3><p>Pause before making another decision. Record what you knew, what you did, and what you would change; do not increase risk to recover a loss.</p></div></article>
      </div>
    </section>
    <section className="candle-quiz-section" aria-labelledby="psychology-quiz-title"><div className="section-heading"><div><div className="eyebrow small-eyebrow">CHECK YOUR UNDERSTANDING</div><h2 id="psychology-quiz-title">Three decision scenarios</h2></div><span className="candle-question-count">{Object.keys(answers).length} / {psychologyQuestions.length} answered</span></div>
      {psychologyQuestions.map((question, index) => { const result = answers[question.id] ? assessPsychologyAnswer(question.id, answers[question.id]) : null; return <article className="panel candle-question" key={question.id}><div className="candle-question-top"><span className="candle-question-number">0{index + 1}</span><h3>{question.prompt}</h3></div><div className="candle-options" role="group" aria-label={question.prompt}>{question.options.map(option => <button key={option.id} type="button" className={'candle-option' + (answers[question.id] === option.id ? ' selected' : '') + (revealed && option.id === question.correctOptionId ? ' correct' : '') + (revealed && answers[question.id] === option.id && option.id !== question.correctOptionId ? ' incorrect' : '')} aria-pressed={answers[question.id] === option.id} onClick={() => { if (!revealed) setAnswers(previous => ({ ...previous, [question.id]: option.id })); }} disabled={revealed}>{option.label}</button>)}</div>{revealed && <p className="candle-explanation" role="status"><ShieldCheck size={16}/><span><strong>{result?.correct ? 'Good reasoning' : 'Review this one.'}</strong> {question.explanation}</span></p>}</article>; })}
      {!revealed ? <button className="btn-primary" disabled={Object.keys(answers).length !== psychologyQuestions.length} onClick={() => setRevealed(true)}><CheckCircle2 size={16}/> Check answers</button> : <div className="candle-result" role="status"><div><strong>{correct} of {psychologyQuestions.length} correct</strong><p>{correct === psychologyQuestions.length ? 'You can recognise these common decision traps. Awareness is useful, but it does not remove uncertainty or establish trading skill.' : 'Review the explanations and try again. A disciplined decision can still have an unfavourable outcome.'}</p></div><button className="btn-outline" onClick={() => { setAnswers({}); setRevealed(false); }}><RotateCcw size={15}/> Try again</button></div>}
    </section>
    <p className="candle-disclaimer"><CircleHelp size={15}/> Educational only. All scenarios are fictional. This lesson offers no trading signals or personalised financial advice and cannot predict real-world outcomes.</p>
  </div>;
}
