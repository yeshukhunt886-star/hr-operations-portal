import { useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { api } from "../services/api";

function Booking() {
  const location = useLocation();
  const navigate = useNavigate();

  const room = location.state?.room;
  const hotel = location.state?.hotel;

  const [form, setForm] = useState({
    checkIn: "",
    checkOut: "",
    guests: 1,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!room || !hotel) {
    return (
      <div className="page">
        <h2>Booking information not found.</h2>
      </div>
    );
  }

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);

      const data =
        await api.createBooking({
          roomId: room.id,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guests: Number(form.guests),
        });

      navigate(
        `/booking-confirmation/${data.booking.id}`,
        {
          state: {
            booking: data.booking,
          },
        }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="booking-container">
        <div className="booking-summary">
          <h1>Book Your Room</h1>

          <h2>{hotel.name}</h2>

          <p>
            Room {room.roomNumber}
          </p>

          <p>{room.roomType}</p>

          <p>
            ₹{room.price} / night
          </p>

          <p>
            Capacity: {room.capacity}
          </p>
        </div>

        <form
          className="booking-form"
          onSubmit={handleSubmit}
        >
          <h2>Booking Details</h2>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <label>
            Check-in
          </label>

          <input
            type="date"
            name="checkIn"
            value={form.checkIn}
            onChange={handleChange}
            required
          />

          <label>
            Check-out
          </label>

          <input
            type="date"
            name="checkOut"
            value={form.checkOut}
            onChange={handleChange}
            required
          />

          <label>
            Guests
          </label>

          <input
            type="number"
            name="guests"
            min="1"
            max={room.capacity}
            value={form.guests}
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Booking..."
              : "Confirm Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Booking;