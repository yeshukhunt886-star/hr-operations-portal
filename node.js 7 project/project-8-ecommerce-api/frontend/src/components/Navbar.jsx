import { Link } from "react-router-dom";

function Navbar({ onLogout }) {
  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  return (
    <nav className="navbar">
      <h2>E-Commerce Store</h2>

      <div className="navbar-links">
        <Link to="/">Dashboard</Link>
        <Link to="/products">Products</Link>
        <Link to="/categories">Categories</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/orders">My Orders</Link>

        {user?.role === "ADMIN" && (
          <Link to="/admin">
            Admin Dashboard
          </Link>
        )}

        <button
          type="button"
          className="logout-button"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;