import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getDocument,
  downloadDocument,
  deleteDocument,
} from "../api/api";

function DocumentDetails() {
  const { id } =
    useParams();

  const [document, setDocument] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument =
    async () => {
      try {
        const response =
          await getDocument(id);

        setDocument(
          response.data.document
        );

      } catch (error) {
        setError(
          error.response?.data
            ?.message ||
          "Unable to load document."
        );
      } finally {
        setLoading(false);
      }
    };

  const handleDownload =
    async () => {
      try {
        const response =
          await downloadDocument(
            id
          );

        const url =
          window.URL.createObjectURL(
            response.data
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href = url;

        anchor.download =
          document.originalFilename;

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

  const handleDelete =
    async () => {
      if (
        !window.confirm(
          "Delete this document?"
        )
      ) {
        return;
      }

      try {
        await deleteDocument(id);

        await loadDocument();

      } catch (error) {
        alert(
          error.response?.data
            ?.message ||
          "Delete failed."
        );
      }
    };

  if (loading) {
    return (
      <div className="loading">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-box">
        {error}
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div>

      <div className="page-header">

        <div>
          <h1>
            {document.originalFilename}
          </h1>

          <p>
            Document details
          </p>
        </div>

        <Link
          to={`/documents/${id}/share`}
          className="primary-button"
        >
          Share User
        </Link>

        <Link
          to={`/documents/${id}/share-links`}
          className="secondary-button"
        >
          Share Links
        </Link>

      </div>

      <div className="details-card">

        <div className="detail-row">
          <strong>
            Filename
          </strong>

          <span>
            {document.originalFilename}
          </span>
        </div>

        <div className="detail-row">
          <strong>
            MIME Type
          </strong>

          <span>
            {document.mimeType}
          </span>
        </div>

        <div className="detail-row">
          <strong>
            Size
          </strong>

          <span>
            {formatBytes(
              document.fileSize
            )}
          </span>
        </div>

        <div className="detail-row">
          <strong>
            Category
          </strong>

          <span>
            {document.category ||
              "—"}
          </span>
        </div>

        <div className="detail-row">
          <strong>
            Description
          </strong>

          <span>
            {document.description ||
              "—"}
          </span>
        </div>

        <div className="detail-row">
          <strong>
            Hash
          </strong>

          <code>
            {document.fileHash ||
              "—"}
          </code>
        </div>

        <div className="detail-row">
          <strong>
            Status
          </strong>

          <span>
            {document.status}
          </span>
        </div>

      </div>

      <div className="action-row">

        {document.status ===
          "active" && (
          <>
            <button
              onClick={
                handleDownload
              }
              className="primary-button"
            >
              Download
            </button>

            <button
              onClick={
                handleDelete
              }
              className="danger-button"
            >
              Delete
            </button>
          </>
        )}

      </div>

    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 Bytes";

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
  ];

  const i =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return `${(
    bytes /
    Math.pow(1024, i)
  ).toFixed(2)} ${units[i]}`;
}

export default DocumentDetails;