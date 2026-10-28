import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import AdminRoute from './routes/AdminRoute.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import RoomDetailsPage from './pages/RoomDetailsPage.jsx';
import RoomsPage from './pages/RoomsPage.jsx';
import UserHomePage from './pages/UserHomePage.jsx';

function ApplicationRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="admin/login" element={<AdminLoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="user" element={<ProtectedRoute types={['Ordinary']}><UserHomePage /></ProtectedRoute>} />
          <Route path="rooms" element={<ProtectedRoute types={['Ordinary']}><RoomsPage /></ProtectedRoute>} />
          <Route path="rooms/:id" element={<ProtectedRoute types={['Ordinary']}><RoomDetailsPage /></ProtectedRoute>} />
          <Route path="my-bookings" element={<ProtectedRoute types={['Ordinary']}><MyBookingsPage /></ProtectedRoute>} />
          <Route path="admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
          <Route path="not-found" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ApplicationRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
