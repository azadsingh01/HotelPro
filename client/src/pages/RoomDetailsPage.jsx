import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/client.js';
import PageLoader from '../components/PageLoader.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, getNights, todayDateInput } from '../utils/format.js';

const emptyPayment = { cardholdername: '', cardNumber: '', expmonthyear: '', cvv: '' };

export default function RoomDetailsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const showToast = useToast();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dates, setDates] = useState({
    checkIn: searchParams.get('checkIn') ?? '',
    checkOut: searchParams.get('checkOut') ?? '',
    guests: '1',
  });
  const [payment, setPayment] = useState(emptyPayment);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setRoom(null);
    api.get(`/rooms/${id}`)
      .then(({ data }) => { if (isMounted) setRoom(data.room); })
      .catch((error) => {
        if (isMounted) showToast(getApiErrorMessage(error, 'Room details could not be loaded.'), 'danger');
      })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [id, showToast]);

  const nights = getNights(dates.checkIn, dates.checkOut);
  const estimate = room ? nights * room.rent : 0;
  const validDates = dates.checkIn && dates.checkOut > dates.checkIn && dates.checkIn >= todayDateInput();

  function updateDate(event) {
    setDates((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updatePayment(event) {
    setPayment((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleBooking(event) {
    event.preventDefault();
    if (!validDates) {
      showToast('Choose valid future check-in and check-out dates.', 'danger');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/bookings', {
        roomid: room.id,
        fromdate: dates.checkIn,
        todate: dates.checkOut,
        guests: Number(dates.guests),
        cardDetails: payment,
      });
      setPayment(emptyPayment);
      showToast('Booking confirmed. Your mock payment was approved.');
      navigate('/my-bookings', { state: { newBookingId: data.booking.id } });
    } catch (error) {
      showToast(getApiErrorMessage(error, 'This room could not be booked.'), 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <section className="container page-section"><PageLoader label="Loading room details" /></section>;
  if (!room) {
    return <section className="container page-section"><div className="empty-state"><span className="empty-state-mark">⌂</span><h2>Room not found</h2><p>This room may no longer be in active inventory.</p><Link className="btn btn-dark rounded-pill px-4" to="/rooms">Back to rooms</Link></div></section>;
  }

  return (
    <section className="container page-section room-details-page">
      <Link className="back-link" to="/rooms">← Back to rooms</Link>
      <div className="room-detail-grid">
        <div className="room-detail-main">
          {room.photos?.[0] ? <img className="room-detail-photo" src={room.photos[0]} alt={`${room.type} room ${room.roomNumber}`} /> : (
            <div className={`room-detail-art room-art-${room.type === 'suite' ? 'rose' : room.type === 'twin' ? 'blue' : 'sage'}`} aria-hidden="true">
              <span className="detail-art-label">ROOM {room.roomNumber}</span><span className="detail-art-window" /><span className="detail-art-bed"><i /><i /></span><span className="detail-art-plant">✳</span><span className="detail-art-note">A place<br />to land.</span>
            </div>
          )}
          <div className="room-detail-copy">
            <p className="eyebrow">ROOM {room.roomNumber} · UP TO {room.capacity} GUESTS</p>
            <h1 className="text-capitalize">The {room.type} room</h1>
            <p className="lead-copy">{room.description || 'A comfortable, thoughtfully prepared room with space to settle in and make the stay your own.'}</p>
            <h2 className="h6 mt-4 mb-3">A few good details</h2>
            <div className="detail-amenities">{(room.amenities?.length ? room.amenities : ['Fresh linens', 'Thoughtful essentials', 'Room to unwind']).map((amenity) => <span key={amenity}><i aria-hidden="true">✓</i>{amenity}</span>)}</div>
          </div>
        </div>

        <aside className="booking-card card">
          <div className="booking-card-heading"><p className="eyebrow mb-1">MAKE IT YOURS</p><h2>Reserve this room</h2><p>Choose your dates and complete the mock payment.</p></div>
          <form onSubmit={handleBooking}>
            <label className="form-label" htmlFor="booking-check-in">Check in</label>
            <input className="form-control mb-3" id="booking-check-in" name="checkIn" type="date" min={todayDateInput()} value={dates.checkIn} onChange={updateDate} required />
            <label className="form-label" htmlFor="booking-check-out">Check out</label>
            <input className="form-control mb-3" id="booking-check-out" name="checkOut" type="date" min={dates.checkIn || todayDateInput()} value={dates.checkOut} onChange={updateDate} required />
            <label className="form-label" htmlFor="booking-guests">Guests</label>
            <select className="form-select mb-3" id="booking-guests" name="guests" value={dates.guests} onChange={updateDate}>{Array.from({ length: room.capacity }, (_, index) => index + 1).map((count) => <option value={count} key={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}</select>
            <div className="booking-estimate mb-3"><span>{formatCurrency(room.rent)} <small>per night</small></span><span className="d-block small text-secondary">{room.count} {room.count === 1 ? 'unit' : 'units'} in inventory</span>{nights > 0 && <strong>{nights} {nights === 1 ? 'night' : 'nights'} · {formatCurrency(estimate)}</strong>}</div>
            {validDates && <div className="border-top pt-3 mt-2">
              <p className="small fw-semibold mb-2">Mock payment</p>
              <label className="form-label" htmlFor="payment-cardholder">Cardholder name</label><input className="form-control mb-2" id="payment-cardholder" name="cardholdername" autoComplete="cc-name" minLength="2" maxLength="80" value={payment.cardholdername} onChange={updatePayment} required />
              <label className="form-label" htmlFor="payment-card-number">Card number</label><input className="form-control mb-2" id="payment-card-number" name="cardNumber" inputMode="numeric" autoComplete="cc-number" maxLength="23" value={payment.cardNumber} onChange={updatePayment} required />
              <div className="row g-2"><div className="col-7"><label className="form-label" htmlFor="payment-expiry">Expiry (MM/YY)</label><input className="form-control mb-2" id="payment-expiry" name="expmonthyear" placeholder="MM/YY" pattern="(0[1-9]|1[0-2])/[0-9]{2}" maxLength="5" autoComplete="cc-exp" value={payment.expmonthyear} onChange={updatePayment} required /></div><div className="col-5"><label className="form-label" htmlFor="payment-cvv">CVV</label><input className="form-control mb-2" id="payment-cvv" name="cvv" type="password" inputMode="numeric" autoComplete="cc-csc" pattern="[0-9]{3,4}" maxLength="4" value={payment.cvv} onChange={updatePayment} required /></div></div>
              <p className="small text-secondary mb-0">Mock only. Full card number and CVV are discarded and never stored.</p>
            </div>}
            <button className="btn btn-dark rounded-pill w-100 py-3 mt-3" type="submit" disabled={submitting || !validDates}>
              {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Booking…</> : 'Confirm and pay'}</button>
          </form>
        </aside>
      </div>
    </section>
  );
}
