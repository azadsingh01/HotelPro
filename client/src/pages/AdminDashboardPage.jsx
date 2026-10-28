import { useCallback, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../api/client.js';
import PageLoader from '../components/PageLoader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

const emptyRoom = {
  roomNumber: '',
  type: 'double',
  description: '',
  capacity: '2',
  rent: '',
  count: '1',
  photos: '',
  amenities: '',
  status: 'available',
};

const bookingStatuses = [
  { value: '', label: 'All bookings' },
  { value: 'booked', label: 'Booked' },
  { value: 'checked-in', label: 'Checked in' },
  { value: 'checked-out', label: 'Checked out' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const showToast = useToast();
  const [tab, setTab] = useState('bookings');
  const [overview, setOverview] = useState(null);
  const [today, setToday] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsPagination, setBookingsPagination] = useState({ page: 1, pages: 1, total: 0, limit: 100 });
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPagination, setUsersPagination] = useState({ page: 1, pages: 1, total: 0, limit: 100 });
  const [bookingStatus, setBookingStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState('');
  const [editingRoomId, setEditingRoomId] = useState('');
  const [roomForm, setRoomForm] = useState(emptyRoom);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const bookingParams = { page: bookingsPage, limit: 100 };
    if (bookingStatus) bookingParams.status = bookingStatus;

    try {
      const [overviewResult, todayResult, roomResult, bookingResult, userResult] = await Promise.all([
        api.get('/admin/stats/overview'),
        api.get('/admin/stats/today'),
        api.get('/admin/rooms'),
        api.get('/admin/bookings', { params: bookingParams }),
        api.get('/admin/users', { params: { page: usersPage, limit: 100 } }),
      ]);
      setOverview(overviewResult.data);
      setToday(todayResult.data);
      setRooms(roomResult.data.rooms);
      setBookings(bookingResult.data.bookings);
      setBookingsPagination(bookingResult.data.pagination);
      setUsers(userResult.data.users);
      setUsersPagination(userResult.data.pagination);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'The dashboard could not be loaded.'), 'danger');
    } finally {
      setLoading(false);
    }
  }, [bookingStatus, bookingsPage, showToast, usersPage]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  function resetRoomForm() {
    setEditingRoomId('');
    setRoomForm(emptyRoom);
    setTab('rooms');
  }

  function editRoom(room) {
    setEditingRoomId(room.id);
    setRoomForm({
      roomNumber: room.roomNumber,
      type: room.type,
      description: room.description ?? '',
      capacity: String(room.capacity),
      rent: String(room.rent),
      count: String(room.count),
      photos: (room.photos ?? []).join('\n'),
      amenities: (room.amenities ?? []).join(', '),
      status: room.status,
    });
    setTab('add-room');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveRoom(event) {
    event.preventDefault();
    setSubmitting(true);
    const payload = {
      roomNumber: Number(roomForm.roomNumber),
      type: roomForm.type,
      description: roomForm.description.trim(),
      capacity: Number(roomForm.capacity),
      rent: Number(roomForm.rent),
      count: Number(roomForm.count),
      photos: roomForm.photos.split('\n').map((item) => item.trim()).filter(Boolean),
      amenities: roomForm.amenities.split(',').map((item) => item.trim()).filter(Boolean),
      status: roomForm.status,
    };

    try {
      if (editingRoomId) {
        await api.put(`/admin/rooms/${editingRoomId}`, payload);
        showToast('Room details updated.');
      } else {
        await api.post('/admin/rooms', payload);
        showToast('Room added to inventory.');
      }
      resetRoomForm();
      await loadDashboard();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Room details could not be saved.'), 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeRoom(room) {
    const accepted = window.confirm(`Remove room ${room.roomNumber} from active inventory? Existing booking history will be kept.`);
    if (!accepted) return;

    setActionId(`room-${room.id}`);
    try {
      await api.delete(`/admin/rooms/${room.id}`);
      showToast(`Room ${room.roomNumber} removed from active inventory.`);
      await loadDashboard();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'The room could not be removed.'), 'danger');
    } finally {
      setActionId('');
    }
  }

  async function restoreRoom(room) {
    setActionId(`room-${room.id}`);
    try {
      await api.patch(`/admin/rooms/${room.id}`, { isActive: true });
      showToast(`Room ${room.roomNumber} restored to active inventory.`);
      await loadDashboard();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'The room could not be restored.'), 'danger');
    } finally {
      setActionId('');
    }
  }

  async function updateBookingState(booking) {
    const action = booking.status === 'booked' ? 'check-in' : 'check-out';
    setActionId(`booking-${booking.id}`);
    try {
      await api.patch(`/admin/bookings/${booking.id}/${action}`);
      showToast(action === 'check-in' ? 'Guest checked in.' : 'Guest checked out.');
      await loadDashboard();
    } catch (error) {
      showToast(getApiErrorMessage(error, `Could not complete ${action}.`), 'danger');
    } finally {
      setActionId('');
    }
  }

  const availableRoomCount = rooms.reduce((sum, room) => (
    room.isActive && room.status === 'available' ? sum + room.count : sum
  ), 0);

  return (
    <section className="container admin-page">
      <div className="admin-welcome">
        <div><p className="eyebrow">HOTELPRO OPERATIONS</p><h1>Good morning, {user?.name.split(' ')[0] ?? 'admin'}.</h1><p>Here’s a clear look at how things are going.</p></div>
        <div className="admin-date"><span className="date-icon">◷</span><span>{today?.date ? formatDate(today.date, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Today'}<small>Hotel dashboard</small></span></div>
      </div>

      <div className="nav nav-tabs admin-tabs" role="tablist" aria-label="Dashboard sections">
        {[
          ['bookings', 'All Bookings'],
          ['rooms', 'All Rooms'],
          ['add-room', 'Add Room'],
          ['users', 'All Users'],
        ].map(([value, label]) => (
          <button className={`nav-link admin-tab${tab === value ? ' active' : ''}`} key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>{label}</button>
        ))}
        <button className="btn btn-outline-dark btn-sm rounded-pill ms-auto px-3" type="button" onClick={loadDashboard} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {loading && !overview ? <PageLoader label="Preparing your dashboard" /> : (
        <>
          {tab === 'overview' && (
            <div className="admin-overview">
              <div className="stats-grid">
                <article className="stat-card stat-card-dark"><span>Total bookings</span><strong>{overview?.totalBookings ?? '—'}</strong><small>All reservations, including cancelled</small><i aria-hidden="true">↗</i></article>
                <article className="stat-card"><span>Revenue</span><strong>{formatCurrency(overview?.totalRevenue ?? 0)}</strong><small>Paid payments, less full refunds</small><i aria-hidden="true">$</i></article>
                <article className="stat-card"><span>Occupancy today</span><strong>{overview?.occupancyRate ?? 0}<small className="stat-percent">%</small></strong><small>{overview?.occupiedRooms ?? 0} of {overview?.totalRooms ?? 0} active rooms</small><i aria-hidden="true">⌂</i></article>
              </div>

              <div className="today-panel">
                <div className="today-panel-heading"><div><p className="eyebrow">ON THE CALENDAR</p><h2>Today at the front desk</h2></div><span className="today-date-chip">{today?.date ?? '—'} · UTC</span></div>
                <div className="today-metrics">
                  <div className="today-metric"><span className="today-metric-mark arrivals">↘</span><div><strong>{today?.todayCheckIns ?? 0}</strong><span>Scheduled check-ins</span></div></div>
                  <div className="today-divider" />
                  <div className="today-metric"><span className="today-metric-mark departures">↗</span><div><strong>{today?.todayCheckOuts ?? 0}</strong><span>Scheduled check-outs</span></div></div>
                  <div className="today-panel-action"><button className="btn btn-outline-dark rounded-pill px-4" type="button" onClick={() => setTab('bookings')}>View bookings <span aria-hidden="true">→</span></button></div>
                </div>
              </div>

              <div className="overview-note"><span>✳</span><p className="mb-0">There are <strong>{availableRoomCount}</strong> active rooms currently marked available in your inventory.</p><button className="btn btn-link text-dark text-decoration-none" type="button" onClick={() => setTab('rooms')}>Manage rooms ↗</button></div>
            </div>
          )}

          {(tab === 'rooms' || tab === 'add-room') && (
            <div className="admin-management-grid admin-single-panel">
              {tab === 'add-room' && <section className="management-panel">
                <div className="management-heading"><div><p className="eyebrow">ROOM INVENTORY</p><h2>{editingRoomId ? 'Edit room' : 'Add a room'}</h2></div>{editingRoomId && <button className="btn btn-link text-secondary" type="button" onClick={resetRoomForm}>Cancel edit</button>}</div>
                <form className="room-editor" onSubmit={saveRoom}>
                  <label className="form-label" htmlFor="room-number">Room number</label>
                  <input className="form-control mb-3" id="room-number" type="number" min="1" max="100000" step="1" value={roomForm.roomNumber} onChange={(event) => setRoomForm({ ...roomForm, roomNumber: event.target.value })} required />
                  <div className="row g-3 mb-3">
                    <div className="col-7"><label className="form-label" htmlFor="room-type">Type</label><select className="form-select" id="room-type" value={roomForm.type} onChange={(event) => setRoomForm({ ...roomForm, type: event.target.value })}>{['single', 'double', 'twin', 'deluxe', 'suite', 'family'].map((type) => <option value={type} key={type}>{type}</option>)}</select></div>
                    <div className="col-5"><label className="form-label" htmlFor="room-capacity">Capacity</label><input className="form-control" id="room-capacity" type="number" min="1" max="20" value={roomForm.capacity} onChange={(event) => setRoomForm({ ...roomForm, capacity: event.target.value })} required /></div>
                  </div>
                  <label className="form-label" htmlFor="room-rent">Rent per night <span className="text-secondary">(USD)</span></label>
                  <input className="form-control mb-3" id="room-rent" type="number" min="0" step="0.01" value={roomForm.rent} onChange={(event) => setRoomForm({ ...roomForm, rent: event.target.value })} required />
                  <label className="form-label" htmlFor="room-count">Units in inventory</label>
                  <input className="form-control mb-3" id="room-count" type="number" min="0" max="10000" value={roomForm.count} onChange={(event) => setRoomForm({ ...roomForm, count: event.target.value })} required />
                  <label className="form-label" htmlFor="room-photos">Photo URLs <span className="text-secondary">(one per line)</span></label>
                  <textarea className="form-control mb-3" id="room-photos" rows="3" value={roomForm.photos} onChange={(event) => setRoomForm({ ...roomForm, photos: event.target.value })} />
                  <label className="form-label" htmlFor="room-status">Inventory status</label>
                  <select className="form-select mb-3" id="room-status" value={roomForm.status} onChange={(event) => setRoomForm({ ...roomForm, status: event.target.value })}>{['available', 'maintenance', 'out_of_service'].map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}</select>
                  <label className="form-label" htmlFor="room-amenities">Amenities <span className="text-secondary">(comma-separated)</span></label>
                  <input className="form-control mb-3" id="room-amenities" placeholder="Wi-Fi, Breakfast, City view" value={roomForm.amenities} onChange={(event) => setRoomForm({ ...roomForm, amenities: event.target.value })} />
                  <label className="form-label" htmlFor="room-description">Description</label>
                  <textarea className="form-control mb-4" id="room-description" rows="3" maxLength="1000" value={roomForm.description} onChange={(event) => setRoomForm({ ...roomForm, description: event.target.value })} />
                  <button className="btn btn-dark rounded-pill w-100 py-3" type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : editingRoomId ? 'Save room changes' : 'Add room to inventory'}
                  </button>
                </form>
              </section>}

              {tab === 'rooms' && <section className="management-panel inventory-panel">
                <div className="management-heading"><div><p className="eyebrow">{rooms.length} TOTAL ROOMS</p><h2>All inventory</h2></div><span className="inventory-count">{availableRoomCount} available</span></div>
                {rooms.length ? (
                  <div className="table-responsive inventory-table-wrap">
                    <table className="table inventory-table align-middle">
                      <thead><tr><th>Room</th><th>Capacity</th><th>Units</th><th>Rent / night</th><th>Status</th><th>Active</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
                      <tbody>{rooms.map((room) => (
                        <tr key={room.id}>
                          <td><strong>{room.roomNumber}</strong><small className="d-block text-capitalize">{room.type}</small></td>
                          <td>{room.capacity} guests</td>
                          <td>{room.count}</td>
                          <td>{formatCurrency(room.rent)}</td>
                          <td><StatusBadge status={room.status} /></td>
                          <td><span className={`active-indicator${room.isActive ? ' is-active' : ''}`}>{room.isActive ? 'Yes' : 'No'}</span></td>
                          <td className="text-end"><div className="d-flex justify-content-end gap-2">{room.isActive ? <><button className="table-action" type="button" onClick={() => editRoom(room)}>Edit</button><button className="table-action table-action-danger" type="button" disabled={actionId === `room-${room.id}`} onClick={() => removeRoom(room)}>{actionId === `room-${room.id}` ? '…' : 'Remove'}</button></> : <button className="table-action" type="button" disabled={actionId === `room-${room.id}`} onClick={() => restoreRoom(room)}>{actionId === `room-${room.id}` ? '…' : 'Restore'}</button>}</div></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <div className="inline-empty">No rooms in inventory yet. Add your first room using the form.</div>}
              </section>}
            </div>
          )}

          {tab === 'bookings' && (
            <section className="management-panel admin-bookings-panel">
              <div className="management-heading"><div><p className="eyebrow">GUEST JOURNEYS</p><h2>All bookings</h2></div><label className="booking-filter"><span className="visually-hidden">Filter by booking status</span><select className="form-select" value={bookingStatus} onChange={(event) => { setBookingsPage(1); setBookingStatus(event.target.value); }}>{bookingStatuses.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label></div>
              {bookings.length ? (
                <div className="table-responsive admin-bookings-table-wrap">
                  <table className="table inventory-table bookings-table align-middle">
                    <thead><tr><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Booking</th><th>Payment</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
                    <tbody>{bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td><strong>{booking.userid?.name ?? booking.username ?? 'Guest'}</strong><small className="d-block text-secondary">{booking.userid?.email ?? ''}</small></td>
                        <td><strong>{booking.roomid?.roomNumber ?? '—'}</strong><small className="d-block text-capitalize">{booking.type ?? booking.roomid?.type ?? 'Room'}</small></td>
                        <td>{formatDate(booking.fromdate, { month: 'short', day: 'numeric' })}<small className="d-block text-secondary">to {formatDate(booking.todate, { month: 'short', day: 'numeric', year: 'numeric' })}</small></td>
                        <td>{formatCurrency(booking.totalAmount)}</td>
                        <td><StatusBadge status={booking.status === 'booked' ? 'active' : booking.status} /></td>
                        <td><StatusBadge status={booking.cardDetails?.paymentStatus} /></td>
                        <td className="text-end">
                          {['booked', 'checked-in'].includes(booking.status) && (
                            <button
                              className="table-action"
                              type="button"
                              disabled={
                                actionId === `booking-${booking.id}`
                              || (booking.status === 'booked' && booking.cardDetails?.paymentStatus !== 'paid')
                              }
                              title={booking.status === 'booked' && booking.cardDetails?.paymentStatus !== 'paid'
                                ? 'Payment must be paid before check-in.'
                                : undefined}
                              onClick={() => updateBookingState(booking)}
                            >
                              {actionId === `booking-${booking.id}`
                                ? '…'
                                : booking.status === 'booked' ? 'Check in' : 'Check out'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <div className="inline-empty">No bookings match this view.</div>}
              {bookingsPagination.pages > 1 && (
                <div className="d-flex align-items-center justify-content-between mt-3">
                  <span className="small text-secondary">Page {bookingsPagination.page} of {bookingsPagination.pages}</span>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-dark btn-sm rounded-pill" type="button" disabled={bookingsPage <= 1} onClick={() => setBookingsPage((page) => page - 1)}>Previous</button>
                    <button className="btn btn-outline-dark btn-sm rounded-pill" type="button" disabled={bookingsPage >= bookingsPagination.pages} onClick={() => setBookingsPage((page) => page + 1)}>Next</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === 'users' && (
            <section className="management-panel admin-bookings-panel">
              <div className="management-heading"><div><p className="eyebrow">HOTELPRO ACCOUNTS</p><h2>All users</h2></div><span className="inventory-count">{usersPagination.total} users</span></div>
              {users.length ? (
                <div className="table-responsive inventory-table-wrap">
                  <table className="table inventory-table align-middle">
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Type</th><th>Joined</th></tr></thead>
                    <tbody>{users.map((account) => (
                      <tr key={account.id}>
                        <td><strong>{account.name}</strong></td>
                        <td>{account.email}</td>
                        <td>{account.phone || '—'}</td>
                        <td><StatusBadge status={account.userType} /></td>
                        <td>{formatDate(account.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <div className="inline-empty">No user accounts were found.</div>}
              {usersPagination.pages > 1 && (
                <div className="d-flex align-items-center justify-content-between mt-3">
                  <span className="small text-secondary">Page {usersPagination.page} of {usersPagination.pages}</span>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-dark btn-sm rounded-pill" type="button" disabled={usersPage <= 1} onClick={() => setUsersPage((page) => page - 1)}>Previous</button>
                    <button className="btn btn-outline-dark btn-sm rounded-pill" type="button" disabled={usersPage >= usersPagination.pages} onClick={() => setUsersPage((page) => page + 1)}>Next</button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}
