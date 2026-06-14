import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, setDoc, deleteDoc, deleteField, collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { useCompetition } from '../contexts/CompetitionContext';
import { useAuth } from '../contexts/AuthContext';
import { Play, Square, Upload, Clock, LogOut, Eye, X, Code, RefreshCcw } from 'lucide-react';

export default function AdminDashboard() {
  const competition = useCompetition();
  const { logout, userProfile, currentUser, refreshUserProfile } = useAuth();
  const [duration, setDuration] = useState(300); // 5 minutes default
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmissionCode, setSelectedSubmissionCode] = useState(null);
  const [selectedSubmissionUser, setSelectedSubmissionUser] = useState(null);
  const [actionError, setActionError] = useState('');
  const [competitionCode, setCompetitionCode] = useState(userProfile?.competitionCode || '');
  const [creatingCompetition, setCreatingCompetition] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showKillModal, setShowKillModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    setCompetitionCode(userProfile?.competitionCode || '');
  }, [userProfile?.competitionCode]);

  useEffect(() => {
    if (!competitionCode) {
      setSubmissions([]);
      return undefined;
    }

    const q = query(collection(db, 'competitions', competitionCode, 'submissions'), orderBy('score', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs = [];
      snapshot.forEach((doc) => {
        subs.push({ id: doc.id, ...doc.data() });
      });
      setSubmissions(subs);
    }, (error) => {
      console.error("Error fetching submissions:", error);
      // Optional: set some state to show an error message in the UI
    });
    return unsubscribe;
  }, [competitionCode]);

  const generateCompetitionCode = () => {
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    const timePart = Date.now().toString(36).slice(-4).toUpperCase();
    return `CITD-${randomPart}${timePart}`;
  };

  const handleCreateCompetition = async () => {
    if (!currentUser) return;

    setCreatingCompetition(true);
    setActionError('');

    try {
      const newCompetitionCode = generateCompetitionCode();
      const compRef = doc(db, 'competitions', newCompetitionCode);
      await setDoc(compRef, {
        competitionCode: newCompetitionCode,
        adminId: currentUser.uid,
        adminEmail: currentUser.email || userProfile?.email || '',
        adminName: userProfile?.name || currentUser.email?.split('@')[0] || 'Admin',
        isRunning: false,
        isKilled: false,
        targetImageUrl: null,
        endTime: null,
        durationSeconds: duration,
        createdAt: Date.now()
      }, { merge: true });

      await setDoc(doc(db, 'users', currentUser.uid), {
        ...(userProfile || {}),
        competitionCode: newCompetitionCode
      }, { merge: true });

      setCompetitionCode(newCompetitionCode);
      await refreshUserProfile();
    } catch (err) {
      console.error('handleCreateCompetition error:', err);
      setActionError('Failed to create competition: ' + err.message);
    }

    setCreatingCompetition(false);
  };

  const handleStart = async () => {
    setActionError('');

    if (!competitionCode) {
      setActionError('Create a competition room first.');
      return;
    }

    if (competition.isKilled) {
      setActionError('This competition was killed. Create a new competition instead.');
      return;
    }

    try {
      const compRef = doc(db, 'competitions', competitionCode);
      const endTime = Date.now() + duration * 1000;
      await setDoc(compRef, {
        isRunning: true,
        isKilled: false,
        durationSeconds: duration,
        endTime: endTime,
        targetImageUrl: competition.targetImageUrl || null
      }, { merge: true });
      console.log('Challenge started successfully');
    } catch (err) {
      console.error('handleStart error:', err);
      setActionError('Failed to start: ' + err.message);
    }
  };

  const handleStop = async () => {
    setActionError('');

    if (!competitionCode) {
      setActionError('Create a competition room first.');
      return;
    }

    try {
      const compRef = doc(db, 'competitions', competitionCode);
      await setDoc(compRef, {
        isRunning: false,
        endTime: null
      }, { merge: true });
      console.log('Challenge stopped successfully');
    } catch (err) {
      console.error('handleStop error:', err);
      setActionError('Failed to stop: ' + err.message);
    }
  };

  const handleImageUrlSubmit = async (e) => {
    e.preventDefault();
    if (!imageUrlInput) return;

    if (!competitionCode) {
      setActionError('Create a competition room first.');
      return;
    }

    setUploading(true);
    try {
      const compRef = doc(db, 'competitions', competitionCode);
      await setDoc(compRef, {
        targetImageUrl: imageUrlInput
      }, { merge: true });
      setImageUrlInput('');
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update image URL. " + error.message);
    }
    setUploading(false);
  };

  const handleKillCompetition = async () => {
    setActionError('');

    if (!competitionCode) {
      setActionError('Create a competition room first.');
      return;
    }

    try {
      await setDoc(doc(db, 'competitions', competitionCode), {
        isRunning: false,
        isKilled: true,
        endTime: null,
        killedAt: Date.now()
      }, { merge: true });
      setShowKillModal(false);
    } catch (error) {
      console.error('handleKillCompetition error:', error);
      setActionError('Failed to kill competition: ' + error.message);
    }
  };

  const handleDeleteCompetition = async () => {
    setActionError('');

    if (!competitionCode) {
      setActionError('Create a competition room first.');
      return;
    }

    try {
      const submissionsSnapshot = await getDocs(collection(db, 'competitions', competitionCode, 'submissions'));
      await Promise.all(submissionsSnapshot.docs.map((submissionDoc) => deleteDoc(submissionDoc.ref)));
      await deleteDoc(doc(db, 'competitions', competitionCode));

      await setDoc(doc(db, 'users', currentUser.uid), {
        competitionCode: deleteField()
      }, { merge: true });

      setCompetitionCode('');
      await refreshUserProfile();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('handleDeleteCompetition error:', error);
      setActionError('Failed to delete competition: ' + error.message);
    }
  };

  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const handleViewCode = (submission) => {
    setSelectedSubmissionCode(submission.code);
    setSelectedSubmissionUser(submission.participantName || submission.userId);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen p-8 bg-dark-900 text-gray-100">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center pb-6 border-b border-dark-700">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Control Panel</h1>
            <p className="text-gray-400 mt-1">Manage the Code in the Dark competition</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors border border-dark-600">
              <RefreshCcw size={18} /> Refresh
            </button>
            <button onClick={handleCreateCompetition} disabled={creatingCompetition} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-lg transition-colors border border-blue-500/40">
              {creatingCompetition ? 'Creating...' : 'New Competition'}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors border border-dark-600">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* Control Panel */}
            <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-xl">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Clock size={20} className="text-accent-500" /> Competition State</h2>

              <div className="mb-6 p-4 bg-dark-900 rounded-lg border border-dark-700 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Competition Code</p>
                  <p className="text-lg font-mono font-bold text-white break-all">{competitionCode || 'No competition created yet'}</p>
                </div>
                <button onClick={() => competitionCode && navigator.clipboard.writeText(competitionCode)} disabled={!competitionCode} className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-sm font-medium border border-dark-600 disabled:opacity-50">
                  Copy Code
                </button>
              </div>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Duration (seconds)</label>
                  <input 
                    type="number" 
                    value={duration} 
                    onChange={(e) => setDuration(Number(e.target.value))}
                    disabled={competition.isRunning}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-accent-500 outline-none disabled:opacity-50"
                  />
                </div>
                
                <div className="flex items-end pt-6 gap-4">
                  {!competition.isRunning ? (
                    <button 
                      onClick={handleStart}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
                    >
                      <Play size={20} fill="currentColor" /> Start Challenge
                    </button>
                  ) : (
                    <button 
                      onClick={handleStop}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                    >
                      <Square size={20} fill="currentColor" /> Stop Challenge
                    </button>
                  )}
                </div>
              </div>

              {actionError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-sm">
                  ⚠ {actionError} — Check your Firestore Security Rules in Firebase Console.
                </div>
              )}

              <div className="p-4 bg-dark-900 rounded-lg border border-dark-700 flex items-center justify-between">
                <span className="text-gray-400 font-medium">Status</span>
                {competition.isKilled ? (
                  <span className="px-3 py-1 bg-red-950/50 text-red-400 border border-red-800 rounded-full text-sm font-semibold flex items-center gap-2">
                    Killed
                  </span>
                ) : competition.isRunning ? (
                  <span className="px-3 py-1 bg-green-900/50 text-green-400 border border-green-800 rounded-full text-sm font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Running
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-800 text-gray-400 border border-gray-700 rounded-full text-sm font-semibold">
                    Stopped
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowKillModal(true)}
                  disabled={!competitionCode}
                  className="px-4 py-3 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  Kill Competition
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={!competitionCode}
                  className="px-4 py-3 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  Delete Record
                </button>
              </div>
            </div>

            {/* Target Image Upload */}
            <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-xl">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Upload size={20} className="text-accent-500" /> Target Design</h2>
              
              <form onSubmit={handleImageUrlSubmit} className="flex gap-4">
                <input 
                  type="url" 
                  placeholder="https://example.com/image.png" 
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-accent-500 outline-none"
                  required
                />
                <button 
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-3 bg-accent-600 hover:bg-accent-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Set Image
                </button>
              </form>
              
              {uploading && <p className="text-accent-500 mt-4 text-center font-medium animate-pulse">Updating image...</p>}
              
              {competition.targetImageUrl && !uploading && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-400 mb-3">Current Target:</p>
                  <div className="rounded-lg overflow-hidden border border-dark-700 bg-white/5">
                    <img src={competition.targetImageUrl} alt="Target" className="w-full h-auto object-contain max-h-96" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-xl h-fit">
            <h2 className="text-xl font-semibold mb-6">Live Leaderboard</h2>
            <div className="space-y-4">
              {submissions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No submissions yet</p>
              ) : (
                submissions.map((sub, idx) => (
                  <div key={sub.id} className="p-4 bg-dark-900 border border-dark-600 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center font-bold text-gray-300">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-white">{sub.participantName || `${sub.userId.substring(0, 8)}...`}</p>
                        <p className="text-xs text-gray-500">{new Date(sub.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-accent-500">
                      {sub.score}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Submissions Section */}
        <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-xl overflow-hidden mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Code size={20} className="text-accent-500" /> Participant Submissions
            </h2>
            <span className="px-3 py-1 bg-dark-900 text-accent-400 border border-dark-700 rounded-full text-xs font-semibold">
              {submissions.length} Total Submissions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-dark-700 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Participant Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">AI Score</th>
                  <th className="py-3 px-4">AI Feedback</th>
                  <th className="py-3 px-4 text-right">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50 text-sm">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-gray-500 py-12">
                      No submissions have been evaluated yet.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-dark-750/30 transition-colors">
                      <td className="py-4 px-4 font-semibold text-white">
                        {sub.participantName || sub.userId?.substring(0, 8) || 'Unknown'}
                      </td>
                      <td className="py-4 px-4 text-gray-400">
                        {sub.participantEmail || 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-full text-xs border ${
                          sub.score >= 80 
                            ? 'bg-green-950/40 text-green-400 border-green-800/60' 
                            : sub.score >= 50 
                            ? 'bg-yellow-950/40 text-yellow-400 border-yellow-800/60' 
                            : 'bg-red-950/40 text-red-400 border-red-800/60'
                        }`}>
                          {sub.score}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-300 max-w-xs truncate hover:max-w-none hover:whitespace-normal transition-all" title={sub.feedback || sub.critique}>
                        {sub.feedback || sub.critique || 'No feedback provided.'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleViewCode(sub)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 hover:bg-accent-500 text-white rounded-lg transition-colors text-xs font-semibold shadow-sm"
                        >
                          <Eye size={14} /> View Code
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Code Viewer Modal */}
      {selectedSubmissionCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-300">
          <div className="bg-dark-800 rounded-xl border border-dark-700 shadow-2xl max-w-4xl w-full h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-dark-900 border-b border-dark-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="text-accent-500" size={20} />
                <h3 className="font-bold text-white">Submission Code - {selectedSubmissionUser}</h3>
              </div>
              <button 
                onClick={() => { setSelectedSubmissionCode(null); setSelectedSubmissionUser(null); }}
                className="p-1 hover:bg-dark-800 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto font-mono text-sm bg-dark-950 text-gray-300 select-all whitespace-pre-wrap leading-relaxed">
              <code>{selectedSubmissionCode}</code>
            </div>
            <div className="p-4 bg-dark-900 border-t border-dark-700 flex justify-end gap-3">
              <button 
                onClick={() => { setSelectedSubmissionCode(null); setSelectedSubmissionUser(null); }}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md rounded-2xl border border-dark-700 bg-dark-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="text-lg font-bold text-white">Logout</h3>
              <button onClick={() => setShowLogoutModal(false)} className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 text-gray-300">Are you sure you want to logout from the admin panel?</div>
            <div className="p-4 border-t border-dark-700 flex justify-end gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-white">Cancel</button>
              <button onClick={confirmLogout} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold">Logout</button>
            </div>
          </div>
        </div>
      )}

      {showKillModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md rounded-2xl border border-dark-700 bg-dark-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="text-lg font-bold text-white">Kill Competition</h3>
              <button onClick={() => setShowKillModal(false)} className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 text-gray-300">This will stop the current room immediately. Participants will no longer be able to continue this competition.</div>
            <div className="p-4 border-t border-dark-700 flex justify-end gap-3">
              <button onClick={() => setShowKillModal(false)} className="px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-white">Cancel</button>
              <button onClick={handleKillCompetition} className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold">Kill Competition</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md rounded-2xl border border-dark-700 bg-dark-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="text-lg font-bold text-white">Delete Competition Record</h3>
              <button onClick={() => setShowDeleteModal(false)} className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 text-gray-300">This will permanently remove the competition room and its submissions from Firestore.</div>
            <div className="p-4 border-t border-dark-700 flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-white">Cancel</button>
              <button onClick={handleDeleteCompetition} className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold">Delete Record</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
