import {
  Link,
  useLocation,
  useParams,
} from "react-router-dom";

function BookingConfirmation() {
  const location = useLocation();
  const { id } = useParams();

  const booking =
    location.state?.booking;

  return (
    <div className="page">
      <div className="confirmation-card">
        <div className="success-icon">
          ✓
        </div>

        <h1>
          Booking Confirmed!
        </h1>

        <p>
          Your hotel booking was
          successfully created.
        </p>

        <div className="confirmation-info">
          <p>
            <strong>
              Booking ID:
            </strong>{" "}
            #{booking?.id || id}
          </p>

          {booking && (
            <>
              <p>
                <strong>
                  Check-in:
                </strong>{" "}
                {new Date(
                  booking.checkIn
                ).toLocaleDateString()}
              </p>

              <p>
                <strong>
                  Check-out:
                </strong>{" "}
                {new Date(
                  booking.checkOut
                ).toLocaleDateString()}
              </p>

              <p>
                <strong>
                  Guests:
                </strong>{" "}
                {booking.guests}
              </p>

              <p>
                <strong>
                  Total:
                </strong>{" "}
                ₹{booking.totalAmount}
              </p>

              <p>
                <strong>
                  Status:
                </strong>{" "}
                {booking.status}
              </p>
            </>
          )}
        </div>

        <div className="button-row">
          <Link
            to="/my-bookings"
            className="button"
          >
            My Bookings
          </Link>

          <Link
            to="/hotels"
            className="button secondary"
          >
            Browse Hotels
          </Link>
        </div>
      </div>
    </div>
  );
}

export default BookingConfirmation;