import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CompetitionProvider } from './contexts/CompetitionContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ParticipantDashboard from './pages/ParticipantDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CompetitionProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/participant" 
              element={
                <ProtectedRoute requiredRole="participant">
                  <ParticipantDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </CompetitionProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
