import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getShowSeats,
  createBooking,
} from "../services/api";

function SeatSelection() {
  const { showId } = useParams();
  const navigate = useNavigate();

  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    loadSeats();
  }, [showId]);

  async function loadSeats() {
    try {
      setLoading(true);
      setError("");

      const data = await getShowSeats(showId);

      console.log("Show seats API response:", data);

      setShow(data.show || null);

      const seatData = Array.isArray(data.seats)
        ? data.seats
        : [];

      setSeats(seatData);

      console.log("Seats loaded:", seatData);
    } catch (err) {
      console.error("Load seats error:", err);
      setError(err.message || "Failed to load seats");
    } finally {
      setLoading(false);
    }
  }

  function toggleSeat(seat) {
    const showSeatId = Number(seat.showSeatId);

    if (
      !Number.isInteger(showSeatId) ||
      showSeatId <= 0
    ) {
      return;
    }

    if (seat.status !== "AVAILABLE") {
      return;
    }

    setSelectedSeats((current) => {
      if (current.includes(showSeatId)) {
        return current.filter(
          (id) => id !== showSeatId
        );
      }

      return [...current, showSeatId];
    });
  }

  async function handleBooking() {
    if (selectedSeats.length === 0) {
      setError("Please select at least one seat.");
      return;
    }

    try {
      setBooking(true);
      setError("");

      console.log("Show ID:", Number(showId));
      console.log(
        "Selected ShowSeat IDs:",
        selectedSeats
      );

      const data = await createBooking(
        Number(showId),
        selectedSeats
      );

      console.log("Booking response:", data);

      const bookingData =
        data.booking || data.data || data;

      navigate("/booking/confirmation", {
        state: {
          booking: bookingData,
        },
      });
    } catch (err) {
      console.error("Booking error:", err);

      setError(
        err.message || "Booking failed"
      );

      await loadSeats();
      setSelectedSeats([]);
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <main className="container">
        <h1>Select Seats</h1>
        <p>Loading seats...</p>
      </main>
    );
  }

  const selectedSeatObjects = seats.filter(
    (seat) =>
      selectedSeats.includes(
        Number(seat.showSeatId)
      )
  );

  const total = selectedSeatObjects.reduce(
    (sum, seat) =>
      sum + Number(seat.price || 0),
    0
  );

  return (
    <main className="container">
      <h1>Select Seats</h1>

      {show && (
        <div className="show-info">
          <h2>
            {show.movie?.title || "Movie"}
          </h2>

          <p>
            Theatre:{" "}
            {show.theatre?.name || "-"}
          </p>

          <p>
            Screen:{" "}
            {show.screen?.name || "-"}
          </p>

          <p>
            Ticket Price: ₹
            {show.ticketPrice}
          </p>
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="screen">
        SCREEN
      </div>

      {seats.length === 0 ? (
        <div className="error">
          No seats available for this show.
          <br />
          Please generate show seats from
          Admin first.
        </div>
      ) : (
        <div className="seat-grid">
          {seats.map((seat) => {
            const showSeatId = Number(
              seat.showSeatId
            );

            const selected =
              selectedSeats.includes(
                showSeatId
              );

            const booked =
              seat.status !== "AVAILABLE";

            return (
              <button
                key={`show-seat-${showSeatId}`}
                type="button"
                className={`seat ${
                  selected
                    ? "selected"
                    : ""
                } ${
                  booked
                    ? "booked"
                    : ""
                }`}
                disabled={booked}
                onClick={() =>
                  toggleSeat(seat)
                }
              >
                {seat.seatLabel}
              </button>
            );
          })}
        </div>
      )}

      <div className="seat-legend">
        <span>
          🟩 Available
        </span>

        <span>
          🟦 Selected
        </span>

        <span>
          🟥 Booked
        </span>
      </div>

      <div className="booking-summary">
        <h2>
          Booking Summary
        </h2>

        <p>
          Selected seats:{" "}
          <strong>
            {selectedSeats.length}
          </strong>
        </p>

        <p>
          Total:{" "}
          <strong>
            ₹{total}
          </strong>
        </p>

        <button
          className="button"
          type="button"
          disabled={
            booking ||
            selectedSeats.length === 0
          }
          onClick={handleBooking}
        >
          {booking
            ? "Booking..."
            : "Confirm Booking"}
        </button>
      </div>
    </main>
  );
}

export default SeatSelection;
