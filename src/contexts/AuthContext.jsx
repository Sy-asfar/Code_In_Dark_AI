import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isLoaded: clerkAuthLoaded, isSignedIn } = useClerkAuth();
  const { isLoaded: clerkUserLoaded, user } = useUser();
  const { signOut } = useClerk();

  const mapClerkUser = (clerkUser) => {
    if (!clerkUser) return null;

    const email = clerkUser.primaryEmailAddress?.emailAddress || '';
    const displayName = clerkUser.fullName || clerkUser.firstName || email.split('@')[0] || 'User';

    return {
      uid: clerkUser.id,
      email,
      displayName,
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      imageUrl: clerkUser.imageUrl || '',
    };
  };

  async function syncUserProfile(clerkUser) {
    if (!clerkUser) {
      setCurrentUser(null);
      setUserRole(null);
      setUserProfile(null);
      return;
    }

    const appUser = mapClerkUser(clerkUser);
    setCurrentUser(appUser);

    try {
      const userDoc = await getDoc(doc(db, 'users', appUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserRole(data.role || null);
        setUserProfile(data);
      } else {
        setUserRole(null);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      setUserProfile(null);
    }
  }

  async function completeProfile({ name, role = 'participant', competitionCode = '' }) {
    if (!currentUser) {
      throw new Error('not-authenticated');
    }

    const trimmedName = name?.trim();
    const normalizedRole = role === 'admin' ? 'admin' : 'participant';
    const trimmedCompetitionCode = competitionCode?.trim();

    if (!trimmedName) {
      throw new Error('name-required');
    }

    if (normalizedRole === 'participant') {
      if (!trimmedCompetitionCode) {
        throw new Error('competition-code-required');
      }

      const competitionDoc = await getDoc(doc(db, 'competitions', trimmedCompetitionCode));
      if (!competitionDoc.exists()) {
        throw new Error('invalid-competition-code');
      }
    }

    const profileData = {
      name: trimmedName,
      role: normalizedRole,
      email: currentUser.email,
      createdAt: Date.now(),
      ...(trimmedCompetitionCode ? { competitionCode: trimmedCompetitionCode } : {})
    };

    await setDoc(doc(db, 'users', currentUser.uid), profileData, { merge: true });
    setUserRole(normalizedRole);
    setUserProfile(profileData);
    return profileData;
  }

  async function joinCompetitionCode(competitionCode) {
    if (!currentUser) {
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

    await setDoc(doc(db, 'users', currentUser.uid), {
      competitionCode: normalizedCode,
    }, { merge: true });

    await syncUserProfile(user);
  }

  function logout() {
    return signOut();
  }

  useEffect(() => {
    if (!clerkAuthLoaded || !clerkUserLoaded) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      if (!isSignedIn || !user) {
        if (!cancelled) {
          setCurrentUser(null);
          setUserRole(null);
          setUserProfile(null);
          setLoading(false);
        }
        return;
      }

      await syncUserProfile(user);

      if (!cancelled) {
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [clerkAuthLoaded, clerkUserLoaded, isSignedIn, user?.id]);

  const value = {
    currentUser,
    userRole,
    userProfile,
    completeProfile,
    joinCompetitionCode,
    logout,
    refreshUserProfile: () => syncUserProfile(user),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
