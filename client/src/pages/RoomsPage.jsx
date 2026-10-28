import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/client.js';
import PageLoader from '../components/PageLoader.jsx';
import RoomCard from '../components/RoomCard.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { todayDateInput } from '../utils/format.js';

const roomTypes = [
  { value: '', label: 'Any room type' },
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'twin', label: 'Twin' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'suite', label: 'Suite' },
  { value: 'family', label: 'Family' },
];

function readFilters(params) {
  return {
    type: params.get('type') ?? '',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    capacity: params.get('capacity') ?? '',
    checkIn: params.get('checkIn') ?? '',
    checkOut: params.get('checkOut') ?? '',
  };
}

export default function RoomsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const showToast = useToast();
  const initialFilters = useMemo(() => readFilters(new URLSearchParams(queryString)), [queryString]);
  const [filters, setFilters] = useState(initialFilters);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    setFilters(readFilters(new URLSearchParams(queryString)));
  }, [queryString]);

  useEffect(() => {
    const controller = new AbortController();
    const uiParams = new URLSearchParams(queryString);
    if (!uiParams.has('checkIn') || !uiParams.has('checkOut')) {
      setRooms([]);
      setLoading(false);
      setErrorMessage('');
      return () => controller.abort();
    }
    const params = Object.fromEntries(['type', 'capacity'].flatMap((key) => (
      uiParams.has(key) ? [[key, uiParams.get(key)]] : []
    )));
    if (uiParams.has('minPrice')) params.minRent = uiParams.get('minPrice');
    if (uiParams.has('maxPrice')) params.maxRent = uiParams.get('maxPrice');
    if (uiParams.has('checkIn')) params.fromdate = uiParams.get('checkIn');
    if (uiParams.has('checkOut')) params.todate = uiParams.get('checkOut');
    setLoading(true);
    setErrorMessage('');

    api.get('/rooms', { params, signal: controller.signal })
      .then(({ data }) => setRooms(data.rooms))
      .catch((error) => {
        if (error.code === 'ERR_CANCELED') return;
        const message = getApiErrorMessage(error, 'Rooms could not be loaded.');
        setErrorMessage(message);
        showToast(message, 'danger');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [queryString, reloadNonce, showToast]);

  function updateField(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (Boolean(filters.checkIn) !== Boolean(filters.checkOut)) {
      showToast('Choose both check-in and check-out dates.', 'danger');
      return;
    }

    if (!filters.checkIn || !filters.checkOut) {
      showToast('Choose your dates first to check room availability.', 'danger');
      return;
    }

    if (filters.checkIn && filters.checkIn < todayDateInput()) {
      showToast('Check-in cannot be in the past.', 'danger');
      return;
    }

    if (filters.checkIn && filters.checkOut <= filters.checkIn) {
      showToast('Check-out must be after check-in.', 'danger');
      return;
    }

    const next = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    setSearchParams(next);
  }

  function clearFilters() {
    setFilters({ type: '', minPrice: '', maxPrice: '', capacity: '', checkIn: '', checkOut: '' });
    setSearchParams({});
  }

  const bookingQuery = filters.checkIn && filters.checkOut
    ? `?${new URLSearchParams({ checkIn: filters.checkIn, checkOut: filters.checkOut })}`
    : '';

  return (
    <section className="container page-section">
      <div className="page-heading page-heading-wide">
        <div><p className="eyebrow">FIND YOUR ROOM</p><h1>A stay that fits.</h1></div>
        <p className="page-heading-copy">A few good options, picked around your plans. Find the room that feels right.</p>
      </div>

      <form className="filter-panel" onSubmit={handleSubmit}>
        <label className="filter-field">
          <span>Room type</span>
          <select name="type" value={filters.type} onChange={updateField}>
            {roomTypes.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Min price / night</span>
          <input name="minPrice" type="number" min="0" step="0.01" placeholder="Any" value={filters.minPrice} onChange={updateField} />
        </label>
        <label className="filter-field">
          <span>Max price / night</span>
          <input name="maxPrice" type="number" min="0" step="0.01" placeholder="Any" value={filters.maxPrice} onChange={updateField} />
        </label>
        <label className="filter-field">
          <span>Guests</span>
          <select name="capacity" value={filters.capacity} onChange={updateField}>
            <option value="">Any number</option>
            {[1, 2, 3, 4, 5, 6].map((count) => <option value={count} key={count}>{count}+ guests</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Check in</span>
          <input name="checkIn" type="date" min={todayDateInput()} value={filters.checkIn} onChange={updateField} />
        </label>
        <label className="filter-field">
          <span>Check out</span>
          <input name="checkOut" type="date" min={filters.checkIn || todayDateInput()} value={filters.checkOut} onChange={updateField} />
        </label>
        <div className="filter-actions">
          <button className="btn btn-dark rounded-pill px-4" type="submit">Search rooms <span aria-hidden="true">→</span></button>
          <button className="btn btn-link text-secondary text-decoration-none" type="button" onClick={clearFilters}>Clear</button>
        </div>
      </form>

      <div className="results-heading">
        <div><p className="eyebrow mb-1">AVAILABLE TO BOOK</p><h2 className="h4 mb-0">{loading ? 'Finding rooms…' : `${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'} to explore`}</h2></div>
        {filters.checkIn && filters.checkOut && <span className="date-chip">{filters.checkIn} <span>→</span> {filters.checkOut}</span>}
      </div>

      {loading ? <PageLoader label="Finding a room for you" /> : errorMessage ? (
        <div className="empty-state"><span className="empty-state-mark">!</span><h3>We couldn’t load rooms</h3><p>{errorMessage}</p><button className="btn btn-outline-dark rounded-pill px-4" type="button" onClick={() => setReloadNonce((value) => value + 1)}>Try again</button></div>
      ) : rooms.length ? (
        <div className="row g-4 room-grid">
          {rooms.map((room) => <div className="col-sm-6 col-xl-4" key={room.id}><RoomCard room={room} searchParams={bookingQuery} /></div>)}
        </div>
      ) : filters.checkIn && filters.checkOut ? (
        <div className="empty-state"><span className="empty-state-mark">⌂</span><h3>No rooms match just yet</h3><p>Try a wider price range, different dates, or fewer guests.</p><button className="btn btn-outline-dark rounded-pill px-4" type="button" onClick={clearFilters}>Clear filters</button></div>
      ) : <div className="empty-state"><span className="empty-state-mark">⌂</span><h3>Choose your dates first</h3><p>Pick a check-in and check-out date to see available rooms.</p></div>}
    </section>
  );
}
