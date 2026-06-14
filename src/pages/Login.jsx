import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

// Animated background floating code elements
const FloatingTag = ({ style, children }) => (
  <div
    className="absolute text-white/[0.04] font-mono font-bold select-none pointer-events-none animate-float"
    style={style}
  >
    {children}
  </div>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('participant');
  const [competitionCode, setCompetitionCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { login, signup, currentUser, userRole, userProfile, joinCompetitionCode, refreshUserProfile } = useAuth();
  const navigate = useNavigate();

  const needsCompetitionJoin = !!currentUser && userRole === 'participant' && !userProfile?.competitionCode;

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setMounted(true), 50);
  }, []);

  useEffect(() => {
    if (userRole === 'admin') navigate('/admin');
    else if (userRole === 'participant' && userProfile?.competitionCode) navigate('/participant');
  }, [userRole, userProfile?.competitionCode, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (role === 'participant' && !competitionCode.trim()) {
          setError('Please enter the competition code from your admin.');
          setLoading(false);
          return;
        }
        await signup(email, password, name.trim(), role, competitionCode.trim());
      }
      // Navigation handled by useEffect above watching userRole
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.includes('weak-password')) {
        setError('Password must be at least 6 characters long.');
      } else {
        setError(`Failed to ${isLogin ? 'sign in' : 'sign up'}: ` + msg);
      }
    }
    setLoading(false);
  }

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setName('');
    setRole('participant');
    setCompetitionCode('');
  };

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

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-[#0a0a0f]">

      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Radial glow spots */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* Floating code snippets */}
      <FloatingTag style={{ top: '8%', left: '5%', fontSize: '3rem', animationDuration: '18s' }}>{'</>'}</FloatingTag>
      <FloatingTag style={{ top: '15%', right: '8%', fontSize: '2.5rem', animationDuration: '22s', animationDelay: '3s' }}>{'{ }'}</FloatingTag>
      <FloatingTag style={{ bottom: '20%', left: '8%', fontSize: '2rem', animationDuration: '25s', animationDelay: '5s' }}>{'<div>'}</FloatingTag>
      <FloatingTag style={{ bottom: '10%', right: '12%', fontSize: '1.5rem', animationDuration: '20s', animationDelay: '1s' }}>{'#id { }'}</FloatingTag>
      <FloatingTag style={{ top: '45%', left: '2%', fontSize: '1.8rem', animationDuration: '30s', animationDelay: '7s' }}>{'@keyframes'}</FloatingTag>
      <FloatingTag style={{ top: '30%', right: '3%', fontSize: '2rem', animationDuration: '28s', animationDelay: '4s' }}>{'display: flex'}</FloatingTag>
      <FloatingTag style={{ top: '70%', left: '18%', fontSize: '1.5rem', animationDuration: '24s', animationDelay: '9s' }}>{'import { }'}</FloatingTag>
      <FloatingTag style={{ bottom: '35%', right: '18%', fontSize: '1.8rem', animationDuration: '26s', animationDelay: '6s' }}>{'async/await'}</FloatingTag>

      {/* Login Card */}
      <div
        className={`relative z-10 w-full max-w-md transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Glow border wrapper */}
        <div className="p-[1px] rounded-2xl bg-gradient-to-br from-blue-500/40 via-violet-500/20 to-blue-500/10 shadow-[0_0_60px_rgba(59,130,246,0.15)]">
          <div className="rounded-2xl bg-[#111118]/95 backdrop-blur-xl px-8 py-10">

            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-400 font-mono font-bold text-3xl drop-shadow-[0_0_12px_rgba(59,130,246,0.8)]">{'<'}</span>
                <div className="flex flex-col items-center leading-none">
                  <span className="text-white font-extrabold text-xl tracking-tight">CODE IN THE</span>
                  <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent font-extrabold text-xl tracking-widest">DARK</span>
                </div>
                <span className="text-violet-400 font-mono font-bold text-3xl drop-shadow-[0_0_12px_rgba(139,92,246,0.8)]">{'/>'}</span>
              </div>
              <p className="text-gray-500 text-xs tracking-widest uppercase">Frontend Challenge Platform</p>
            </div>

            {!needsCompetitionJoin && (
              <div className="flex mb-8 bg-white/5 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    isLogin
                      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    !isLogin
                      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {needsCompetitionJoin && (
              <form onSubmit={handleJoinCompetition} className="mb-8 space-y-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-1">Join Competition</p>
                  <h2 className="text-lg font-bold text-white">Enter your room code</h2>
                  <p className="text-sm text-gray-400 mt-1">Your account is signed in. Add the code from your admin to enter this competition.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Competition Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="CITD-XXXX"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="w-full px-4 py-3 pr-11 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all duration-200 uppercase tracking-wider"
                    />
                    {joinCode && (
                      <button
                        type="button"
                        onClick={() => setJoinCode('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
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
                  className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-60 transition-all duration-300"
                >
                  {joinLoading ? 'Joining...' : 'Join Competition'}
                </button>
              </form>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-sm flex items-start gap-2 animate-in slide-in-from-top-2 duration-300">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {!needsCompetitionJoin && (
              <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name field — Sign Up only */}
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  !isLogin ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/8 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-200"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/8 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-200"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/8 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-200"
                />
              </div>

              {/* Role selector — Sign Up only */}
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  !isLogin ? 'max-h-36 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">I am joining as a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('participant')}
                    className={`relative flex flex-col items-center justify-center py-4 px-3 rounded-xl border text-sm font-semibold transition-all duration-300 ${
                      role === 'participant'
                        ? 'border-blue-500/60 bg-blue-500/10 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-2xl mb-1">💻</span>
                    <span>Participant</span>
                    <span className="text-[10px] opacity-60 font-normal mt-0.5">Compete & code</span>
                    {role === 'participant' && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`relative flex flex-col items-center justify-center py-4 px-3 rounded-xl border text-sm font-semibold transition-all duration-300 ${
                      role === 'admin'
                        ? 'border-violet-500/60 bg-violet-500/10 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-2xl mb-1">🛠️</span>
                    <span>Admin</span>
                    <span className="text-[10px] opacity-60 font-normal mt-0.5">Manage contests</span>
                    {role === 'admin' && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Competition Code — Participant Sign Up only */}
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  !isLogin && role === 'participant' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Competition Code</label>
                <input
                  type="text"
                  placeholder="Enter the code from your admin"
                  value={competitionCode}
                  onChange={(e) => setCompetitionCode(e.target.value)}
                  required={!isLogin && role === 'participant'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/8 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-200 uppercase tracking-wider"
                />
                <p className="mt-1 text-[11px] text-gray-500">Ask your admin for the code before joining.</p>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_4px_24px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_32px_rgba(37,99,235,0.5)] overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      {isLogin ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    isLogin ? 'Enter the Challenge →' : 'Create Account →'
                  )}
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              </form>
            )}

            {!needsCompetitionJoin && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-sm text-gray-500 hover:text-blue-400 transition-colors duration-200"
                >
                  {isLogin ? "New here? Create an account" : "Already have an account? Sign In"}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-4 text-center w-full text-gray-700 text-xs">
        Code in the Dark — Frontend Challenge Platform
      </p>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.03; }
          50% { transform: translateY(-30px) rotate(3deg); opacity: 0.06; }
        }
        .animate-float { animation: float 20s ease-in-out infinite; }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
