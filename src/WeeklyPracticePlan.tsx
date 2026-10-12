import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Download, ShieldCheck, Target, Upload, Trash2 } from 'lucide-react';
import { downloadLearningExport } from './learningExport';
import { parseLearningImport, restoreLearningImport, type LearningImport } from './learningImport';
import { clearLocalLearningData } from './learningDataControls';
import type { Session } from '@supabase/supabase-js';
export type WeeklyPlan = { week:string; target:number; completedDates:string[] };
const storageKey='tradequest-weekly-practice-plan-v1';
export function weekKey(date:Date):string { const copy=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));const day=copy.getUTCDay()||7;copy.setUTCDate(copy.getUTCDate()-day+1);return copy.toISOString().slice(0,10); }
export function normaliseWeeklyPlan(value:unknown,currentWeek:string):WeeklyPlan {
 const fallback:WeeklyPlan={week:currentWeek,target:3,completedDates:[]};if(!value||typeof value!=='object')return fallback;
 const candidate=value as Partial<WeeklyPlan>;if(candidate.week!==currentWeek)return fallback;const target=candidate.target;if(typeof target!=='number'||![3,5,7].includes(target))return fallback;
 const completedDates=Array.isArray(candidate.completedDates)?[...new Set(candidate.completedDates.filter((date):date is string=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)))].slice(0,7):[];
 return {week:currentWeek,target,completedDates};
}
function readPlan(currentWeek:string):WeeklyPlan {try{return normaliseWeeklyPlan(JSON.parse(localStorage.getItem(storageKey)??'null'),currentWeek);}catch{return normaliseWeeklyPlan(null,currentWeek);}}
export default function WeeklyPracticePlan({ session }: { session: Session | null }){
 const currentWeek=useMemo(()=>weekKey(new Date()),[]);const [plan,setPlan]=useState<WeeklyPlan>(()=>readPlan(currentWeek));const [saved,setSaved]=useState(false); const [planLoading,setPlanLoading]=useState(Boolean(session)); const [planBusy,setPlanBusy]=useState(false); const [planError,setPlanError]=useState(''); const [planReloadKey,setPlanReloadKey]=useState(0);
 const [accountExportBusy,setAccountExportBusy]=useState(false); const [accountExportError,setAccountExportError]=useState(''); const [accountExportMessage,setAccountExportMessage]=useState('');
 const [deleteDataConfirmation,setDeleteDataConfirmation]=useState(''); const [deleteDataBusy,setDeleteDataBusy]=useState(false); const [deleteDataError,setDeleteDataError]=useState(''); const [deleteDataMessage,setDeleteDataMessage]=useState('');
 useEffect(()=>{setDeleteDataConfirmation('');setDeleteDataError('');setDeleteDataMessage('');setAccountExportError('');setAccountExportMessage('');},[session?.access_token]);
 useEffect(()=>{
  let active=true;
  if(!session){
   setPlan(readPlan(currentWeek));setSaved(false);setPlanLoading(false);setPlanError('');
   return ()=>{active=false;};
  }
  setPlan({week:currentWeek,target:3,completedDates:[]});setPlanLoading(true);setPlanError('');
  const url=(import.meta.env.VITE_TRADEQUEST_API_URL||'http://localhost:4000')+'/v1/weekly-plan?weekStart='+encodeURIComponent(currentWeek);
  fetch(url,{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'})
   .then(async response=>{
    const body=await response.json() as {plan?:unknown;error?:string};
    if(!response.ok||!body.plan)throw new Error(body.error||'Your account-backed weekly plan could not be loaded. Apply the weekly plan migration, then retry.');
    if(active){setPlan(normaliseWeeklyPlan(body.plan,currentWeek));setSaved(true);}
   })
   .catch(error=>{if(active){setPlanError(error instanceof Error?error.message:'Your weekly plan could not be loaded.');setSaved(false);}})
   .finally(()=>{if(active)setPlanLoading(false);});
  return ()=>{active=false;};
 },[session?.access_token,currentWeek,planReloadKey]);
 const [pendingImport,setPendingImport]=useState<LearningImport|null>(null);const [importError,setImportError]=useState('');const [importMessage,setImportMessage]=useState(''); const [clearConfirm,setClearConfirm]=useState(false); const [clearMessage,setClearMessage]=useState('');
 const today=new Date().toISOString().slice(0,10);const complete=plan.completedDates.includes(today);const progress=Math.min(100,Math.round((plan.completedDates.length/plan.target)*100));
 async function persist(next:WeeklyPlan){
  if(planBusy||planLoading)return;
  if(!session){
   setPlan(next);setSaved(false);setPlanError('');
   try{localStorage.setItem(storageKey,JSON.stringify(next));setSaved(true);}catch{setSaved(false);}
   return;
  }
  setPlanBusy(true);setPlanError('');setSaved(false);
  const apiBase=import.meta.env.VITE_TRADEQUEST_API_URL||'http://localhost:4000';
  const headers={'Content-Type':'application/json',Authorization:'Bearer '+session.access_token};
  const send=async(path:string,body:Record<string,unknown>)=>{
   const response=await fetch(apiBase+path,{method:'PUT',headers,cache:'no-store',body:JSON.stringify(body)});
   const result=await response.json() as {plan?:unknown;error?:string};
   if(!response.ok||!result.plan)throw new Error(result.error||'Your weekly plan could not be saved.');
   return normaliseWeeklyPlan(result.plan,currentWeek);
  };
  try{
   let savedPlan:WeeklyPlan=next;
   if(next.target!==plan.target)savedPlan=await send('/v1/weekly-plan',{weekStart:currentWeek,target:next.target});
   const changedDates=[...new Set([...plan.completedDates,...next.completedDates])].filter(date=>plan.completedDates.includes(date)!==next.completedDates.includes(date));
   for(const sessionDate of changedDates)savedPlan=await send('/v1/weekly-plan/session',{weekStart:currentWeek,sessionDate,completed:next.completedDates.includes(sessionDate)});
   setPlan(savedPlan);setSaved(true);
  }catch(error){setPlanError(error instanceof Error?error.message:'Your weekly plan could not be saved.');setSaved(false);}
  finally{setPlanBusy(false);}
 }
 async function selectImport(file?:File){setPendingImport(null);setImportError('');setImportMessage('');if(!file)return;try{setPendingImport(parseLearningImport(await file.text()));}catch(error){setImportError(error instanceof Error?error.message:'Could not read this learning export.');}}
 function confirmClearLocalData(){const removed=clearLocalLearningData(localStorage);if(!session){setPlan({week:currentWeek,target:3,completedDates:[]});setSaved(false);}setPendingImport(null);setImportError('');setImportMessage('');setClearConfirm(false);setClearMessage(removed===3?(session?'Browser-local learning records cleared. Your account-saved weekly plan was not changed.':'Browser-local learning records cleared. Account data and unrelated browser storage were not changed.'):'Some local records could not be removed by this browser.');}
 async function downloadAccountExport(){
  if(!session||accountExportBusy)return;
  setAccountExportBusy(true);setAccountExportError('');setAccountExportMessage('');
  try{
   const response=await fetch((import.meta.env.VITE_TRADEQUEST_API_URL||'http://localhost:4000')+'/v1/me/export',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
   if(!response.ok){let message='Account learning data could not be exported.';try{const body=await response.json() as {error?:string};message=body.error||message;}catch{/* Keep the safe generic message. */}throw new Error(message);}
   const blob=await response.blob();const url=URL.createObjectURL(blob);const anchor=document.createElement('a');
   anchor.href=url;anchor.download='tradequest-account-learning-export-'+new Date().toISOString().slice(0,10)+'.json';anchor.click();URL.revokeObjectURL(url);
   setAccountExportMessage('Account learning data export prepared. Check your downloads folder.');
  }catch(error){setAccountExportError(error instanceof Error?error.message:'Account learning data could not be exported.');}
  finally{setAccountExportBusy(false);}
 }
 async function deleteAccountLearningData(){
  if(!session||deleteDataBusy||deleteDataConfirmation!=='DELETE_MY_LEARNING_DATA')return;
  setDeleteDataBusy(true);setDeleteDataError('');setDeleteDataMessage('');
  try{
   const response=await fetch((import.meta.env.VITE_TRADEQUEST_API_URL||'http://localhost:4000')+'/v1/me/delete-learning-data',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},cache:'no-store',
    body:JSON.stringify({confirmation:'DELETE_MY_LEARNING_DATA'})
   });
   const body=await response.json() as {deleted?:Record<string,number>;error?:string};
   if(!response.ok)throw new Error(body.error||'Saved learning data could not be deleted.');
   const count=Object.values(body.deleted??{}).reduce((total,value)=>total+(Number.isFinite(value)?value:0),0);
   setDeleteDataMessage('Deleted '+count+' saved learning record(s). Your sign-in remains active. Browser-local records were not changed; refresh the app to clear any account progress already displayed.');
   setDeleteDataConfirmation('');
  }catch(error){setDeleteDataError(error instanceof Error?error.message:'Saved learning data could not be deleted.');}
  finally{setDeleteDataBusy(false);}
 }
 function confirmImport(){if(!pendingImport)return;try{const restored=restoreLearningImport(pendingImport,(key,value)=>localStorage.setItem(key,value));if(!session){setPlan(readPlan(currentWeek));setSaved(true);}setImportMessage(`Restored ${restored.length} browser-local learning record categories. Account-saved data was not changed.`);setPendingImport(null);}catch{setImportError('The browser could not save the imported data. Check available storage and try again.');}}
 return <div className="weekly-plan-page">
 <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line"/> CONSISTENCY OVER INTENSITY</div><h1>A plan you can <span>keep.</span></h1><p>Set a realistic weekly learning target, practise in short sessions, and review what you learned. This tracks learning activity—not trading skill or future results.</p></div>
 <section className="panel weekly-plan-card"><div className="weekly-plan-heading"><div className="weekly-plan-icon"><CalendarDays size={22}/></div><div><div className="eyebrow">THIS WEEK</div><h2>Your practice commitment</h2><p>Choose a target that fits your week. You can change it at any time.</p></div></div>
 <div className="weekly-target-options" role="group" aria-label="Weekly practice target">{[3,5,7].map(target=><button key={target} className={plan.target===target?'weekly-target selected':'weekly-target'} aria-pressed={plan.target===target} disabled={planBusy||planLoading} onClick={()=>void persist({...plan,target})}><strong>{target}</strong><span>sessions</span><small>{target===3?'A gentle start':target===5?'Steady rhythm':'Frequent practice'}</small></button>)}</div>
 <div className="weekly-progress-label"><span>Sessions recorded</span><strong>{plan.completedDates.length} of {plan.target}</strong></div><div className="weekly-progress-track" role="progressbar" aria-label="Weekly practice progress" aria-valuemin={0} aria-valuemax={plan.target} aria-valuenow={Math.min(plan.completedDates.length,plan.target)}><span style={{width:progress+'%'}}/></div>
 <div className="weekly-plan-actions"><button className="btn-primary" disabled={complete||planBusy||planLoading} onClick={()=>void persist({...plan,completedDates:[...plan.completedDates,today]})}>{complete?<><CheckCircle2 size={16}/> Session recorded today</>:<><Target size={16}/> Record today’s session</>}</button>{complete&&<button className="btn-outline" disabled={planBusy||planLoading} onClick={()=>void persist({...plan,completedDates:plan.completedDates.filter(date=>date!==today)})}>Undo today</button>}</div>
 {session&&planLoading&&<p className="form-footnote" role="status">Loading your account-backed weekly plan…</p>}{planBusy&&<p className="form-footnote" role="status">Syncing your weekly plan…</p>}{planError&&<div className="weekly-import-error" role="alert"><p>{planError}</p><button className="btn-outline" type="button" onClick={()=>setPlanReloadKey(value=>value+1)} disabled={planLoading}>Retry account sync</button></div>}
 <div className="weekly-export-row"><button className="btn-outline" onClick={()=>downloadLearningExport(key=>localStorage.getItem(key))}><Download size={16}/> Export browser-local learning data</button><p className="form-footnote">Exports the local practice plan, adaptive practice attempts, and demo journal entries as JSON. Server-stored account data is not included.</p></div>
 <div className="weekly-import-panel"><h3><Download size={16}/> Export account-saved learning data</h3>{session?<><p className="form-footnote">Download server-saved progress, quiz and Chart Dojo attempts, private journal entries, and saved synthetic paper-trade sessions. This export excludes passwords, authentication tokens, and browser-local records.</p><button className="btn-outline" onClick={()=>void downloadAccountExport()} disabled={accountExportBusy}>{accountExportBusy?'Preparing account export…':'Export my account data'}</button>{accountExportError&&<p className="weekly-import-error" role="alert">{accountExportError}</p>}{accountExportMessage&&<p className="weekly-import-success" role="status">{accountExportMessage}</p>}</>:<p className="form-footnote">Sign in to export server-saved account data. Browser-local practice records are exported separately above.</p>}</div>
 <div className="weekly-import-panel"><h3><Trash2 size={16}/> Delete saved account learning data</h3>{session?<><p className="form-footnote">Permanently delete server-saved progress, lesson and Chart Dojo attempts, private journal entries, and saved paper-trade sessions from this account. Your sign-in remains active. This does not delete browser-local records; clear those separately above. Export your data first if you may want a copy.</p><label className="field-label" htmlFor="delete-learning-data-confirmation">Type DELETE_MY_LEARNING_DATA to confirm</label><input id="delete-learning-data-confirmation" className="journal-input" autoComplete="off" spellCheck={false} value={deleteDataConfirmation} onChange={event=>setDeleteDataConfirmation(event.target.value)} /><button className="btn-outline" type="button" onClick={()=>void deleteAccountLearningData()} disabled={deleteDataBusy||deleteDataConfirmation!=='DELETE_MY_LEARNING_DATA'}>{deleteDataBusy?'Deleting saved data…':'Delete saved account data'}</button>{deleteDataError&&<p className="weekly-import-error" role="alert">{deleteDataError}</p>}{deleteDataMessage&&<p className="weekly-import-success" role="status">{deleteDataMessage}</p>}</>:<p className="form-footnote">Sign in to delete server-saved learning data. Browser-local records can be cleared separately above.</p>}</div>
 <div className="weekly-import-panel"><h3><Upload size={16}/> Restore a learning export</h3><p className="form-footnote">Choose a TradeQuest JSON export to restore browser-local learning records. Server-stored account data is not included.</p><label className="weekly-import-file">Choose JSON export<input type="file" accept=".json,application/json" onChange={event=>void selectImport(event.currentTarget.files?.[0])}/></label>
 {pendingImport&&<div className="weekly-import-preview" role="status"><strong>Ready to restore</strong><p>Exported {pendingImport.exportedAt}. {Object.keys(pendingImport.data).length} record categories found.</p><p>This will replace existing local records only for categories present in the file. Other browser data and account data will not be changed.</p><div className="weekly-plan-actions"><button className="btn-primary" onClick={confirmImport}>Replace selected local records</button><button className="btn-outline" onClick={()=>setPendingImport(null)}>Cancel</button></div></div>}
 {importError&&<p className="weekly-import-error" role="alert">{importError}</p>}{importMessage&&<p className="weekly-import-success" role="status">{importMessage}</p>}</div>
 <div className="weekly-import-panel"><h3><Trash2 size={16}/> Clear browser-local learning data</h3><p className="form-footnote">Remove the local weekly plan, adaptive practice history, and demo journal entries from this browser. This does not delete account-saved journal entries or unrelated browser data.</p>{!clearConfirm?<button className="btn-outline" onClick={()=>{setClearConfirm(true);setClearMessage('');}}>Review local data deletion</button>:<div className="weekly-import-preview" role="alert"><strong>Clear three local learning record categories?</strong><p>This cannot be undone unless you exported your data first.</p><div className="weekly-plan-actions"><button className="btn-primary" onClick={confirmClearLocalData}>Clear local learning data</button><button className="btn-outline" onClick={()=>setClearConfirm(false)}>Cancel</button></div></div>}{clearMessage&&<p className="weekly-import-error" role="status">{clearMessage}</p>}</div>
 <p className="form-footnote" role="status">{session?(saved?'Synced to your learner account.':'Your account plan has not synced yet.'):saved?'Saved on this device.':'Your plan is stored only in this browser. Clearing browser data removes it.'} Sessions are self-recorded; TradeQuest does not verify time spent.</p></section>
 <section className="panel weekly-plan-checklist"><div className="weekly-plan-heading"><div className="weekly-plan-icon"><ShieldCheck size={22}/></div><div><h2>A useful 10-minute session</h2><p>Use a simple routine rather than chasing a score.</p></div></div><ul><li><Circle size={17}/><span><strong>Choose one skill</strong><small>Use Adaptive Practice or the Spaced Review Queue to pick a topic.</small></span></li><li><Circle size={17}/><span><strong>Explain the decision</strong><small>State the evidence, invalidation condition, and risk limit in your own words.</small></span></li><li><Circle size={17}/><span><strong>Reflect honestly</strong><small>Record one lesson in your private Decision Journal, including when passing is appropriate.</small></span></li></ul><div className="weekly-plan-note"><CheckCircle2 size={17}/><span>A skipped session is not a failure. Keep the target realistic and focus on deliberate practice.</span></div></section>
 <p className="weekly-plan-footnote">Educational tool only. Synthetic exercises do not predict real-world trading performance. No live market data, broker connection, or trade execution is used.</p></div>;
}