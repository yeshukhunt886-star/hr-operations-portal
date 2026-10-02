import {
  Link,
  Outlet,
  useNavigate,
} from "react-router-dom";

function Navbar() {
  const navigate =
    useNavigate();

  const user = JSON.parse(
    localStorage.getItem(
      "vault_user"
    ) || "null"
  );

  const logout = () => {
    localStorage.removeItem(
      "vault_token"
    );

    localStorage.removeItem(
      "vault_user"
    );

    navigate("/login");
  };

  return (
    <>
      <header className="navbar">

        <Link
          to="/dashboard"
          className="brand"
        >
          🔐 Secure Vault
        </Link>

        <nav>

          <Link to="/dashboard">
            Dashboard
          </Link>

          <Link to="/documents">
            My Documents
          </Link>

          <Link to="/documents/upload">
            Upload
          </Link>

          <Link to="/shared">
            Shared With Me
          </Link>

        </nav>

        <div className="nav-user">

          <span>
            {user?.name ||
              user?.email ||
              "User"}
          </span>

          <button
            onClick={logout}
            className="logout-button"
          >
            Logout
          </button>

        </div>

      </header>

      <main className="page-container">
        <Outlet />
      </main>
    </>
  );
}

export default Navbar;