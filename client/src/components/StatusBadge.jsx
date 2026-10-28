const statusTone = {
  booked: 'status-blue',
  active: 'status-green',
  'checked-in': 'status-green',
  'checked-out': 'status-muted',
  cancelled: 'status-red',
  unpaid: 'status-amber',
  pending: 'status-amber',
  paid: 'status-green',
  refunded: 'status-purple',
  available: 'status-green',
  maintenance: 'status-amber',
  out_of_service: 'status-red',
  Ordinary: 'status-blue',
  Admin: 'status-purple',
};

export default function StatusBadge({ status }) {
  const label = status?.replaceAll('_', ' ').replaceAll('-', ' ') ?? 'unknown';

  return <span className={`status-badge ${statusTone[status] ?? 'status-muted'}`}>{label}</span>;
}
