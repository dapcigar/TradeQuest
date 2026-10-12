import { useEffect, useMemo, useState } from 'react';
import JournalView from './JournalView';
import ReviewQueue from './ReviewQueue';
import AdaptivePractice from './AdaptivePractice';
import WeeklyPracticePlan from './WeeklyPracticePlan';
import GlossaryView from './GlossaryView';
import CandleLiteracy from './CandleLiteracy';
import SupportResistanceLiteracy from './SupportResistanceLiteracy';
import TrendStructureLiteracy from './TrendStructureLiteracy';
import BreakoutLiteracy from './BreakoutLiteracy';
import RiskRewardLiteracy from './RiskRewardLiteracy';
import LeverageMarginLiteracy from './LeverageMarginLiteracy';
import PositionSizingLiteracy from './PositionSizingLiteracy';
import DrawdownLiteracy from './DrawdownLiteracy';
import PsychologyLiteracy from './PsychologyLiteracy';
import ExecutionLiteracy from './ExecutionLiteracy';
import MarketConditionsLiteracy from './MarketConditionsLiteracy';
import BacktestingEvidenceLiteracy from './BacktestingEvidenceLiteracy';
import AssetClassLiteracy from './AssetClassLiteracy';
import {
  Activity, ArrowRight, ArrowUpRight, Award, BarChart3, BookOpen, CalendarDays,
  Check, CheckCircle2, ChevronDown, CircleHelp, Compass, Flame, GraduationCap,
  LockKeyhole, Menu, Play, ShieldCheck, Sparkles, Target, Trophy,
  Wallet, X, Zap,
} from 'lucide-react';
import { calculateRisk } from './risk';
import { normaliseProgress, awardProgressXPOnce } from './progress';
import { assessSpreadAnswer } from './learning';
import { supabase, supabaseConfigured } from './supabase';
import { useModalFocus } from './useModalFocus';
import { describeEvidence, describeTransfer, type ApplicationBucket, type EvidenceBucket } from './masteryDisplay';
import type { Session } from '@supabase/supabase-js';

type View = 'overview' | 'learn' | 'practice' | 'risk' | 'challenges' | 'progress' | 'journal' | 'review' | 'adaptive' | 'weekly' | 'glossary' | 'candles' | 'structure' | 'trend' | 'breakout' | 'risk-reward' | 'leverage' | 'position-sizing' | 'drawdown' | 'psychology' | 'execution' | 'conditions' | 'backtesting' | 'assets';
type Progress = { lessonComplete: boolean; quizCorrect: boolean; xp: number; riskToolUsed: boolean; awardedActions: string[] };
type MasterySummary = {
  skills: Array<{ skillId: string; scenarioId: string; label: string; description: string; attempts: number; positiveDecisions: number; successRate: number | null; confidence: string; distinctScenarios: number; scenariosAvailable: number; recall: EvidenceBucket; application: ApplicationBucket; lastPractisedAt: string | null; reviewStatus: string; firstAttemptPositive: boolean | null; delayedReviewAttempts: number; retentionStatus: string }>;
  recommendation: { scenarioId: string; skillId: string; title: string; reason: string; attempts: number; confidence: string; reviewStatus: string; retentionStatus: string; isNewScenario: boolean };
  learningSignals: Array<{ signalId: string; label: string; description: string; attempts: number; positiveDecisions: number | null; successRate: number | null; confidence: string; measure: string }>;
  sampleSize: number;
  note: string;
};
type DojoScenario = {
  scenarioId: string;
  version: string;
  title: string;
  prompt: string;
  chartData: Record<string, unknown>;
  choices: Array<{ id: string; label: string }>;
};
const demoDojoScenarios: DojoScenario[] = [
  {
    scenarioId: 'TQ-SYN-001', version: '1', title: 'Momentum without a plan',
    prompt: 'The illustrative candles have been moving higher. You have no defined entry, stop, or reason that would invalidate the idea.',
    chartData: { kind: 'illustrative-uptrend', disclosure: 'Synthetic teaching data; not live prices', instrument: 'XAU/USD', timeframe: '1H' },
    choices: [
      { id: 'wait', label: 'Wait for more evidence and define risk first' },
      { id: 'buy', label: 'Buy now because the trend looks strong' },
      { id: 'skip', label: 'Skip the trade; the setup is unclear' },
    ],
  },
  {
    scenarioId: 'TQ-SYN-002', version: '1', title: 'A stop that is too wide',
    prompt: 'Two hypothetical plans have the same account size. One has a stop distance that makes the potential loss exceed the stated risk budget. What should happen before entering?',
    chartData: { kind: 'risk-budget-comparison', disclosure: 'Synthetic teaching data; no real prices or execution', accountEquity: 10000, riskBudgetPercent: 1, plans: [{ id: 'A', stopDistance: 10, estimatedLoss: 100 }, { id: 'B', stopDistance: 120, estimatedLoss: 1200 }] },
    choices: [
      { id: 'recalculate', label: 'Recalculate size or wait until the risk fits the budget' },
      { id: 'accept', label: 'Accept the larger loss because the setup looks strong' },
      { id: 'skip', label: 'Skip the setup if risk cannot be made acceptable' },
    ],
  },
  {
    scenarioId: 'TQ-SYN-003', version: '1', title: 'Evidence before prediction',
    prompt: 'A synthetic chart has made a sharp move, but the next candle has not closed and your original thesis has no defined invalidation level. Choose the most disciplined next step.',
    chartData: { kind: 'uncertain-breakout', disclosure: 'Synthetic teaching data; not live prices', instrument: 'SYNTHETIC-ASSET', timeframe: '1H', context: 'Sharp move · candle not closed · no invalidation level' },
    choices: [
      { id: 'wait', label: 'Wait for the candle close and define invalidation' },
      { id: 'chase', label: 'Enter immediately to avoid missing the move' },
      { id: 'skip', label: 'Skip if a clear plan cannot be formed' },
    ],
  },
];
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
    return normaliseProgress(raw ? JSON.parse(raw) as unknown : null, initialProgress);
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
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const authDialogRef = useModalFocus<HTMLElement>(authOpen, () => setAuthOpen(false));
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [lessonReadPending, setLessonReadPending] = useState(false);
  const [accountProgress, setAccountProgress] = useState<{ xp: number; lessons_completed: string[]; events: string[] } | null>(null);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; xpAwarded: number; idempotentReplay?: boolean } | null>(null);
  const [quizError, setQuizError] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [quizChoice, setQuizChoice] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [riskEquity, setRiskEquity] = useState('10000');
  const [riskPercent, setRiskPercent] = useState('1');
  const [entry, setEntry] = useState('2350');
  const [stop, setStop] = useState('2335');
  const [riskError, setRiskError] = useState('');
  const [scenarioChoice, setScenarioChoice] = useState<string | null>(null);
  const [scenarioRevealed, setScenarioRevealed] = useState(false);
  const [dojoResult, setDojoResult] = useState<{ choiceId: string; outcome: string; feedback: string; xpAwarded: number; idempotentReplay?: boolean } | null>(null);
  const [dojoError, setDojoError] = useState('');
  const [dojoBusy, setDojoBusy] = useState(false);
  const [dojoHistory, setDojoHistory] = useState<Array<{ attemptId: string; scenarioId?: string; scenarioVersion?: string; choiceId: string; outcome: string; feedback: string; submittedAt: string }>>([]);
  const [dojoScenarios, setDojoScenarios] = useState<DojoScenario[]>(demoDojoScenarios);
  const [activeScenarioId, setActiveScenarioId] = useState('TQ-SYN-001');
  const [dojoCatalogueMessage, setDojoCatalogueMessage] = useState('');
  const [mastery, setMastery] = useState<MasterySummary | null>(null);
  const [masteryMessage, setMasteryMessage] = useState('');


  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAccountProgress(null);
      setQuizResult(null);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (session) return;
    try { localStorage.setItem(progressKey, JSON.stringify(progress)); } catch { /* demo progress remains in memory */ }
  }, [progress, session]);

  useEffect(() => {
    if (!session) { setAccountProgress(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch((import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000') + '/v1/me/progress', {
          headers: { Authorization: 'Bearer ' + session.access_token },
        });
        if (!response.ok) throw new Error('Progress could not be loaded. Check the API and database setup.');
        const body = await response.json() as { progress?: { xp?: unknown; lessons_completed?: unknown }; events?: unknown };
        if (!cancelled) setAccountProgress({
          xp: typeof body.progress?.xp === 'number' && Number.isFinite(body.progress.xp) ? body.progress.xp : 0,
          lessons_completed: Array.isArray(body.progress?.lessons_completed) ? body.progress.lessons_completed.filter((x): x is string => typeof x === 'string') : [],
          events: Array.isArray(body.events) ? body.events.filter((x): x is string => typeof x === 'string') : [],
        });
      } catch (error) {
        if (!cancelled) setAuthMessage(error instanceof Error ? error.message : 'Account progress could not load.');
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!session) {
      setDojoHistory([]);
      setDojoResult(null);
      setDojoScenarios(demoDojoScenarios);
      setDojoCatalogueMessage('');
      return;
    }
    let cancelled = false;
    const baseUrl = import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000';
    fetch(baseUrl + '/v1/chart-dojo/scenarios', { headers: { Authorization: 'Bearer ' + session.access_token } })
      .then(async response => {
        if (!response.ok) throw new Error('The scenario catalogue could not load. Apply Supabase migration 006 and restart the API.');
        return response.json();
      })
      .then((body: { scenarios?: DojoScenario[] }) => {
        if (cancelled) return;
        if (!Array.isArray(body.scenarios) || body.scenarios.length === 0) throw new Error('No published Chart Dojo scenarios are available yet.');
        setDojoScenarios(body.scenarios);
        setActiveScenarioId(current => body.scenarios!.some(scenario => scenario.scenarioId === current) ? current : body.scenarios![0].scenarioId);
        setDojoCatalogueMessage('');
      })
      .catch(error => {
        if (!cancelled) setDojoCatalogueMessage(error instanceof Error ? error.message : 'The scenario catalogue could not load.');
      });
    fetch(baseUrl + '/v1/chart-dojo/attempts', { headers: { Authorization: 'Bearer ' + session.access_token } })
      .then(async response => { if (!response.ok) throw new Error('Chart Dojo history could not load.'); return response.json(); })
      .then((body: { attempts?: Array<{ attemptId: string; scenarioId?: string; scenarioVersion?: string; choiceId: string; outcome: string; feedback: string; submittedAt: string }> }) => {
        if (!cancelled) setDojoHistory(Array.isArray(body.attempts) ? body.attempts : []);
      })
      .catch(error => { if (!cancelled) setDojoError(error instanceof Error ? error.message : 'Chart Dojo history could not load.'); });
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!session) { setMastery(null); setMasteryMessage(''); return; }
    let cancelled = false;
    fetch((import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000') + '/v1/me/mastery', {
      headers: { Authorization: 'Bearer ' + session.access_token },
    }).then(async response => {
      if (!response.ok) throw new Error('Your practice recommendations could not be loaded.');
      return response.json() as Promise<MasterySummary>;
    }).then(body => {
      if (!cancelled) { setMastery(body); setMasteryMessage(''); }
    }).catch(error => {
      if (!cancelled) setMasteryMessage(error instanceof Error ? error.message : 'Your practice recommendations could not be loaded.');
    });
    return () => { cancelled = true; };
  }, [session, dojoHistory.length]);

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
    { id: 'glossary', label: 'Learning glossary', icon: BookOpen, section: 'FIELD GUIDE' },
    { id: 'candles', label: 'Candle literacy', icon: BarChart3 },
    { id: 'structure', label: 'Support & resistance', icon: BarChart3 },
    { id: 'trend', label: 'Trend structure', icon: Activity },
    { id: 'breakout', label: 'Breakouts & false breakouts', icon: BarChart3 },
    { id: 'risk-reward', label: 'Risk and reward', icon: ShieldCheck },
    { id: 'leverage', label: 'Leverage and margin', icon: ShieldCheck },
    { id: 'position-sizing', label: 'Position sizing', icon: ShieldCheck },
    { id: 'drawdown', label: 'Drawdown & losing streaks', icon: ShieldCheck },
    { id: 'psychology', label: 'Trading psychology', icon: ShieldCheck },
    { id: 'execution', label: 'Order types & execution', icon: Activity },
    { id: 'conditions', label: 'Liquidity, volatility & sessions', icon: Activity },
    { id: 'backtesting', label: 'Backtesting & evidence quality', icon: BookOpen },
    { id: 'assets', label: 'Understanding asset classes', icon: BarChart3 },       
    { id: 'practice', label: 'Chart dojo', icon: Activity, section: 'PRACTICE LABS' },
    { id: 'risk', label: 'Risk simulator', icon: ShieldCheck },
    { id: 'journal', label: 'Decision journal', icon: BookOpen, section: 'REFLECT' },
    { id: 'review', label: 'Review queue', icon: Target, section: 'KEEP LEARNING' },
    { id: 'adaptive', label: 'Adaptive practice', icon: Sparkles },
    { id: 'weekly', label: 'Weekly practice plan', icon: CalendarDays, section: 'BUILD A ROUTINE' }, 
    { id: 'challenges', label: 'Community quests', icon: Trophy, section: 'PLAY TOGETHER' },
    { id: 'progress', label: 'Skill tree', icon: Award },
  ];

  const activeXp = session ? (accountProgress?.xp ?? 0) : progress.xp;
  const completed = Number(progress.lessonComplete) + Number(progress.quizCorrect);
  const completion = Math.round((completed / 2) * 100);
  const titleMap: Record<View, string> = {
    overview: 'Mission control', learn: 'Your learning path', practice: 'Chart dojo',
    risk: 'Risk simulator', challenges: 'Community quests', progress: 'Your skill tree', journal: 'Decision journal', review: 'Spaced review queue', adaptive: 'Adaptive practice', weekly: 'Weekly practice plan', glossary: 'Learning glossary', candles: 'Candle literacy', structure: 'Support and resistance', trend: 'Trend structure', breakout: 'Breakouts & false breakouts', 'risk-reward': 'Risk and reward', leverage: 'Leverage and margin', 'position-sizing': 'Position sizing', drawdown: 'Drawdown and losing streaks', psychology: 'Trading psychology', execution: 'Order types and execution', conditions: 'Liquidity, volatility and sessions', backtesting: 'Backtesting and evidence quality', assets: 'Understanding asset classes',
  };

  function awardXPOnce(actionId: string, amount: number) {
    setProgress(p => awardProgressXPOnce(p, actionId, amount));
  }

  async function recordAccountEvent(eventKey: 'foundations-lesson-01' | 'risk-tool-used-v1') {
    if (!session) return false;
    try {
      const response = await fetch((import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000') + '/v1/progress-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ eventId: crypto.randomUUID(), eventKey }),
      });
      const body = await response.json() as { result?: { xpAwarded: number; alreadyRecorded: boolean }; error?: string };
      if (!response.ok || !body.result) throw new Error(body.error || 'Progress could not be saved.');
      setAccountProgress(p => p ? {
        ...p,
        xp: p.xp + (body.result!.alreadyRecorded ? 0 : body.result!.xpAwarded),
        events: p.events.includes(eventKey) ? p.events : [...p.events, eventKey],
      } : p);
      setAuthMessage('');
      return true;
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Progress could not be saved.');
      return false;
    }
  }

  async function submitChartDojoAttempt(scenarioId: string, choiceId: string): Promise<boolean> {
    setDojoBusy(true); setDojoError('');
    try {
      if (session) {
        const response = await fetch((import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000') + '/v1/chart-dojo/attempts', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
          body: JSON.stringify({ attemptId: crypto.randomUUID(), scenarioId, choiceId }),
        });
        const body = await response.json() as { result?: { choiceId: string; outcome: string; feedback: string; xpAwarded: number; idempotentReplay?: boolean; attemptId: string; scenarioId?: string; scenarioVersion?: string }; error?: string };
        if (!response.ok || !body.result) throw new Error(body.error || 'Chart Dojo answer could not be saved.');
        setDojoResult(body.result);
        setAccountProgress(p => p ? { ...p, xp: p.xp + body.result!.xpAwarded, events: p.events.includes('chart-dojo-scenario-01') ? p.events : [...p.events, 'chart-dojo-scenario-01'] } : p);
        setDojoHistory(history => [{ attemptId: body.result!.attemptId, scenarioId: body.result!.scenarioId ?? scenarioId, scenarioVersion: body.result!.scenarioVersion, choiceId: body.result!.choiceId, outcome: body.result!.outcome, feedback: body.result!.feedback, submittedAt: new Date().toISOString() }, ...history].slice(0, 50));
      } else {
        const scenario = demoDojoScenarios.find(item => item.scenarioId === scenarioId);
        const answer = scenarioId === 'TQ-SYN-001'
          ? (choiceId === 'buy'
            ? { outcome: 'undefined-risk', feedback: 'Momentum is not a plan. Entering without an invalidation point leaves risk undefined. A strong-looking chart does not guarantee continuation.' }
            : { outcome: 'disciplined', feedback: 'A disciplined choice. Waiting or declining an unclear setup protects your decision process. Define what would prove the idea wrong before considering an entry.' })
          : scenarioId === 'TQ-SYN-002'
            ? (choiceId === 'accept'
              ? { outcome: 'risk-exceeded', feedback: 'A strong-looking setup does not change the risk budget. A potential loss above the planned limit means the plan needs to be resized or rejected.' }
              : { outcome: 'risk-aware', feedback: 'Good process: size the position from the risk budget and stop distance. If the position cannot be sized reliably, do not force the trade.' })
            : (choiceId === 'chase'
              ? { outcome: 'impulsive', feedback: 'Fear of missing out is not evidence. Entering before the scenario is defined can leave both the thesis and risk uncontrolled.' }
              : { outcome: 'evidence-led', feedback: 'Waiting for defined evidence reduces impulsive decisions. A candle close still does not guarantee direction; define the condition that invalidates the idea.' });
        if (!scenario?.choices.some(option => option.id === choiceId)) throw new Error('Choose one of the available answers.');
        setDojoResult({ choiceId, ...answer, xpAwarded: scenarioId === 'TQ-SYN-001' ? 15 : 0 });
        if (scenarioId === 'TQ-SYN-001') awardXPOnce('chart-dojo-synthetic-001', 15);
        setDojoHistory(history => [{ attemptId: crypto.randomUUID(), scenarioId, scenarioVersion: scenario?.version, choiceId, outcome: answer.outcome, feedback: answer.feedback, submittedAt: new Date().toISOString() }, ...history].slice(0, 50));
      }
      setScenarioRevealed(true);
      return true;
    } catch (error) {
      setDojoError(error instanceof Error ? error.message : 'Chart Dojo answer could not be saved.');
      return false;
    } finally { setDojoBusy(false); }
  }

  async function markLessonComplete() {
    if (session) {
      if (accountProgress?.events.includes('foundations-lesson-01')) {
        setLessonOpen(false);
        return;
      }
      if (!accountProgress?.lessons_completed.includes('spread-basics')) {
        // The milestone is earned after the quick check; remember the lesson was read.
        setLessonReadPending(true);
        setLessonOpen(false);
        setAuthMessage('Lesson read. Pass the quick check on the learning page to earn the lesson milestone.');
        return;
      }
      const saved = await recordAccountEvent('foundations-lesson-01');
      if (!saved) return;
      setProgress(p => ({ ...p, lessonComplete: true }));
      setLessonOpen(false);
      return;
    }
    setProgress(p => ({ ...p, lessonComplete: true, xp: p.xp + (p.lessonComplete ? 0 : 40) }));
    setLessonOpen(false);
  }

  async function submitQuiz() {
    if (!quizChoice) return;
    setQuizSubmitted(true);
    setQuizResult(null);
    setQuizError('');
    if (session) {
      try {
        const response = await fetch((import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000') + '/v1/lesson-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
          body: JSON.stringify({
            lessonId: 'spread-basics', lessonVersion: '1', attemptId: crypto.randomUUID(),
            answers: [{ questionId: 'spread-definition', answerId: quizChoice }],
          }),
        });
        const body = await response.json() as { result?: { score: number; passed: boolean; xpAwarded: number; idempotentReplay?: boolean }; error?: string };
        if (!response.ok || !body.result) throw new Error(body.error || 'The answer could not be saved.');
        setQuizResult(body.result);
        setProgress(p => ({ ...p, quizCorrect: body.result!.passed || p.quizCorrect }));
        if (body.result.passed && lessonReadPending) {
          setLessonReadPending(false);
          const claimed = await recordAccountEvent('foundations-lesson-01');
          if (claimed) setProgress(p => ({ ...p, lessonComplete: true }));
        }
        setAccountProgress(p => p ? {
          ...p,
          xp: p.xp + (body.result!.idempotentReplay ? 0 : body.result!.xpAwarded),
          lessons_completed: body.result!.passed && !p.lessons_completed.includes('spread-basics') ? [...p.lessons_completed, 'spread-basics'] : p.lessons_completed,
        } : p);
      } catch (error) {
        setQuizError(error instanceof Error ? error.message : 'The answer could not be saved.');
      }
      return;
    }
    const correct = quizChoice === 'spread';
    setProgress(p => ({ ...p, quizCorrect: correct || p.quizCorrect, xp: p.xp + (correct && !p.quizCorrect ? 30 : 0) }));
  }

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true); setAuthMessage('');
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        if (!data.session) setAuthMessage('Account created. Check your email to confirm the address, then sign in.');
        else { setSession(data.session); setAuthOpen(false); setAuthPassword(''); }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        setSession(data.session); setAuthOpen(false); setAuthPassword('');
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.');
    } finally { setAuthBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthMessage(error.message);
    else { setSession(null); setAccountProgress(null); setAuthMessage('Signed out. Browser demo progress remains separate from account progress.'); }
  }

  async function calculateAndSaveRisk() {
    if (!risk) {
      setRiskError('Check your inputs. Entry and stop must be different, and values must be positive.');
      return;
    }
    setRiskError('');
    if (session) {
      if (accountProgress?.events.includes('risk-tool-used-v1')) {
        setProgress(p => ({ ...p, riskToolUsed: true }));
        return;
      }
      const saved = await recordAccountEvent('risk-tool-used-v1');
      if (saved) setProgress(p => ({ ...p, riskToolUsed: true }));
      return;
    }
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
          <div className="level-track"><span style={{ width: `${Math.min(100, (activeXp % 200) / 2)}%` }} /></div>
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
          <div className="topbar-right"><button className="btn-outline account-button" onClick={() => session ? void signOut() : (setAuthOpen(true), setAuthMessage(''))}>{session ? 'Sign out' : 'Sign in'}</button><span className="data-pill"><span className="status-dot" /> SIMULATION MODE</span><div className="top-xp"><Zap size={15} fill="currentColor" /> {activeXp} XP</div><button className="help-button" aria-label="About TradeQuest" title="TradeQuest is an educational simulator, not financial advice." onClick={() => window.alert('TradeQuest is for education only. No live prices, signals or real-money trading. Synthetic chart data is clearly labelled.') }><CircleHelp size={18} /></button></div>
        </header>

        <div className="page-content">
          {view === 'overview' && <Overview
            progress={progress} completion={completion} onStart={() => setLessonOpen(true)}
            onNavigate={setView} onPractice={() => setView('practice')}
          />}
          {view === 'glossary' && <GlossaryView />}
          {view === 'candles' && <CandleLiteracy />}
          {view === 'structure' && <SupportResistanceLiteracy />}
          {view === 'trend' && <TrendStructureLiteracy />}
          {view === 'breakout' && <BreakoutLiteracy />}
          {view === 'risk-reward' && <RiskRewardLiteracy />}
          {view === 'leverage' && <LeverageMarginLiteracy />}
          {view === 'position-sizing' && <PositionSizingLiteracy />}
          {view === 'drawdown' && <DrawdownLiteracy />}
          {view === 'psychology' && <PsychologyLiteracy />}
          {view === 'execution' && <ExecutionLiteracy />}
          {view === 'conditions' && <MarketConditionsLiteracy />}
          {view === 'backtesting' && <BacktestingEvidenceLiteracy />}
          {view === 'assets' && <AssetClassLiteracy />}
          {view === 'learn' && <LearningView progress={progress} onOpen={() => setLessonOpen(true)} quizChoice={quizChoice} setQuizChoice={value => { setQuizChoice(value); setQuizSubmitted(false); setQuizResult(null); }} quizSubmitted={quizSubmitted} submitQuiz={submitQuiz} quizResult={quizResult} quizError={quizError} onRetryQuiz={() => { setQuizChoice(''); setQuizSubmitted(false); setQuizResult(null); setQuizError(''); }} accountMode={Boolean(session)} />}
          {view === 'practice' && <PracticeView scenarios={dojoScenarios} activeScenarioId={activeScenarioId} onSelectScenario={scenarioId => { setActiveScenarioId(scenarioId); setScenarioChoice(null); setScenarioRevealed(false); setDojoResult(null); setDojoError(''); }} catalogueMessage={session ? dojoCatalogueMessage : ''} choice={scenarioChoice} setChoice={value => { setScenarioChoice(value); setScenarioRevealed(false); setDojoResult(null); setDojoError(''); }} revealed={scenarioRevealed} onSubmit={submitChartDojoAttempt} result={dojoResult} error={dojoError} busy={dojoBusy} history={session ? dojoHistory : []} />}
          {view === 'journal' && <JournalView session={session} scenarioId={activeScenarioId} />}
          {view === 'adaptive' && <AdaptivePractice />}
          {view === 'weekly' && <WeeklyPracticePlan />}
          {view === 'review' && <ReviewQueue signedIn={Boolean(session)} mastery={session ? mastery : null} message={session ? masteryMessage : ''} onPractice={scenarioId => { setActiveScenarioId(scenarioId); setScenarioChoice(null); setScenarioRevealed(false); setDojoResult(null); setDojoError(''); setView('practice'); }} onSignIn={() => { setAuthOpen(true); setAuthMessage(''); }} />}
          {view === 'risk' && <RiskView equity={riskEquity} setEquity={setRiskEquity} riskPercent={riskPercent} setRiskPercent={setRiskPercent} entry={entry} setEntry={setEntry} stop={stop} setStop={setStop} risk={risk} error={riskError} onCalculate={calculateAndSaveRisk} />}
          {view === 'challenges' && <ChallengesView onPractice={() => setView('practice')} />}
          {view === 'progress' && <ProgressView progress={progress} accountProgress={session ? accountProgress : null} mastery={session ? mastery : null} masteryMessage={session ? masteryMessage : ''} onPractice={scenarioId => { setActiveScenarioId(scenarioId); setScenarioChoice(null); setScenarioRevealed(false); setDojoResult(null); setDojoError(''); setView('practice'); }} />}
        </div>
        {authOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setAuthOpen(false); }}><section ref={authDialogRef} tabIndex={-1} className="lesson-modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="modal-top"><span className="modal-kicker"><LockKeyhole size={15} /> FREE LEARNER ACCOUNT</span><button className="icon-button" onClick={() => setAuthOpen(false)} aria-label="Close sign in"><X size={19} /></button></div><div className="modal-content"><div className="eyebrow small-eyebrow">{authMode === 'signin' ? 'WELCOME BACK' : 'START YOUR JOURNEY'}</div><h2 id="auth-title">{authMode === 'signin' ? 'Sign in to TradeQuest.' : 'Create your learner account.'}</h2><p>Account progress is separate from browser demo progress. Supabase Auth handles your password.</p>{!supabaseConfigured ? <p className="feedback" role="alert">Authentication is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your local environment.</p> : <form className="auth-form" onSubmit={handleAuthSubmit}><label className="field-label" htmlFor="auth-email">Email address</label><input id="auth-email" type="email" autoComplete="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} /><label className="field-label" htmlFor="auth-password">Password</label><input id="auth-password" type="password" autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required value={authPassword} onChange={e => setAuthPassword(e.target.value)} /><button className="btn-primary full-button" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={15} /></button></form>}{authMessage && <p className="feedback" role="status">{authMessage}</p>}<button className="text-link auth-switch" onClick={() => { setAuthMode(mode => mode === 'signin' ? 'signup' : 'signin'); setAuthMessage(''); }}>{authMode === 'signin' ? 'New to TradeQuest? Create an account' : 'Already registered? Sign in'}</button></div></section></div>}
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

function LearningView({ progress, onOpen, quizChoice, setQuizChoice, quizSubmitted, submitQuiz, quizResult, quizError, onRetryQuiz, accountMode }: {
  progress: Progress; onOpen: () => void; quizChoice: string | null;
  setQuizChoice: (s: string) => void; quizSubmitted: boolean; submitQuiz: () => void; quizResult: { score: number; passed: boolean; xpAwarded: number; idempotentReplay?: boolean } | null; quizError: string; onRetryQuiz: () => void; accountMode: boolean;
}) {
  return <><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> LEARN BY DOING</div><h1>Your learning <span>path.</span></h1><p>Short lessons, useful practice, and feedback that explains the why—not just the answer.</p></div>
    <div className="learning-layout"><div className="lesson-list">
      {lessons.map((lesson, i) => <div className={`lesson-row ${i === 0 ? 'lesson-row-current' : ''}`} key={lesson.title}><div className={`lesson-marker ${lesson.color}`}>{i === 0 && progress.lessonComplete ? <Check size={17} /> : lesson.done ? <Check size={17} /> : String(i + 1).padStart(2, '0')}</div><div className="lesson-row-copy"><span className="lesson-row-meta">{lesson.meta}</span><h3>{lesson.title}</h3><span className="lesson-row-status">{i === 0 && progress.lessonComplete ? 'Completed · revisit any time' : i === 0 ? 'Ready when you are' : 'Planned · not available in this prototype'}</span></div>{i === 0 ? <button className="btn-dark" onClick={onOpen}>{progress.lessonComplete ? 'Review' : 'Start'} <ArrowRight size={14} /></button> : <button className="btn-outline" disabled title="This lesson has not been implemented yet">Coming soon</button>}</div>)}
    </div><aside className="learning-aside"><div className="aside-card"><div className="aside-icon"><Target size={20} /></div><div className="eyebrow small-eyebrow">YOUR FIRST SKILL</div><h3>Understand the spread</h3><p>The difference between bid and ask is a real cost. Learn to spot it before thinking about profit.</p><div className="skill-meter"><span style={{ width: progress.quizCorrect ? '100%' : '15%' }} /></div><span className="skill-caption">{progress.quizCorrect ? 'Skill check passed' : 'Skill check not yet passed'}</span></div>
      <div className="quiz-card" id="quick-quiz"><div className="quiz-kicker"><Sparkles size={14} /> QUICK CHECK</div><h3>What does the spread represent?</h3>{[['commission','A fixed fee charged by the broker'],['spread','The difference between bid and ask'],['leverage','The amount borrowed to amplify exposure']].map(([id,label]) => <button key={id} className={`quiz-option ${quizChoice === id ? 'selected' : ''} ${progress.quizCorrect && id === 'spread' ? 'correct' : ''}`} onClick={() => setQuizChoice(id)}><span className="radio-dot">{quizChoice === id ? <span /> : null}</span>{label}</button>)}<button className="btn-primary full-button" onClick={submitQuiz} disabled={!quizChoice || quizSubmitted}>{quizSubmitted ? 'Answer checked' : 'Check answer'} <ArrowRight size={15} /></button>{quizSubmitted && quizChoice && <><p className={accountMode ? (quizResult?.passed ? 'feedback good' : 'feedback') : (assessSpreadAnswer(quizChoice)?.correct ? 'feedback good' : 'feedback')} role="status">{accountMode ? (quizError || (quizResult ? (quizResult.passed ? 'Server-checked: ' + quizResult.score + '%. You passed and earned ' + quizResult.xpAwarded + ' XP.' : 'Server-checked: ' + quizResult.score + '%. You need 80% to pass. Review the lesson and try again.') : 'Submitting your answer to the learning service…')) : assessSpreadAnswer(quizChoice)?.message}</p>{(accountMode ? Boolean(quizError || (quizResult && !quizResult.passed)) : assessSpreadAnswer(quizChoice)?.nextStep === 'retry') && <button className="btn-outline full-button" onClick={onRetryQuiz}>Try again</button>}</>}</div>
    </aside></div></>;
}

function PracticeView({ scenarios, activeScenarioId, onSelectScenario, catalogueMessage, choice, setChoice, revealed, onSubmit, result, error, busy, history }: {
  scenarios: DojoScenario[];
  activeScenarioId: string;
  onSelectScenario: (scenarioId: string) => void;
  catalogueMessage: string;
  choice: string | null;
  setChoice: (s: string) => void;
  revealed: boolean;
  onSubmit: (scenarioId: string, choice: string) => Promise<boolean>;
  result: { choiceId: string; outcome: string; feedback: string; xpAwarded: number } | null;
  error: string;
  busy: boolean;
  history: Array<{ attemptId: string; scenarioId?: string; scenarioVersion?: string; choiceId: string; outcome: string; feedback: string; submittedAt: string }>;
}) {
  const scenario = scenarios.find(item => item.scenarioId === activeScenarioId) ?? scenarios[0];
  async function reveal() { if (revealed || !choice || busy || !scenario) return; await onSubmit(scenario.scenarioId, choice); }
  if (!scenario) return <div className="data-notice" role="status"><div><strong>No scenarios available</strong><p>Sign in after the scenario catalogue migration is applied, or try the local demo.</p></div></div>;
  const kind = String(scenario.chartData.kind ?? '');
  const instrument = String(scenario.chartData.instrument ?? 'SYNTHETIC-ASSET');
  const timeframe = String(scenario.chartData.timeframe ?? '1H');
  const isOriginal = scenario.scenarioId === 'TQ-SYN-001';
  const plans = Array.isArray(scenario.chartData.plans) ? scenario.chartData.plans as Array<{ id: string; stopDistance: number; estimatedLoss: number }> : [];
  const outcomeTitle = result?.outcome === 'disciplined' ? 'A disciplined choice.'
    : result?.outcome === 'undefined-risk' ? 'Momentum is not a plan.'
    : result?.outcome === 'risk-aware' ? 'Risk stays within the plan.'
    : result?.outcome === 'risk-exceeded' ? 'The risk budget was exceeded.'
    : result?.outcome === 'evidence-led' ? 'Evidence before prediction.'
    : result?.outcome === 'impulsive' ? 'Avoid chasing a move.'
    : 'Review the reasoning.';
  const seenScenarioIds = new Set(history.map(item => item.scenarioId));
  const budgetPercent = Number(scenario.chartData.riskBudgetPercent ?? 0);
  const budgetLimit = Number(scenario.chartData.accountEquity ?? 0) * budgetPercent / 100;
  const choiceLabel = (id: string) => scenario.choices.find(option => option.id === id)?.label ?? id;
  return <><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> PRACTICE LAB · SYNTHETIC SCENARIOS</div><h1>Welcome to the <span>chart dojo.</span></h1><p>Slow down, read what is visible, make a plan, then choose your next step. No rush, no real money.</p></div>
    {catalogueMessage && <div className="data-notice" role="status"><div className="notice-icon"><CircleHelp size={17} /></div><div><strong>Using the built-in demo catalogue</strong><p>{catalogueMessage} The signed-in account can still submit the original scenario if migration 005 is available, but new scenarios require migration 006.</p></div></div>}
    <div className="dojo-scenario-picker" aria-label="Choose a practice scenario">
      <div><span className="eyebrow small-eyebrow">CHOOSE YOUR MISSION</span><h2>Practise good decisions in new situations</h2></div>
      <div className="dojo-scenario-tabs" role="group" aria-label="Available synthetic scenarios">
        {scenarios.map((item, index) => <button key={item.scenarioId + ':' + item.version} className={item.scenarioId === scenario.scenarioId ? 'dojo-scenario-tab active' : 'dojo-scenario-tab'} onClick={() => onSelectScenario(item.scenarioId)} aria-pressed={item.scenarioId === scenario.scenarioId}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.title}</strong>{history.length > 0 && <small>{seenScenarioIds.has(item.scenarioId) ? 'Practised' : 'New to you'}</small>}</button>)}
      </div>
    </div>
    <div className="practice-layout"><section className="chart-panel"><div className="chart-panel-head"><div><span className="chart-instrument">SYNTHETIC · TEACHING SCENARIO · VERSION {scenario.version}</span><h2>{isOriginal ? 'Gold / USD' : scenario.title} <span className="chart-symbol">{instrument} · SIMULATED</span></h2></div><span className="timeframe-chip">{timeframe} <ChevronDown size={13} /></span></div><div className="chart-legend"><span><i className="legend-dot green" /> Illustrative evidence</span><span><i className="legend-dot red" /> Risk or uncertainty</span><span className="chart-disclosure"><LockKeyhole size={12} /> Not live prices</span></div>
      {kind === 'illustrative-uptrend' ? <div className="chart-wrap"><CandleChart /></div> : kind === 'risk-budget-comparison' ? <div className="dojo-data-panel"><div className="dojo-data-heading"><strong>Hypothetical risk comparison</strong><span>Account £{Number(scenario.chartData.accountEquity ?? 0).toLocaleString('en-GB')} · Budget {String(scenario.chartData.riskBudgetPercent ?? '—')}%</span></div><div className="dojo-plan-grid">{plans.map(plan => <div className="dojo-plan-card" key={plan.id}><span>PLAN {plan.id}</span><strong>£{plan.estimatedLoss.toLocaleString('en-GB')}</strong><small>Illustrative loss at stop</small><div className={plan.estimatedLoss <= budgetLimit ? 'dojo-plan-status safe' : 'dojo-plan-status danger'}>{plan.estimatedLoss <= budgetLimit ? `Within ${budgetPercent}% budget` : `Above ${budgetPercent}% budget`}</div><small>Stop distance: {plan.stopDistance} illustrative units</small></div>)}</div><p className="dojo-data-disclaimer">These values are fictional teaching figures, not instrument specifications or trade instructions.</p></div> : <div className="dojo-data-panel dojo-context-panel"><div className="dojo-context-icon"><Activity size={25} /></div><span className="eyebrow small-eyebrow">WHAT WE KNOW</span><h3>{String(scenario.chartData.contextHeading ?? 'Movement is visible. Confirmation is not.')}</h3><p>{String(scenario.chartData.context ?? 'A move has occurred, but the scenario remains uncertain.')}</p><div className="dojo-context-track"><span /><span /><span /><span /><span /></div><small>Illustrative context only · no live prices</small></div>}
      <div className="chart-footer"><span>SCENARIO {scenario.scenarioId}</span><span>{String(scenario.chartData.disclosure ?? 'Synthetic teaching data')}</span></div></section>
      <aside className="scenario-panel"><div className="scenario-number">DECISION POINT {scenario.scenarioId.slice(-3)} <span>{isOriginal ? '+15 XP milestone' : 'PRACTICE'}</span></div><h2>{scenario.title}</h2><p>{scenario.prompt}</p><div className="scenario-rule"><ShieldCheck size={17} /><span><strong>Think risk-first</strong> — choose the process you can explain, not a prediction you hope will work.</span></div><div className="scenario-options">{scenario.choices.map(option => <button key={option.id} className={`scenario-option ${choice === option.id ? 'selected' : ''}`} onClick={() => setChoice(option.id)} disabled={busy || revealed}><span className="scenario-radio">{choice === option.id ? <span /> : null}</span>{option.label}</button>)}</div><button className="btn-primary full-button" onClick={reveal} disabled={!choice || revealed || busy}>{busy ? 'Saving answer…' : revealed ? 'Scenario revealed' : 'Reveal feedback'} <ArrowRight size={15} /></button>{error && <p className="feedback" role="alert">{error}</p>}{revealed && result && <div className="scenario-feedback" role="status"><CheckCircle2 size={18} /><div><strong>{outcomeTitle}</strong><p>{result.feedback}</p><span className="scenario-xp">{result.xpAwarded > 0 ? '+' + result.xpAwarded + ' XP earned' : 'Practice recorded · no repeat XP'}</span></div></div>}
      {history.length > 0 && <div className="dojo-history"><h3>Recent practice</h3>{history.slice(0, 5).map(item => <div className="dojo-history-row" key={item.attemptId}><span>{item.scenarioId ? (scenarios.find(s => s.scenarioId === item.scenarioId)?.title ?? item.scenarioId) : choiceLabel(item.choiceId)}</span><span>{item.outcome}</span><time>{new Date(item.submittedAt).toLocaleDateString()}</time></div>)}</div>}</aside>
    </div><div className="practice-disclaimer"><ShieldCheck size={17} /><span>Learning simulation only. All scenarios use synthetic teaching data and are not recommendations to buy or sell any asset.</span></div>
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

function ProgressView({ progress, accountProgress, mastery, masteryMessage, onPractice }: { progress: Progress; accountProgress: { xp: number; lessons_completed: string[]; events: string[] } | null; mastery: MasterySummary | null; masteryMessage: string; onPractice: (scenarioId: string) => void }) {
  const skills = [
    { title: 'Market foundations', description: 'Understand who buys and sells', complete: accountProgress ? accountProgress.events.includes('foundations-lesson-01') : progress.lessonComplete, icon: BookOpen },
    { title: 'Trading mechanics', description: 'Understand bid, ask, and spread', complete: accountProgress ? accountProgress.lessons_completed.includes('spread-basics') : progress.quizCorrect, icon: Activity },
    { title: 'Risk-first thinking', description: 'Estimate risk before a decision', complete: accountProgress ? accountProgress.events.includes('risk-tool-used-v1') : progress.riskToolUsed, icon: ShieldCheck },
    { title: 'Chart interpretation', description: 'Read a chart without predicting', complete: false, icon: BarChart3 },
  ];
  return <><div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> PROGRESS THAT MEANS SOMETHING</div><h1>Your skill <span>tree.</span></h1><p>Progress reflects practice you have completed—not a claim about future trading performance.</p></div>
    {accountProgress && <section className="panel mastery-panel" aria-labelledby="mastery-title"><div className="panel-heading"><div className="panel-heading-icon"><Target size={19} /></div><div><h2 id="mastery-title">Your next practice mission</h2><p>Recommendations are based on your practice history, not predictions about market outcomes.</p></div></div>
      {masteryMessage && <p className="feedback" role="status">{masteryMessage}</p>}
      {!mastery && !masteryMessage && <p role="status">Reviewing your recent practice…</p>}
      {mastery && <><div className="mastery-recommendation"><span className="tag tag-mint">{mastery.recommendation.reviewStatus === 'review-due' ? 'REVIEW DUE' : 'RECOMMENDED NEXT'}</span><h3>{mastery.recommendation.title}</h3><p>{mastery.recommendation.reason}</p><div className="mastery-meta"><span>{mastery.recommendation.attempts} attempt{mastery.recommendation.attempts === 1 ? '' : 's'} on this skill</span><span>{mastery.recommendation.confidence === 'not-enough-evidence' ? 'Low confidence · keep practising' : mastery.recommendation.confidence === 'early-signal' ? 'Early signal · retention not yet shown' : 'Building signal · positive delayed review'}</span>{mastery.recommendation.attempts > 0 && <span>{mastery.recommendation.isNewScenario ? 'A scenario you have not seen' : 'All scenarios seen · repeats test recall'}</span>}</div><button className="btn-primary" onClick={() => onPractice(mastery.recommendation.scenarioId)}>{mastery.recommendation.reviewStatus === 'review-due' ? 'Review this skill' : 'Practise this skill'} <ArrowRight size={15} /></button></div><div className="mastery-skill-list">{mastery.skills.map(skill => <div className="mastery-skill-row" key={skill.skillId}><div><strong>{skill.label}</strong><p>{skill.description}</p><small>{skill.reviewStatus === 'review-due' ? 'Review due' : skill.reviewStatus === 'recently-practised' ? 'Practised recently' : skill.reviewStatus === 'not-yet-practised' ? 'Not practised yet' : 'Practice date unavailable'} · {skill.retentionStatus === 'retained-after-review' ? 'Positive after delayed review' : skill.retentionStatus === 'needs-reinforcement' ? 'Delayed review needs reinforcement' : skill.retentionStatus === 'awaiting-delayed-review' ? 'Retention not yet checked' : skill.retentionStatus === 'date-unavailable' ? 'Retention date unavailable' : 'No practice yet'}</small></div><dl className="mastery-evidence"><div><dt>Recall · scenarios you have already seen</dt><dd>{describeEvidence(skill.recall)}</dd></div><div><dt>Application · scenarios new to you</dt><dd>{describeEvidence(skill.application)}</dd></div><div><dt>Transfer</dt><dd>{describeTransfer(skill.application)}</dd></div><div><dt>Coverage</dt><dd>{skill.distinctScenarios} of {skill.scenariosAvailable} scenarios tried · {skill.attempts} {skill.attempts === 1 ? 'attempt' : 'attempts'} in total</dd></div></dl></div>)}</div><div className="mastery-skill-list"><h3>Signals from other exercises</h3>{mastery.learningSignals.map(signal => <div className="mastery-skill-row" key={signal.signalId}><div><strong>{signal.label}</strong><p>{signal.description}</p></div><span>{signal.measure === 'milestone' ? (signal.attempts ? 'Used' : 'Not yet used') : signal.attempts + ' attempts · ' + (signal.successRate === null ? 'No signal yet' : signal.successRate + '% passed')}</span></div>)}</div><p className="form-footnote">{mastery.note} Small samples are not reliable measures of skill.</p></>}
    </section>}
    <div className="skill-tree-grid">{skills.map((skill, i) => { const Icon = skill.icon; return <div className={`skill-node ${skill.complete ? 'skill-complete' : ''}`} key={skill.title}><div className="skill-node-top"><div className="skill-node-icon"><Icon size={21} /></div><span className={skill.complete ? 'skill-state state-done' : 'skill-state'}>{skill.complete ? 'PRACTISED' : 'TO EXPLORE'}</span></div><h2>{skill.title}</h2><p>{skill.description}</p><div className="skill-node-bottom"><span>{skill.complete ? 'Evidence recorded' : `Skill ${String(i + 1).padStart(2, '0')}`}</span>{skill.complete ? <CheckCircle2 size={17} /> : <LockKeyhole size={15} />}</div></div>; })}</div><div className="data-notice"><div className="notice-icon"><Award size={17} /></div><div><strong>Mastery takes more than one lucky answer</strong><p>{accountProgress ? 'These milestones are loaded from your learner account. Mastery will require evidence across multiple unseen exercises.' : 'Demo milestones are stored in this browser. Sign in to save supported milestones to your learner account.'}</p></div></div></>;
}

function LessonModal({ onClose, onComplete, completed }: { onClose: () => void; onComplete: () => void; completed: boolean }) {
  const [step, setStep] = useState(0);
  const dialogRef = useModalFocus<HTMLElement>(true, onClose);
  const pages = [
    { kicker: 'THE BIG IDEA', title: 'Every market is a meeting place.', body: 'A market brings buyers and sellers together. A quoted price reflects the level where participants are currently willing to transact—not a promise about where price will go next.', example: 'Think of a busy marketplace. The highest price a buyer will pay and the lowest price a seller will accept can be different.' },
    { kicker: 'THE MECHANIC', title: 'A currency pair compares two currencies.', body: 'In EUR/USD, EUR is the base currency and USD is the quote currency. A price of 1.0800 means one euro is quoted at 1.08 US dollars. If the quote rises, the euro has strengthened relative to the dollar in that pair.', example: 'Pairs always have two sides. A price move is relative: it describes one currency against another.' },
    { kicker: 'THE TAKEAWAY', title: 'A direction is not a complete plan.', body: 'A chart can move either way, and even a well-reasoned idea can be wrong. Before evaluating a hypothetical trade, know what evidence supports it, what would invalidate it, and what loss you could tolerate.', example: 'The best next step can be to wait. Uncertainty is information—not a reason to rush.' },
  ];
  const page = pages[step];
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section ref={dialogRef} tabIndex={-1} className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-title"><div className="modal-top"><span className="modal-kicker"><BookOpen size={15} /> MISSION 01 · FOUNDATIONS</span><button className="icon-button" onClick={onClose} aria-label="Close lesson"><X size={19} /></button></div><div className="modal-progress">{pages.map((_, i) => <span key={i} className={i <= step ? 'active' : ''} />)}</div><div className="lesson-illustration"><div className="lesson-sun" /><div className="lesson-land land-one" /><div className="lesson-land land-two" /><div className="lesson-illustration-icon">{step === 0 ? <Compass size={28} /> : step === 1 ? <BarChart3 size={28} /> : <ShieldCheck size={28} />}</div></div><div className="modal-content"><div className="eyebrow small-eyebrow">{page.kicker}</div><h2 id="lesson-title">{page.title}</h2><p>{page.body}</p><div className="example-box"><Sparkles size={17} /><div><strong>Make it stick</strong><p>{page.example}</p></div></div><div className="modal-actions"><span className="step-count">0{step + 1} <span>/ 03</span></span>{step < pages.length - 1 ? <button className="btn-primary" onClick={() => setStep(s => s + 1)}>Next concept <ArrowRight size={15} /></button> : <button className="btn-primary" onClick={onComplete}>{completed ? 'Mark reviewed' : 'Complete mission'} <Check size={16} /></button>}</div></div></section></div>;
}

export default App;