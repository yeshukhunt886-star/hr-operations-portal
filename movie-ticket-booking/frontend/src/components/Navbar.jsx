import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo">
          MovieBooking
        </Link>

        <div className="nav-links">
          <Link to="/movies">Movies</Link>

          {token && <Link to="/bookings">My Bookings</Link>}

          {!token ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          ) : (
            <button onClick={logout}>Logout</button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;