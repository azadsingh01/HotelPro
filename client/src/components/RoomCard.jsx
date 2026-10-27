import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/format.js';

const roomThemes = {
  single: 'room-art-sand',
  double: 'room-art-sage',
  twin: 'room-art-blue',
  suite: 'room-art-rose',
  family: 'room-art-sand',
};

export default function RoomCard({ room, searchParams = '' }) {
  return (
    <article className="room-card card h-100">
      <div className={`room-art ${roomThemes[room.type] ?? 'room-art-sage'}`} aria-hidden="true">
        <span className="room-art-label">{room.type?.replaceAll('_', ' ')}</span>
        <span className="room-art-window" />
        <span className="room-art-bed" />
        <span className="room-art-plant">✦</span>
      </div>
      <div className="card-body d-flex flex-column p-4">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
          <div>
            <p className="eyebrow mb-1">Room {room.roomNumber}</p>
            <h3 className="h5 mb-0 text-capitalize">{room.type} room</h3>
          </div>
          <span className="room-capacity">Up to {room.capacity}</span>
        </div>
        <p className="room-description text-secondary mb-3">
          {room.description || 'A comfortable, thoughtfully prepared room for your stay.'}
        </p>
        <div className="room-amenities mb-4">
          {(room.amenities ?? []).slice(0, 3).map((amenity) => (
            <span key={amenity}>{amenity}</span>
          ))}
          {!room.amenities?.length && <span>Made for a restful stay</span>}
        </div>
        <div className="mt-auto d-flex align-items-end justify-content-between gap-3">
          <p className="room-rate mb-0">
            <strong>{formatCurrency(room.pricePerNight)}</strong>
            <span> / night</span>
          </p>
          <Link className="btn btn-outline-dark rounded-pill px-3" to={`/rooms/${room.id}${searchParams}`}>
            View room <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
