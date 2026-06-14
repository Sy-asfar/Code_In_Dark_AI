import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' or 'participant'
  const [userProfile, setUserProfile] = useState(null); // { name, email, role }
  const [loading, setLoading] = useState(true);

  async function fetchAndSetUserProfile(user) {
    if (!user) {
      setUserRole(null);
      setUserProfile(null);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserRole(data.role);
        setUserProfile(data);
      } else {
        setUserRole('participant');
        setUserProfile({ name: user.email?.split('@')[0], email: user.email, role: 'participant' });
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole('participant');
      setUserProfile({ name: user.email?.split('@')[0], email: user.email, role: 'participant' });
    }
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function signup(email, password, name, role = 'participant', competitionCode = '') {
    if (role === 'participant') {
      if (!competitionCode) {
        throw new Error('competition-code-required');
      }

      const competitionDoc = await getDoc(doc(db, 'competitions', competitionCode));
      if (!competitionDoc.exists()) {
        throw new Error('invalid-competition-code');
      }
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const profileData = {
      name: name || email.split('@')[0],
      role: role,
      email: email,
      createdAt: Date.now(),
      ...(competitionCode ? { competitionCode } : {})
    };
    // Use setDoc so the document is created from scratch (no pre-existing doc needed)
    await setDoc(doc(db, 'users', userCredential.user.uid), profileData);
    return userCredential;
  }

  async function joinCompetitionCode(competitionCode) {
    if (!auth.currentUser) {
      throw new Error('not-authenticated');
    }

    const normalizedCode = competitionCode.trim();
    if (!normalizedCode) {
      throw new Error('competition-code-required');
    }

    const competitionDoc = await getDoc(doc(db, 'competitions', normalizedCode));
    if (!competitionDoc.exists()) {
      throw new Error('invalid-competition-code');
    }

    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      competitionCode: normalizedCode
    });

    await fetchAndSetUserProfile(auth.currentUser);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await fetchAndSetUserProfile(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    userProfile,
    login,
    signup,
    joinCompetitionCode,
    logout,
    refreshUserProfile: () => fetchAndSetUserProfile(auth.currentUser)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
