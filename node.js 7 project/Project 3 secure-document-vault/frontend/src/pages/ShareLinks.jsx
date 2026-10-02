import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  createShareLink,
  getShareLinks,
  revokeShareLink,
} from "../api/api";

import "../styles/shareLinks.css";

export default function ShareLinks() {
  const { id } = useParams();

  const documentId = Number(id);

  const [shareLinks, setShareLinks] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [revokingId, setRevokingId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [expiresAt, setExpiresAt] =
    useState("");

  const [maxUses, setMaxUses] =
    useState("");

  const [createdToken, setCreatedToken] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD SHARE LINKS
  |--------------------------------------------------------------------------
  */

  async function loadShareLinks() {
    try {
      setLoading(true);
      setError("");

      const response =
        await getShareLinks(documentId);

      if (response.success) {
        setShareLinks(
          response.shareLinks || []
        );
      } else {
        setError(
          response.message ||
            "Unable to load share links."
        );
      }
    } catch (err) {
      console.error(
        "Load share links error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load share links."
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
    if (
      Number.isSafeInteger(documentId) &&
      documentId > 0
    ) {
      loadShareLinks();
    } else {
      setLoading(false);
      setError("Invalid document ID.");
    }
  }, [documentId]);

  /*
  |--------------------------------------------------------------------------
  | CREATE SHARE LINK
  |--------------------------------------------------------------------------
  */

  async function handleCreateLink(event) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setCreatedToken("");

    if (!expiresAt) {
      setError(
        "Expiration date and time are required."
      );
      return;
    }

    const expirationDate =
      new Date(expiresAt);

    if (
      Number.isNaN(
        expirationDate.getTime()
      )
    ) {
      setError(
        "Please enter a valid expiration date."
      );
      return;
    }

    if (
      expirationDate <= new Date()
    ) {
      setError(
        "Expiration must be in the future."
      );
      return;
    }

    let parsedMaxUses = null;

    if (
      maxUses !== "" &&
      maxUses !== null
    ) {
      parsedMaxUses = Number(maxUses);

      if (
        !Number.isSafeInteger(
          parsedMaxUses
        ) ||
        parsedMaxUses <= 0
      ) {
        setError(
          "Maximum uses must be a positive integer."
        );
        return;
      }
    }

    try {
      setCreating(true);

      const response =
        await createShareLink(
          documentId,
          {
            expiresAt:
              expirationDate.toISOString(),

            maxUses:
              parsedMaxUses,
          }
        );

      if (!response.success) {
        setError(
          response.message ||
            "Unable to create share link."
        );
        return;
      }

      /*
       * IMPORTANT:
       *
       * The raw token is returned only once.
       */
      const token =
        response.shareLink?.token;

      setCreatedToken(
        token || ""
      );

      setSuccess(
        "Share link created successfully."
      );

      setExpiresAt("");
      setMaxUses("");

      await loadShareLinks();
    } catch (err) {
      console.error(
        "Create share link error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to create share link."
      );
    } finally {
      setCreating(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | REVOKE SHARE LINK
  |--------------------------------------------------------------------------
  */

  async function handleRevoke(linkId) {
    const confirmed =
      window.confirm(
        "Are you sure you want to revoke this share link?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setRevokingId(linkId);
      setError("");
      setSuccess("");

      const response =
        await revokeShareLink(
          documentId,
          linkId
        );

      if (!response.success) {
        setError(
          response.message ||
            "Unable to revoke share link."
        );
        return;
      }

      setSuccess(
        "Share link revoked successfully."
      );

      await loadShareLinks();
    } catch (err) {
      console.error(
        "Revoke share link error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to revoke share link."
      );
    } finally {
      setRevokingId(null);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | COPY TOKEN
  |--------------------------------------------------------------------------
  */

  async function handleCopyToken() {
    if (!createdToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        createdToken
      );

      setSuccess(
        "Share token copied to clipboard."
      );
    } catch (err) {
      console.error(
        "Copy token error:",
        err
      );

      setError(
        "Unable to copy token."
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SHARE URL
  |--------------------------------------------------------------------------
  */

  function getShareUrl(token) {
    return `${window.location.origin}/share/${token}`;
  }

  /*
  |--------------------------------------------------------------------------
  | COPY SHARE URL
  |--------------------------------------------------------------------------
  */

  async function handleCopyUrl(token) {
    try {
      const url =
        getShareUrl(token);

      await navigator.clipboard.writeText(
        url
      );

      setSuccess(
        "Share URL copied to clipboard."
      );
    } catch (err) {
      console.error(
        "Copy share URL error:",
        err
      );

      setError(
        "Unable to copy share URL."
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | FORMAT DATE
  |--------------------------------------------------------------------------
  */

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString();
  }

  /*
  |--------------------------------------------------------------------------
  | STATUS
  |--------------------------------------------------------------------------
  */

  function getLinkStatus(link) {
    if (
      Number(link.is_revoked) === 1
    ) {
      return "Revoked";
    }

    if (
      link.revoked_at
    ) {
      return "Revoked";
    }

    if (
      link.expires_at &&
      new Date(link.expires_at) <=
        new Date()
    ) {
      return "Expired";
    }

    if (
      link.max_uses !== null &&
      Number(link.use_count) >=
        Number(link.max_uses)
    ) {
      return "Max uses reached";
    }

    return "Active";
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="share-links-page">

      <div className="share-links-header">

        <div>
          <h1>
            Secure Share Links
          </h1>

          <p>
            Create temporary,
            expiring links for
            document access.
          </p>
        </div>

        <Link
          to={`/documents/${documentId}`}
          className="back-button"
        >
          Back to Document
        </Link>

      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {createdToken && (
        <div className="token-box">

          <h2>
            Share Link Created
          </h2>

          <p>
            Copy this token now.
            The raw token is only
            returned when the link
            is created.
          </p>

          <div className="token-row">

            <input
              type="text"
              value={createdToken}
              readOnly
            />

            <button
              type="button"
              onClick={
                handleCopyToken
              }
            >
              Copy Token
            </button>

          </div>

          <div className="share-url-row">

            <input
              type="text"
              value={getShareUrl(
                createdToken
              )}
              readOnly
            />

            <button
              type="button"
              onClick={() =>
                handleCopyUrl(
                  createdToken
                )
              }
            >
              Copy URL
            </button>

          </div>

        </div>
      )}

      <section className="create-share-section">

        <h2>
          Create New Share Link
        </h2>

        <form
          onSubmit={
            handleCreateLink
          }
        >

          <div className="form-group">

            <label htmlFor="expiresAt">
              Expires At
            </label>

            <input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) =>
                setExpiresAt(
                  event.target.value
                )
              }
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="maxUses">
              Maximum Uses
            </label>

            <input
              id="maxUses"
              type="number"
              min="1"
              step="1"
              placeholder="Unlimited"
              value={maxUses}
              onChange={(event) =>
                setMaxUses(
                  event.target.value
                )
              }
            />

            <small>
              Leave empty for
              unlimited uses.
            </small>

          </div>

          <button
            type="submit"
            disabled={creating}
            className="primary-button"
          >
            {creating
              ? "Creating..."
              : "Create Share Link"}
          </button>

        </form>

      </section>

      <section className="share-links-section">

        <div className="section-header">

          <h2>
            Existing Share Links
          </h2>

          <button
            type="button"
            onClick={
              loadShareLinks
            }
            disabled={loading}
          >
            Refresh
          </button>

        </div>

        {loading ? (
          <div className="loading">
            Loading share links...
          </div>
        ) : shareLinks.length ===
          0 ? (
          <div className="empty-state">
            No share links have
            been created yet.
          </div>
        ) : (
          <div className="share-links-table-wrapper">

            <table className="share-links-table">

              <thead>

                <tr>
                  <th>ID</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Uses</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>

              </thead>

              <tbody>

                {shareLinks.map(
                  (link) => {

                    const status =
                      getLinkStatus(
                        link
                      );

                    const active =
                      status ===
                      "Active";

                    return (
                      <tr
                        key={
                          link.id
                        }
                      >

                        <td>
                          {link.id}
                        </td>

                        <td>
                          {formatDate(
                            link.created_at
                          )}
                        </td>

                        <td>
                          {formatDate(
                            link.expires_at
                          )}
                        </td>

                        <td>

                          {link.use_count}

                          {link.max_uses !==
                            null &&
                            ` / ${link.max_uses}`}

                        </td>

                        <td>

                          <span
                            className={`status-badge status-${status
                              .toLowerCase()
                              .replace(
                                /\s+/g,
                                "-"
                              )}`}
                          >
                            {status}
                          </span>

                        </td>

                        <td>

                          <div className="action-buttons">

                            {active && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRevoke(
                                    link.id
                                  )
                                }
                                disabled={
                                  revokingId ===
                                  link.id
                                }
                                className="danger-button"
                              >
                                {revokingId ===
                                link.id
                                  ? "Revoking..."
                                  : "Revoke"}
                              </button>
                            )}

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
}