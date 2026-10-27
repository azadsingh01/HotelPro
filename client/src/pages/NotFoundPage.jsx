import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="container page-section">
      <div className="empty-state not-found-state">
        <span className="empty-state-mark">404</span>
        <h1>Looks like this room is taken.</h1>
        <p>The page you’re looking for isn’t here. Let’s find you somewhere else.</p>
        <Link className="btn btn-dark rounded-pill px-4" to="/">Back home</Link>
      </div>
    </section>
  );
}
