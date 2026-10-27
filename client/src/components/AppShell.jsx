import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function HeaderLink({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
    >
      {children}
    </NavLink>
  );
}

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogout() {
    logout();
    closeMenu();
    navigate('/');
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <nav className="container site-nav" aria-label="Main navigation">
          <Link className="brand-lockup" to="/" onClick={closeMenu}>
            <span className="brand-mark" aria-hidden="true">H</span>
            <span className="brand-name">hotelpro<span>.</span></span>
          </Link>

          <button
            className="nav-toggle"
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className={`nav-content${menuOpen ? ' nav-content-open' : ''}`}>
            <div className="nav-links">
              <HeaderLink to="/rooms" onClick={closeMenu}>Find a room</HeaderLink>
              {user && <HeaderLink to="/my-bookings" onClick={closeMenu}>My bookings</HeaderLink>}
              {user?.role === 'admin' && <HeaderLink to="/admin" onClick={closeMenu}>Dashboard</HeaderLink>}
            </div>

            <div className="nav-actions">
              {user ? (
                <>
                  <span className="nav-greeting">Hello, {user.name.split(' ')[0]}</span>
                  <button className="btn btn-outline-dark btn-sm rounded-pill px-3" type="button" onClick={handleLogout}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <HeaderLink to="/login" onClick={closeMenu}>Log in</HeaderLink>
                  <Link className="btn btn-dark btn-sm rounded-pill px-3" to="/register" onClick={closeMenu}>
                    Create account
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-content">
          <Link className="brand-lockup brand-lockup-footer" to="/">
            <span className="brand-mark" aria-hidden="true">H</span>
            <span className="brand-name">hotelpro<span>.</span></span>
          </Link>
          <p className="mb-0">A more considered way to stay.</p>
          <span>© {new Date().getFullYear()} HotelPro</span>
        </div>
      </footer>
    </div>
  );
}
