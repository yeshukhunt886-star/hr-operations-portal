import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api } from "../services/api";

function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadBooking = async () => {
    try {
      const data =
        await api.getBookingById(id);

      setBooking(data.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [id]);

  const cancelBooking = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.cancelBooking(id);

      alert(
        "Booking cancelled successfully"
      );

      await loadBooking();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="page">
        Loading booking...
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

  if (!booking) {
    return (
      <div className="page">
        Booking not found.
      </div>
    );
  }

  return (
    <div className="page">
      <div className="booking-detail-card">
        <h1>
          Booking #{booking.id}
        </h1>

        <div className="detail-section">
          <h2>Hotel</h2>

          <p>
            {booking.room?.hotel?.name}
          </p>

          <p>
            {booking.room?.hotel?.city}
          </p>

          <p>
            {booking.room?.hotel?.address}
          </p>
        </div>

        <div className="detail-section">
          <h2>Room</h2>

          <p>
            Room Number:{" "}
            {booking.room?.roomNumber}
          </p>

          <p>
            Type:{" "}
            {booking.room?.roomType}
          </p>

          <p>
            Capacity:{" "}
            {booking.room?.capacity}
          </p>
        </div>

        <div className="detail-section">
          <h2>Booking</h2>

          <p>
            Check-in:{" "}
            {new Date(
              booking.checkIn
            ).toLocaleDateString()}
          </p>

          <p>
            Check-out:{" "}
            {new Date(
              booking.checkOut
            ).toLocaleDateString()}
          </p>

          <p>
            Guests: {booking.guests}
          </p>

          <p>
            Total: ₹{booking.totalAmount}
          </p>

          <p>
            Status:{" "}
            <span
              className={`status ${booking.status.toLowerCase()}`}
            >
              {booking.status}
            </span>
          </p>
        </div>

        <div className="button-row">
          <Link
            to="/my-bookings"
            className="button secondary"
          >
            Back
          </Link>

          {booking.status !==
            "CANCELLED" &&
            booking.status !==
              "COMPLETED" && (
              <button
                className="danger-button"
                onClick={cancelBooking}
              >
                Cancel Booking
              </button>
            )}
        </div>
      </div>
    </div>
  );
}

export default BookingDetails;