import {
  Link,
} from "react-router-dom";

function Dashboard() {
  const user = JSON.parse(
    localStorage.getItem(
      "vault_user"
    ) || "null"
  );

  return (
    <div>

      <div className="page-header">

        <div>
          <h1>
            Welcome to Secure Vault
          </h1>

          <p>
            Manage your private documents
            securely.
          </p>
        </div>

      </div>

      <div className="dashboard-grid">

        <Link
          to="/documents"
          className="dashboard-card"
        >
          <span className="card-icon">
            📁
          </span>

          <h2>
            My Documents
          </h2>

          <p>
            View and manage your
            documents.
          </p>
        </Link>

        <Link
          to="/documents/upload"
          className="dashboard-card"
        >
          <span className="card-icon">
            ⬆️
          </span>

          <h2>
            Upload Document
          </h2>

          <p>
            Securely upload a new
            document.
          </p>
        </Link>

        <Link
          to="/shared"
          className="dashboard-card"
        >
          <span className="card-icon">
            🤝
          </span>

          <h2>
            Shared With Me
          </h2>

          <p>
            Documents shared with
            your account.
          </p>
        </Link>

      </div>

      {user && (
        <div className="profile-card">

          <h2>
            Account
          </h2>

          <p>
            <strong>Name:</strong>{" "}
            {user.name || "-"}
          </p>

          <p>
            <strong>Email:</strong>{" "}
            {user.email || "-"}
          </p>

          <p>
            <strong>Role:</strong>{" "}
            {user.role || "-"}
          </p>

        </div>
      )}

    </div>
  );
}

export default Dashboard;