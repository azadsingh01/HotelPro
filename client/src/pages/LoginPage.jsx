import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function LoginPage({ adminMode = false }) {
  const { login, adminLogin } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const user = adminMode
        ? await adminLogin(form.email, form.password)
        : await login(form.email, form.password);
      showToast(`Welcome back, ${user.name.split(' ')[0]}.`);
      const destination = location.state?.from;
      navigate(destination ? `${destination.pathname}${destination.search ?? ''}` : user.userType === 'Admin' ? '/admin' : '/user', { replace: true });
    } catch (error) {
      showToast(getApiErrorMessage(error, 'We could not sign you in.'), 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="container auth-page">
      <div className="auth-panel">
        <div className="auth-intro">
          <p className="eyebrow">{adminMode ? 'HOTELPRO OPERATIONS' : 'WELCOME BACK'}</p>
          <h1>{adminMode ? <>Welcome<br />back.</> : <>Good to see<br />you again.</>}</h1>
          <p>{adminMode ? 'Sign in to manage rooms, bookings, and guest accounts.' : 'Sign in to find your next stay or pick up where you left off.'}</p>
          <div className="auth-illustration" aria-hidden="true"><span /><span /><span /><i /></div>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="mb-4"><span className="form-step">{adminMode ? 'ADMIN ACCOUNT' : 'YOUR ACCOUNT'}</span><h2 className="h3 mt-2">{adminMode ? 'Admin log in' : 'Log in'}</h2></div>
          <label className="form-label" htmlFor="login-email">Email address</label>
          <input
            className="form-control form-control-lg mb-3"
            id="login-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <label className="form-label" htmlFor="login-password">Password</label>
          <input
            className="form-control form-control-lg mb-2"
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
          <div className="d-flex justify-content-end mb-4"><span className="small text-secondary">Keep your password somewhere safe.</span></div>
          <button className="btn btn-dark btn-lg rounded-pill w-100" type="submit" disabled={submitting}>
            {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Signing in…</> : 'Sign in'}
          </button>
          {!adminMode ? (
            <p className="auth-switch mt-4 mb-0">New to HotelPro? <Link to="/register">Create an account</Link><br /><Link to="/admin/login">Administrator login</Link></p>
          ) : (
            <p className="auth-switch mt-4 mb-0"><Link to="/login">Ordinary login</Link></p>
          )}
        </form>
      </div>
    </section>
  );
}
