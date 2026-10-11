import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, Award, BarChart3, BookOpen,
  Check, CheckCircle2, ChevronDown, CircleHelp, Compass, Flame, GraduationCap,
  LockKeyhole, Menu, Play, ShieldCheck, Sparkles, Target, Trophy,
  Wallet, X, Zap,
} from 'lucide-react';
import { calculateRisk } from './risk';

type View = 'overview' | 'learn' | 'practice' | 'risk' | 'challenges' | 'progress';
type Progress = { lessonComplete: boolean; quizCorrect: boolean; xp: number; riskToolUsed: boolean; awardedActions: string[] };
const initialProgress: Progress = { lessonComplete: false, quizCorrect: false, xp: 120, riskToolUsed: false, awardedActions: [] };
const progressKey = 'tradequest-demo-progress-v1';

const lessons = [
  { title: 'How markets move', meta: 'FOUNDATIONS · 6 MIN', done: true, color: 'mint' },
  { title: 'Read your first candle', meta: 'CHART SKILLS · 8 MIN', done: false, color: 'blue' },
  { title: 'The hidden cost: spread', meta: 'TRADING MECHANICS · 5 MIN', done: false, color: 'amber' },
  { title: 'Protect your downside', meta: 'RISK LAB · 9 MIN', done: false, color: 'violet' },
];

function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(progressKey);
    if (!raw) return initialProgress;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return initialProgress;
    const value = parsed as Partial<Progress>;
    return {
      lessonComplete: value.lessonComplete === true,
      quizCorrect: value.quizCorrect === true,
      riskToolUsed: value.riskToolUsed === true,
      xp: typeof value.xp === 'number' && Number.isFinite(value.xp) && value.xp >= 0 ? value.xp : initialProgress.xp,
      awardedActions: Array.isArray(value.awardedActions) ? value.awardedActions.filter((id): id is string => typeof id === 'string').slice(0, 500) : [],
    };
  } catch {
    return initialProgress;
  }
}

function CandleChart() {
  const candles = [
    [43, 100, 72, 117, 59], [66, 88, 55, 102, 47], [89, 97, 72, 111, 61],
    [112, 70, 44, 81, 32], [135, 77, 55, 91, 47], [158, 62, 35, 76, 25],
    [181, 72, 49, 84, 39], [204, 48, 22, 61, 14], [227, 57, 35, 69, 29],
    [250, 42, 17, 54, 8], [273, 52, 29, 63, 22], [296, 35, 12, 46, 5],
    [319, 44, 22, 57, 15], [342, 30, 8, 42, 2], [365, 39, 17, 50, 11],
  ];
  return (
    <svg className="candles" viewBox="0 0 400 145" role="img" aria-label="Illustrative synthetic candlestick chart trending upward. This is not live market data.">
      {[24, 54, 84, 114].map(y => <line key={y} x1="18" y1={y} x2="385" y2={y} className="chart-grid" />)}
      {candles.map(([x, open, close, high, low]) => {
        const up = close < open;
        const top = Math.min(open, close);
        const height = Math.max(5, Math.abs(open - close));
        return <g key={x}>
          <line x1={x} y1={high} x2={x} y2={low} className={up ? 'wick up' : 'wick down'} />
          <rect x={x - 5} y={top} width="10" height={height} rx="1.5" className={up ? 'candle up' : 'candle down'} />
        </g>;
      })}
      <text x="18" y="139" className="chart-label">ILLUSTRATIVE SYNTHETIC DATA</text>
    </svg>
  );
}

function App() {
  const [view, setView] = useState<View>('overview');
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [mobileNav, setMobileNav] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [quizChoice, setQuizChoice] = useState<string | null>(null);
  const [riskEquity, setRiskEquity] = useState('10000');
  const [riskPercent, setRiskPercent] = useState('1');
  const [entry, setEntry] = useState('2350');
  const [stop, setStop] = useState('2335');
  const [riskError, setRiskError] = useState('');
  const [scenarioChoice, setScenarioChoice] = useState<string | null>(null);
  const [scenarioRevealed, setScenarioRevealed] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(progressKey, JSON.stringify(progress)); } catch { /* demo progress remains in memory */ }
  }, [progress]);

  const risk = useMemo(() => {
    try {
      return calculateRisk({
        equity: Number(riskEquity),
        riskPercent: Number(riskPercent),
        entry: Number(entry),
        stop: Number(stop),
        unitsPerPrice: 1,
      });
    } catch {
      return null;
    }
  }, [riskEquity, riskPercent, entry, stop]);

  const navItems: { id: View; label: string; icon: typeof Compass; section?: string }[] = [
    { id: 'overview', label: 'Mission control', icon: Compass, section: 'YOUR WORLD' },
    { id: 'learn', label: 'Learning path', icon: BookOpen },
    { id: 'practice', label: 'Chart dojo', icon: Activity, section: 'PRACTICE LABS' },
    { id: 'risk', label: 'Risk simulator', icon: ShieldCheck },
    { id: 'challenges', label: 'Community quests', icon: Trophy, section: 'PLAY TOGETHER' },
    { id: 'progress', label: 'Skill tree', icon: Award },
  ];

  const completed = Number(progress.lessonComplete) + Number(progress.quizCorrect);
  const completion = Math.round((completed / 2) * 100);
  const titleMap: Record<View, string> = {
    overview: 'Mission control', learn: 'Your learning path', practice: 'Chart dojo',
    risk: 'Risk simulator', challenges: 'Community quests', progress: 'Your skill tree',
  };

  function awardXPOnce(actionId: string, amount: number) {
    setProgress(p => {
      if (p.awardedActions.includes(actionId)) return p;
      return { ...p, xp: p.xp + amount, awardedActions: [...p.awardedActions, actionId] };
    });
  }

  function markLessonComplete() {
    setProgress(p => ({ ...p, lessonComplete: true, xp: p.xp + (p.lessonComplete ? 0 : 40) }));
    setLessonOpen(false);
  }

  function submitQuiz() {
    if (!quizChoice) return;
    const correct = quizChoice === 'spread';
    setProgress(p => ({ ...p, quizCorrect: correct || p.quizCorrect, xp: p.xp + (correct && !p.quizCorrect ? 30 : 0) }));
  }

  function calculateAndSaveRisk() {
    if (!risk) {
      setRiskError('Check your inputs. Entry and stop must be different, and values must be positive.');
      return;
    }
    setRiskError('');
    setProgress(p => ({ ...p, riskToolUsed: true, xp: p.xp + (p.riskToolUsed ? 0 : 10) }));
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Compass size={22} strokeWidth={2.5} /></div>
          <div><span className="brand-name">tradequest<span className="brand-dot">.</span></span><span className="brand-sub">THE MARKET ACADEMY</span></div>
          <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>
        <div className="world-card">
          <div className="world-orbit orbit-one" /><div className="world-orbit orbit-two" />
          <div className="world-top"><span className="world-tag"><Sparkles size={12} /> SEASON 01</span><span className="world-level">LVL 02</span></div>
          <div className="world-title">The Market<br />Frontier</div>
          <div className="world-bottom"><span>Explorer rank</span><span>02 / 10</span></div>
          <div className="level-track"><span style={{ width: `${Math.min(100, (progress.xp % 200) / 2)}%` }} /></div>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <div key={item.id}>
              {item.section && <div className="nav-section">{item.section}</div>}
              <button className={`nav-link ${view === item.id ? 'active' : ''}`} onClick={() => { setView(item.id); setMobileNav(false); }}>
                <Icon size={17} strokeWidth={1.9} /><span>{item.label}</span>{item.id === 'learn' && <span className="nav-count">04</span>}
              </button>
            </div>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="daily-card"><div className="daily-icon"><Flame size={17} /></div><div><strong>Daily spark</strong><span>One small lesson a day.</span></div><span className="daily-dot" /></div>
          <div className="profile-row"><div className="avatar">E</div><div className="profile-copy"><strong>Explorer</strong><span>Free learner account</span></div><ChevronDown size={16} className="muted-icon" /></div>
        </div>
      </aside>

      {mobileNav && <button className="nav-backdrop" aria-label="Close navigation overlay" onClick={() => setMobileNav(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button><span className="breadcrumb">The Market Frontier</span><span className="crumb-slash">/</span><span className="breadcrumb-current">{titleMap[view]}</span></div>
          <div className="topbar-right"><span className="data-pill"><span className="status-dot" /> SIMULATION MODE</span><div className="top-xp"><Zap size={15} fill="currentColor" /> {progress.xp} XP</div><button className="help-button" aria-label="About TradeQuest" title="TradeQuest is an educational simulator, not financial advice." onClick={() => window.alert('TradeQuest is for education only. No live prices, signals or real-money trading. Synthetic chart data is clearly labelled.') }><CircleHelp size={18} /></button></div>
        </header>

        <div className="page-content">
          {view === 'overview' && <Overview
            progress={progress} completion={completion} onStart={() => setLessonOpen(true)}
            onNavigate={setView} onPractice={() => setView('practice')}
          />}
          {view === 'learn' && <LearningView progress={progress} onOpen={() => setLessonOpen(true)} onQuiz={() => document.getElementById('quick-quiz')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} quizChoice={quizChoice} setQuizChoice={setQuizChoice} submitQuiz={submitQuiz} />}
          {view === 'practice' && <PracticeView choice={scenarioChoice} setChoice={setScenarioChoice} revealed={scenarioRevealed} setRevealed={setScenarioRevealed} onAward={() => awardXPOnce('chart-dojo-synthetic-001', 15)} />}
          {view === 'risk' && <RiskView equity={riskEquity} setEquity={setRiskEquity} riskPercent={riskPercent} setRiskPercent={setRiskPercent} entry={entry} setEntry={setEntry} stop={stop} setStop={setStop} risk={risk} error={riskError} onCalculate={calculateAndSaveRisk} />}
          {view === 'challenges' && <ChallengesView onPractice={() => setView('practice')} />}
          {view === 'progress' && <ProgressView progress={progress} />}
        </div>
        <footer className="site-footer"><span>TRADEQUEST <span className="footer-sep">/</span> LEARN THE PROCESS, NOT THE HYPE.</span><span>Educational simulation · No live market data · Not financial advice</span></footer>
      </main>

      {lessonOpen && <LessonModal onClose={() => setLessonOpen(false)} onComplete={markLessonComplete} completed={progress.lessonComplete} />}
    </div>
  );
}

function Overview({ progress, completion, onStart, onNavigate, onPractice }: {
  progress: Progress; completion: number; onStart: () => void; onNavigate: (v: View) => void; onPractice: () => void;
}) {
  return <>
    <div className="eyebrow"><span className="eyebrow-line" /> MONDAY, YOUR NEXT MOVE STARTS HERE</div>
    <section className="welcome-row">
      <div><h1>Small steps.<br /><span>Sharper decisions.</span></h1><p className="welcome-copy">Markets reward preparation. Build your understanding one mission at a time—without putting real money at risk.</p><div className="welcome-actions"><button className="btn-primary" onClick={onStart}><Play size={16} fill="currentColor" /> Continue learning <ArrowRight size={16} /></button><button className="btn-quiet" onClick={onPractice}>Enter chart dojo <ArrowRight size={15} /></button></div></div>
      <div className="hero-art" aria-label="Illustration of a market explorer looking over a stylised chart landscape"><div className="hero-sun" /><div className="hero-mountain mountain-back" /><div className="hero-mountain mountain-front" /><div className="hero-platform" /><div className="hero-path" /><div className="hero-flag"><Target size={17} /></div><div className="hero-orbit" /><div className="hero-label"><span className="tiny-green-dot" /> YOUR NEXT SKILL IS AHEAD</div></div>
    </section>

    <section className="stat-grid" aria-label="Learning summary">
      <div className="stat-card"><div className="stat-top"><span className="stat-label">Learning progress</span><div className="stat-icon icon-blue"><GraduationCap size={18} /></div></div><div className="stat-number">{completion}<span className="stat-unit">%</span></div><div className="stat-foot"><div className="mini-track"><span style={{ width: `${completion}%` }} /></div><span>{completion === 100 ? 'Mission complete' : 'First mission'}</span></div></div>
      <div className="stat-card"><div className="stat-top"><span className="stat-label">Experience points</span><div className="stat-icon icon-amber"><Zap size={17} /></div></div><div className="stat-number">{progress.xp}<span className="stat-unit"> XP</span></div><div className="stat-foot"><span className="stat-trend"><ArrowUpRight size={14} /> Earned by learning</span></div></div>
      <div className="stat-card"><div className="stat-top"><span className="stat-label">Risk-first habits</span><div className="stat-icon icon-green"><ShieldCheck size={18} /></div></div><div className="stat-number">{progress.riskToolUsed ? '1' : '0'}<span className="stat-unit"> / 3</span></div><div className="stat-foot"><span className="stat-muted">Plan · Size · Review</span></div></div>
    </section>

    <section className="section-block">
      <div className="section-heading"><div><div className="eyebrow small-eyebrow">YOUR NEXT CHAPTER</div><h2>Pick up where curiosity left off</h2></div><button className="text-link" onClick={() => onNavigate('learn')}>View learning path <ArrowRight size={15} /></button></div>
      <div className="mission-card">
        <div className="mission-art"><div className="mission-glyph"><BookOpen size={27} /></div><span className="mission-number">MISSION 01</span><div className="mission-art-lines"><span /><span /><span /><span /><span /></div><div className="mission-stamp">FOUNDATIONS</div></div>
        <div className="mission-body"><div className="mission-meta"><span className="tag tag-mint">BEGINNER</span><span className="duration"><Activity size={13} /> 6 MIN</span><span className="duration"><Zap size={13} /> +40 XP</span></div><h3>How markets move</h3><p>Meet buyers and sellers, understand currency pairs, and discover why a price is never just a number.</p><div className="mission-bottom"><div className="mission-progress"><span className="mini-track"><span style={{ width: progress.lessonComplete ? '100%' : '0%' }} /></span><span>{progress.lessonComplete ? 'Complete' : 'Not started'}</span></div><button className="btn-dark" onClick={onStart}>{progress.lessonComplete ? 'Review lesson' : 'Start mission'} <ArrowRight size={15} /></button></div></div>
      </div>
    </section>

    <section className="lower-grid">
      <div className="section-block no-margin"><div className="section-heading compact"><div><div className="eyebrow small-eyebrow">PRACTICE MAKES PROGRESS</div><h2>Choose your training ground</h2></div></div>
        <div className="training-grid">
          <button className="training-card training-blue" onClick={() => onNavigate('practice')}><div className="training-icon"><BarChart3 size={19} /></div><span className="training-arrow"><ArrowUpRight size={17} /></span><h3>Chart dojo</h3><p>Read a synthetic chart. Decide before you reveal what happens next.</p><span className="training-meta">SCENARIO PRACTICE <ArrowRight size={13} /></span></button>
          <button className="training-card training-sand" onClick={() => onNavigate('risk')}><div className="training-icon"><ShieldCheck size={19} /></div><span className="training-arrow"><ArrowUpRight size={17} /></span><h3>Risk simulator</h3><p>Turn a risk budget and stop distance into a position-size estimate.</p><span className="training-meta">RISK LAB <ArrowRight size={13} /></span></button>
        </div>
      </div>
      <div className="section-block no-margin"><div className="section-heading compact"><div><div className="eyebrow small-eyebrow">THE NORTH STAR</div><h2>Process over profit</h2></div></div><div className="principle-card"><div className="principle-mark"><ShieldCheck size={22} /></div><div className="principle-copy"><h3>A good decision can be “no trade.”</h3><p>We reward planning, patience, and risk awareness—not just a lucky outcome. Practice results are not predictions of real-world performance.</p><button className="text-link" onClick={() => onNavigate('risk')}>Build your risk habits <ArrowRight size={14} /></button></div><div className="principle-number">01<span>/03</span></div></div></div>
    </section>
    <div className="data-notice"><div className="notice-icon"><LockKeyhole size={17} /></div><div><strong>A safe space to learn</strong><p>Charts in this starter experience are synthetic teaching examples. No live prices, broker connection, or real-money trading.</p></div><span className="notice-check"><CheckCircle2 size={17} /> CLEARLY LABELLED</span></div>
  </>;
}

function LearningView({ progress, onOpen, onQuiz, quizChoice, setQuizChoice, submitQuiz }: {
  progress: Progress; onOpen: () => void; onQuiz: () => void; quizChoice: string | null;
  setQuizChoice: (s: string) => void; submitQuiz: () => void;
}) {
  return <><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> LEARN BY DOING</div><h1>Your learning <span>path.</span></h1><p>Short lessons, useful practice, and feedback that explains the why—not just the answer.</p></div>
    <div className="learning-layout"><div className="lesson-list">
      {lessons.map((lesson, i) => <div className={`lesson-row ${i === 0 ? 'lesson-row-current' : ''}`} key={lesson.title}><div className={`lesson-marker ${lesson.color}`}>{i === 0 && progress.lessonComplete ? <Check size={17} /> : lesson.done ? <Check size={17} /> : String(i + 1).padStart(2, '0')}</div><div className="lesson-row-copy"><span className="lesson-row-meta">{lesson.meta}</span><h3>{lesson.title}</h3><span className="lesson-row-status">{i === 0 && progress.lessonComplete ? 'Completed · revisit any time' : i === 0 ? 'Ready when you are' : 'Next in your learning path'}</span></div><button className={i === 0 ? 'btn-dark' : 'btn-outline'} onClick={i === 0 ? onOpen : onQuiz}>{i === 0 ? (progress.lessonComplete ? 'Review' : 'Start') : 'Preview'} <ArrowRight size={14} /></button></div>)}
    </div><aside className="learning-aside"><div className="aside-card"><div className="aside-icon"><Target size={20} /></div><div className="eyebrow small-eyebrow">YOUR FIRST SKILL</div><h3>Understand the spread</h3><p>The difference between bid and ask is a real cost. Learn to spot it before thinking about profit.</p><div className="skill-meter"><span style={{ width: progress.quizCorrect ? '100%' : '15%' }} /></div><span className="skill-caption">{progress.quizCorrect ? 'Skill check passed' : 'Skill check not yet passed'}</span></div>
      <div className="quiz-card" id="quick-quiz"><div className="quiz-kicker"><Sparkles size={14} /> QUICK CHECK</div><h3>What does the spread represent?</h3>{[['commission','A fixed fee charged by the broker'],['spread','The difference between bid and ask'],['leverage','The amount borrowed to amplify exposure']].map(([id,label]) => <button key={id} className={`quiz-option ${quizChoice === id ? 'selected' : ''} ${progress.quizCorrect && id === 'spread' ? 'correct' : ''}`} onClick={() => setQuizChoice(id)}><span className="radio-dot">{quizChoice === id ? <span /> : null}</span>{label}</button>)}<button className="btn-primary full-button" onClick={submitQuiz} disabled={!quizChoice}>Check answer <ArrowRight size={15} /></button>{quizChoice && <p className={quizChoice === 'spread' ? 'feedback good' : 'feedback'}>{quizChoice === 'spread' ? 'Correct. Bid and ask are different prices; that difference is a transaction cost to understand.' : 'Not quite. Look for the two prices available at the same moment: bid and ask.'}</p>}</div>
    </aside></div></>;
}

function PracticeView({ choice, setChoice, revealed, setRevealed, onAward }: {
  choice: string | null; setChoice: (s: string) => void; revealed: boolean; setRevealed: (b: boolean) => void; onAward: () => void;
}) {
  const [awarded, setAwarded] = useState(false);
  function reveal() { setRevealed(true); if (!awarded) { onAward(); setAwarded(true); } }
  return <><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> PRACTICE LAB 01</div><h1>Welcome to the <span>chart dojo.</span></h1><p>Slow down, read what is visible, make a plan, then reveal the next chapter. No rush, no real money.</p></div>
    <div className="practice-layout"><section className="chart-panel"><div className="chart-panel-head"><div><span className="chart-instrument">SYNTHETIC · TEACHING SCENARIO</span><h2>Gold / USD <span className="chart-symbol">XAU/USD · SIMULATED</span></h2></div><span className="timeframe-chip">1H <ChevronDown size={13} /></span></div><div className="chart-legend"><span><i className="legend-dot green" /> Illustrative up candle</span><span><i className="legend-dot red" /> Illustrative down candle</span><span className="chart-disclosure"><LockKeyhole size={12} /> Not live prices</span></div><div className="chart-wrap"><CandleChart /></div><div className="chart-footer"><span>SCENARIO TQ-SYN-001</span><span>Prices are fictional</span></div></section>
      <aside className="scenario-panel"><div className="scenario-number">DECISION POINT 01 <span>+15 XP</span></div><h2>What would you do next?</h2><p>The illustrative candles have been moving higher. You have no defined entry, stop, or reason that would invalidate the idea.</p><div className="scenario-rule"><ShieldCheck size={17} /><span><strong>Think risk-first</strong> — a chart direction alone is not a complete plan.</span></div><div className="scenario-options">{[['wait','Wait for more evidence and define risk first'],['buy','Buy now because the trend looks strong'],['skip','Skip the trade; the setup is unclear']].map(([id,label]) => <button key={id} className={`scenario-option ${choice === id ? 'selected' : ''}`} onClick={() => { setChoice(id); setRevealed(false); }}><span className="scenario-radio">{choice === id ? <span /> : null}</span>{label}</button>)}</div><button className="btn-primary full-button" onClick={reveal} disabled={!choice || revealed}>{revealed ? 'Scenario revealed' : 'Reveal feedback'} <ArrowRight size={15} /></button>{revealed && <div className="scenario-feedback"><CheckCircle2 size={18} /><div><strong>{choice === 'wait' || choice === 'skip' ? 'A disciplined choice.' : 'Momentum is not a plan.'}</strong><p>{choice === 'buy' ? 'Entering without an invalidation point leaves risk undefined. A strong-looking chart does not guarantee continuation.' : 'Waiting or declining an unclear setup protects your decision process. Define what would prove the idea wrong before considering an entry.'}</p></div></div>}</aside>
    </div><div className="practice-disclaimer"><ShieldCheck size={17} /><span>Learning simulation only. This scenario uses synthetic teaching data and is not a recommendation to buy or sell gold.</span></div>
  </>;
}

function RiskView({ equity, setEquity, riskPercent, setRiskPercent, entry, setEntry, stop, setStop, risk, error, onCalculate }: {
  equity: string; setEquity: (s: string) => void; riskPercent: string; setRiskPercent: (s: string) => void;
  entry: string; setEntry: (s: string) => void; stop: string; setStop: (s: string) => void;
  risk: ReturnType<typeof calculateRisk> | null; error: string; onCalculate: () => void;
}) {
  return <><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> RISK LAB 01</div><h1>Know your risk <span>before the trade.</span></h1><p>Learn how a risk budget and stop distance influence position size. The assumptions here are simplified for teaching.</p></div>
    <div className="risk-layout"><section className="risk-form panel"><div className="panel-heading"><div className="panel-heading-icon"><ShieldCheck size={19} /></div><div><h2>Build a risk plan</h2><p>Try the numbers. Nothing is sent to a broker.</p></div></div><label className="field-label" htmlFor="equity">Virtual account equity (£)</label><input id="equity" type="number" min="1" value={equity} onChange={e => setEquity(e.target.value)} /><label className="field-label" htmlFor="risk-percent">Risk budget (%)</label><div className="risk-presets">{['0.5','1','2'].map(v => <button key={v} className={riskPercent === v ? 'preset active' : 'preset'} onClick={() => setRiskPercent(v)}>{v}%</button>)}</div><input id="risk-percent" type="number" min="0.01" max="100" step="0.1" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} /><div className="field-pair"><div><label className="field-label" htmlFor="entry">Illustrative entry</label><input id="entry" type="number" min="0.01" step="0.1" value={entry} onChange={e => setEntry(e.target.value)} /></div><div><label className="field-label" htmlFor="stop">Illustrative stop</label><input id="stop" type="number" min="0.01" step="0.1" value={stop} onChange={e => setStop(e.target.value)} /></div></div><button className="btn-primary full-button" onClick={onCalculate}>Calculate risk budget <ArrowRight size={15} /></button>{error && <p className="feedback">{error}</p>}<p className="form-footnote"><CircleHelp size={14} /> Simplified example: instrument contract size, pip/tick value, spread, slippage, fees, currency conversion, and gaps are not modelled.</p></section>
      <section className="risk-result"><div className="result-top"><div><span className="result-label">YOUR ESTIMATED RISK BUDGET</span><div className="result-number">{risk ? risk.riskBudget.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }) : '—'}</div></div><div className="result-icon"><Wallet size={22} /></div></div><div className="result-divider" /><div className="result-row"><span>Stop distance</span><strong>{risk ? risk.distance.toLocaleString('en-GB', { maximumFractionDigits: 4 }) : '—'}</strong></div><div className="result-row"><span>Illustrative units*</span><strong>{risk ? risk.units.toLocaleString('en-GB', { maximumFractionDigits: 4 }) : '—'}</strong></div><div className="result-row"><span>Loss at stop (before costs)*</span><strong>{risk ? risk.estimatedLoss.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }) : '—'}</strong></div><div className="result-warning"><ShieldCheck size={18} /><div><strong>Estimate, not a guarantee</strong><p>Real execution can lose more than the planned amount due to gaps, slippage, costs, leverage, and instrument-specific contract rules.</p></div></div><div className="result-foot">* The example assumes one unit of account-currency loss per price unit. This is not a valid contract specification for every market.</div></section></div>
  </>;
}

function ChallengesView({ onPractice }: { onPractice: () => void }) {
  return <><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> LEARN WITH OTHERS</div><h1>Good decisions are <span>a team sport.</span></h1><p>Community quests reward reasoning, risk awareness, and reflection—not simulated profit leaderboards.</p></div><div className="challenge-grid"><div className="challenge-card"><div className="challenge-art art-teal"><div className="challenge-emblem"><ShieldCheck size={27} /></div><span>QUEST 001</span></div><div className="challenge-copy"><span className="tag tag-mint">BEGINNER · 10 MIN</span><h2>The patient explorer</h2><p>Review a fictional gold chart. Identify what evidence is missing before you would consider a trade.</p><div className="challenge-footer"><span><Award size={15} /> Process badge</span><button className="btn-dark" onClick={onPractice}>Try quest <ArrowRight size={14} /></button></div></div></div><div className="challenge-card"><div className="challenge-art art-violet"><div className="challenge-emblem"><Target size={27} /></div><span>QUEST 002</span></div><div className="challenge-copy"><span className="tag tag-violet">BEGINNER · 8 MIN</span><h2>Risk budget detective</h2><p>Compare two hypothetical plans and choose the one with a clearly defined, proportionate risk.</p><div className="challenge-footer"><span><Award size={15} /> Risk badge</span><button className="btn-dark" onClick={onPractice}>Try quest <ArrowRight size={14} /></button></div></div></div></div><div className="data-notice"><div className="notice-icon"><LockKeyhole size={17} /></div><div><strong>Community is being built carefully</strong><p>This starter has no public profiles, user submissions, or leaderboard backend yet. Challenges shown here are curated demo content.</p></div></div></>;
}

function ProgressView({ progress }: { progress: Progress }) {
  const skills = [
    { title: 'Market foundations', description: 'Understand who buys and sells', complete: progress.lessonComplete, icon: BookOpen },
    { title: 'Trading mechanics', description: 'Understand bid, ask, and spread', complete: progress.quizCorrect, icon: Activity },
    { title: 'Risk-first thinking', description: 'Estimate risk before a decision', complete: progress.riskToolUsed, icon: ShieldCheck },
    { title: 'Chart interpretation', description: 'Read a chart without predicting', complete: false, icon: BarChart3 },
  ];
  return <><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> PROGRESS THAT MEANS SOMETHING</div><h1>Your skill <span>tree.</span></h1><p>Progress reflects practice you have completed—not a claim about future trading performance.</p></div><div className="skill-tree-grid">{skills.map((skill, i) => { const Icon = skill.icon; return <div className={`skill-node ${skill.complete ? 'skill-complete' : ''}`} key={skill.title}><div className="skill-node-top"><div className="skill-node-icon"><Icon size={21} /></div><span className={skill.complete ? 'skill-state state-done' : 'skill-state'}>{skill.complete ? 'PRACTISED' : 'TO EXPLORE'}</span></div><h2>{skill.title}</h2><p>{skill.description}</p><div className="skill-node-bottom"><span>{skill.complete ? 'Evidence recorded' : `Skill ${String(i + 1).padStart(2, '0')}`}</span>{skill.complete ? <CheckCircle2 size={17} /> : <LockKeyhole size={15} />}</div></div>; })}</div><div className="data-notice"><div className="notice-icon"><Award size={17} /></div><div><strong>Mastery takes more than one lucky answer</strong><p>This prototype records simple demo milestones locally. The full adaptive mastery engine will require account-based evidence across multiple unseen exercises.</p></div></div></>;
}

function LessonModal({ onClose, onComplete, completed }: { onClose: () => void; onComplete: () => void; completed: boolean }) {
  const [step, setStep] = useState(0);
  const pages = [
    { kicker: 'THE BIG IDEA', title: 'Every market is a meeting place.', body: 'A market brings buyers and sellers together. A quoted price reflects the level where participants are currently willing to transact—not a promise about where price will go next.', example: 'Think of a busy marketplace. The highest price a buyer will pay and the lowest price a seller will accept can be different.' },
    { kicker: 'THE MECHANIC', title: 'A currency pair compares two currencies.', body: 'In EUR/USD, EUR is the base currency and USD is the quote currency. A price of 1.0800 means one euro is quoted at 1.08 US dollars. If the quote rises, the euro has strengthened relative to the dollar in that pair.', example: 'Pairs always have two sides. A price move is relative: it describes one currency against another.' },
    { kicker: 'THE TAKEAWAY', title: 'A direction is not a complete plan.', body: 'A chart can move either way, and even a well-reasoned idea can be wrong. Before evaluating a hypothetical trade, know what evidence supports it, what would invalidate it, and what loss you could tolerate.', example: 'The best next step can be to wait. Uncertainty is information—not a reason to rush.' },
  ];
  const page = pages[step];
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-title"><div className="modal-top"><span className="modal-kicker"><BookOpen size={15} /> MISSION 01 · FOUNDATIONS</span><button className="icon-button" onClick={onClose} aria-label="Close lesson"><X size={19} /></button></div><div className="modal-progress">{pages.map((_, i) => <span key={i} className={i <= step ? 'active' : ''} />)}</div><div className="lesson-illustration"><div className="lesson-sun" /><div className="lesson-land land-one" /><div className="lesson-land land-two" /><div className="lesson-illustration-icon">{step === 0 ? <Compass size={28} /> : step === 1 ? <BarChart3 size={28} /> : <ShieldCheck size={28} />}</div></div><div className="modal-content"><div className="eyebrow small-eyebrow">{page.kicker}</div><h2 id="lesson-title">{page.title}</h2><p>{page.body}</p><div className="example-box"><Sparkles size={17} /><div><strong>Make it stick</strong><p>{page.example}</p></div></div><div className="modal-actions"><span className="step-count">0{step + 1} <span>/ 03</span></span>{step < pages.length - 1 ? <button className="btn-primary" onClick={() => setStep(s => s + 1)}>Next concept <ArrowRight size={15} /></button> : <button className="btn-primary" onClick={onComplete}>{completed ? 'Mark reviewed' : 'Complete mission'} <Check size={16} /></button>}</div></div></section></div>;
}

export default App;