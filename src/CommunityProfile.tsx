import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Globe2, LockKeyhole, Save, ShieldCheck, Trash2, Users } from 'lucide-react';

type Profile = { handle: string; displayName: string; bio: string; isPublic: boolean; updatedAt?: string };
type PublicProfile = { handle: string; displayName: string; bio: string; updatedAt: string };
const apiBase = () => import.meta.env.VITE_TRADEQUEST_API_URL || 'http://localhost:4000';
const blankProfile: Profile = { handle: '', displayName: '', bio: '', isPublic: false };

export default function CommunityProfile({ session, onSignIn }: { session: Session | null; onSignIn: () => void }) {
  const [profile, setProfile] = useState<Profile>(blankProfile);
  const [publicProfiles, setPublicProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError('');
      setMessage('');
      setProfile(blankProfile);
      setPublicProfiles([]);
      if (!session) return;
      setLoading(true);
      try {
        const headers = { Authorization: 'Bearer ' + session.access_token };
        const [mineResponse, directoryResponse] = await Promise.all([
          fetch(apiBase() + '/v1/community/profile', { headers, cache: 'no-store' }),
          fetch(apiBase() + '/v1/community/profiles', { headers, cache: 'no-store' }),
        ]);
        const mine = await mineResponse.json() as { profile?: Profile | null; error?: string };
        const directory = await directoryResponse.json() as { profiles?: PublicProfile[]; error?: string };
        if (!mineResponse.ok) throw new Error(mine.error || 'Your profile could not be loaded.');
        if (!directoryResponse.ok) throw new Error(directory.error || 'The community directory could not be loaded.');
        if (cancelled) return;
        setProfile(mine.profile ?? blankProfile);
        setPublicProfiles(Array.isArray(directory.profiles) ? directory.profiles : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Community profiles could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [session]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(apiBase() + '/v1/community/profile', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: profile.handle.trim(), displayName: profile.displayName.trim(), bio: profile.bio.trim(), isPublic: profile.isPublic }),
      });
      const body = await response.json() as { profile?: Profile; error?: string };
      if (!response.ok || !body.profile) throw new Error(body.error || 'Your profile could not be saved.');
      setProfile(body.profile);
      setMessage(body.profile.isPublic ? 'Your profile is now visible to signed-in learners.' : 'Your profile is saved privately.');
      const directoryResponse = await fetch(apiBase() + '/v1/community/profiles', { headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store' });
      const directory = await directoryResponse.json() as { profiles?: PublicProfile[] };
      if (directoryResponse.ok) setPublicProfiles(Array.isArray(directory.profiles) ? directory.profiles : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your profile could not be saved.');
    } finally { setSaving(false); }
  }

  async function removeProfile() {
    if (!session || !window.confirm('Delete your community profile? This removes your handle and bio from the directory. Your learning records remain unchanged.')) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(apiBase() + '/v1/community/profile', { method: 'DELETE', headers: { Authorization: 'Bearer ' + session.access_token } });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        throw new Error(body.error || 'Your profile could not be deleted.');
      }
      setProfile(blankProfile);
      setMessage('Community profile deleted. Your learning records were not changed.');
      const directoryResponse = await fetch(apiBase() + '/v1/community/profiles', { headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store' });
      const directory = await directoryResponse.json() as { profiles?: PublicProfile[] };
      if (directoryResponse.ok) setPublicProfiles(Array.isArray(directory.profiles) ? directory.profiles : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your profile could not be deleted.');
    } finally { setSaving(false); }
  }

  return <>
    <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> COMMUNITY · PRIVACY FIRST</div><h1>Join the community, <span>on your terms.</span></h1><p>Create an optional learner profile. Your learning progress, decision journal, account details, virtual balances and trading history are never included in the public profile.</p></div>
    {!session ? <section className="panel community-gate"><div className="community-icon"><LockKeyhole size={22}/></div><h2>Profiles are opt-in</h2><p>Sign in to create a private profile or choose what other signed-in learners can see.</p><button className="btn-primary" onClick={onSignIn}>Sign in to manage profile</button></section> : <>
      {error && <div className="data-notice" role="alert"><ShieldCheck size={17}/><div><strong>Community profile</strong><p>{error}</p></div></div>}
      {message && <div className="data-notice" role="status"><ShieldCheck size={17}/><div><strong>Saved</strong><p>{message}</p></div></div>}
      <div className="community-layout">
        <section className="panel community-editor">
          <div className="community-section-heading"><div className="community-icon"><Users size={20}/></div><div><h2>Your learner profile</h2><p>Private until you explicitly opt in.</p></div></div>
          {loading ? <p role="status">Loading your profile…</p> : <form onSubmit={save}>
            <label className="community-label" htmlFor="community-handle">Public handle</label>
            <div className="community-handle-wrap"><span>@</span><input id="community-handle" className="community-input" value={profile.handle} onChange={e => setProfile(p => ({...p, handle: e.target.value.toLowerCase()}))} minLength={3} maxLength={20} pattern="[a-z0-9][a-z0-9_-]{2,19}" autoComplete="off" required aria-describedby="community-handle-help"/></div>
            <p className="community-help" id="community-handle-help">3–20 lowercase letters, numbers, underscores or hyphens. Handles are unique.</p>
            <label className="community-label" htmlFor="community-display-name">Display name</label>
            <input id="community-display-name" className="community-input" value={profile.displayName} onChange={e => setProfile(p => ({...p, displayName: e.target.value}))} minLength={2} maxLength={40} required autoComplete="nickname"/>
            <label className="community-label" htmlFor="community-bio">Short bio <span>(optional)</span></label>
            <textarea id="community-bio" className="community-input community-textarea" value={profile.bio} onChange={e => setProfile(p => ({...p, bio: e.target.value}))} maxLength={280} rows={4} aria-describedby="community-bio-help"/>
            <p className="community-help" id="community-bio-help">{profile.bio.length}/280 characters. Do not include contact details or sensitive information.</p>
            <label className="community-visibility">
              <input type="checkbox" checked={profile.isPublic} onChange={e => setProfile(p => ({...p, isPublic: e.target.checked}))}/>
              <span><strong>Make my profile visible to signed-in learners</strong><small>Only your handle, display name and bio are shown. You can switch this off or delete your profile at any time.</small></span>
            </label>
            <div className="community-privacy-note">{profile.isPublic ? <Globe2 size={17}/> : <LockKeyhole size={17}/>}<span>{profile.isPublic ? 'Public profile selected. Save to publish these fields.' : 'Private profile selected. Other learners cannot see your profile.'}</span></div>
            <div className="community-actions"><button className="btn-primary" type="submit" disabled={saving || loading}><Save size={15}/>{saving ? 'Saving…' : 'Save profile'}</button><button className="btn-outline" type="button" disabled={saving || loading || !profile.handle} onClick={() => void removeProfile()}><Trash2 size={15}/>Delete profile</button></div>
          </form>}
        </section>
        <section className="community-directory">
          <div className="community-section-heading"><div className="community-icon"><Globe2 size={20}/></div><div><h2>Community directory</h2><p>Only profiles explicitly made public appear here.</p></div></div>
          {loading ? <div className="panel" role="status">Loading directory…</div> : publicProfiles.length === 0 ? <div className="community-empty"><Users size={24}/><h3>No public profiles yet</h3><p>Profiles stay private unless a learner chooses to publish them.</p></div> : <div className="community-profile-list">{publicProfiles.map(item => <article className="panel community-profile-card" key={item.handle}><div className="community-avatar">{item.displayName.slice(0,1).toUpperCase()}</div><div><h3>{item.displayName}</h3><span className="community-handle">@{item.handle}</span>{item.bio && <p>{item.bio}</p>}</div></article>)}</div>}
          <div className="data-notice community-data-note"><ShieldCheck size={17}/><div><strong>Privacy boundary</strong><p>No public progress scores, balances, journals, contact details, direct messages or leaderboards are exposed by this feature.</p></div></div>
        </section>
      </div>
    </>}
  </>;
}
