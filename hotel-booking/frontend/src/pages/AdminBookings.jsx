import { useEffect, useState } from "react";
import { api } from "../services/api";

function AdminBookings() {
  const [bookings, setBookings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const data =
        await api.getAllBookings();

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
        <h1>Admin Bookings</h1>

        <p>
          Total bookings:{" "}
          {bookings.length}
        </p>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Hotel</th>
              <th>Room</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Guests</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>
                  #{booking.id}
                </td>

                <td>
                  <strong>
                    {booking.user?.name}
                  </strong>
                  <br />
                  {booking.user?.email}
                </td>

                <td>
                  {booking.room?.hotel?.name}
                </td>

                <td>
                  {booking.room?.roomNumber}
                </td>

                <td>
                  {new Date(
                    booking.checkIn
                  ).toLocaleDateString()}
                </td>

                <td>
                  {new Date(
                    booking.checkOut
                  ).toLocaleDateString()}
                </td>

                <td>
                  {booking.guests}
                </td>

                <td>
                  ₹{booking.totalAmount}
                </td>

                <td>
                  <span
                    className={`status ${booking.status.toLowerCase()}`}
                  >
                    {booking.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminBookings;