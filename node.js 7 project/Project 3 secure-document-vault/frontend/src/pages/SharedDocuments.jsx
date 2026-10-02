import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getDocuments,
} from "../api/api";

function SharedDocuments() {
  const [documents, setDocuments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadSharedDocuments();
  }, []);

  const loadSharedDocuments =
    async () => {
      try {
        /*
         * This assumes your backend GET /documents
         * supports a shared filter.
         *
         * If your backend has a dedicated
         * /documents/shared endpoint, change
         * this to that endpoint.
         */
        const response =
          await getDocuments({
            shared: true,
          });

        setDocuments(
          response.data.documents ||
          []
        );

      } catch (error) {
        setError(
          error.response?.data
            ?.message ||
          "Unable to load shared documents."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div>

      <div className="page-header">

        <div>
          <h1>
            Shared With Me
          </h1>

          <p>
            Documents other users have
            shared with you.
          </p>
        </div>

      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">
          Loading...
        </div>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <h2>
            No shared documents
          </h2>

          <p>
            Documents shared with your
            account will appear here.
          </p>
        </div>
      ) : (

        <div className="document-grid">

          {documents.map(
            (doc) => (

              <div
                className="document-card"
                key={doc.id}
              >

                <div className="document-icon">
                  🤝
                </div>

                <h3>
                  {doc.originalFilename}
                </h3>

                <p>
                  {doc.mimeType}
                </p>

                <span className="status-active">
                  Shared
                </span>

                <div className="document-actions">

                  <Link
                    to={`/documents/${doc.id}`}
                    className="secondary-button"
                  >
                    View
                  </Link>

                </div>

              </div>

            )
          )}

        </div>

      )}

    </div>
  );
}

export default SharedDocuments;