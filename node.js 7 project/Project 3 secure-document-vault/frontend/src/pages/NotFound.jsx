import {
  Link,
} from "react-router-dom";

function NotFound() {
  return (
    <div className="empty-state">

      <h1>
        404
      </h1>

      <h2>
        Page Not Found
      </h2>

      <Link
        to="/dashboard"
        className="primary-button"
      >
        Go to Dashboard
      </Link>

    </div>
  );
}

export default NotFound;