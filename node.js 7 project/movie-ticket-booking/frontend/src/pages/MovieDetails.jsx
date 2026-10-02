
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMovie, getShows } from "../services/api";

function MovieDetails() {
  const { id } = useParams();

  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const movieData = await getMovie(id);
      const showData = await getShows();

      setMovie(
        movieData.movie ||
        movieData.data ||
        movieData
      );

      const allShows =
        showData.shows ||
        showData.data ||
        (Array.isArray(showData) ? showData : []);

      setShows(
        allShows.filter(
          (show) =>
            Number(show.movieId) === Number(id)
        )
      );
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <main className="container">
        <div className="error">{error}</div>
      </main>
    );
  }

  if (!movie) {
    return (
      <main className="container">
        Loading...
      </main>
    );
  }

  return (
    <main className="container">
      <section className="movie-details">
        <div className="large-poster">
          🎬
        </div>

        <div>
          <h1>{movie.title}</h1>

          <p>{movie.description}</p>

          {movie.releaseDate && (
            <p>
              Release Date:{" "}
              {new Date(movie.releaseDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </section>

      <h2>Available Shows</h2>

      <div className="show-grid">
        {shows.length === 0 && (
          <p>No shows available.</p>
        )}

        {shows.map((show) => (
          <div className="show-card" key={show.id}>
            <h3>
              {show.theatre?.name || "Theatre"}
            </h3>

            <p>
              {show.screen?.name || "Screen"}
            </p>

            <p>
              {show.showDate
                ? new Date(show.showDate).toLocaleDateString()
                : ""}
            </p>

            <strong>
              {show.startTime
                ? new Date(show.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </strong>

            <p>
              ₹{show.ticketPrice}
            </p>

            <Link
              className="button"
              to={`/shows/${show.id}/seats`}
            >
              Select Seats
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}

export default MovieDetails;