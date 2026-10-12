import { useState } from 'react';
import { CheckCircle2, CircleHelp, RotateCcw, ShieldCheck } from 'lucide-react';
import { assessTrendAnswer, trendQuestions } from './trendStructure';

function StructureSketch() {
  return <svg viewBox="0 0 340 220" role="img" aria-labelledby="trend-svg-title trend-svg-desc">
    <title id="trend-svg-title">Three illustrative types of market structure</title>
    <desc id="trend-svg-desc">Three separate synthetic zigzag paths show rising swing highs and lows, falling swing highs and lows, and a sideways range. They illustrate labels, not forecasts.</desc>
    <g transform="translate(8 8)">
      <rect x="0" y="0" width="324" height="60" rx="5" fill="currentColor" opacity=".035"/>
      <text x="9" y="14" fontSize="10" fill="currentColor">RISING STRUCTURE</text>
      <path d="M12 48 L52 34 L83 42 L126 23 L156 32 L204 14 L238 24 L292 8" fill="none" stroke="#26856a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="52" cy="34" r="3" fill="#26856a"/><circle cx="126" cy="23" r="3" fill="#26856a"/><circle cx="204" cy="14" r="3" fill="#26856a"/>
    </g>
    <g transform="translate(8 80)">
      <rect x="0" y="0" width="324" height="60" rx="5" fill="currentColor" opacity=".035"/>
      <text x="9" y="14" fontSize="10" fill="currentColor">FALLING STRUCTURE</text>
      <path d="M12 8 L52 25 L83 17 L126 37 L156 28 L204 45 L238 36 L292 52" fill="none" stroke="#b45d52" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="52" cy="25" r="3" fill="#b45d52"/><circle cx="126" cy="37" r="3" fill="#b45d52"/><circle cx="204" cy="45" r="3" fill="#b45d52"/>
    </g>
    <g transform="translate(8 152)">
      <rect x="0" y="0" width="324" height="60" rx="5" fill="currentColor" opacity=".035"/>
      <text x="9" y="14" fontSize="10" fill="currentColor">POSSIBLE RANGE</text>
      <path d="M12 42 L52 22 L83 38 L126 19 L156 40 L204 23 L238 37 L292 20" fill="none" stroke="#b18a3d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="18" x2="302" y2="18" stroke="#b18a3d" strokeDasharray="4 4" opacity=".55"/>
      <line x1="12" y1="44" x2="302" y2="44" stroke="#b18a3d" strokeDasharray="4 4" opacity=".55"/>
    </g>
  </svg>;
}

export default function TrendStructureLiteracy() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const correct = trendQuestions.filter(question => answers[question.id] === question.correctOptionId).length;

  return <div className="candle-literacy-page">
    <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> CHART SKILLS · LESSON 03</div><h1>Describe the <span>structure, not the future.</span></h1><p>Learn to describe rising swings, falling swings, and ranges in an illustrative chart—without confusing a pattern with a prediction.</p></div>
    <section className="panel candle-lesson-card" aria-labelledby="trend-structure-title">
      <div className="candle-lesson-heading"><div><div className="eyebrow">READING A SYNTHETIC CHART</div><h2 id="trend-structure-title">Three ways price can be structured</h2><p>Illustrative synthetic paths · no live or historical prices</p></div><span className="candle-data-label">SYNTHETIC EXAMPLE</span></div>
      <div className="candle-visual-grid">
        <div className="candle-figure trend-structure-figure"><StructureSketch /></div>
        <div className="candle-definitions">
          <article><span className="candle-term-mark body-mark"/><div><h3>Higher highs and higher lows</h3><p>Successive observed swing points rise. This is commonly described as upward structure, not a promise that price will keep rising.</p></div></article>
          <article><span className="candle-term-mark wick-mark"/><div><h3>Lower highs and lower lows</h3><p>Successive observed swing points fall. This is commonly described as downward structure, not a guaranteed short opportunity.</p></div></article>
          <article><span className="candle-term-mark range-mark"/><div><h3>Range or sideways structure</h3><p>Price moves between broadly similar highs and lows. It may continue, expand, or break; the label alone does not confirm a breakout.</p></div></article>
          <article><span className="candle-term-mark open-mark"/><div><h3>Structure can change</h3><p>These labels describe the section you can see. They are simplified observations, depend on the chosen timeframe, and do not establish what happens next.</p></div></article>
        </div>
      </div>
    </section>
    <section className="candle-quiz-section" aria-labelledby="trend-quiz-title"><div className="section-heading"><div><div className="eyebrow small-eyebrow">CHECK YOUR UNDERSTANDING</div><h2 id="trend-quiz-title">Three quick questions</h2></div><span className="candle-question-count">{Object.keys(answers).length} / {trendQuestions.length} answered</span></div>
      {trendQuestions.map((question,index)=>{const result=answers[question.id]?assessTrendAnswer(question.id,answers[question.id]):null;return <article className="panel candle-question" key={question.id}><div className="candle-question-top"><span className="candle-question-number">0{index+1}</span><h3>{question.prompt}</h3></div><div className="candle-options" role="group" aria-label={question.prompt}>{question.options.map(option=><button key={option.id} type="button" className={'candle-option'+(answers[question.id]===option.id?' selected':'')+(revealed&&option.id===question.correctOptionId?' correct':'')+(revealed&&answers[question.id]===option.id&&option.id!==question.correctOptionId?' incorrect':'')} aria-pressed={answers[question.id]===option.id} onClick={()=>{if(!revealed)setAnswers(previous=>({...previous,[question.id]:option.id}));}} disabled={revealed}>{option.label}</button>)}</div>{revealed&&<p className="candle-explanation" role="status"><ShieldCheck size={16}/><span><strong>{result?.correct?'Correct':'Review this one.'}</strong> {assessTrendAnswer(question.id,question.correctOptionId)?.explanation}</span></p>}</article>})}
      {!revealed?<button className="btn-primary" disabled={Object.keys(answers).length!==trendQuestions.length} onClick={()=>setRevealed(true)}><CheckCircle2 size={16}/> Check answers</button>:<div className="candle-result" role="status"><div><strong>{correct} of {trendQuestions.length} correct</strong><p>{correct===trendQuestions.length?'You can describe basic swing structure while keeping uncertainty in view.':'Review the explanations, then try again. A chart label never guarantees the next move.'}</p></div><button className="btn-outline" onClick={()=>{setAnswers({});setRevealed(false);}}><RotateCcw size={15}/> Try again</button></div>}
    </section>
    <p className="candle-disclaimer"><CircleHelp size={15}/> Educational only. This lesson teaches chart vocabulary, not trading signals or predictive ability.</p>
  </div>;
}
