import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useCompetition } from '../contexts/CompetitionContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { evaluateCode } from '../utils/aiJudge';
import { Clock, Send, Eye, EyeOff, Layout, Image as ImageIcon, X } from 'lucide-react';

const TARGET_REVEAL_WINDOW_SECONDS = 180;

export default function ParticipantDashboard() {
  const competition = useCompetition();
  const { currentUser, userRole, userProfile, logout, joinCompetitionCode, refreshUserProfile } = useAuth();
  const competitionCode = userProfile?.competitionCode || competition.competitionCode;
  const [code, setCode] = useState('<!-- Write your HTML/CSS here -->\n<style>\n  body { background: #fff; }\n</style>\n\n<div class="box">Hello</div>');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [isTargetVisible, setIsTargetVisible] = useState(false);
  const [targetRevealSecondsLeft, setTargetRevealSecondsLeft] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(!!currentUser && userRole === 'participant' && !userProfile?.competitionCode);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  // Store latest state in refs to avoid resetting the timer interval closure
  const codeRef = useRef(code);
  const isSubmittingRef = useRef(isSubmitting);
  const resultRef = useRef(result);
  const targetImageUrlRef = useRef(competition.targetImageUrl);
  const isRunningRef = useRef(competition.isRunning);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    targetImageUrlRef.current = competition.targetImageUrl;
    isRunningRef.current = competition.isRunning;
  }, [competition.targetImageUrl, competition.isRunning]);

  useEffect(() => {
    if (competition.isRunning && competition.endTime && competition.targetImageUrl) {
      const revealWindow = Math.min(TARGET_REVEAL_WINDOW_SECONDS, competition.durationSeconds || TARGET_REVEAL_WINDOW_SECONDS);
      setTargetRevealSecondsLeft(revealWindow);
      setIsTargetVisible(false);
    } else {
      setTargetRevealSecondsLeft(0);
      setIsTargetVisible(false);
    }
  }, [competition.isRunning, competition.endTime, competition.targetImageUrl, competition.durationSeconds]);

  useEffect(() => {
    if (!competition.isRunning || !competition.endTime) return;

    const interval = setInterval(() => {
      setTargetRevealSecondsLeft((current) => {
        if (current <= 1) {
          setIsTargetVisible(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [competition.isRunning, competition.endTime]);

  useEffect(() => {
    setShowJoinModal(
      !!currentUser &&
      userRole === 'participant' &&
      (!userProfile?.competitionCode || !competition.competitionExists || competition.isKilled)
    );
  }, [currentUser, userRole, userProfile?.competitionCode, competition.competitionExists, competition.isKilled]);

  const submitCode = async (codeToSubmit) => {
    if (!codeToSubmit || !targetImageUrlRef.current || isSubmittingRef.current || resultRef.current || !competitionCode) return;
    
    setIsSubmitting(true);
    setIsPreviewVisible(true); // Reveal on submit
    
    try {
      const evalResult = await evaluateCode(codeToSubmit, targetImageUrlRef.current);
      setResult(evalResult);

      let participantEmail = currentUser.email || '';
      let participantName = currentUser.displayName || participantEmail.split('@')[0];

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.name) {
            participantName = userData.name;
          } else if (userData.displayName) {
            participantName = userData.displayName;
          }
          if (userData.email) {
            participantEmail = userData.email;
          }
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }

      // Save to Firestore
      await addDoc(collection(db, 'competitions', competitionCode, 'submissions'), {
        userId: currentUser.uid,
        code: codeToSubmit,
        score: evalResult.score,
        feedback: evalResult.feedback,
        critique: evalResult.feedback, // For compatibility
        participantName,
        participantEmail,
        competitionCode,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error("Submission failed", error);
      alert("Submission failed. " + error.message);
    }
    setIsSubmitting(false);
  };

  // Timer logic
  useEffect(() => {
    let interval;
    if (competition.isRunning && competition.endTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((competition.endTime - now) / 1000));
        setTimeLeft(remaining);
        
        // Auto-submit and reveal preview when time is up
        if (remaining === 0 && !isSubmittingRef.current && !resultRef.current && isRunningRef.current && targetImageUrlRef.current) {
          setIsPreviewVisible(true);
          submitCode(codeRef.current);
        } else if (remaining > 0) {
          setIsPreviewVisible(false);
        }
      }, 1000);
    } else {
      setTimeLeft(0);
      setIsPreviewVisible(true); // Show preview if not running
    }

    return () => clearInterval(interval);
  }, [competition.isRunning, competition.endTime]);

  const handleSubmit = () => {
    submitCode(code);
  };

  const handleToggleTarget = () => {
    if (!competition.isRunning || targetRevealSecondsLeft === 0 || !competition.targetImageUrl) return;
    setIsTargetVisible((current) => !current);
  };

  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = async () => {
    setShowExitModal(false);
    await logout();
  };

  const handleJoinCompetition = async (e) => {
    e.preventDefault();

    if (!joinCode.trim()) return;

    setJoinLoading(true);
    try {
      await joinCompetitionCode(joinCode.trim());
      await refreshUserProfile();
      setShowJoinModal(false);
      setJoinCode('');
    } catch (error) {
      console.error('Failed to join competition:', error);
      alert(error.message === 'invalid-competition-code'
        ? 'That competition code does not exist.'
        : 'Failed to join competition.');
    }
    setJoinLoading(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col bg-dark-900 text-gray-100 overflow-hidden">
      {showJoinModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-dark-700 bg-dark-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <div>
                <h3 className="text-lg font-bold text-white">Join Competition</h3>
                <p className="text-sm text-gray-400 mt-1">Enter the code from your admin to open the participant panel.</p>
              </div>
              <button onClick={() => setShowJoinModal(false)} className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleJoinCompetition} className="p-4 space-y-4">
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
                disabled={joinLoading || !joinCode.trim()}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-60 transition-all duration-300"
              >
                {joinLoading ? 'Joining...' : 'Join Competition'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 border-b border-dark-700 bg-dark-800/80 backdrop-blur flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-blue-400 font-mono font-bold text-xl leading-none drop-shadow-[0_0_8px_rgba(59,130,246,0.7)]">{'<'}</span>
          <h1 className="font-extrabold text-base tracking-tight">
            <span className="text-white">CODE IN THE </span>
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">DARK</span>
          </h1>
          <span className="text-violet-400 font-mono font-bold text-xl leading-none drop-shadow-[0_0_8px_rgba(139,92,246,0.7)]">{'/>'}</span>
        </div>

        <div className="flex items-center gap-4">
          {competitionCode && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-dark-700 bg-dark-900 text-xs text-gray-400 font-mono uppercase tracking-wider">
              Room {competitionCode}
            </div>
          )}
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-lg font-bold border ${competition.isRunning && timeLeft > 0 ? 'bg-accent-900/30 text-accent-400 border-accent-800 shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'bg-dark-900 text-gray-500 border-dark-700'}`}>
            <Clock size={18} />
            {formatTime(timeLeft)}
          </div>
          {userProfile && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                {(userProfile.name || userProfile.email || 'U')[0].toUpperCase()}
              </div>
              <span className="text-sm text-gray-300 hidden sm:block">{userProfile.name || userProfile.email?.split('@')[0]}</span>
            </div>
          )}
          <button onClick={handleExit} className="text-sm text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded">
            Exit
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Editor Pane */}
        <div className="w-1/2 flex flex-col border-r border-dark-700 relative">
          <div className="h-10 bg-dark-800 flex items-center px-4 border-b border-dark-700 text-sm text-gray-400 font-medium shrink-0">
            index.html
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="html"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value)}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                padding: { top: 16 }
              }}
            />
          </div>
          
          {/* Submit Button */}
          <div className="absolute bottom-6 right-6 z-10">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !competition.isRunning || timeLeft === 0 || !!result}
              className="flex items-center gap-2 px-6 py-3 bg-accent-600 hover:bg-accent-500 disabled:bg-dark-700 disabled:text-gray-500 text-white rounded-lg font-medium shadow-lg transition-all"
            >
              {isSubmitting ? (
                <span className="animate-pulse">Judging...</span>
              ) : (
                <>
                  <Send size={18} /> Submit Output
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Pane (Target / Preview) */}
        <div className="w-1/2 flex flex-col relative bg-dark-800">
          
          {/* Tabs */}
          <div className="h-10 bg-dark-900 flex items-center px-2 border-b border-dark-700 shrink-0 gap-2">
            <div className="px-4 py-1 bg-dark-800 text-white text-sm font-medium rounded-t-md border-t border-l border-r border-dark-700 flex items-center gap-2">
              <Layout size={14} className="text-accent-500" /> Target Design
            </div>
            <button
              type="button"
              onClick={handleToggleTarget}
              disabled={!competition.isRunning || targetRevealSecondsLeft === 0 || !competition.targetImageUrl}
              className="px-4 py-1 text-sm font-medium rounded-t-md border border-transparent flex items-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-gray-400 hover:text-white hover:bg-dark-800"
            >
              <ImageIcon size={14} />
              {isTargetVisible ? 'Hide Target' : targetRevealSecondsLeft > 0 ? `View Target (${Math.ceil(targetRevealSecondsLeft / 60)}m left)` : 'Target Locked'}
            </button>
            {isPreviewVisible && (
              <div className="px-4 py-1 text-gray-400 text-sm font-medium flex items-center gap-2">
                <Eye size={14} /> Live Preview
              </div>
            )}
          </div>

          <div className="flex-1 relative overflow-hidden">
            {/* Target Image Layer */}
            {isTargetVisible ? (
              <div className="absolute inset-0 p-8 flex items-center justify-center transition-opacity duration-500 opacity-100">
                {competition.targetImageUrl ? (
                  <img 
                    src={competition.targetImageUrl} 
                    alt="Target" 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl ring-1 ring-dark-600"
                  />
                ) : (
                  <div className="text-gray-500 flex flex-col items-center gap-3">
                    <Layout size={48} className="opacity-30" />
                    <p>Waiting for admin to upload target...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 p-8 flex items-center justify-center transition-opacity duration-500 opacity-100">
                <div className="text-gray-500 flex flex-col items-center gap-3 text-center max-w-md">
                  <ImageIcon size={48} className="opacity-30" />
                  <p className="text-lg text-gray-300">Target image is hidden</p>
                  <p className="text-sm text-gray-500">
                    Use the View Target button while the competition is running.
                  </p>
                  {targetRevealSecondsLeft > 0 ? (
                    <p className="text-xs text-gray-600 uppercase tracking-wider">
                      Available for {Math.ceil(targetRevealSecondsLeft / 60)} minute(s)
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 uppercase tracking-wider">
                      Target window expired
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Hidden Preview Overlay */}
            {!isPreviewVisible && (
              <div className="absolute inset-0 backdrop-blur-md bg-dark-900/80 flex flex-col items-center justify-center z-20">
                <EyeOff size={64} className="text-gray-600 mb-4" />
                <h2 className="text-2xl font-bold text-gray-300">Preview Hidden</h2>
                <p className="text-gray-500 mt-2">Code in the dark until time runs out!</p>
              </div>
            )}

            {/* Actual Rendered Preview */}
            {isPreviewVisible && (
              <div className="absolute inset-0 bg-white z-10 transition-all duration-500">
                <iframe
                  title="preview"
                  className="w-full h-full border-none"
                  srcDoc={code}
                  sandbox="allow-scripts"
                />
              </div>
            )}
            
            {/* Loading Overlay */}
            {isSubmitting && (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-8 bg-dark-900/90 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-dark-800 p-8 rounded-2xl border border-dark-600 shadow-2xl max-w-md w-full text-center flex flex-col items-center justify-center gap-6">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-accent-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Evaluating</h2>
                    <p className="text-gray-400 font-medium animate-pulse">
                      AI Judge is assessing your layout...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Overlay */}
            {result && (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-8 bg-dark-900/90 backdrop-blur-sm animate-in fade-in duration-500">
                <div className="bg-dark-800 p-8 rounded-2xl border border-dark-600 shadow-2xl max-w-md w-full text-center">
                  <h2 className="text-2xl font-bold mb-2">Evaluation Complete</h2>
                  <div className="text-6xl font-extrabold text-accent-500 my-6">
                    {result.score}<span className="text-2xl text-gray-400">%</span>
                  </div>
                  <div className="p-4 bg-dark-900 rounded-lg border border-dark-700 text-left mb-6">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {result.critique}
                    </p>
                  </div>
                  <button 
                    onClick={() => setResult(null)}
                    className="px-6 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors w-full"
                  >
                    View Final Result
                  </button>
                </div>
              </div>
            )}

            {showExitModal && (
              <div className="absolute inset-0 z-[40] flex items-center justify-center p-6 bg-black/80">
                <div className="w-full max-w-md rounded-2xl border border-dark-700 bg-dark-800 shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-dark-700">
                    <h3 className="text-lg font-bold text-white">Exit Competition</h3>
                    <button onClick={() => setShowExitModal(false)} className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-4 text-gray-300">
                    Are you sure you want to exit? You can sign back in later if your competition room is still active.
                  </div>
                  <div className="p-4 border-t border-dark-700 flex justify-end gap-3">
                    <button onClick={() => setShowExitModal(false)} className="px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-white">
                      Cancel
                    </button>
                    <button onClick={confirmExit} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold">
                      Exit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
