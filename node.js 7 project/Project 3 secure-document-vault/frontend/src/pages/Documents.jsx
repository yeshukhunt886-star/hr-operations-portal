import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getDocuments,
  deleteDocument,
  restoreDocument,
  downloadDocument,
} from "../api/api";

function Documents() {
  const [documents, setDocuments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadDocuments =
    async () => {
      try {
        setLoading(true);

        const response =
          await getDocuments();

        setDocuments(
          response.data.documents ||
          response.data.data ||
          []
        );

      } catch (error) {
        setError(
          error.response?.data
            ?.message ||
          "Unable to load documents."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDelete =
    async (id) => {
      if (
        !window.confirm(
          "Delete this document?"
        )
      ) {
        return;
      }

      try {
        await deleteDocument(id);

        await loadDocuments();
      } catch (error) {
        alert(
          error.response?.data
            ?.message ||
          "Unable to delete document."
        );
      }
    };

  const handleRestore =
    async (id) => {
      try {
        await restoreDocument(id);

        await loadDocuments();
      } catch (error) {
        alert(
          error.response?.data
            ?.message ||
          "Unable to restore document."
        );
      }
    };

  const handleDownload =
    async (id, filename) => {
      try {
        const response =
          await downloadDocument(id);

        const url =
          window.URL.createObjectURL(
            new Blob([
              response.data,
            ])
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href = url;
        anchor.download =
          filename ||
          "document";

        document.body.appendChild(
          anchor
        );

        anchor.click();

        anchor.remove();

        window.URL.revokeObjectURL(
          url
        );

      } catch (error) {
        alert(
          error.response?.data
            ?.message ||
          "Download failed."
        );
      }
    };

  if (loading) {
    return (
      <div className="loading">
        Loading documents...
      </div>
    );
  }

  return (
    <div>

      <div className="page-header">

        <div>
          <h1>
            My Documents
          </h1>

          <p>
            Manage your private files.
          </p>
        </div>

        <Link
          to="/documents/upload"
          className="primary-button"
        >
          + Upload Document
        </Link>

      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="empty-state">
          <h2>
            No documents
          </h2>

          <p>
            Upload your first document.
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
                  📄
                </div>

                <h3>
                  {
                    doc.originalFilename ||
                    doc.original_filename
                  }
                </h3>

                <p>
                  {doc.mimeType ||
                    doc.mime_type ||
                    "Unknown type"}
                </p>

                <p>
                  {formatBytes(
                    doc.fileSize ||
                    doc.file_size ||
                    0
                  )}
                </p>

                <span
                  className={
                    doc.status ===
                    "active"
                      ? "status-active"
                      : "status-deleted"
                  }
                >
                  {doc.status}
                </span>

                <div className="document-actions">

                  <Link
                    to={`/documents/${doc.id}`}
                    className="secondary-button"
                  >
                    View
                  </Link>

                  {doc.status ===
                  "active" && (
                    <>
                      <button
                        onClick={() =>
                          handleDownload(
                            doc.id,
                            doc.originalFilename ||
                              doc.original_filename
                          )
                        }
                        className="secondary-button"
                      >
                        Download
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(
                            doc.id
                          )
                        }
                        className="danger-button"
                      >
                        Delete
                      </button>
                    </>
                  )}

                  {doc.status !==
                    "active" && (
                    <button
                      onClick={() =>
                        handleRestore(
                          doc.id
                        )
                      }
                      className="success-button"
                    >
                      Restore
                    </button>
                  )}

                </div>

              </div>

            )
          )}

        </div>

      )}

    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) {
    return "0 Bytes";
  }

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
  ];

  const index =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return `${(
    bytes /
    Math.pow(1024, index)
  ).toFixed(2)} ${units[index]}`;
}

export default Documents;