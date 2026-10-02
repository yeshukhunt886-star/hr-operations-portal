import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyBookings } from "../services/api";

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      const data = await getMyBookings();

      setBookings(
        data.bookings ||
        data.data ||
        (Array.isArray(data) ? data : [])
      );
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="container">
      <h1>My Bookings</h1>

      {error && (
        <div className="error">{error}</div>
      )}

      {bookings.length === 0 && (
        <p>You don't have any bookings yet.</p>
      )}

      <div className="booking-list">
        {bookings.map((booking) => (
          <div
            className="booking-card"
            key={booking.id}
          >
            <h2>
              {booking.show?.movie?.title ||
                "Movie"}
            </h2>

            <p>
              Booking:{" "}
              <strong>
                {booking.bookingNumber}
              </strong>
            </p>

            <p>
              Seats:{" "}
              {booking.bookingSeats
                ?.map(
                  (item) =>
                    item.showSeat?.seat?.seatNumber ||
                    item.showSeat?.seat?.label ||
                    item.showSeatId
                )
                .join(", ")}
            </p>

            <p>
              Amount: ₹{booking.totalAmount}
            </p>

            <p>
              Status:{" "}
              <strong>
                {booking.bookingStatus}
              </strong>
            </p>

            <Link
              className="button"
              to={`/bookings/${booking.id}`}
            >
              View Details
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}

export default MyBookings;