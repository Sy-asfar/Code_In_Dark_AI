import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const CompetitionContext = createContext();

export function useCompetition() {
  return useContext(CompetitionContext);
}

export function CompetitionProvider({ children }) {
  const { userProfile } = useAuth();
  const [competitionState, setCompetitionState] = useState({
    isRunning: false,
    targetImageUrl: null,
    endTime: null,
    durationSeconds: 0,
    competitionCode: null,
    isKilled: false,
    competitionExists: false
  });

  useEffect(() => {
    const competitionCode = userProfile?.competitionCode;

    if (!competitionCode) {
      setCompetitionState({
        isRunning: false,
        targetImageUrl: null,
        endTime: null,
        durationSeconds: 0,
        competitionCode: null,
        isKilled: false,
        competitionExists: false
      });
      return undefined;
    }

    // Listen to the active competition room for this user
    const unsubscribe = onSnapshot(doc(db, 'competitions', competitionCode), (competitionDoc) => {
      if (competitionDoc.exists()) {
        setCompetitionState({
          ...competitionDoc.data(),
          isKilled: !!competitionDoc.data().isKilled,
          competitionExists: true,
          competitionCode
        });
      } else {
        setCompetitionState({
          isRunning: false,
          targetImageUrl: null,
          endTime: null,
          durationSeconds: 0,
          competitionCode: null,
          isKilled: false,
          competitionExists: false
        });
      }
    }, (error) => {
      console.error("Error fetching competition state:", error);
    });

    return unsubscribe;
  }, [userProfile?.competitionCode]);

  return (
    <CompetitionContext.Provider value={competitionState}>
      {children}
    </CompetitionContext.Provider>
  );
}
