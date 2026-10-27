export default function PageLoader({ label = 'Loading your stay' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="spinner-border spinner-border-sm text-success" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
