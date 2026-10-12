import { useState } from 'react';
import { CheckCircle2, CircleHelp, RotateCcw, ShieldCheck } from 'lucide-react';
import { assessExecutionAnswer, executionQuestions } from './executionLiteracy';

export default function ExecutionLiteracy() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const correct = executionQuestions.filter(question => answers[question.id] === question.correctOptionId).length;

  return <div className="candle-literacy-page">
    <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> TRADING MECHANICS · LESSON 06</div><h1>Understand the order, <span>not just the price.</span></h1><p>Learn what common order types prioritise, why an order may not fill, and how execution can differ from the price you expected.</p></div>
    <section className="panel candle-lesson-card" aria-labelledby="execution-title">
      <div className="candle-lesson-heading"><div><div className="eyebrow">THREE EXECUTION BASICS</div><h2 id="execution-title">An order instruction is not a promise about the outcome</h2><p>Fictional examples · actual rules vary by venue and product</p></div><span className="candle-data-label">EXECUTION ≠ CERTAINTY</span></div>
      <div className="candle-definitions psychology-traps">
        <article><span className="candle-term-mark body-mark"/><div><h3>Market order</h3><p>Prioritises execution using available prices. The fill can differ from the quote you last saw, especially when prices move quickly or liquidity is limited.</p></div></article>
        <article><span className="candle-term-mark wick-mark"/><div><h3>Limit order</h3><p>Sets a price boundary: a buy limit sets the maximum buy price, while a sell limit sets the minimum sell price. It can remain unfilled even when the market approaches the limit.</p></div></article>
        <article><span className="candle-term-mark open-mark"/><div><h3>Stop order and gaps</h3><p>A stop commonly becomes a market order when its trigger is reached, subject to product rules. A gap or fast move can cause execution away from the trigger price.</p></div></article>
        <article><span className="candle-term-mark range-mark"/><div><h3>Slippage and spread</h3><p>Spread is the difference between bid and ask. Slippage is the difference between an expected or reference price and the execution price. They are related to costs and conditions but are not the same thing.</p></div></article>
      </div>
    </section>
    <section className="candle-quiz-section" aria-labelledby="execution-quiz-title"><div className="section-heading"><div><div className="eyebrow small-eyebrow">CHECK YOUR UNDERSTANDING</div><h2 id="execution-quiz-title">Three order scenarios</h2></div><span className="candle-question-count">{Object.keys(answers).length} / {executionQuestions.length} answered</span></div>
      {executionQuestions.map((question, index) => { const result = answers[question.id] ? assessExecutionAnswer(question.id, answers[question.id]) : null; return <article className="panel candle-question" key={question.id}><div className="candle-question-top"><span className="candle-question-number">0{index + 1}</span><h3>{question.prompt}</h3></div><div className="candle-options" role="group" aria-label={question.prompt}>{question.options.map(option => <button key={option.id} type="button" className={'candle-option' + (answers[question.id] === option.id ? ' selected' : '') + (revealed && option.id === question.correctOptionId ? ' correct' : '') + (revealed && answers[question.id] === option.id && option.id !== question.correctOptionId ? ' incorrect' : '')} aria-pressed={answers[question.id] === option.id} onClick={() => { if (!revealed) setAnswers(previous => ({ ...previous, [question.id]: option.id })); }} disabled={revealed}>{option.label}</button>)}</div>{revealed && <p className="candle-explanation" role="status"><ShieldCheck size={16}/><span><strong>{result?.correct ? 'Correct' : 'Review this one.'}</strong> {question.explanation}</span></p>}</article>; })}
      {!revealed ? <button className="btn-primary" disabled={Object.keys(answers).length !== executionQuestions.length} onClick={() => setRevealed(true)}><CheckCircle2 size={16}/> Check answers</button> : <div className="candle-result" role="status"><div><strong>{correct} of {executionQuestions.length} correct</strong><p>{correct === executionQuestions.length ? 'You can distinguish order instructions from execution outcomes. Real execution still depends on product rules and market conditions.' : 'Review the explanations, then try again. No order type removes uncertainty or guarantees a profitable outcome.'}</p></div><button className="btn-outline" onClick={() => { setAnswers({}); setRevealed(false); }}><RotateCcw size={15}/> Try again</button></div>}
    </section>
    <p className="candle-disclaimer"><CircleHelp size={15}/> Educational only. All scenarios are fictional. This lesson is not a trading signal or personalised financial advice; execution terms differ between providers and products.</p>
  </div>;
}
