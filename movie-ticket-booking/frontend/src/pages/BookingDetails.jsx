
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBooking();
  }, [id]);

  async function fetchBooking() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${API_URL}/bookings/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load booking");
      }

      setBooking(data.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading booking...</div>;
  }

  if (error) {
    return (
      <div>
        <h2>Booking Details</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/bookings")}>
          Back to My Bookings
        </button>
      </div>
    );
  }

  if (!booking) {
    return <div>Booking not found.</div>;
  }

  const seats = booking.bookingSeats || [];

  return (
    <div style={{ padding: "30px", maxWidth: "900px", margin: "auto" }}>
      <button onClick={() => navigate("/bookings")}>
        ← Back to My Bookings
      </button>

      <h1>Booking Details</h1>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "20px",
          marginTop: "20px",
        }}
      >
        <h2>{booking.bookingNumber}</h2>

        <p>
          <strong>Booking Status:</strong>{" "}
          {booking.bookingStatus}
        </p>

        <p>
          <strong>Payment Status:</strong>{" "}
          {booking.paymentStatus}
        </p>

        <p>
          <strong>Total Amount:</strong> ₹
          {Number(booking.totalAmount).toFixed(2)}
        </p>

        <p>
          <strong>Booking Date:</strong>{" "}
          {new Date(booking.createdAt).toLocaleString()}
        </p>
      </div>

      {booking.show && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "20px",
            marginTop: "20px",
          }}
        >
          <h2>Movie & Show</h2>

          <p>
            <strong>Movie:</strong>{" "}
            {booking.show.movie?.title || "N/A"}
          </p>

          <p>
            <strong>Theatre:</strong>{" "}
            {booking.show.theatre?.name || "N/A"}
          </p>

          <p>
            <strong>City:</strong>{" "}
            {booking.show.theatre?.city || "N/A"}
          </p>

          <p>
            <strong>Screen:</strong>{" "}
            {booking.show.screen?.name || "N/A"}
          </p>

          <p>
            <strong>Show Date:</strong>{" "}
            {new Date(booking.show.showDate).toLocaleDateString()}
          </p>

          <p>
            <strong>Show Time:</strong>{" "}
            {new Date(booking.show.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <p>
            <strong>Ticket Price:</strong> ₹
            {Number(booking.show.ticketPrice).toFixed(2)}
          </p>
        </div>
      )}

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "20px",
          marginTop: "20px",
        }}
      >
        <h2>Selected Seats</h2>

        {seats.length === 0 ? (
          <p>No seats found.</p>
        ) : (
          <ul>
            {seats.map((bookingSeat) => (
              <li key={bookingSeat.id}>
                {bookingSeat.showSeat?.seat?.seatLabel || "Seat"} — ₹
                {Number(bookingSeat.seatPrice).toFixed(2)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default BookingDetails;

