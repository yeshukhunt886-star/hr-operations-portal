import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHotels();
  }, []);

  const loadHotels = async () => {
    try {
      setLoading(true);

      const data = await api.getHotels();

      setHotels(data.hotels || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page">Loading hotels...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Hotels</h1>
        <p>Find your perfect hotel</p>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="hotel-grid">
        {hotels.map((hotel) => (
          <div
            className="hotel-card"
            key={hotel.id}
          >
            {hotel.image ? (
              <img
                src={hotel.image}
                alt={hotel.name}
              />
            ) : (
              <div className="image-placeholder">
                Hotel
              </div>
            )}

            <div className="hotel-content">
              <h2>{hotel.name}</h2>

              <p className="location">
                {hotel.city}
              </p>

              <p>
                {hotel.address}
              </p>

              <p>
                ⭐ {hotel.rating}
              </p>

              <p className="description">
                {hotel.description}
              </p>

              <Link
                to={`/hotels/${hotel.id}`}
                className="button"
              >
                View Hotel
              </Link>
            </div>
          </div>
        ))}
      </div>

      {!hotels.length && (
        <p>No hotels found.</p>
      )}
    </div>
  );
}

export default Hotels;