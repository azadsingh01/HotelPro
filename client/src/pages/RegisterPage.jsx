import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const user = await register({ ...form, phone: form.phone || undefined });
      showToast(`Welcome to HotelPro, ${user.name.split(' ')[0]}.`);
      const destination = location.state?.from;
      navigate(destination ? `${destination.pathname}${destination.search ?? ''}` : '/rooms', { replace: true });
    } catch (error) {
      showToast(getApiErrorMessage(error, 'We could not create your account.'), 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="container auth-page">
      <div className="auth-panel">
        <div className="auth-intro auth-intro-register">
          <p className="eyebrow">A GOOD PLACE TO START</p>
          <h1>Your next stay<br />starts here.</h1>
          <p>Create an account to book a room and keep your trip details in one place.</p>
          <div className="auth-illustration auth-illustration-register" aria-hidden="true"><span /><span /><span /><i /></div>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="mb-4"><span className="form-step">GET SETTLED</span><h2 className="h3 mt-2">Create your account</h2></div>
          <label className="form-label" htmlFor="register-name">Full name</label>
          <input className="form-control mb-3" id="register-name" autoComplete="name" minLength="2" maxLength="80" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <label className="form-label" htmlFor="register-email">Email address</label>
          <input className="form-control mb-3" id="register-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <label className="form-label" htmlFor="register-phone">Phone <span className="text-secondary fw-normal">(optional)</span></label>
          <input className="form-control mb-3" id="register-phone" type="tel" autoComplete="tel" maxLength="32" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <label className="form-label" htmlFor="register-password">Password</label>
          <input className="form-control mb-2" id="register-password" type="password" autoComplete="new-password" minLength="8" maxLength="72" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          <p className="small text-secondary mb-4">Use at least 8 characters.</p>
          <button className="btn btn-dark rounded-pill w-100 py-3" type="submit" disabled={submitting}>
            {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Creating account…</> : 'Create account'}
          </button>
          <p className="auth-switch mt-4 mb-0">Already have an account? <Link to="/login">Log in</Link></p>
        </form>
      </div>
    </section>
  );
}
