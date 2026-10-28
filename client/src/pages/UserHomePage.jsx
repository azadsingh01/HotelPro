import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/client.js';
import PageLoader from '../components/PageLoader.jsx';
import RoomCard from '../components/RoomCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { todayDateInput } from '../utils/format.js';

export default function UserHomePage() {
  const { user } = useAuth();
  const showToast = useToast();
  const [fromdate, setFromdate] = useState('');
  const [todate, setTodate] = useState('');
  const [rooms, setRooms] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function findRooms(event) {
    event.preventDefault();
    if (!fromdate || !todate || todate <= fromdate || fromdate < todayDateInput()) {
      showToast('Choose a future check-in date and a later check-out date.', 'danger');
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const { data } = await api.get('/rooms', { params: { fromdate, todate } });
      setRooms(data.rooms);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Available rooms could not be loaded.');
      setError(message);
      showToast(message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  const searchParams = searched ? `?${new URLSearchParams({ checkIn: fromdate, checkOut: todate })}` : '';

  return (
    <>
      <section className="container user-home-hero">
        <div className="user-home-copy"><p className="eyebrow">YOUR HOTELPRO STAY</p><h1>Hi, {user?.name?.split(' ')[0] ?? 'there'}.</h1><p>Pick your dates and we’ll find a room that feels right.</p><div className="d-flex flex-wrap gap-2"><Link className="btn btn-outline-dark rounded-pill px-4" to="/my-bookings">My bookings</Link></div></div>
        <div className="user-home-callout"><span className="eyebrow">A GOOD PLACE TO LAND</span><h2>Make room for a little time away.</h2><p>Browse available rooms by date, compare the details, and book in a few simple steps.</p></div>
      </section>
      <section className="container page-section user-home-rooms">
        <div className="page-heading"><div><p className="eyebrow">ROOMS FOR YOUR DATES</p><h2 className="h1">Find availability</h2></div></div>
        <form className="filter-panel user-date-search" onSubmit={findRooms}>
          <label className="filter-field"><span>From</span><input type="date" min={todayDateInput()} value={fromdate} onChange={(event) => setFromdate(event.target.value)} required /></label>
          <label className="filter-field"><span>To</span><input type="date" min={fromdate || todayDateInput()} value={todate} onChange={(event) => setTodate(event.target.value)} required /></label>
          <div className="filter-actions"><button className="btn btn-dark rounded-pill px-4" type="submit" disabled={loading}>{loading ? 'Searching…' : 'Show available rooms →'}</button></div>
        </form>
        {loading ? <PageLoader label="Checking availability for your dates" /> : error ? <div className="empty-state"><h3>We couldn’t check those dates</h3><p>{error}</p></div> : searched && rooms.length ? <div className="row g-4 room-grid mt-2">{rooms.map((room) => <div className="col-sm-6 col-xl-4" key={room.id}><RoomCard room={room} searchParams={searchParams} /></div>)}</div> : searched ? <div className="empty-state"><span className="empty-state-mark">⌂</span><h3>No rooms available for those dates</h3><p>Try a different date range to see more options.</p></div> : <div className="empty-state"><span className="empty-state-mark">⌂</span><h3>Choose dates to get started</h3><p>We’ll show room types and prices that are available for your stay.</p></div>}
      </section>
    </>
  );
}
