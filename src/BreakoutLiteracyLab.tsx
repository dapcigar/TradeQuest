import { useState } from 'react';
import { CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react';
import { assessBreakoutAnswer, breakoutQuestions } from './breakoutLiteracy';

function BreakoutSketch() {
  return <svg viewBox="0 0 340 214" role="img" aria-labelledby="breakout-svg-title breakout-svg-desc">
    <title id="breakout-svg-title">Illustrative breakout and failed breakout paths</title>
    <desc id="breakout-svg-desc">Two synthetic line paths show one move that returns inside a range and another that closes above a range. Neither path predicts future prices.</desc>
    <rect x="10" y="18" width="320" height="74" rx="5" fill="currentColor" opacity=".035" />
    <text x="16" y="13" fontSize="10" fill="currentColor">FAILED ATTEMPT · RETURNS INSIDE</text>
    <line x1="16" y1="34" x2="324" y2="34" stroke="#b18a3d" strokeDasharray="4 4" opacity=".85" />
    <line x1="16" y1="76" x2="324" y2="76" stroke="#b18a3d" strokeDasharray="4 4" opacity=".85" />
    <path d="M18 64 L48 43 L78 71 L108 39 L138 65 L166 20 L194 45 L224 69 L254 48 L286 62 L320 53" fill="none" stroke="#b45d52" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="166" cy="20" r="4" fill="#b45d52" />
    <rect x="10" y="122" width="320" height="74" rx="5" fill="currentColor" opacity=".035" />
    <text x="16" y="117" fontSize="10" fill="currentColor">CLOSES ABOVE · CONTINUATION UNKNOWN</text>
    <line x1="16" y1="138" x2="324" y2="138" stroke="#b18a3d" strokeDasharray="4 4" opacity=".85" />
    <line x1="16" y1="180" x2="324" y2="180" stroke="#b18a3d" strokeDasharray="4 4" opacity=".85" />
    <path d="M18 173 L48 148 L78 181 L108 146 L138 169 L166 142 L194 158 L224 126 L254 136 L286 115 L320 126" fill="none" stroke="#26856a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="224" cy="126" r="4" fill="#26856a" />
  </svg>;
}

export default function BreakoutLiteracy() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const correct = breakoutQuestions.filter(question => answers[question.id] === question.correctOptionId).length;

  return <div className="candle-literacy-page">
    <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> CHART SKILLS · LESSON 04</div><h1>Breakouts are <span>observations, not promises.</span></h1><p>Learn to describe a move beyond a range, recognise a possible failed attempt, and keep uncertainty and risk in view.</p></div>
    <section className="panel candle-lesson-card" aria-labelledby="breakout-lesson-title">
      <div className="candle-lesson-heading"><div><div className="eyebrow">READING A SYNTHETIC CHART</div><h2>When price moves beyond a range</h2><p>Illustrative synthetic paths · no live or historical prices</p></div><span className="candle-data-label">SYNTHETIC EXAMPLE</span></div>
      <div className="candle-visual-grid">
        <div className="candle-figure trend-structure-figure"><BreakoutSketch /></div>
        <div className="candle-definitions">
          <article><span className="candle-term-mark range-mark"/><div><h3>Range boundary</h3><p>A rough area around prior swings, not a perfectly precise line. Different observers may draw it differently.</p></div></article>
          <article><span className="candle-term-mark wick-mark"/><div><h3>Failed breakout attempt</h3><p>Price briefly moves outside a range and returns inside. It may be called a false breakout, but the label is descriptive and can be uncertain in real time.</p></div></article>
          <article><span className="candle-term-mark body-mark"/><div><h3>A close beyond the range</h3><p>A candle close beyond a boundary adds information, but does not guarantee continuation. Definitions of confirmation vary by method and timeframe.</p></div></article>
          <article><span className="candle-term-mark open-mark"/><div><h3>Process before action</h3><p>Ask what evidence is present, what would invalidate the idea, and whether the potential loss fits a defined budget. Waiting or passing is valid.</p></div></article>
        </div>
      </div>
    </section>
    <section className="candle-quiz-section" aria-labelledby="breakout-quiz-title"><div className="section-heading"><div><div className="eyebrow small-eyebrow">CHECK YOUR UNDERSTANDING</div><h2 id="breakout-quiz-title">Three quick questions</h2></div><span className="candle-question-count">{Object.keys(answers).length} / {breakoutQuestions.length} answered</span></div>
      {breakoutQuestions.map((question,index)=>{const result=answers[question.id]?assessBreakoutAnswer(question.id,answers[question.id]):null;return <article className="panel candle-question" key={question.id}><div className="candle-question-top"><span className="candle-question-number">0{index+1}</span><h3>{question.prompt}</h3></div><div className="candle-options" role="group" aria-label={question.prompt}>{question.options.map(option=><button key={option.id} type="button" className={'candle-option'+(answers[question.id]===option.id?' selected':'')+(revealed&&option.id===question.correctOptionId?' correct':'')+(revealed&&answers[question.id]===option.id&&option.id!==question.correctOptionId?' incorrect':'')} aria-pressed={answers[question.id]===option.id} onClick={()=>{if(!revealed)setAnswers(previous=>({...previous,[question.id]:option.id}));}} disabled={revealed}>{option.label}</button>)}</div>{revealed&&<p className="candle-explanation" role="status"><ShieldCheck size={16}/><span><strong>{result?.correct?'Correct':'Review this concept'}.</strong> {result?.explanation??'Choose an option to review the explanation.'}</span></p>}</article>;})}
      <div className="candle-quiz-footer">{revealed?<><p className="candle-score" role="status"><CheckCircle2 size={17}/> You answered {correct} of {breakoutQuestions.length} correctly. This checks concept recall, not trading ability.</p><button className="btn-secondary" type="button" onClick={()=>{setAnswers({});setRevealed(false);}}><RotateCcw size={15}/> Try again</button></>:<button className="btn-primary" type="button" onClick={()=>setRevealed(true)} disabled={Object.keys(answers).length!==breakoutQuestions.length}>Check answers <ShieldCheck size={16}/></button>}</div>
    </section>
    <div className="practice-disclaimer"><ShieldCheck size={17}/><span>Educational only. These paths are synthetic illustrations, not market history, trade signals, or predictions.</span></div>
  </div>;
}
