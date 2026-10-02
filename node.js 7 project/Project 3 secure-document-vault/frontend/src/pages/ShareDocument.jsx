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

export default function SharedDocuments() {
  const [documents, setDocuments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD DOCUMENTS
  |--------------------------------------------------------------------------
  */

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");

      const response =
        await getDocuments();

      if (!response.success) {
        setError(
          response.message ||
            "Unable to fetch documents."
        );

        return;
      }

      setDocuments(
        response.documents || []
      );
    } catch (err) {
      console.error(
        "Shared documents error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to fetch shared documents."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadDocuments();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="shared-documents-page">

      <div className="page-header">

        <div>
          <h1>
            Shared Documents
          </h1>

          <p>
            Documents available to
            your account through
            controlled sharing.
          </p>
        </div>

      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">
          Loading documents...
        </div>
      ) : documents.length ===
        0 ? (
        <div className="empty-state">
          No documents available.
        </div>
      ) : (
        <div className="documents-grid">

          {documents.map(
            (document) => (

              <div
                className="document-card"
                key={document.id}
              >

                <div className="document-card-header">

                  <h2>
                    {document.originalFilename ||
                      document.original_filename ||
                      "Unnamed document"}
                  </h2>

                </div>

                <div className="document-card-body">

                  <p>
                    <strong>
                      Category:
                    </strong>{" "}
                    {document.category ||
                      "Uncategorized"}
                  </p>

                  <p>
                    <strong>
                      Description:
                    </strong>{" "}
                    {document.description ||
                      "No description"}
                  </p>

                  <p>
                    <strong>
                      Status:
                    </strong>{" "}
                    {document.status ||
                      "active"}
                  </p>

                </div>

                <div className="document-card-actions">

                  <Link
                    to={`/documents/${document.id}`}
                  >
                    View Document
                  </Link>

                  <Link
                    to={`/documents/${document.id}/share-links`}
                  >
                    Share Links
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