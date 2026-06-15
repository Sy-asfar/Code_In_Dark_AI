import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
import { ArrowRight, CheckCircle2, LogIn, Shield, Sparkles, X } from 'lucide-react';

export default function Login() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('participant');
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const { currentUser, userRole, userProfile, completeProfile, joinCompetitionCode, refreshUserProfile, logout } = useAuth();
  const navigate = useNavigate();

  const needsCompetitionJoin = !!currentUser && userRole === 'participant' && !!userProfile && !userProfile?.competitionCode;
  const needsProfileSetup = !!currentUser && !userProfile;

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  useEffect(() => {
    if (userRole === 'admin') navigate('/admin');
    else if (userRole === 'participant' && userProfile?.competitionCode) navigate('/participant');
  }, [userRole, userProfile?.competitionCode, navigate]);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setError('');
    setSavingProfile(true);

    try {
      if (!name.trim()) {
        setError('Please enter your full name.');
        setSavingProfile(false);
        return;
      }

      await completeProfile({
        name: name.trim(),
        role,
        competitionCode: role === 'participant' ? joinCode.trim() : '',
      });

      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/participant');
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('competition-code-required')) {
        setError('Please enter the competition code from your admin.');
      } else if (msg.includes('invalid-competition-code')) {
        setError('That competition code does not exist. Check it with your admin.');
      } else if (msg.includes('name-required')) {
        setError('Please enter your full name.');
      } else {
        setError(`Failed to save your profile: ${msg}`);
      }
    }

    setSavingProfile(false);
  }

  async function handleJoinCompetition(e) {
    e.preventDefault();
    setError('');
    setJoinLoading(true);

    try {
      await joinCompetitionCode(joinCode);
      await refreshUserProfile();
      navigate('/participant');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('competition-code-required')) {
        setError('Please enter your competition code.');
      } else if (msg.includes('invalid-competition-code')) {
        setError('That competition code does not exist. Check it with your admin.');
      } else {
        setError(`Failed to join competition: ${msg}`);
      }
    }

    setJoinLoading(false);
  }

  const handleSignOut = async () => {
    setError('');
    await logout();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08080d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),_transparent_28%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:auto,_auto,_56px_56px,_56px_56px]" />
      <div className={`relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_24px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 text-slate-950 shadow-[0_0_35px_rgba(96,165,250,0.45)]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Code in the Dark</p>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Clerk auth + Firestore profiles</h1>
                </div>
              </div>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>

            <p className="max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Use Clerk for sign-in and sign-up, then save your role and competition profile into Firestore so the dashboards keep working the same way.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center gap-2 text-sky-300">
                  <LogIn size={16} />
                  <span className="text-sm font-semibold">Sign in</span>
                </div>
                <p className="text-sm text-slate-400">Use Clerk’s secure session flow for returning users.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center gap-2 text-violet-300">
                  <Shield size={16} />
                  <span className="text-sm font-semibold">Profile sync</span>
                </div>
                <p className="text-sm text-slate-400">Store name, role, and competition code in Firestore on first login.</p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <p>
                  Signed in users without a Firestore profile will see the onboarding form on the right. Participants can join a room there before being routed to the dashboard.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#0f1118]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-8">
            <SignedOut>
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Authentication</p>
                <h2 className="mt-2 text-2xl font-bold">Choose how to continue</h2>
                <p className="mt-2 text-sm text-slate-400">Clerk will handle the sign-in and sign-up flow, then we’ll bridge you into Firestore.</p>
              </div>

              <div className="space-y-3">
                <SignInButton mode="modal" forceRedirectUrl="/" fallbackRedirectUrl="/">
                  <button type="button" className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3.5 font-semibold text-slate-950 transition-transform hover:-translate-y-0.5">
                    <LogIn size={16} />
                    Sign in with Clerk
                  </button>
                </SignInButton>

                <SignUpButton mode="modal" forceRedirectUrl="/" fallbackRedirectUrl="/">
                  <button type="button" className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 font-semibold text-white transition-colors hover:border-white/20 hover:bg-white/8">
                    <ArrowRight size={16} />
                    Create a Clerk account
                  </button>
                </SignUpButton>
              </div>
            </SignedOut>

            <SignedIn>
              {needsCompetitionJoin ? (
                <form onSubmit={handleJoinCompetition} className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Participant setup</p>
                    <h2 className="mt-2 text-2xl font-bold">Join your competition</h2>
                    <p className="mt-2 text-sm text-slate-400">Your Clerk account is ready. Add the competition code from your admin to enter the room.</p>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Competition Code</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="CITD-XXXX"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 pr-11 uppercase tracking-wider text-white placeholder:text-slate-600 focus:border-sky-400/60 focus:outline-none"
                      />
                      {joinCode && (
                        <button
                          type="button"
                          onClick={() => setJoinCode('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                          aria-label="Clear competition code"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={joinLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-3.5 font-bold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {joinLoading ? 'Joining...' : 'Join competition'}
                  </button>

                  <button type="button" onClick={handleSignOut} className="w-full text-sm text-slate-400 transition-colors hover:text-white">
                    Sign out
                  </button>
                </form>
              ) : needsProfileSetup ? (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Complete profile</p>
                    <h2 className="mt-2 text-2xl font-bold">Set your competition role</h2>
                    <p className="mt-2 text-sm text-slate-400">We already know your Clerk account. Add your name and role so Firestore can bridge you into the app.</p>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Full name</label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder:text-slate-600 focus:border-sky-400/60 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Role</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole('participant')}
                        className={`rounded-2xl border px-4 py-4 text-left transition-colors ${role === 'participant' ? 'border-sky-400/60 bg-sky-400/10 text-sky-200' : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'}`}
                      >
                        <div className="text-sm font-semibold">Participant</div>
                        <div className="mt-1 text-xs text-current/70">Compete and submit code</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('admin')}
                        className={`rounded-2xl border px-4 py-4 text-left transition-colors ${role === 'admin' ? 'border-violet-400/60 bg-violet-400/10 text-violet-200' : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'}`}
                      >
                        <div className="text-sm font-semibold">Admin</div>
                        <div className="mt-1 text-xs text-current/70">Create and manage contests</div>
                      </button>
                    </div>
                  </div>

                  <div className={`transition-all duration-300 ${role === 'participant' ? 'max-h-28 opacity-100' : 'max-h-0 overflow-hidden opacity-0'}`}>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Competition Code</label>
                    <input
                      type="text"
                      placeholder="Enter the code from your admin"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 uppercase tracking-wider text-white placeholder:text-slate-600 focus:border-sky-400/60 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-3.5 font-bold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? 'Saving profile...' : 'Save profile'}
                  </button>

                  <button type="button" onClick={handleSignOut} className="w-full text-sm text-slate-400 transition-colors hover:text-white">
                    Sign out
                  </button>
                </form>
              ) : (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
                  <div>
                    <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    <p className="text-sm text-slate-400">Loading your Clerk session and Firestore profile...</p>
                  </div>
                </div>
              )}
            </SignedIn>
          </section>
        </div>
      </div>
    </div>
  );
}
