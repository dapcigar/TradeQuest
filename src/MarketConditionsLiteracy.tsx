import { useState } from 'react';
import { CheckCircle2, CircleHelp, RotateCcw, ShieldCheck } from 'lucide-react';
import { assessMarketConditionsAnswer, marketConditionsQuestions } from './marketConditionsLiteracy';

export default function MarketConditionsLiteracy() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const correct = marketConditionsQuestions.filter(question => answers[question.id] === question.correctOptionId).length;

  return <div className="candle-literacy-page">
    <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> MARKET CONTEXT · LESSON 07</div><h1>Read the conditions, <span>not a promise.</span></h1><p>Understand liquidity, volatility and market sessions as context for uncertainty—not as shortcuts to predict direction.</p></div>
    <section className="panel candle-lesson-card" aria-labelledby="conditions-title">
      <div className="candle-lesson-heading"><div><div className="eyebrow">THREE MARKET CONDITIONS</div><h2>Conditions can change how a plan behaves</h2><p>Conceptual examples only · no live prices or session clock</p></div><span className="candle-data-label">CONTEXT ≠ SIGNAL</span></div>
      <div className="candle-definitions psychology-traps">
        <article><span className="candle-term-mark body-mark"/><div><h3>Liquidity</h3><p>Liquidity is how readily participants can trade without causing a large price change. Thin liquidity can mean wider spreads, greater price impact, or harder execution. It does not tell you which way price will move.</p></div></article>
        <article><span className="candle-term-mark wick-mark"/><div><h3>Volatility</h3><p>Volatility describes how much and how quickly prices vary. A fast move can increase uncertainty, and a quiet market can still make a sudden move. Volatility is not a forecast of direction.</p></div></article>
        <article><span className="candle-term-mark open-mark"/><div><h3>Market sessions</h3><p>Activity can vary around regional sessions and overlaps, but patterns differ by instrument and venue. Trading hours, daylight-saving changes, holidays, and product-specific schedules matter; no session guarantees liquidity or a useful setup.</p></div></article>
        <article><span className="candle-term-mark range-mark"/><div><h3>Scheduled events and gaps</h3><p>News, auctions, market openings, and unexpected events can change spreads and volatility. A planned stop or expected price is not a guarantee of execution. If conditions are unclear, waiting or passing is a valid decision.</p></div></article>
      </div>
    </section>
    <section className="candle-quiz-section" aria-labelledby="conditions-quiz-title"><div className="section-heading"><div><div className="eyebrow small-eyebrow">CHECK YOUR UNDERSTANDING</div><h2 id="conditions-quiz-title">Three context scenarios</h2></div><span className="candle-question-count">{Object.keys(answers).length} / {marketConditionsQuestions.length} answered</span></div>
      {marketConditionsQuestions.map((question, index) => { const result = answers[question.id] ? assessMarketConditionsAnswer(question.id, answers[question.id]) : null; return <article className="panel candle-question" key={question.id}><div className="candle-question-top"><span className="candle-question-number">0{index + 1}</span><h3>{question.prompt}</h3></div><div className="candle-options" role="group" aria-label={question.prompt}>{question.options.map(option => <button key={option.id} type="button" className={'candle-option' + (answers[question.id] === option.id ? ' selected' : '') + (revealed && option.id === question.correctOptionId ? ' correct' : '') + (revealed && answers[question.id] === option.id && option.id !== question.correctOptionId ? ' incorrect' : '')} aria-pressed={answers[question.id] === option.id} onClick={() => { if (!revealed) setAnswers(previous => ({ ...previous, [question.id]: option.id })); }} disabled={revealed}>{option.label}</button>)}</div>{revealed && <p className="candle-explanation" role="status"><ShieldCheck size={16}/><span><strong>{result?.correct ? 'Correct' : 'Review this one.'}</strong> {question.explanation}</span></p>}</article>; })}
      {!revealed ? <button className="btn-primary" disabled={Object.keys(answers).length !== marketConditionsQuestions.length} onClick={() => setRevealed(true)}><CheckCircle2 size={16}/> Check answers</button> : <div className="candle-result" role="status"><div><strong>{correct} of {marketConditionsQuestions.length} correct</strong><p>{correct === marketConditionsQuestions.length ? 'You can describe market conditions without treating them as predictions. Real conditions remain uncertain and product-specific.' : 'Review the explanations, then try again. Liquidity, volatility and session patterns do not guarantee direction or a profitable outcome.'}</p></div><button className="btn-outline" onClick={() => { setAnswers({}); setRevealed(false); }}><RotateCcw size={15}/> Try again</button></div>}
    </section>
    <p className="candle-disclaimer"><CircleHelp size={15}/> Educational only. Examples are fictional and conceptual. This lesson is not a trading signal or personalised financial advice; hours, costs, liquidity and execution differ between instruments and venues.</p>
  </div>;
}
