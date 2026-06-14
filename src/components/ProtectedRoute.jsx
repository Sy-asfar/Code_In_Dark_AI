import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/" />;
  }

  if (requiredRole && userRole !== requiredRole) {
    // If they are not the required role, redirect to their appropriate dashboard
    if (userRole === 'admin') {
      return <Navigate to="/admin" />;
    } else {
      return <Navigate to="/participant" />;
    }
  }

  return children;
}
