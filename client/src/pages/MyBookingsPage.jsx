import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/client.js';
import PageLoader from '../components/PageLoader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function MyBookingsPage() {
  const { user } = useAuth();
  const showToast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState('');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bookings/my', { params: { limit: 100 } });
      setBookings(data.bookings);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Your bookings could not be loaded.'), 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  async function cancelBooking(booking) {
    setCancellingId(booking.id);
    try {
      await api.post('/bookings/cancel', { bookingId: booking.id });
      showToast('Booking cancelled.');
      await loadBookings();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'This booking could not be cancelled.'), 'danger');
    } finally {
      setCancellingId('');
    }
  }

  return (
    <section className="container page-section">
      <div className="page-heading"><div><p className="eyebrow">YOUR TRIP LIST</p><h1>My bookings</h1></div><Link className="btn btn-dark rounded-pill px-4" to="/rooms">Find another room <span aria-hidden="true">↗</span></Link></div>
      {loading ? <PageLoader label="Gathering your trip details" /> : bookings.length ? (
        <div className="booking-list">{bookings.map((booking) => {
          const cancelled = booking.status === 'cancelled';
          return <article className="booking-list-card" key={booking.id}>
            <div className="booking-list-main"><div className="booking-room-icon" aria-hidden="true">⌂</div><div className="booking-list-info">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2"><p className="eyebrow mb-0">BOOKING {booking.id}</p><StatusBadge status={cancelled ? 'cancelled' : booking.status === 'checked-out' ? 'checked-out' : 'active'} /></div>
              <h2 className="h5 text-capitalize mb-1">{booking.type ?? 'Hotel'} room</h2>
              <p className="booking-dates mb-1">{formatDate(booking.fromdate)} <span>→</span> {formatDate(booking.todate)} · {booking.totaldays} {booking.totaldays === 1 ? 'night' : 'nights'}</p>
              <p className="small text-secondary mb-0">Customer phone: {booking.phone ?? user?.phone ?? '—'}</p>
            </div></div>
            <div className="booking-list-payment"><span className="small text-secondary">Booking total</span><strong>{formatCurrency(booking.totalAmount)}</strong></div>
            <div className="booking-list-actions">{booking.status === 'booked' && !cancelled && <button className="btn btn-outline-danger rounded-pill" type="button" onClick={() => cancelBooking(booking)} disabled={cancellingId === booking.id}>{cancellingId === booking.id ? 'Cancelling…' : 'Cancel booking'}</button>}</div>
          </article>;
        })}</div>
      ) : <div className="empty-state"><span className="empty-state-mark">↗</span><h2>No bookings yet</h2><p>Your next trip starts here. Choose dates to find a room.</p><Link className="btn btn-dark rounded-pill px-4" to="/rooms">Find a room</Link></div>}
    </section>
  );
}
