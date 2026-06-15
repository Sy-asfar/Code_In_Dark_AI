import { Navigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { currentUser, userRole } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn || !currentUser) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && !userRole) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/participant" replace />;
    }
  }

  return children;
}
