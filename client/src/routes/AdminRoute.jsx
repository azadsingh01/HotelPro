import ProtectedRoute from './ProtectedRoute.jsx';

export default function AdminRoute({ children }) {
  return <ProtectedRoute types={['Admin']}>{children}</ProtectedRoute>;
}
