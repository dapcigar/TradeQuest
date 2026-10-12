import { useState } from 'react';
import { CheckCircle2, CircleHelp, RotateCcw, ShieldCheck } from 'lucide-react';
import { assessLeverageAnswer, leverageQuestions } from './leverageMarginLiteracy';

export default function LeverageMarginLiteracy() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const correct = leverageQuestions.filter(question => answers[question.id] === question.correctOptionId).length;

  return <div className="candle-literacy-page">
    <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> RISK SKILLS · LESSON 02</div><h1>Understand leverage, <span>respect exposure.</span></h1><p>Learn the difference between leverage, margin, and loss. More exposure does not create an edge, and margin is not a cap on what can be lost.</p></div>
    <section className="panel candle-lesson-card" aria-labelledby="leverage-title">
      <div className="candle-lesson-heading"><div><div className="eyebrow">A FICTIONAL EXAMPLE</div><h2 id="leverage-title">Exposure is not the same as equity</h2><p>Illustrative amounts only · not a product specification</p></div><span className="candle-data-label">SYNTHETIC EXAMPLE</span></div>
      <div className="candle-visual-grid">
        <div className="candle-figure"><svg viewBox="0 0 320 230" role="img" aria-labelledby="lev-svg-title lev-svg-desc"><title id="lev-svg-title">Illustrative exposure compared with account funds</title><desc id="lev-svg-desc">A short bar shows one thousand pounds of account funds. A bar five times as long shows five thousand pounds of exposure. Both gains and losses can be magnified, and the diagram does not show a maximum loss.</desc><line x1="30" y1="180" x2="292" y2="180" className="candle-label-line"/><rect x="48" y="150" width="52" height="30" rx="4" className="candle-body-shape"/><rect x="165" y="30" width="100" height="150" rx="4" className="candle-wick-line"/><text x="74" y="137" textAnchor="middle" className="candle-svg-label">£1,000</text><text x="215" y="20" textAnchor="middle" className="candle-svg-label">£5,000</text><text x="74" y="201" textAnchor="middle" className="candle-svg-label">Account funds</text><text x="215" y="201" textAnchor="middle" className="candle-svg-label">Exposure</text><text x="30" y="224" className="candle-svg-caption">5:1 EXPOSURE · NOT A LOSS LIMIT</text></svg></div>
        <div className="candle-definitions">
          <article><span className="candle-term-mark body-mark"/><div><h3>Leverage</h3><p>Describes exposure relative to the funds supporting it. It can magnify losses as well as gains.</p></div></article>
          <article><span className="candle-term-mark wick-mark"/><div><h3>Margin</h3><p>Collateral required under a product’s rules. It is not the maximum amount that can be lost.</p></div></article>
          <article><span className="candle-term-mark open-mark"/><div><h3>Close-out risk</h3><p>When available margin falls, product rules may trigger a close-out. Gaps and execution conditions can affect outcomes.</p></div></article>
          <article><span className="candle-term-mark range-mark"/><div><h3>Know the product</h3><p>Requirements differ by instrument and provider. A simplified example cannot establish valid position size or actual loss.</p></div></article>
        </div>
      </div>
    </section>
    <section className="candle-quiz-section" aria-labelledby="leverage-quiz-title"><div className="section-heading"><div><div className="eyebrow small-eyebrow">CHECK YOUR UNDERSTANDING</div><h2 id="leverage-quiz-title">Three quick questions</h2></div><span className="candle-question-count">{Object.keys(answers).length} / {leverageQuestions.length} answered</span></div>
      {leverageQuestions.map((question,index)=>{const result=answers[question.id]?assessLeverageAnswer(question.id,answers[question.id]):null;return <article className="panel candle-question" key={question.id}><div className="candle-question-top"><span className="candle-question-number">0{index+1}</span><h3>{question.prompt}</h3></div><div className="candle-options" role="group" aria-label={question.prompt}>{question.options.map(option=><button key={option.id} type="button" className={'candle-option'+(answers[question.id]===option.id?' selected':'')+(revealed&&option.id===question.correctOptionId?' correct':'')+(revealed&&answers[question.id]===option.id&&option.id!==question.correctOptionId?' incorrect':'')} aria-pressed={answers[question.id]===option.id} onClick={()=>{if(!revealed)setAnswers(previous=>({...previous,[question.id]:option.id}));}} disabled={revealed}>{option.label}</button>)}</div>{revealed&&<p className="candle-explanation" role="status"><ShieldCheck size={16}/><span><strong>{result?.correct?'Correct':'Review this one.'}</strong> {result?.explanation}</span></p>}</article>})}
      {!revealed?<button className="btn-primary" disabled={Object.keys(answers).length!==leverageQuestions.length} onClick={()=>setRevealed(true)}><CheckCircle2 size={16}/> Check answers</button>:<div className="candle-result" role="status"><div><strong>{correct} of {leverageQuestions.length} correct</strong><p>{correct===leverageQuestions.length?'You can distinguish exposure from margin and loss limits. Keep learning product-specific risks before evaluating a simulation.':'Review the explanations, then try again. Leverage changes exposure; it does not remove uncertainty or cap every possible loss.'}</p></div><button className="btn-outline" onClick={()=>{setAnswers({});setRevealed(false);}}><RotateCcw size={15}/> Try again</button></div>}
    </section>
    <p className="candle-disclaimer"><CircleHelp size={15}/> Educational only. Fictional examples do not represent any broker, margin rule, or real trading outcome and are not personalised financial advice.</p>
  </div>;
}
