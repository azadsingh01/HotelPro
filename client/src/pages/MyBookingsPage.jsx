import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/client.js';
import PageLoader from '../components/PageLoader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function MyBookingsPage() {
  const showToast = useToast();
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState('');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bookings/my', { params: { limit: 100 } });
      const nextBookings = data.bookings;
      setBookings(nextBookings);

      const paymentPairs = await Promise.all(nextBookings
        .filter((booking) => booking.paymentStatus !== 'unpaid')
        .map(async (booking) => {
          try {
            const paymentResult = await api.get(`/bookings/${booking.id}/payments`);
            return [booking.id, paymentResult.data.payments[0] ?? null];
          } catch {
            return [booking.id, null];
          }
        }));

      setPayments(Object.fromEntries(paymentPairs));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Your bookings could not be loaded.'), 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  async function runAction(booking, action, task) {
    setActionKey(`${booking.id}-${action}`);

    try {
      await task();
      await loadBookings();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'That action could not be completed.'), 'danger');
    } finally {
      setActionKey('');
    }
  }

  function startPayment(booking) {
    return runAction(booking, 'pay', async () => {
      const { data } = await api.post(`/bookings/${booking.id}/payments`);
      setPayments((current) => ({ ...current, [booking.id]: data.payment }));
      showToast('Mock payment started. Complete it to confirm payment.');
    });
  }

  function completePayment(booking) {
    const payment = payments[booking.id];
    if (!payment) return startPayment(booking);

    return runAction(booking, 'complete', async () => {
      await api.post(`/payments/${payment.id}/mock-complete`);
      showToast('Payment marked as paid.');
    });
  }

  function refundPayment(booking) {
    const payment = payments[booking.id];
    if (!payment) return;

    return runAction(booking, 'refund', async () => {
      await api.post(`/payments/${payment.id}/refund`);
      showToast('Payment refunded. You can now cancel this booking if needed.');
    });
  }

  function cancelBooking(booking) {
    return runAction(booking, 'cancel', async () => {
      await api.patch(`/bookings/${booking.id}/cancel`);
      showToast('Booking cancelled.');
    });
  }

  return (
    <section className="container page-section">
      <div className="page-heading">
        <div><p className="eyebrow">YOUR TRIP LIST</p><h1>My bookings</h1></div>
        <Link className="btn btn-dark rounded-pill px-4" to="/rooms">Find another room <span aria-hidden="true">↗</span></Link>
      </div>

      {loading ? <PageLoader label="Gathering your trip details" /> : bookings.length ? (
        <div className="booking-list">
          {bookings.map((booking) => {
            const payment = payments[booking.id];
            const canCancel = booking.status === 'booked' && ['unpaid', 'refunded'].includes(booking.paymentStatus);
            const isWorking = actionKey.startsWith(`${booking.id}-`);

            return (
              <article className="booking-list-card" key={booking.id}>
                <div className="booking-list-main">
                  <div className="booking-room-icon" aria-hidden="true">⌂</div>
                  <div className="booking-list-info">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                      <p className="eyebrow mb-0">ROOM {booking.room?.roomNumber ?? '—'}</p>
                      <StatusBadge status={booking.status} />
                    </div>
                    <h2 className="h5 text-capitalize mb-1">{booking.room?.type ?? 'Hotel'} room</h2>
                    <p className="booking-dates mb-0">{formatDate(booking.checkIn)} <span>→</span> {formatDate(booking.checkOut)} · {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}</p>
                  </div>
                </div>
                <div className="booking-list-payment">
                  <span className="small text-secondary">Booking total</span>
                  <strong>{formatCurrency(booking.totalAmount)}</strong>
                  <div className="d-flex align-items-center gap-2"><span className="small text-secondary">Payment</span><StatusBadge status={booking.paymentStatus} /></div>
                </div>
                <div className="booking-list-actions">
                  {booking.status === 'booked' && booking.paymentStatus === 'unpaid' && (
                    <button className="btn btn-dark rounded-pill" type="button" onClick={() => startPayment(booking)} disabled={isWorking}>
                      {actionKey === `${booking.id}-pay` ? 'Starting…' : 'Start payment'}
                    </button>
                  )}
                  {booking.status === 'booked' && booking.paymentStatus === 'pending' && (
                    <button className="btn btn-dark rounded-pill" type="button" onClick={() => completePayment(booking)} disabled={isWorking}>
                      {actionKey === `${booking.id}-complete` ? 'Completing…' : 'Complete mock payment'}
                    </button>
                  )}
                  {booking.status === 'booked' && booking.paymentStatus === 'paid' && (
                    <button className="btn btn-outline-dark rounded-pill" type="button" onClick={() => refundPayment(booking)} disabled={isWorking || !payment}>
                      {actionKey === `${booking.id}-refund` ? 'Refunding…' : 'Request full refund'}
                    </button>
                  )}
                  {canCancel && (
                    <button className="btn btn-link text-danger text-decoration-none" type="button" onClick={() => cancelBooking(booking)} disabled={isWorking}>
                      {actionKey === `${booking.id}-cancel` ? 'Cancelling…' : 'Cancel booking'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state"><span className="empty-state-mark">↗</span><h2>Your next trip starts here</h2><p>There are no bookings on your account yet.</p><Link className="btn btn-dark rounded-pill px-4" to="/rooms">Find a room</Link></div>
      )}
    </section>
  );
}
