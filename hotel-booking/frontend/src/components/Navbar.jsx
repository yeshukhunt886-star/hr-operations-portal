import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/hotels" className="logo">
          Hotel Booking
        </Link>

        <div className="nav-links">
          {token ? (
            <>
              <Link to="/hotels">Hotels</Link>
              <Link to="/my-bookings">My Bookings</Link>

              {role === "ADMIN" && (
                <Link to="/admin/bookings">
                  Admin Bookings
                </Link>
              )}

              <button onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;