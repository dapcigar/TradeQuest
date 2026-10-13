import { useState } from 'react';
import { CheckCircle2, CircleHelp, RotateCcw, ShieldCheck } from 'lucide-react';
import { assessBacktestingAnswer, backtestingQuestions } from './backtestingEvidenceLiteracy';

export default function BacktestingEvidenceLiteracy() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const correct = backtestingQuestions.filter(question => answers[question.id] === question.correctOptionId).length;

  return <div className="candle-literacy-page">
    <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> STRATEGY EVALUATION · LESSON 08</div><h1>Test the evidence, <span>not your hopes.</span></h1><p>Learn why small samples, overfitting and missing costs can make historical results look more convincing than they are.</p></div>
    <section className="panel candle-lesson-card" aria-labelledby="backtesting-title">
      <div className="candle-lesson-heading"><div><div className="eyebrow">THREE EVIDENCE CHECKS</div><h2 id="backtesting-title">A backtest is an investigation, not a promise</h2><p>Fictional examples · no strategy performance claims</p></div><span className="candle-data-label">PAST FIT ≠ FUTURE PROOF</span></div>
      <div className="candle-definitions psychology-traps">
        <article><span className="candle-term-mark body-mark"/><div><h3>Sample size and uncertainty</h3><p>A small number of examples can produce misleading results by chance. More observations can help, but quality, independence, market variety and test design matter too. No sample size makes outcomes certain.</p></div></article>
        <article><span className="candle-term-mark wick-mark"/><div><h3>Overfitting and data leakage</h3><p>Overfitting happens when rules are tuned too closely to one dataset, including random noise. Using future information accidentally, or repeatedly checking a holdout period while changing the rules, weakens the test.</p></div></article>
        <article><span className="candle-term-mark open-mark"/><div><h3>Costs and realistic assumptions</h3><p>Spread, commissions, financing, slippage, gaps and instrument rules can change results. A test that omits relevant costs or assumes ideal fills may overstate what could have been achieved.</p></div></article>
        <article><span className="candle-term-mark range-mark"/><div><h3>Out-of-sample and robustness</h3><p>Keep development data separate from out-of-sample evaluation, state the rules before the final test, and check different periods and reasonable assumptions. A robust-looking backtest remains uncertain and does not establish future profitability.</p></div></article>
      </div>
    </section>
    <section className="candle-quiz-section" aria-labelledby="backtesting-quiz-title"><div className="section-heading"><div><div className="eyebrow small-eyebrow">CHECK YOUR UNDERSTANDING</div><h2 id="backtesting-quiz-title">Three evidence scenarios</h2></div><span className="candle-question-count">{Object.keys(answers).length} / {backtestingQuestions.length} answered</span></div>
      {backtestingQuestions.map((question, index) => { const result = answers[question.id] ? assessBacktestingAnswer(question.id, answers[question.id]) : null; return <article className="panel candle-question" key={question.id}><div className="candle-question-top"><span className="candle-question-number">0{index + 1}</span><h3>{question.prompt}</h3></div><div className="candle-options" role="group" aria-label={question.prompt}>{question.options.map(option => <button key={option.id} type="button" className={'candle-option' + (answers[question.id] === option.id ? ' selected' : '') + (revealed && option.id === question.correctOptionId ? ' correct' : '') + (revealed && answers[question.id] === option.id && option.id !== question.correctOptionId ? ' incorrect' : '')} aria-pressed={answers[question.id] === option.id} onClick={() => { if (!revealed) setAnswers(previous => ({ ...previous, [question.id]: option.id })); }} disabled={revealed}>{option.label}</button>)}</div>{revealed && <p className="candle-explanation" role="status"><ShieldCheck size={16}/><span><strong>{result?.correct ? 'Correct' : 'Review this one.'}</strong> {question.explanation}</span></p>}</article>; })}
      {!revealed ? <button className="btn-primary" disabled={Object.keys(answers).length !== backtestingQuestions.length} onClick={() => setRevealed(true)}><CheckCircle2 size={16}/> Check answers</button> : <div className="candle-result" role="status"><div><strong>{correct} of {backtestingQuestions.length} correct</strong><p>{correct === backtestingQuestions.length ? 'You can distinguish historical fit from strong evidence. A backtest cannot guarantee future outcomes.' : 'Review the explanations, then try again. Results depend on assumptions and data, and past performance does not guarantee future outcomes.'}</p></div><button className="btn-outline" onClick={() => { setAnswers({}); setRevealed(false); }}><RotateCcw size={15}/> Try again</button></div>}
    </section>
    <p className="candle-disclaimer"><CircleHelp size={15}/> Educational only. This lesson uses fictional examples and does not test or recommend a trading strategy. It is not a trading signal or personalised financial advice.</p>
  </div>;
}
