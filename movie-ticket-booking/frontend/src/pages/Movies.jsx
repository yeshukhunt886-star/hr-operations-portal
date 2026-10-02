import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMovies } from "../services/api";

function Movies() {
  const [movies, setMovies] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovies();
  }, []);

  async function loadMovies() {
    try {
      const data = await getMovies();

      setMovies(
        data.movies ||
        data.data ||
        (Array.isArray(data) ? data : [])
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="container">Loading movies...</div>;
  }

  return (
    <main className="container">
      <h1>Movies</h1>

      {error && <div className="error">{error}</div>}

      <div className="movie-grid">
        {movies.map((movie) => (
          <div className="movie-card" key={movie.id}>
            <div className="movie-poster">
              🎬
            </div>

            <div className="movie-content">
              <h2>{movie.title}</h2>

              <p>
                {movie.description || "No description available"}
              </p>

              <Link to={`/movies/${movie.id}`}>
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default Movies;