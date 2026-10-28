import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PageLoader from '../components/PageLoader.jsx';

export default function ProtectedRoute({ children, types }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader label="Checking your account" />;
  }

  if (!user) {
    const loginPath = types?.includes('Admin') ? '/admin/login' : '/login';
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (types && !types.includes(user.userType)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
