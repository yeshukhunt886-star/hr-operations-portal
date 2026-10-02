import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const data =
        await api.getMyBookings();

      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        Loading bookings...
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Bookings</h1>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="booking-grid">
        {bookings.map((booking) => (
          <div
            className="booking-card"
            key={booking.id}
          >
            <h2>
              Booking #{booking.id}
            </h2>

            <p>
              <strong>Hotel:</strong>{" "}
              {booking.room?.hotel?.name}
            </p>

            <p>
              <strong>Room:</strong>{" "}
              {booking.room?.roomNumber}
            </p>

            <p>
              <strong>Type:</strong>{" "}
              {booking.room?.roomType}
            </p>

            <p>
              <strong>Check-in:</strong>{" "}
              {new Date(
                booking.checkIn
              ).toLocaleDateString()}
            </p>

            <p>
              <strong>Check-out:</strong>{" "}
              {new Date(
                booking.checkOut
              ).toLocaleDateString()}
            </p>

            <p>
              <strong>Guests:</strong>{" "}
              {booking.guests}
            </p>

            <p>
              <strong>Total:</strong>{" "}
              ₹{booking.totalAmount}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`status ${booking.status.toLowerCase()}`}
              >
                {booking.status}
              </span>
            </p>

            <Link
              to={`/bookings/${booking.id}`}
              className="button"
            >
              View Details
            </Link>
          </div>
        ))}
      </div>

      {!bookings.length && (
        <div className="empty">
          You have no bookings yet.
        </div>
      )}
    </div>
  );
}

export default MyBookings;