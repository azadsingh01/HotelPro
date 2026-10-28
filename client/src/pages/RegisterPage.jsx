import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const initialForm = { name: '', email: '', phone: '', password: '', c_password: '', userType: 'Ordinary', adminCode: '' };

export default function RegisterPage() {
  const { register } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setFormError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Enter your name (at least 2 characters).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!/^\d{10,15}$/.test(form.phone.trim())) nextErrors.phone = 'Phone must contain 10 to 15 digits.';
    if (form.password.length < 8) nextErrors.password = 'Password must contain at least 8 characters.';
    if (form.c_password !== form.password) nextErrors.c_password = 'Passwords do not match.';
    if (!['Ordinary', 'Admin'].includes(form.userType)) nextErrors.userType = 'Choose Ordinary or Admin.';
    if (form.userType === 'Admin' && !form.adminCode.trim()) nextErrors.adminCode = 'Admin Secret Code is required.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), ...(form.userType !== 'Admin' ? { adminCode: undefined } : {}) });
      setSuccess('Account created successfully.');
      showToast('Account created successfully. Please log in.');
      window.setTimeout(() => navigate('/login', { replace: true }), 700);
    } catch (error) {
      const details = error.response?.data?.data?.details ?? error.response?.data?.details ?? [];
      const serverErrors = Object.fromEntries(details.map(({ field, message }) => [field, message]));
      setErrors(serverErrors);
      const message = getApiErrorMessage(error, 'We could not create your account.');
      if (!Object.keys(serverErrors).length || !details.length) setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function fieldClass(name) { return `form-control${errors[name] ? ' is-invalid' : ''}`; }
  function errorText(name) { return errors[name] ? <div className="invalid-feedback d-block">{errors[name]}</div> : null; }

  return (
    <section className="container auth-page">
      <div className="auth-panel">
        <div className="auth-intro auth-intro-register"><p className="eyebrow">A GOOD PLACE TO START</p><h1>Your next stay<br />starts here.</h1><p>Create an account to book a room and keep your trip details in one place.</p><div className="auth-illustration auth-illustration-register" aria-hidden="true"><span /><span /><span /><i /></div></div>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="mb-4"><span className="form-step">GET SETTLED</span><h2 className="h3 mt-2">Create your account</h2></div>
          {formError && <div className="alert alert-danger" role="alert">{formError}</div>}
          {success && <div className="alert alert-success" role="status">{success}</div>}
          <label className="form-label" htmlFor="register-name">Name</label><input className={`${fieldClass('name')} mb-1`} id="register-name" name="name" autoComplete="name" minLength="2" maxLength="80" value={form.name} onChange={updateField} required />{errorText('name')}
          <label className="form-label mt-3" htmlFor="register-email">Email</label><input className={`${fieldClass('email')} mb-1`} id="register-email" name="email" type="email" autoComplete="email" value={form.email} onChange={updateField} required />{errorText('email')}
          <label className="form-label mt-3" htmlFor="register-phone">Phone</label><input className={`${fieldClass('phone')} mb-1`} id="register-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" minLength="10" maxLength="15" pattern="[0-9]{10,15}" value={form.phone} onChange={updateField} required />{errorText('phone')}
          <label className="form-label mt-3" htmlFor="register-password">Password</label><input className={`${fieldClass('password')} mb-1`} id="register-password" name="password" type="password" autoComplete="new-password" minLength="8" maxLength="72" value={form.password} onChange={updateField} required />{errorText('password')}<p className="small text-secondary mt-1 mb-0">Use at least 8 characters.</p>
          <label className="form-label mt-3" htmlFor="register-confirm-password">Confirm password</label><input className={`${fieldClass('c_password')} mb-1`} id="register-confirm-password" name="c_password" type="password" autoComplete="new-password" minLength="8" maxLength="72" value={form.c_password} onChange={updateField} required />{errorText('c_password')}
          <label className="form-label mt-3" htmlFor="register-type">User Type</label><select className={`form-select${errors.userType ? ' is-invalid' : ''}`} id="register-type" name="userType" value={form.userType} onChange={updateField} required><option value="Ordinary">Ordinary</option><option value="Admin">Admin</option></select>{errorText('userType')}
          {form.userType === 'Admin' && <><label className="form-label mt-3" htmlFor="register-admin-code">Admin Secret Code</label><input className={`${fieldClass('adminCode')} mb-1`} id="register-admin-code" name="adminCode" type="password" autoComplete="off" value={form.adminCode} onChange={updateField} required />{errorText('adminCode')}<p className="small text-secondary mt-1">Admin accounts require an invitation code configured by the server.</p></>}
          <button className="btn btn-dark rounded-pill w-100 py-3 mt-3" type="submit" disabled={submitting || Boolean(success)}>{submitting ? <><span className="spinner-border spinner-border-sm me-2" />Creating account…</> : 'Create account'}</button>
          <p className="auth-switch mt-4 mb-0">Already have an account? <Link to="/login">Log in</Link></p>
        </form>
      </div>
    </section>
  );
}
