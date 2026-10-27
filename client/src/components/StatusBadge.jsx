const statusTone = {
  booked: 'status-blue',
  checked_in: 'status-green',
  checked_out: 'status-muted',
  cancelled: 'status-red',
  unpaid: 'status-amber',
  pending: 'status-amber',
  paid: 'status-green',
  refunded: 'status-purple',
  available: 'status-green',
  maintenance: 'status-amber',
  out_of_service: 'status-red',
};

export default function StatusBadge({ status }) {
  const label = status?.replaceAll('_', ' ') ?? 'unknown';

  return <span className={`status-badge ${statusTone[status] ?? 'status-muted'}`}>{label}</span>;
}
