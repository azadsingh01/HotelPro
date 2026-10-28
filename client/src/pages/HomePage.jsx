import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import RoomCard from '../components/RoomCard.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { todayDateInput } from '../utils/format.js';

function nextDate(dateString) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function HomePage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [checkIn, setCheckIn] = useState(todayDateInput());
  const [checkOut, setCheckOut] = useState(nextDate(todayDateInput()));
  const [guests, setGuests] = useState('2');
  const [rooms, setRooms] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/rooms')
      .then(({ data }) => { if (active) setRooms(data.rooms); })
      .catch(() => { if (active) { setRooms([]); setPreviewError('Room highlights are unavailable right now. Please try again later.'); } })
      .finally(() => { if (active) setPreviewLoading(false); });
    return () => { active = false; };
  }, []);

  const highlightedRoom = rooms.length ? rooms[highlightIndex % rooms.length] : null;

  function handleSearch(event) {
    event.preventDefault();

    if (checkOut <= checkIn) {
      showToast('Check-out must be after check-in.', 'danger');
      return;
    }

    const params = new URLSearchParams({ checkIn, checkOut, capacity: guests });
    navigate(`/rooms?${params.toString()}`);
  }

  return (
    <>
      <section className="container home-hero-wrap">
        <div className="home-hero">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow"><span className="eyebrow-line" /> YOUR NEXT GOOD STAY</p>
            <h1>Arrive well.<br /><span>Stay a little longer.</span></h1>
            <p className="hero-description">
              Thoughtful rooms, warm service, and the little details that make a trip feel like yours.
            </p>
            <div className="hero-links">
              <Link className="btn btn-lime rounded-pill px-4 py-3" to="/rooms">
                Explore rooms <span aria-hidden="true">↗</span>
              </Link>
              <span className="hero-note"><span className="note-dot" /> A calmer kind of check-in</span>
            </div>
            <div className="hero-proof">
              <div className="proof-avatars" aria-hidden="true"><span>AM</span><span>JL</span><span>RK</span></div>
              <p className="mb-0"><strong>Made for good mornings</strong><br /><span>and easy arrivals.</span></p>
            </div>
          </div>

          <div className="hero-art" aria-label="Featured hotel room carousel">
            {highlightedRoom?.photos?.[0] ? <img className="hero-highlight-image" src={highlightedRoom.photos[0]} alt={`${highlightedRoom.type} room ${highlightedRoom.roomNumber}`} /> : <>
              <div className="hero-art-sun" /><div className="hero-art-arch"><div className="hero-art-window"><span /><span /><span /><span /></div></div>
              <div className="hero-art-wall-frame"><i /><i /><i /></div><div className="hero-art-bed-back" /><div className="hero-art-bed"><span /><span /></div>
              <div className="hero-art-nightstand"><i /></div><div className="hero-art-plant"><i /><i /><i /><span /></div>
            </>}
            <div className="hero-art-caption"><span>{highlightedRoom ? `ROOM ${highlightedRoom.roomNumber} / ${highlightedRoom.type.toUpperCase()}` : '01 / THE SLOW MORNING'}<small>{highlightedRoom ? ` · $${highlightedRoom.rent} / NIGHT` : ''}</small></span><strong>{highlightedRoom ? 'Room to exhale.' : 'Room to exhale.'}</strong></div>
            <div className="hero-art-stamp">STAY<br />AWHILE</div>
            {rooms.length > 1 && <div className="hero-carousel-controls"><button type="button" aria-label="Previous featured room" onClick={() => setHighlightIndex((index) => (index - 1 + rooms.length) % rooms.length)}>←</button><span>{highlightIndex + 1} / {rooms.length}</span><button type="button" aria-label="Next featured room" onClick={() => setHighlightIndex((index) => (index + 1) % rooms.length)}>→</button></div>}
          </div>
        </div>

        <form className="search-panel" onSubmit={handleSearch}>
          <label className="search-field">
            <span>Check in</span>
            <input type="date" value={checkIn} min={todayDateInput()} onChange={(event) => setCheckIn(event.target.value)} required />
          </label>
          <label className="search-field">
            <span>Check out</span>
            <input type="date" value={checkOut} min={checkIn || todayDateInput()} onChange={(event) => setCheckOut(event.target.value)} required />
          </label>
          <label className="search-field search-field-guests">
            <span>Guests</span>
            <select value={guests} onChange={(event) => setGuests(event.target.value)}>
              {[1, 2, 3, 4, 5, 6].map((count) => <option value={count} key={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}
            </select>
          </label>
          <button className="btn btn-dark rounded-pill search-submit" type="submit">
            Find your room <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>

      <section className="container home-intro section-space" id="about">
        <div>
          <p className="eyebrow">A BETTER KIND OF GETAWAY</p>
          <h2>Good stays are<br />made of small things.</h2>
        </div>
        <p className="intro-copy">
          From the first hello to the last coffee, we make it easy to settle in and find your own rhythm.
        </p>
      </section>

      <section className="container benefit-grid pb-5">
        <article className="benefit-card benefit-card-primary">
          <span className="benefit-index">01</span>
          <span className="benefit-symbol">⌂</span>
          <h3>Space to unwind</h3>
          <p>Rooms with room to slow down, recharge, and feel at home.</p>
        </article>
        <article className="benefit-card benefit-card-sand">
          <span className="benefit-index">02</span>
          <span className="benefit-symbol">✳</span>
          <h3>The details, handled</h3>
          <p>Simple booking, clear details, and a team ready when you need us.</p>
        </article>
        <article className="benefit-card benefit-card-lime">
          <span className="benefit-index">03</span>
          <span className="benefit-symbol">↗</span>
          <h3>Easy from the start</h3>
          <p>Find a room, book your dates, and arrive with one less thing to think about.</p>
        </article>
      </section>

      <section className="container home-room-preview section-space">
        <div className="page-heading"><div><p className="eyebrow">A FEW GOOD PLACES TO STAY</p><h2 className="h1">Room highlights</h2></div><Link className="btn btn-outline-dark rounded-pill px-4" to="/rooms">Explore rooms ↗</Link></div>
        {previewLoading ? <div className="inline-empty">Loading room highlights…</div> : previewError ? <div className="alert alert-warning" role="status">{previewError}</div> : rooms.length ? <div className="row g-4">{rooms.slice(0, 3).map((room) => <div className="col-md-6 col-xl-4" key={room.id}><RoomCard room={room} /></div>)}</div> : <div className="inline-empty">Rooms will appear here once they are added to the inventory.</div>}
      </section>

      <section className="container home-cta mb-5">
        <div><p className="eyebrow text-white-50">A ROOM WITH YOUR NAME ON IT</p><h2>Make space for<br />something good.</h2></div>
        <Link className="btn btn-lime rounded-pill px-4 py-3" to="/rooms">See available rooms <span aria-hidden="true">↗</span></Link>
      </section>
    </>
  );
}
