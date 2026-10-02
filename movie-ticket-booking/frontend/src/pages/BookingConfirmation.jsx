import { Link, useLocation } from "react-router-dom";

function BookingConfirmation() {
  const location = useLocation();

  const booking = location.state?.booking;

  if (!booking) {
    return (
      <main className="container">
        <h1>Booking not found</h1>

        <Link to="/bookings">
          Go to My Bookings
        </Link>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="confirmation-card">
        <div className="success-icon">
          ✓
        </div>

        <h1>Booking Confirmed!</h1>

        <p>
          Your movie tickets have been booked
          successfully.
        </p>

        <div className="booking-info">
          <p>
            <strong>Booking Number:</strong>{" "}
            {booking.bookingNumber}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            {booking.bookingStatus}
          </p>

          <p>
            <strong>Payment:</strong>{" "}
            {booking.paymentStatus}
          </p>

          <p>
            <strong>Total:</strong>{" "}
            ₹{booking.totalAmount}
          </p>
        </div>

        <Link
          className="button"
          to={`/bookings/${booking.id}`}
        >
          View Booking
        </Link>
      </div>
    </main>
  );
}

export default BookingConfirmation;