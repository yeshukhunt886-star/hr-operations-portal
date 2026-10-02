import { useEffect, useState } from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import { api } from "../services/api";

function HotelDetails() {
  const { id } = useParams();

  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      const hotelData =
        await api.getHotelById(id);

      setHotel(
        hotelData.hotel || hotelData
      );

      try {
        const roomData =
          await api.getRoomsByHotel(id);

        setRooms(roomData.rooms || []);
      } catch {
        setRooms(
          hotelData.hotel?.rooms || []
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        Loading hotel...
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="error">
          {error}
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="page">
        Hotel not found.
      </div>
    );
  }

  return (
    <div className="page">
      <div className="hotel-detail">
        <div>
          {hotel.image ? (
            <img
              className="detail-image"
              src={hotel.image}
              alt={hotel.name}
            />
          ) : (
            <div className="detail-placeholder">
              Hotel
            </div>
          )}
        </div>

        <div>
          <h1>{hotel.name}</h1>

          <p>
            📍 {hotel.city}
          </p>

          <p>{hotel.address}</p>

          <p>
            ⭐ {hotel.rating}
          </p>

          <p>{hotel.description}</p>
        </div>
      </div>

      <h2 className="section-title">
        Available Rooms
      </h2>

      <div className="room-grid">
        {rooms.map((room) => (
          <div
            className="room-card"
            key={room.id}
          >
            <h3>
              Room {room.roomNumber}
            </h3>

            <p>
              Type: {room.roomType}
            </p>

            <p>
              Capacity: {room.capacity}
            </p>

            <p>
              ₹{room.price} / night
            </p>

            <p>
              Status: {room.status}
            </p>

            {room.status === "AVAILABLE" && (
              <Link
                to={`/booking/${room.id}`}
                state={{
                  hotel,
                  room,
                }}
                className="button"
              >
                Book Now
              </Link>
            )}
          </div>
        ))}
      </div>

      {!rooms.length && (
        <p>No rooms available.</p>
      )}
    </div>
  );
}

export default HotelDetails;